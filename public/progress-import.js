'use strict';
// Session imports never erase a saved record. Review is tied to both an event
// generation and the exact current state, so even change-and-change-back cancels.
function createProgressImport(o) {
  let generation=0, pending=null, active=false, importedSession=false;
  const $=o.element, status=message=>{$('storage').textContent=message;};
  function invalidate(message='Import canceled because this session changed. Choose the file again to review it.') {
    generation++; pending=null;
    $('import-review').hidden=true;
    $('import-preview').value=''; $('import-summary').textContent=''; $('import').value='';
    if(active)status(message);
    active=false;
  }
  function bounded(value) {
    let count=0;
    function walk(v,depth) {
      if(++count>20000||depth>20)throw Error('bounds');
      if(typeof v==='string'&&v.length>200000)throw Error('bounds');
      if(v&&typeof v==='object')for(const k of Object.keys(v)){
        if(['__proto__','prototype','constructor'].includes(k))throw Error('unsafe key');
        walk(v[k],depth+1);
      }
    }
    walk(value,0);
    return o.valid(value)&&['week','work','hobby','own'].includes(value.goal)&&['new','tried','comfortable'].includes(value.capability)&&['','document','spreadsheet','code','paper'].includes(value.tool)&&['','none','readonly','review'].includes(value.connection);
  }
  function context(){return JSON.stringify(o.getState());}
  async function select(e) {
    const target=e.target, file=target.files&&target.files[0];
    invalidate('Previous import canceled.');
    if(!file)return;
    let ticket=generation, before=context();
    active=true; status('Reading progress file locally. Nothing has been replaced.');
    try {
      if(!Number.isFinite(file.size)||file.size<=0||file.size>1000000)throw Error('size');
      const raw=await file.text();
      if(ticket!==generation)return;
      if(before!==context()){invalidate();return;}
      if(typeof raw!=='string'||new TextEncoder().encode(raw).length>1000000)throw Error('size');
      const value=JSON.parse(raw);
      if(!bounded(value))throw Error('schema');
      const incoming=o.upgrade(value);
      if(!bounded(incoming))throw Error('schema');
      incoming.save=false;
      // Previewing an answer-bearing record is assistance, not independent work.
      active=false;
      if(!o.reviewExposure(incoming)){invalidate('Import review canceled. No record was replaced.');return;}
      ticket=generation; before=context(); active=true;
      pending={incoming,before,ticket};
      $('import-summary').textContent='Goal: '+incoming.purpose+'\nType: '+(incoming.projectKind||'checklist')+'\nSource: '+(incoming.sourceBasis?.origin||'Not retained')+'\nEarlier task records: '+(incoming.resultHistory?.length||0)+'\nReview the exact incoming record below, including draft, supplied facts, history and help. These remain self-reports, not verified learning.';
      $('import-preview').value=JSON.stringify(incoming,null,2);
      $('import-review').hidden=false;
      status('Review ready. No record was replaced. Any disclosed answer-preview help remains recorded; review the incoming session below.');
      $('import-review-title').focus();
    } catch {
      if(ticket===generation){invalidate('');status('Could not import that file. Choose a compatible Learn4Free JSON export, at most 1 MB. Nothing was replaced.');}
    } finally {if(ticket===generation)target.value='';}
  }
  function apply() {
    const p=pending;
    if(!p)return;
    if(p.ticket!==generation||p.before!==context()){invalidate();return;}
    if(!o.confirm('Replace only this current session with the reviewed record? Export your current session first if needed. Unsubmitted panels will be cleared. Existing browser-saved progress will be kept. Automatic saving will be OFF.')){invalidate('Import canceled. No record was replaced. Any answer-preview help already disclosed remains recorded.');return;}
    if(p.ticket!==generation||p.before!==context()){invalidate();return;}
    invalidate(''); importedSession=true;
    o.setState(p.incoming); o.clearPanels(); o.render();
    $('remember-import').hidden=false;
    status('Imported for this session only; automatic saving is OFF. Existing browser-saved progress is untouched and will return on reload. Export this imported work before closing, or explicitly remember it to replace the saved record.');
  }
  function allowSave() {
    if(!importedSession)return true;
    if(!o.confirm('Remember this imported session on this browser? This replaces any previously saved progress. Export either record first if you need both.'))return false;
    importedSession=false; $('remember-import').hidden=true; return true;
  }
  function remember() {
    if(!allowSave())return;
    o.getState().save=true; o.persist();
  }
  function deleted(){invalidate();importedSession=false;$('remember-import').hidden=true;}
  function interaction(e) {
    const id=e.target?.id;
    if(e.type==='click'&&$('import-review').contains?.(e.target))return;
    if(['import','import-button','import-apply','import-cancel','import-preview'].includes(id))return;
    if(active)invalidate();
  }
  o.document.addEventListener('input',interaction,true);
  o.document.addEventListener('change',interaction,true);
  o.document.addEventListener('click',interaction,true);
  $('import').onchange=select;
  $('import').oncancel=()=>invalidate('File selection canceled. No record was replaced.');
  $('import-apply').onclick=apply;
  $('import-cancel').onclick=()=>invalidate('Import canceled. No record was replaced. Any answer-preview help already disclosed remains recorded.');
  $('remember-import').onclick=remember;
  return {invalidate,deleted,allowSave,select,apply};
}
if(typeof module!=='undefined')module.exports={createProgressImport};
