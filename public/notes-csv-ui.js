(function(){
'use strict';
const $=id=>document.getElementById(id),L=NotesCSV;
let checked=null,approval=null,prepared=null,promptApproval=null,copyTicket=0;
let controls=[],savedQuotes=new Map(),restoreTicket=0,pendingRestore=null,restoreReading=false;
// Compute from current work, not a download click: browsers cannot confirm a file was saved.
// Replacement previews are not editable work and do not arm this warning on a blank page.
function hasWorkToLose(){
  return ['sources','columns','csv','origin','check-note','prompt'].some(id=>$(id).value.length>0)||
    $('harmless').checked||!!approval||!!promptApproval||
    controls.some(c=>c.reviewed.checked||(c.quote&&c.quote.value.length>0))||
    Array.from(savedQuotes.values()).some(quote=>quote.length>0);
}
let leaveWarningAttached=false;
function warnBeforeLeaving(event){
  if(!hasWorkToLose())return;
  event.preventDefault();event.returnValue='';
}
function syncLeaveWarning(){
  const needed=hasWorkToLose();
  if(needed===leaveWarningAttached)return;
  window[needed?'addEventListener':'removeEventListener']('beforeunload',warnBeforeLeaving);
  leaveWarningAttached=needed;
}
// Reconcile form values a browser may restore after script initialization.
window.addEventListener('pageshow',syncLeaveWarning);
function draftData(){
  const excerpts=new Map(savedQuotes);controls.forEach(c=>{if(c.quote)excerpts.set(c.cell.key,c.quote.value);});
  return {format:L.draftFormat,version:L.draftVersion,sources:$('sources').value,columns:$('columns').value,csv:$('csv').value,origin:$('origin').value,note:$('check-note').value,excerpts:Array.from(excerpts,([key,quote])=>({key,quote}))};
}
function restorable(data){
  // Text controls normalize some characters. Reject those files before replacing any work.
  for(const [tag,value] of [['textarea',data.sources],['input',data.columns],['textarea',data.csv],['textarea',data.note],...data.excerpts.map(x=>['textarea',x.quote])]){
    const probe=element(tag);if(tag==='input')probe.type='text';probe.value=value;
    if(probe.value!==value)throw Error('A draft field contains line endings or characters this text control would change. Nothing was shortened or replaced.');
  }
  return data;
}
function restoreSnapshot(){return JSON.stringify({draft:draftData(),review:snapshot(),prompt:$('prompt').value,promptReviewed:$('prompt-reviewed').checked,finalReviewed:$('final-reviewed').checked});}
function cancelRestore(message){
  restoreTicket++;pendingRestore=null;restoreReading=false;$('restore-preview').hidden=true;$('restore-text').textContent='';$('restore-draft').disabled=true;$('cancel-restore').hidden=true;$('open-draft').value='';
  if(message)$('draft-status').textContent=message;
}
function draftChanged(){const active=pendingRestore||restoreReading;cancelRestore(active?'Work changed. Choose the file again or preview fictional practice if you still want to replace this workbench.':undefined);}
function inputSnapshot(){return JSON.stringify({sources:$('sources').value,columns:$('columns').value,harmless:$('harmless').checked});}
function mappings(){return controls.map(c=>({key:c.cell.key,quote:c.quote?c.quote.value:'',reviewed:c.reviewed.checked,unknown:c.cell.value===''&&c.reviewed.checked}));}
function snapshot(){return JSON.stringify({input:inputSnapshot(),csv:$('csv').value,origin:$('origin').value,note:$('check-note').value,mappings:mappings()});}
function currentCheck(){return !!checked&&checked.input===inputSnapshot()&&checked.text===$('csv').value&&checked.result.ok&&$('harmless').checked;}
function eligible(){return currentCheck()&&L.review(checked.result,mappings()).ok&&['manual','external'].includes($('origin').value)&&!!$('check-note').value.trim()&&$('check-note').value.length<=L.limits.note;}
function approved(){return !!approval&&eligible()&&approval===snapshot();}
function promptCurrent(){return !!prepared&&prepared.input===inputSnapshot()&&$('harmless').checked&&prepared.text===$('prompt').value;}
function promptReviewed(){return promptCurrent()&&promptApproval===prepared.text;}
function status(text){$('status').textContent=text;}
function refresh(){
  syncLeaveWarning();
  const ready=approved();$('download-csv').disabled=!ready;$('download-record').disabled=!ready;$('final-reviewed').checked=ready;
  $('copy-prompt').disabled=!promptReviewed();$('prompt-reviewed').checked=promptReviewed();
  if(currentCheck()){
    const progress=L.review(checked.result,mappings());
    $('review-progress').textContent=progress.done+' of '+progress.total+' value comparisons recorded. These are your declarations, not verified meaning or truth.';
    controls.forEach(c=>{
      const checkedBox=c.reviewed.checked;
      const exact=c.quote&&!!c.quote.value.trim()&&c.quote.value.length<=L.limits.quote&&c.cell.source.includes(c.quote.value);
      c.state.textContent=c.cell.value===''?(checkedBox?'Unknown confirmed by you; not independently verified.':'Check that this field is unstated, not zero.'):
        !c.quote.value?'Add a short exact excerpt from the source above.':!exact?'This excerpt does not exactly occur in this source entry.':checkedBox?'Excerpt found; you declared it supports this value. Meaning is not checked by this page.':'Excerpt found. Now compare its meaning with the CSV value yourself.';
    });
  }
}
function revoke(message){approval=null;$('final-state').textContent=message||'Review was cleared. Your checking note is kept; review the current work again.';}
function rememberQuotes(){controls.forEach(c=>{if(c.quote)savedQuotes.set(c.cell.key,c.quote.value);});}
function invalidateCheck(){
  rememberQuotes();checked=null;controls=[];$('source-cards').replaceChildren();$('review-panel').hidden=true;
  $('check-result').textContent='Notes, columns or CSV changed. Run the structure check again; earlier comparisons no longer count.';
  revoke('Your checking note and excerpt drafts are kept. Check the current CSV and renew every source comparison.');
}
function requireSource(){
  if(!$('harmless').checked)throw Error('First check that your notes are harmless and appropriate to use here.');
  return L.spec($('sources').value,$('columns').value);
}
function element(tag,text){const e=document.createElement(tag);if(text!==undefined)e.textContent=text;return e;}
function renderComparisons(result){
  const old=savedQuotes;controls=[];savedQuotes=new Map();const container=$('source-cards');container.replaceChildren();
  let article,lastID;
  for(const [i,cell] of L.cells(result).entries()){
    if(cell.id!==lastID){
      article=element('article');article.className='source-card';
      const heading=element('h3','Source '+cell.id),source=element('p',cell.source);source.className='source-note';
      article.append(heading,source);container.append(article);lastID=cell.id;
    }
    const field=element('fieldset');field.className='cell-review';
    const legend=element('legend',cell.column),value=element('span',cell.value===''?'(empty / unknown)':cell.value);value.className='cell-value';
    field.append(legend,element('p','Current CSV value:'),value);
    let quote=null;
    if(old.has(cell.key))savedQuotes.set(cell.key,old.get(cell.key));
    if(cell.value!==''){
      quote=element('textarea');quote.id='excerpt-'+i;quote.rows=2;quote.maxLength=L.limits.quote;quote.autocomplete='off';quote.spellcheck=false;quote.value=old.get(cell.key)||'';
      const label=element('label','Exact supporting words from Source '+cell.id);label.htmlFor=quote.id;
      field.append(label,quote);savedQuotes.set(cell.key,quote.value);
    }
    const reviewed=element('input');reviewed.type='checkbox';reviewed.id='comparison-'+i;
    const label=element('label');label.htmlFor=reviewed.id;label.className='tick';
    label.append(reviewed,element('span',cell.value===''?'I checked Source '+cell.id+': '+cell.column+' is not stated, so this empty cell is intentional.':'I compared '+cell.column+' with Source '+cell.id+'; this excerpt supports the value.'));
    const state=element('p');state.className='cell-state';state.id='comparison-state-'+i;reviewed.setAttribute('aria-describedby',state.id);if(quote)quote.setAttribute('aria-describedby',state.id);
    field.append(label,state);article.append(field);controls.push({cell,quote,reviewed,state});
    if(quote)quote.addEventListener('input',()=>{draftChanged();reviewed.checked=false;savedQuotes.set(cell.key,quote.value);revoke();refresh();});
    reviewed.addEventListener('change',()=>{draftChanged();revoke();refresh();});
  }
  $('review-panel').hidden=false;
}
for(const id of ['sources','columns','csv'])$(id).addEventListener('input',()=>{
  draftChanged();invalidateCheck();
  if(id!=='csv'){promptApproval=null;copyTicket++;$('prompt-state').textContent=prepared?'Source changed. The old prompt is kept for reading only. Prepare and review a new prompt.':'Nothing has been prepared, copied or sent.';}
  refresh();
});
$('harmless').addEventListener('change',()=>{draftChanged();invalidateCheck();promptApproval=null;copyTicket++;$('prompt-state').textContent='Source approval changed. Prepare and review the current prompt before copying.';refresh();});
for(const id of ['origin','check-note'])for(const event of ['input','change'])$(id).addEventListener(event,()=>{draftChanged();revoke();refresh();});
$('make-blank').addEventListener('click',()=>{
  try{
    requireSource();const text=L.scaffold($('sources').value,$('columns').value);
    if($('csv').value&&!confirm('Replace the current CSV draft with blank cells and your current source IDs? Your source and checking note stay. Current comparisons will be cleared.'))return;
    draftChanged();$('csv').value=text;invalidateCheck();refresh();status('Blank CSV created, not extracted or checked. Fill its cells from the source; leave only genuinely unstated values empty.');$('csv').focus();
  }catch(e){status(e.message);}
});
$('build-prompt').addEventListener('click',()=>{
  try{requireSource();draftChanged();prepared={input:inputSnapshot(),text:L.prompt($('sources').value,$('columns').value)};promptApproval=null;copyTicket++;$('prompt').value=prepared.text;$('prompt-state').textContent='Prepared locally. Read the complete prompt and review it before copying. Nothing was sent.';refresh();$('prompt').focus();}
  catch(e){status(e.message);}
});
$('prompt-reviewed').addEventListener('change',()=>{
  draftChanged();const wanted=$('prompt-reviewed').checked;promptApproval=wanted&&promptCurrent()?prepared.text:null;copyTicket++;
  $('prompt-state').textContent=promptReviewed()?'Current prompt reviewed. Copying is a separate action; you decide whether to paste it elsewhere.':'Prepare a prompt from the current harmless source, then review it.';refresh();
});
$('copy-prompt').addEventListener('click',async()=>{
  if(!promptReviewed()){promptApproval=null;refresh();return;}
  const ticket=++copyTicket,text=prepared.text;
  try{await navigator.clipboard.writeText(text);if(ticket===copyTicket&&promptReviewed()&&prepared.text===text)$('prompt-state').textContent='Copied. This page sent nothing to an AI. Paste only if you choose to share these notes with your provider. Clearing this page will not clear the clipboard.';}
  catch{if(ticket===copyTicket&&promptReviewed()){$('prompt').focus();$('prompt').select();$('prompt-state').textContent='Copy did not complete. You can manually copy the selected reviewed prompt. Nothing was sent.';}}
});
$('check').addEventListener('click',()=>{
  // Repeated checks require fresh manual comparisons; they do not accumulate credit.
  draftChanged();revoke();rememberQuotes();
  try{requireSource();}catch(e){invalidateCheck();$('check-result').textContent=e.message;refresh();return;}
  const result=L.analyze($('sources').value,$('columns').value,$('csv').value);
  checked={input:inputSnapshot(),text:$('csv').value,result};
  if(result.ok){renderComparisons(result);$('check-result').textContent='Structure check passed: exact header, one row per supplied source ID, and no blocked formula-like cells. Values and unknowns still need your manual comparison below.';status('Compare each value with its original source. A neat table is not evidence of correctness.');$('review-title').focus();}
  else{controls=[];$('source-cards').replaceChildren();$('review-panel').hidden=true;$('check-result').textContent=result.issues.join('\n');status('The draft is kept unchanged. Correct the listed problems, then check again.');}
  refresh();
});
$('final-reviewed').addEventListener('change',()=>{
  draftChanged();const wanted=$('final-reviewed').checked;approval=null;
  if(wanted&&eligible())approval=snapshot();
  $('final-state').textContent=approved()?'This exact current CSV and review record are ready for you to download. Your declarations are not independently verified.':'Run the current check, compare every value, choose the draft origin and write a checking note before reviewing.';refresh();
});
function download(name,text,type){
  const blob=new Blob([text],{type}),url=URL.createObjectURL(blob),a=element('a');a.href=url;a.download=name;
  try{document.body.append(a);a.click();}finally{a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
}
function record(){
  const result=checked.result,ms=mappings();
  return ['LEARN4FREE — YOUR NOTES / CSV REVIEW RECORD',
    'Harmless user-supplied notes. No AI ran here. Origin and source comparisons below are user declarations, not authenticated AI use, semantic verification, truth, usefulness or learning evidence.',
    'This record is readable text, not an automatic restore file. It and the CSV contain entered data. Clear cannot remove downloaded or external copies.',
    '', 'SOURCE NOTES AS ENTERED',$('sources').value,'','REVIEWED SOURCE ENTRIES (outer spaces ignored)',...result.spec.sources.map(s=>s.id+' | '+s.text),
    '', 'EXPECTED COLUMNS',result.spec.columns.join(','),'Draft origin declared: '+($('origin').value==='manual'?'Written by me':'External AI draft, possibly edited; authorship and sending unverified'),
    '', 'CURRENT CSV — EXACT DRAFT',$('csv').value,
    '', 'LOCAL STRUCTURE CHECK','Header, row coverage, exact source IDs and formula/control-character restrictions passed. Text occurrence checks do not validate meaning. Unknown declarations are manual, not machine-confirmed.',
    '', 'SOURCE COMPARISONS',...L.cells(result).flatMap((cell,i)=>[cell.id+' / '+cell.column+' = '+JSON.stringify(cell.value),cell.value===''?'User declared: source does not state this value; empty is intentional.':'Exact excerpt: '+JSON.stringify(ms[i].quote)+'\nUser declared: this excerpt supports the value.']),
    '', 'MY CHECKING NOTE',$('check-note').value,
    '', 'NEXT: IMPORT AND RECHECK','Use comma delimiter and import source_id and other codes as Text (or all columns as Text first). Check leading zeros, dates/numbers, quoted labels and blank cells in the opened spreadsheet. This page has not verified import or use.'].join('\n');
}
for(const [id,isCSV] of [['download-csv',true],['download-record',false]])$(id).addEventListener('click',()=>{
  if(!approved()){revoke('Current entries no longer match the approved review. Check and review again before exporting.');refresh();return;}
  try{
    const csv=L.exportCSV($('sources').value,$('columns').value,$('csv').value,mappings());
    download(isCSV?'learn4free-reviewed-notes.csv':'learn4free-notes-review.txt',isCSV?csv:record(),isCSV?'text/csv;charset=utf-8':'text/plain;charset=utf-8');
    status(isCSV?'CSV download requested with the exact reviewed text. Import ID/code columns as Text and check the opened file; successful import is not verified.':'Source and review record download requested. It contains your entered notes and declarations, not proof of correctness or an automatic restore file.');
  }catch(e){status('Download could not be prepared. Your work stays in this tab. '+e.message);}
});
$('clear').addEventListener('click',()=>{
  if(!confirm('Clear the source notes, CSV, prompt and all comparisons in this workbench? There is no automatic saving. Downloaded files, clipboard copies, external AI conversations and other lessons will remain.'))return;
  cancelRestore('No editable draft is open.');checked=null;approval=null;prepared=null;promptApproval=null;copyTicket++;controls=[];savedQuotes=new Map();
  for(const id of ['sources','columns','csv','origin','check-note','prompt'])$(id).value='';
  $('harmless').checked=false;$('ai-help').open=false;$('source-cards').replaceChildren();$('review-panel').hidden=true;
  $('check-result').textContent='No checks run yet.';$('prompt-state').textContent='Nothing has been prepared, copied or sent.';$('review-progress').textContent='';$('final-state').textContent='Complete the source comparisons and write a checking note before export.';
  refresh();status('This workbench was cleared. Downloaded files, clipboard copies and other lessons are unchanged.');$('source-title').focus();
});
$('download-draft').addEventListener('click',()=>{
  try{
    const text=L.serializeDraft(draftData());
    download('learn4free-notes-editable-draft.json',text,'application/json;charset=utf-8');
    $('draft-status').textContent='Editable draft download requested. It includes unfinished text and excerpt drafts, not approvals or verified results. Keep this file private. The readable review record is a separate output.';
  }catch(e){$('draft-status').textContent='Draft download could not be prepared. Your work stays unchanged in this tab. '+e.message;}
});
$('preview-practice').addEventListener('click',()=>{
  // Use the same explicit, stale-safe replacement gate as reopened files.
  // Practice is data, never a privacy declaration or a completed review.
  cancelRestore();
  const sources='001 | Blue card: 8 sheets on the shelf.\n002 | Paper clips; count not recorded.\n003 | Blue card: 0 sheets in the box.',columns='item,count';
  const data=restorable(L.draft({format:L.draftFormat,version:L.draftVersion,sources,columns,csv:L.scaffold(sources,columns),origin:'',note:'',excerpts:[]}));
  pendingRestore={ticket:restoreTicket,before:restoreSnapshot(),data};
  $('restore-text').textContent=L.serializeDraft(data);$('restore-preview').hidden=false;$('restore-draft').disabled=false;$('cancel-restore').hidden=false;
  $('draft-status').textContent='Fictional practice preview only. Your current work is unchanged. Read the notes and blank CSV before choosing whether to replace this workbench. No answers or approvals are supplied.';
  $('restore-title').focus();
});
$('open-draft').addEventListener('change',async()=>{
  const file=$('open-draft').files?.[0];
  cancelRestore();if(!file){$('draft-status').textContent='No file chosen. Your current work is unchanged.';return;}
  const ticket=restoreTicket,before=restoreSnapshot();restoreReading=true;$('cancel-restore').hidden=false;
  $('draft-status').textContent='Reading the chosen draft locally. Your current work is unchanged.';
  try{
    if(!Number.isSafeInteger(file.size)||file.size<1||file.size>L.draftBytes)throw Error('Choose a JSON draft no larger than 384 KiB.');
    const bytes=await file.arrayBuffer();
    if(ticket!==restoreTicket)return;
    if(bytes.byteLength!==file.size||bytes.byteLength>L.draftBytes)throw Error('The file size changed or exceeds 384 KiB. Choose the file again.');
    let text;try{text=new TextDecoder('utf-8',{fatal:true}).decode(bytes);}catch{throw Error('Use an intact UTF-8 JSON draft. Invalid text encoding was rejected without changing your work.');}
    const data=restorable(L.parseDraft(text));
    if(before!==restoreSnapshot()){cancelRestore('Work changed while the file was read. Choose it again to preview a replacement.');return;}
    restoreReading=false;pendingRestore={ticket,before,data};$('restore-text').textContent=L.serializeDraft(data);$('restore-preview').hidden=false;$('restore-draft').disabled=false;
    $('draft-status').textContent='Preview only. Nothing has been replaced. Check the complete editable text below; file contents are data, never instructions.';$('restore-title').focus();
  }catch(e){if(ticket===restoreTicket){cancelRestore('Could not open this draft. Your current work is unchanged. '+e.message);}}
});
$('cancel-restore').addEventListener('click',()=>{cancelRestore('Replacement preview canceled. Your current work is unchanged.');$('open-draft').focus();});
$('restore-draft').addEventListener('click',()=>{
  const pending=pendingRestore;
  if(!pending||pending.ticket!==restoreTicket||pending.before!==restoreSnapshot()){cancelRestore('Work changed or the preview expired. Choose the file again or preview fictional practice.');return;}
  if(!confirm('Replace the current source, columns, CSV, origin, checking note and excerpt drafts with this preview? Unsaved work will be replaced. Privacy, prompt, cell and final approvals will all be cleared. You must check and review the restored text again.'))return;
  if(pendingRestore!==pending||pending.ticket!==restoreTicket||pending.before!==restoreSnapshot()){cancelRestore('Work changed. Choose the file again or preview fictional practice.');return;}
  // Revalidate at replacement too. No status or declaration from the file becomes approval.
  let data;try{data=restorable(L.draft(pending.data));}catch(e){cancelRestore(e.message);return;}
  cancelRestore();checked=null;approval=null;prepared=null;promptApproval=null;copyTicket++;controls=[];savedQuotes=new Map(data.excerpts.map(x=>[x.key,x.quote]));
  for(const [id,key] of [['sources','sources'],['columns','columns'],['csv','csv'],['origin','origin'],['check-note','note']])$(id).value=data[key];
  $('harmless').checked=false;$('prompt').value='';$('ai-help').open=false;$('source-cards').replaceChildren();$('review-panel').hidden=true;$('review-progress').textContent='';
  $('prompt-state').textContent='Nothing has been prepared, copied or sent.';
  $('check-result').textContent='Editable text restored, not checked. Confirm the notes are harmless, then run the structure check on this exact content.';
  $('final-state').textContent='All approvals were cleared. Check the current CSV, renew every source comparison and review again before output downloads.';
  refresh();$('draft-status').textContent='Editable draft reopened. Unfinished text and excerpt drafts are kept exactly; no privacy, prompt, cell or final approval was restored. Nothing was uploaded or automatically saved.';status('Recheck the restored content from the source. Downloaded and clipboard copies outside this page are unchanged.');$('source-title').focus();
});
refresh();
})();
