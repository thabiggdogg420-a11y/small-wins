(function(){
'use strict';
const $=id=>document.getElementById(id),L=StockLesson;
const fields=['origin','other-help','request','raw','draft','note'];
function fresh(id,blank=false){return {origin:'','other-help':'',request:id===0&&!blank?L.prompt(0):'',raw:'',draft:'',note:'',first:null,checks:0,checked:null,approval:null,promptReview:null,help:L.emptyHelp(),firstProvenance:null,started:false};}
let records=[fresh(0),fresh(1)],active=0,copyTicket=0;
const exposure=[L.emptyHelp(),L.emptyHelp()],pageChecks=[0,0];
let restoreTicket=0,pendingRestore=null,restoreReading=false;
function current(){return records[active];}
function values(){const s=current();fields.forEach(id=>{if(!s.first||!['raw','origin'].includes(id))s[id]=$(id).value;});return s;}
function support(s){const used=Object.entries(s.help).filter(([,used])=>used).map(([name])=>name);return used.length?used.map(name=>name==='feedback'?'source-check feedback (answer-level)':name==='savedWork'?'saved-work exposure (file history unverified)':name).join(', '):'No additional help declared or opened here. This is not independently verified.';}
function invalidate(s){s.approval=null;}
function reviewed(s){return !!s.first&&!!s.checked&&s.checked.text===s.draft&&s.checked.result.ok&&!!s.note.trim()&&s.approval===snapshot(s);}
function snapshot(s){return JSON.stringify({draft:s.draft,note:s.note,request:s.request,origin:s.origin,checks:s.checks,help:s.help,other:s['other-help']});}
function status(message){$('status').textContent=message;}
function refresh(){
  const s=current();$('download-csv').disabled=!reviewed(s);$('final-reviewed').checked=reviewed(s);
  $('copy-request').disabled=!s.promptReview||s.promptReview!==s.request;
  $('request-reviewed').checked=!!s.promptReview&&s.promptReview===s.request;
  $('help-status').textContent='Support recorded for this task: '+support(s);
  $('history-status').textContent=s.firstProvenance==='file'?'This first submission and its pre-feedback help are file-provided, unauthenticated claims. The file is not verified history.':s.first?'First submission kept in this page before its check; declared authorship and help are not independently verified.':'No first submission kept for this task.';
}
function render(writeFields=true){
  const s=current(),spec=L.task(active);copyTicket++;
  $('task-title').textContent=spec.title;$('source').textContent=spec.source;$('task-number').textContent='Task '+(active+1)+' of 2';
  if(writeFields)fields.forEach(id=>$(id).value=s[id]);
  $('raw').readOnly=!!s.first;$('origin').disabled=!!s.first;$('submit-first').disabled=!!s.first;
  $('prepared-option').disabled=active!==0;$('load-example').hidden=active!==0;$('load-example').disabled=!!s.first;
  $('correction').hidden=!s.first;$('hint-text').hidden=!s.help.hint;$('hint').setAttribute('aria-expanded',String(s.help.hint));
  $('first-guidance').hidden=active!==0;$('changed-guidance').hidden=active!==1;
  $('next-task').hidden=active!==0;$('next-task').textContent=records[1].started?'Return to the changed task →':'Try the different list with less help →';$('previous-task').hidden=active!==1;
  $('feedback').textContent=s.checked?L.feedback(s.checked.result):(s.first?'Your draft is kept. Check the current version again.':'');
  $('copy-status').textContent='';$('status').textContent='';$('note-status').textContent=s.note&&!reviewed(s)?'Your checking note is kept as a draft. Review it again after the current checks.':'';
  preview(s.checked?.result);refresh();
}
function preview(result){
  const body=$('table-body');body.replaceChildren();$('table-preview').hidden=!result?.rows?.length;
  if(!result?.rows?.length)return;
  for(const row of result.rows.slice(1)){const tr=document.createElement('tr');row.forEach(value=>{const td=document.createElement('td');td.textContent=value;tr.append(td);});body.append(tr);}
}
function helpFromDeclaration(s){
  if(s.origin==='external'||s['other-help']==='ai')s.help.external=true;
  if(s.origin==='prepared')s.help.example=true;
  if(s['other-help']==='person')s.help.person=true;
}
function check(s){s.help.feedback=true;remember(active);s.checks=++pageChecks[active];s.checked={text:s.draft,result:L.analyze(active,s.draft)};invalidate(s);$('feedback').textContent=L.feedback(s.checked.result);preview(s.checked.result);refresh();}
fields.forEach(id=>['input','change'].forEach(event=>$(id).addEventListener(event,()=>{
  const s=values();draftChanged();invalidate(s);copyTicket++;
  if(id==='request'){s.promptReview=null;$('copy-status').textContent='Review this exact request again before copying.';}
  if(id==='draft'){s.checked=null;$('feedback').textContent='Draft changed. Your first submitted draft and note are kept; run the checks again.';preview(null);}
  if(id==='other-help'||id==='origin')helpFromDeclaration(s);remember(active);
  if(s.note)$('note-status').textContent='Checking note kept as a draft. Check the current table and review again.';
  refresh();
})));
$('request-reviewed').addEventListener('change',()=>{
  draftChanged();const s=values();s.promptReview=$('request-reviewed').checked&&s.request.trim()&&s.request.length<=16000?s.request:null;
  if(!s.promptReview)$('copy-status').textContent='Write a request, then review it before copying.';refresh();
});
$('copy-request').addEventListener('click',async()=>{
  const s=values(),ticket=++copyTicket;if(!s.promptReview||s.promptReview!==s.request)return;
  const text=s.request;try{await navigator.clipboard.writeText(text);if(ticket===copyTicket&&s===current()&&s.request===text)$('copy-status').textContent='Copied. Only paste it if you choose to share it with your provider. Nothing was sent by this page.';}
  catch{if(ticket===copyTicket&&s===current()){$('request').focus();$('request').select();$('copy-status').textContent='Copy did not complete. Select and copy the reviewed text manually. Nothing was sent.';}}
});
$('load-example').addEventListener('click',()=>{
  const s=values();if(active!==0||s.first)return;draftChanged();
  if(s.raw&& !confirm('Replace your unsubmitted first draft with a deliberately flawed prepared example? Your request and notes stay.'))return;
  s.raw=L.task(0).sample;s.origin='prepared';s.help.example=true;remember(active);invalidate(s);render();status('Prepared example loaded. It was written for this lesson, not generated by an AI. Find what it loses or invents.');$('raw').focus();
});
$('hint').addEventListener('click',()=>{
  draftChanged();const s=values();s.help.hint=true;remember(active);invalidate(s);$('hint-text').hidden=false;$('hint').setAttribute('aria-expanded','true');refresh();
});
$('submit-first').addEventListener('click',()=>{
  const s=values();if(s.first)return;draftChanged();
  if(!['manual','external',...(active===0?['prepared']:[])].includes(s.origin)||!['none','ai','person'].includes(s['other-help'])||!s.raw.trim())return status('Choose where the draft came from, record other help and add your first CSV draft.');
  if(s.raw.length>12000||s.request.length>16000)return status('The draft or request is too long. Keep a copy outside this page and shorten it for this small lesson.');
  if(s.origin==='external'&&!s.request.trim())return status('Keep the request you used with the external AI, then submit your draft. Sending and response authorship cannot be verified here.');
  helpFromDeclaration(s);remember(active);s.first={raw:s.raw,request:s.request,origin:s.origin,otherHelp:s['other-help'],help:{...s.help}};
  s.draft=s.raw;s.started=true;check(s);s.first.feedback=L.feedback(s.checked.result);L.freezeFirst(s.first);s.firstProvenance='page';render();status('First submitted draft kept unchanged before feedback. Edit the separate correction below; later attempts have seen checking help.');$('correction-title').focus();
});
$('check-draft').addEventListener('click',()=>{draftChanged();const s=values();if(!s.first)return;helpFromDeclaration(s);check(s);status('Current draft checked. Write what changed or still needs attention, then review it.');$('feedback').focus();});
$('final-reviewed').addEventListener('change',()=>{
  draftChanged();const wanted=$('final-reviewed').checked,s=values();invalidate(s);
  if(wanted&&s.first&&s.checked?.result.ok&&s.checked.text===s.draft&&s.note.trim()&&s.note.length<=2000)s.approval=snapshot(s);
  $('note-status').textContent=reviewed(s)?'This exact table and checking note are reviewed. You can download the CSV.':'Run the current checks, correct all mismatches and write your checking note before reviewing.';refresh();
});
function download(name,text,type){
  const blob=new Blob([text],{type}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);
  try{a.click();}finally{a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
}
$('download-csv').addEventListener('click',()=>{
  const s=values();if(!reviewed(s)){invalidate(s);refresh();return status('The draft or note changed. Check and review it again before downloading.');}
  try{download('learn4free-stock-task-'+(active+1)+'.csv',L.exportCSV(active,s.draft),'text/csv;charset=utf-8');status('CSV download requested. Import source_id as text to keep its leading zeros; compare the opened file with the source. A download is not a verified spreadsheet import.');}
  catch(e){status(e.message);}
});
function record(s,id){
  const first=s.first;
  return ['LEARN4FREE — STOCK LIST PRACTICE RECORD','Task '+(id+1)+': '+L.task(id).title,
  'Fictional practice only. No AI runs here. Prepared responses are written examples; pasted AI authorship and sending are unverified. No grade, verified learning, real stock count or spreadsheet-import pass is awarded.',
  'This text record is not an import file. Keep it to read later or manually copy your drafts back. No automatic saving. Downloads survive Clear.',
  '', 'ORIGINAL FICTIONAL SOURCE',L.task(id).source,'','OUTPUT RULES',L.rules,
  '', 'FIRST SUBMITTED DRAFT — KEPT BEFORE FEEDBACK',s.firstProvenance==='file'?'File-provided unauthenticated history: first draft, original help and feedback claims. Not verified history.':'Kept in this page; help and origin are not independently verified.',first?first.raw:'Not submitted yet.',
  'Origin declared: '+(first?first.origin:'Not submitted'),
  'Other help declared before first check: '+(first?first.otherHelp:'Not submitted'),
  'Help recorded before first check: '+(first?JSON.stringify(first.help):'Not submitted'),
  'Request on page at first submission (sending unverified):',first?first.request:'Not submitted',
  'First check feedback:',first?first.feedback:'Not checked',
  '', 'CURRENT REQUEST (may be a later correction request)',s.request,
  '', 'UNSUBMITTED FIRST DRAFT',first?'Already preserved above.':s.raw,
  '', 'CURRENT CORRECTED CSV DRAFT',s.draft,
  '', 'CURRENT LOCAL CHECK',s.checked&&s.checked.text===s.draft?L.feedback(s.checked.result):'Current draft has not been checked; an earlier result cannot be reused.',
  'Checks run in this tab: '+s.checks+'. File check counts are never restored. Revisions after the first check have seen feedback.',
  'Current support record: '+support(s),'Current other-help declaration: '+s['other-help'],
  '', 'MY CHECKING NOTE',s.note,
  'Exact table/note review: '+(reviewed(s)?'Learner reviewed; not independent verification.':'Not currently reviewed.'),
  '', 'TAKE THE METHOD WITH YOU','Ask for a precise table shape. Keep source IDs as text. Account for every row, including repeated items. Separate zero from unknown. Check parsed cell values, not just neat formatting. Correct against the original. Import IDs as text and inspect the opened file. Do not run untrusted spreadsheet formulas.','Only this task is included; the other task\'s answer is not in this record.'].join('\n');
}
$('download-record').addEventListener('click',()=>{const s=values();try{download('learn4free-stock-task-'+(active+1)+'-record.txt',record(s,active),'text/plain;charset=utf-8');status('Practice record download requested, including unfinished drafts and your first submitted attempt. It is a readable record, not a file this page imports.');}catch(e){status('Download could not be prepared. Your work is still in this tab. '+e.message);}});
$('next-task').addEventListener('click',()=>{
  draftChanged();const s=values();if(!records[1].started&&!reviewed(s))return status('Finish the source checks and review your first task before trying the changed task. You can save an unfinished record at any time.');
  active=1;current().started=true;render();$('task-title').focus();
});
$('previous-task').addEventListener('click',()=>{
  draftChanged();values();records[1].help.example=true;remember(1);invalidate(records[1]);active=0;render();status('Earlier work reopened. Example help is recorded on the changed task; its first submission stays unchanged.');$('task-title').focus();
});
$('clear').addEventListener('click',()=>{
  draftChanged();
  if(!confirm('Clear both task drafts, requests, notes and first attempts in this tab? Already-seen help and actual page check counts remain recorded while this page stays open. Staged file data is discarded. Download working records first if needed; downloaded files and other projects are unchanged.'))return;
  rememberAll();records=[fresh(0,true),fresh(1,true)];records.forEach((s,id)=>{s.help={...exposure[id]};s.checks=pageChecks[id];});active=0;render();status('Both task drafts, requests, notes and first attempts were cleared. Already-seen help stays recorded in this open page; downloaded copies and other lessons are unchanged.');$('task-title').focus();
});
// Portable records are separate from the main project and from every other lesson.
// The exposure ledger retains only booleans through Clear, never learner text.
// Separate pageChecks counters retain actual operations observed in this page.
function remember(id,extra={}){
  const s=records[id],minimum=L.minimumHelp(s);let changed=false;
  for(const k of L.helpKeys){const next=exposure[id][k]||minimum[k]||!!extra[k];exposure[id][k]=next;if(s.help[k]!==next){s.help[k]=next;changed=true;}}
  if(changed){invalidate(s);copyTicket++;}return changed;
}
function rememberAll(){records.forEach((_,id)=>remember(id));}
function workingData(){values();rememberAll();return {format:L.workingFormat,version:L.workingVersion,definition:L.definitionPin,active,records:records.map(s=>Object.fromEntries([...fields,'first','help','started'].map(k=>[k,s[k]])))};}
function restoreSnapshot(){return JSON.stringify({active,records,exposure,pageChecks,inputs:fields.map(id=>$(id).value),requestReview:$('request-reviewed').checked,finalReview:$('final-reviewed').checked});}
function cancelRestore(message){
  restoreTicket++;pendingRestore=null;restoreReading=false;
  $('restore-preview').hidden=true;$('restore-text').textContent='';$('restore-hidden').textContent='';$('restore').disabled=true;$('reveal-records').hidden=true;$('cancel-restore').hidden=true;$('open-working').value='';
  if(message)$('working-status').textContent=message;
}
function draftChanged(){cancelRestore(pendingRestore||restoreReading?'Work, task or review changed. Choose the file again; nothing was replaced.':undefined);}
function restoreCurrent(ticket,before){
  if(ticket!==restoreTicket)return false;
  if(before!==restoreSnapshot()){cancelRestore('Work or review changed. Choose the file again; nothing was replaced.');return false;}
  return true;
}
function conflicts(data){for(let id=0;id<2;id++)if(records[id].first&&!L.sameFirst(records[id].first,data.records[id].first))throw Error('Task '+(id+1)+' already has a different first submission in this page. Nothing was replaced. Keep its record; use a separate fresh lesson tab for a different history.');}
function restorable(data){
  for(const s of data.records)for(const id of ['request','raw','draft','note']){
    const probe=document.createElement('textarea');probe.value=s[id];
    if(probe.value!==s[id])throw Error('A saved text field would change in this browser’s text control. Nothing was normalized or replaced.');
  }
  return data;
}
function earlierSensitive(data){return records[1].started||data.records[1].started;}
function showPending(p,all=false){
  // Called only AFTER stale validation. Internal exposure must not rebase stale work.
  const visible=all?[0,1]:(p.data.active===0&&earlierSensitive(p.data)?[]:[p.data.active]);
  visible.forEach(id=>remember(id,{savedWork:true,feedback:!!p.data.records[id].first}));
  if(visible.includes(0)&&earlierSensitive(p.data))remember(1,{example:true,savedWork:true});
  refresh();
  const shown={format:p.data.format,version:p.data.version,definition:p.data.definition,active:p.data.active,records:[]};
  shown.records=p.data.records.map((s,id)=>visible.includes(id)?s:{concealed:'Task '+(id+1)+' saved fields are carried by this file but hidden in this preview.'});
  $('restore-text').textContent=JSON.stringify(shown,null,2);
  $('restore-hidden').textContent=all?'Both task records are now visible. Saved-work exposure is recorded; earlier-answer exposure is recorded for a started changed task. Cancel cannot unsee this help.':'Only the saved active task is shown, unless earlier work must stay concealed. Hidden records will also be replaced. Reveal both only if you want to read them; doing so records help. The actual file contains both tasks.';
  $('reveal-records').hidden=all;$('restore-preview').hidden=false;$('restore').disabled=false;$('cancel-restore').hidden=false;
  p.before=restoreSnapshot();p.all=all;
}
function replacement(data){
  conflicts(data);
  return data.records.map((saved,id)=>{
    const old=records[id],next={...saved,help:{...saved.help},first:saved.first?L.freezeFirst(saved.first):null,firstProvenance:saved.first?'file':null,checks:pageChecks[id],checked:null,approval:null,promptReview:null};
    if(old.first){next.first=old.first;next.firstProvenance=old.firstProvenance;}
    const min=L.minimumHelp(next);for(const k of L.helpKeys)next.help[k]=min[k]||exposure[id][k]||old.help[k];
    // Reopening a record is support, even if its answer fields were concealed.
    next.help.savedWork=true;
    if(id===1&&data.active===0&&earlierSensitive(data)){next.help.example=true;next.help.savedWork=true;}
    return next;
  });
}
function replaceInputs(next){
  const before=fields.map(id=>$(id).value);
  try{
    fields.forEach(id=>$(id).value=next[id]);
    if(fields.some(id=>$(id).value!==next[id]))throw Error('A control did not retain its exact text.');
  }catch(e){fields.forEach((id,i)=>{if($(id).value!==before[i])$(id).value=before[i];});throw Error('Replacement failed; original fields were restored. '+e.message);}
}
$('save-working').addEventListener('click',()=>{
  values();draftChanged();
  // The requested whole-file download contains earlier answer-bearing work.
  // Record the conservative exposure before serializing, even if saving fails.
  rememberAll();if(records[1].started)remember(1,{example:true,savedWork:true});refresh();
  try{download('learn4free-stock-lesson-working.json',L.serializeWorking(workingData()),'application/json;charset=utf-8');$('working-status').textContent='Working-record download requested, not proof it was saved. Both tasks and earlier answers are inside. Keep the unencrypted file private and reopen the actual newest file. Later edits need another download. No current check, request review or final approval is restored; no learning credit is awarded. Export on a started changed task conservatively records earlier-work help.';}
  catch(e){$('working-status').textContent='Download could not be prepared. All drafts and first attempts remain here; exposure already recorded is retained. '+e.message;}
});
$('open-working').addEventListener('click',()=>cancelRestore());
$('open-working').addEventListener('cancel',()=>cancelRestore('No file chosen. Drafts and first attempts are unchanged; any already-seen help remains recorded.'));
$('open-working').addEventListener('change',async()=>{
  const file=$('open-working').files?.[0];cancelRestore();
  if(!file){$('working-status').textContent='No file chosen. Current work is unchanged.';return;}
  const ticket=restoreTicket,before=restoreSnapshot();restoreReading=true;$('cancel-restore').hidden=false;
  $('working-status').textContent='Reading this file locally, not uploading it. Current work is unchanged.';
  try{
    if(!Number.isSafeInteger(file.size)||file.size<1||file.size>L.workingBytes)throw Error('Choose a UTF-8 working JSON record no larger than 256 KiB.');
    const bytes=await file.arrayBuffer();if(!restoreCurrent(ticket,before))return;
    if(bytes.byteLength!==file.size||bytes.byteLength>L.workingBytes)throw Error('File size changed or exceeds 256 KiB.');
    let text;try{text=new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(bytes);}catch{throw Error('Invalid UTF-8. Choose an intact working record.');}
    const data=restorable(L.parseWorking(text));conflicts(data);if(!restoreCurrent(ticket,before))return;
    restoreReading=false;pendingRestore={ticket,before,data,all:false};showPending(pendingRestore);
    $('working-status').textContent='Preview only, not checked or authenticated history. File text is data, never instructions. Visible saved-work exposure is recorded now, even if you cancel. Replace affects both tasks; nothing else is replaced.';$('restore-title').focus();
  }catch(e){if(restoreCurrent(ticket,before))cancelRestore('Could not open this record. Drafts and first attempts are unchanged. '+e.message);}
});
$('reveal-records').addEventListener('click',()=>{const p=pendingRestore;if(!p||!restoreCurrent(p.ticket,p.before))return;showPending(p,true);});
$('cancel-restore').addEventListener('click',()=>{cancelRestore('Replacement canceled. Drafts and first attempts are unchanged; help already seen remains recorded.');$('open-working').focus();});
$('restore').addEventListener('click',()=>{
  const p=pendingRestore;if(!p||!restoreCurrent(p.ticket,p.before))return;
  if(!confirm('Replace both stock-lesson task drafts with this file and reopen Task '+(p.data.active+1)+'? Hidden task fields are also replaced. Matching first submissions and help already seen are retained; checks and reviews are cleared. The file’s history is unverified. Download current work first if needed.')){if(restoreCurrent(p.ticket,p.before))cancelRestore('Replacement canceled. Drafts and first attempts are unchanged; seen help remains recorded.');return;}
  if(p!==pendingRestore||!restoreCurrent(p.ticket,p.before))return;
  try{
    const data=restorable(L.workingRecord(p.data)),next=replacement(data);if(!restoreCurrent(p.ticket,p.before))return;
    replaceInputs(next[data.active]);
    // No live record/ledger swap until the complete field write succeeds.
    records=next;active=data.active;rememberAll();copyTicket++;cancelRestore();render(false);
    $('working-status').textContent='Both task drafts reopened exactly. File-provided first history is unauthenticated; matching history already kept in this page stays unchanged. No current check, request review or final approval was restored. Check and review again. Help already seen remains recorded.';$('task-title').focus();
  }catch(e){cancelRestore('Could not replace this lesson. '+e.message);refresh();}
});
globalThis.addEventListener?.('pagehide',()=>cancelRestore('Choose the file again after returning to this page.'));

render();
})();
