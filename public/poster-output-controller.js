'use strict';
function createPosterOutput(o){
 const $=o.element,P=o.poster;
 let owner=null,record=null,phase=null,shownDraft=null,prepared=null,reference=null,notePersistence=false,revision=0;
 const checks=['facts','readable','private'];
 function status(message){$('status').textContent=message;}
 function revoke(){
  revision++;prepared=null;
  for(const id of checks)$(id).checked=false;
  $('download').disabled=true;
 }
 function invalidate(message){
  const had=!!(prepared||reference);revoke();reference=null;
  $('review').hidden=true;$('preview').replaceChildren();
  if(message&&had)status(message);
 }
 function eligible(){const s=o.state();return s.started&&s.projectKind==='poster'&&o.visible();}
 function draft(){const r=o.state().resultPath;return r?.posterLayouts?.[r.phase]||P.fresh()[r?.phase==='transfer'?'transfer':'first'];}
 function key(){return JSON.stringify(o.state());}
 function stamp(){const s=o.state(),r=s.resultPath;return {owner:s,record:r,phase:r.phase,source:s.sourceBasis,layouts:r.posterLayouts,layout:r.posterLayouts?.[r.phase],key:key()};}
 function matches(view){const s=o.state(),r=s.resultPath;return !!view&&eligible()&&view.owner===s&&view.record===r&&view.phase===r.phase&&view.source===s.sourceBasis&&view.layouts===r.posterLayouts&&view.layout===r.posterLayouts?.[r.phase]&&view.key===key();}
 function rendered(view){return $('preview').innerHTML===view.dom&&P.fits($('preview').querySelector('svg'),view.lines);}
 function current(){return matches(prepared)&&prepared.revision===revision;}
 function referenceCurrent(){return matches(reference)&&rendered(reference);}
 function noteEdit(){
  // Only an explicit edit of this note can turn the exact visible same-task
  // rendering into a reference. It has no download bytes or approval token.
  const view=prepared||reference;
  if(!matches(view)||!rendered(view)){invalidate();return;}
  const kept={...stamp(),dom:view.dom,lines:view.lines};revoke();reference=kept;
  $('preview-title').textContent='UNAPPROVED reference · same task';
  $('reference-help').hidden=false;
  for(const id of checks)$(id).disabled=true;
 }
 function beforePersist(message){
  // One synchronous persistence call owned by note editing, never a general
  // permission to retain through save/import/adoption or nested persistence.
  const keep=notePersistence&&referenceCurrent();notePersistence=false;
  if(!keep)invalidate(message);
 }
 function sync(){
  const s=o.state(),r=s.resultPath,p=r?.phase==='transfer'?'transfer':'first';
  const changed=owner!==s||record!==r||phase!==p;
  if(changed||prepared&&!current()||reference&&!referenceCurrent()||!eligible())invalidate('Work or context changed. Build and review a new preview; your display text is kept.');
  if(changed){owner=s;record=r;phase=p;shownDraft=null;}
  $('panel').hidden=!eligible();if(!eligible())return;
  const d=draft(),raw=JSON.stringify(d);
  if(shownDraft!==raw){
   // Avoid assigning an unchanged textarea value: it can move the caret during
   // note input. Compare its normalized DOM value without changing raw state.
   for(const field of ['text','preset','note']){const value=d[field]||'';if($(field).value!==(field==='preset'?value:value.replace(/\r\n?/g,'\n')))$(field).value=value;}
   shownDraft=raw;
  }
  $('preview-title').textContent=reference?'UNAPPROVED reference · same task':'Check this exact rendered preview';
  $('reference-help').hidden=!reference;
  for(const id of checks)$(id).disabled=!current();
  $('phase').textContent=p==='transfer'?'Changed task · your own new poster':'First task · your poster';
  $('source').textContent=p==='transfer'?'YOUR CHANGED REQUIREMENT\n'+(r.transferTask||'Not recorded yet.')+'\n\nYOUR RELATED DRAFT\n'+(r.transferDraft||'Not recorded yet.'):'YOUR CURRENT PROJECT AND LAYOUT BRIEF\n'+(s.artifact||'Not recorded yet.')+'\n\nYOUR SUPPLIED SOURCE FACTS AND UNKNOWNS\n'+(s.sourceBasis?.facts||'No separate source recorded. Use the original brief, including its deliberate changes.');
  $('revisit').hidden=p!=='transfer';
  $('download').disabled=!current()||!!P.noteError(draft().note)||!checks.every(id=>$(id).checked);
 }
 function edit(field,value){
  if(!eligible())return;
  if(field==='note')noteEdit();else invalidate('Display text or layout changed. Build and check a new preview.');
  const r=o.state().resultPath;if(!r.posterLayouts)r.posterLayouts=P.fresh();
  // Upgrade old optional layouts only on an explicit edit, retaining both raw
  // drafts/presets and starting each newly required note blank.
  if(r.posterLayouts.version===1)r.posterLayouts={version:2,first:{...r.posterLayouts.first,note:''},transfer:{...r.posterLayouts.transfer,note:''}};
  r.posterLayouts[r.phase][field]=value;
  // Editing an output cannot keep an earlier useful-result self-check current.
  o.invalidateLearning(r.phase);
  if(field==='note'&&reference)reference={...reference,...stamp()};
  notePersistence=field==='note'&&referenceCurrent();
  try{o.persist();}finally{notePersistence=false;}
  sync();
  status(value.length>200000?'Your full editable input is kept, but exceeds the editable JSON field limit. Export will offer a clearly labelled archival text copy instead of restorable JSON. Nothing was shortened. Shorten the draft yourself for editable JSON recovery.':reference?'Visual-check note kept. The same-task image remains an UNAPPROVED reference. Build and review again, then complete all three checks before downloading.':'Display draft kept in this project. It is not checked. Build the preview when ready.');
 }
 function prepare(){
  sync();if(!eligible())return false;invalidate();
  let bytes,lines;try{lines=P.linesFor(draft());bytes=P.build(draft());}catch(e){status(e.message);$('text').focus();return false;}
  // Owned builder only. Never interpolate learner text anywhere else as markup.
  $('preview').innerHTML=bytes;$('review').hidden=false;
  if(!P.fits($('preview').querySelector('svg'),lines.length)){
   $('review').hidden=true;$('preview').replaceChildren();status('This layout could not fit or measure every line safely. Shorten a line or add a line break within the 12-line limit, then preview again. Your full input is kept. If measurement is unavailable, use the text kit or progress JSON.');return false;
  }
  prepared={bytes,lines:lines.length,...stamp(),revision,dom:$('preview').innerHTML};
  status('Preview built locally. Compare every displayed line with your requirement, check readability, and write what you found in the visual-check note. Rebuild after editing the note, then complete all three checks. No learning credit was awarded.');
  $('preview-title').focus();sync();return true;
 }
 function download(){
  if(!current()){if(referenceCurrent())revoke();else invalidate();status('Build a current preview and review it before downloading.');return false;}
  if(!checks.every(id=>$(id).checked)){status('Complete all three checks for this exact preview first.');return false;}
  const noteProblem=P.noteError(draft().note);if(noteProblem){status(noteProblem);$('note').focus();return false;}
  const svg=$('preview').querySelector('svg');
  // Verify DOM still matches the owned builder and measure once more at click.
  if($('preview').innerHTML!==prepared.dom||!P.fits(svg,prepared.lines)){invalidate();status('The rendered preview changed or no longer fits. Build and review it again.');return false;}
  try{o.download('my-'+(phase==='transfer'?'related':'first')+'-poster.svg',prepared.bytes,'image/svg+xml');}
  catch{status('Download could not start. Your display draft and review remain here. Keep the tab open and try again, or export editable progress.');return false;}
  status('Private SVG download requested, not proof of saving. Reopen the actual file in a trusted viewer and recheck text and readability before relying on it. Fonts can vary. Keep editable progress JSON too; the SVG cannot restore this project. Nothing was published.');return true;
 }
 $('text').oninput=e=>edit('text',e.target.value);
 $('note').oninput=e=>edit('note',e.target.value);
 $('preset').onchange=e=>edit('preset',e.target.value);
 $('build').onclick=prepare;
 for(const id of checks)$(id).onchange=()=>{if(!current()){if(referenceCurrent())revoke();else invalidate();status('This review is no longer current. Build the preview again.');}sync();if(current()&&checks.every(id=>$(id).checked)&&P.noteError(draft().note))status(P.noteError(draft().note));};
 $('download').onclick=download;
 $('revisit').onclick=()=>{invalidate();o.revisit();sync();};
 $('close').onclick=()=>{invalidate();status('Preview closed. Display text remains in your editable progress.');};
 // All ordinary text/check changes revoke approval even after edit-and-revert.
 function input(event){if(event.target===$('note'))noteEdit();else if(!checks.some(id=>$(id)===event.target))invalidate('An input changed. Build and review a new preview.');}
 o.document.addEventListener('input',input,true);o.document.addEventListener('change',input,true);
 for(const type of ['input','change','click'])o.document.addEventListener(type,sync);
 sync();return {sync,invalidate,beforePersist,prepare,download};
}
if(typeof module!=='undefined')module.exports={createPosterOutput};
