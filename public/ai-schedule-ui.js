(function(){
'use strict';
const $=id=>document.getElementById(id),L=ScheduleLesson;
const fields=['origin','other-help','request','raw','draft','note'];
function fresh(id){return {origin:'','other-help':'',request:id===0?L.prompt(0):'',raw:'',draft:'',note:'',first:null,checks:0,checked:null,approval:null,promptReview:null,help:{hint:false,example:false,external:false,person:false,feedback:false,planner:false},started:false};}
let records=[fresh(0),fresh(1)],active=0,copyTicket=0;
function current(){return records[active];}
function values(){const s=current();fields.forEach(id=>s[id]=$(id).value);return s;}
function support(s){const used=Object.entries(s.help).filter(([,used])=>used).map(([name])=>name);return used.length?used.map(name=>name==='feedback'?'constraint-check feedback':name==='planner'?'separate planner opened':name).join(', '):'No additional help declared or opened here. This is not independently verified.';}
function invalidate(s){s.approval=null;}
function reviewed(s){return !!s.first&&!!s.checked&&s.checked.text===s.draft&&s.checked.result.ok&&!!s.note.trim()&&s.approval===snapshot(s);}
function snapshot(s){return JSON.stringify({draft:s.draft,note:s.note,request:s.request,origin:s.origin,checks:s.checks,help:s.help,other:s['other-help']});}
function status(message){$('status').textContent=message;}
function refresh(){
  const s=current();$('download-sheet').disabled=!reviewed(s);$('final-reviewed').checked=reviewed(s);
  $('copy-request').disabled=!s.promptReview||s.promptReview!==s.request;
  $('request-reviewed').checked=!!s.promptReview&&s.promptReview===s.request;
  $('help-status').textContent='Support recorded for this task: '+support(s);
}
function render(){
  const s=current(),spec=L.task(active);copyTicket++;
  $('task-title').textContent=spec.title;$('source').textContent=L.source(spec);$('task-number').textContent='Task '+(active+1)+' of 2';
  fields.forEach(id=>$(id).value=s[id]);
  $('raw').readOnly=!!s.first;$('origin').disabled=!!s.first;$('submit-first').disabled=!!s.first;
  $('prepared-option').disabled=active!==0;$('load-example').hidden=active!==0;$('load-example').disabled=!!s.first;
  $('correction').hidden=!s.first;$('hint-text').hidden=!s.help.hint;$('hint').setAttribute('aria-expanded',String(s.help.hint));
  $('first-guidance').hidden=active!==0;$('changed-guidance').hidden=active!==1;
  $('next-task').hidden=active!==0;$('next-task').textContent=records[1].started?'Return to the changed task →':'Try the changed brief with less help →';$('previous-task').hidden=active!==1;
  $('feedback').textContent=s.checked?L.feedback(s.checked.result):(s.first?'Your draft is kept. Check the current version again.':'');
  $('open-own-planner').hidden=active!==1;$('own-planner').hidden=active===1&&!s.help.planner;$('open-own-planner').setAttribute('aria-expanded',String(!$('own-planner').hidden));
  $('copy-status').textContent='';$('status').textContent='';$('note-status').textContent=s.note&&!reviewed(s)?'Your checking note is kept as a draft. Review it again after the current checks.':'';
  preview(s.checked?.result);refresh();
}
function preview(result){
  const body=$('table-body');body.replaceChildren();$('table-preview').hidden=!result?.rows?.length;
  if(!result?.rows?.length)return;
  for(const row of result.rows.slice().sort((a,b)=>a.from-b.from)){const tr=document.createElement('tr');[row.id,row.start,row.end,String(row.to-row.from)].forEach(value=>{const td=document.createElement('td');td.textContent=value;tr.append(td);});body.append(tr);}
}
function helpFromDeclaration(s){
  if(s.origin==='external'||s['other-help']==='ai')s.help.external=true;
  if(s.origin==='prepared')s.help.example=true;
  if(s['other-help']==='person')s.help.person=true;
}
function check(s){s.help.feedback=true;s.checks++;s.checked={text:s.draft,result:L.analyze(L.task(active),s.draft)};invalidate(s);$('feedback').textContent=L.feedback(s.checked.result);preview(s.checked.result);refresh();}
fields.forEach(id=>['input','change'].forEach(event=>$(id).addEventListener(event,()=>{
  const s=values();invalidate(s);copyTicket++;
  if(id==='request'){s.promptReview=null;$('copy-status').textContent='Review this exact request again before copying.';}
  if(id==='draft'){s.checked=null;$('feedback').textContent='Draft changed. Your first submitted draft and note are kept; run the checks again.';preview(null);}
  if(id==='other-help'||id==='origin')helpFromDeclaration(s);
  if(s.note)$('note-status').textContent='Checking note kept as a draft. Check the current timetable and review again.';
  refresh();
})));
$('request-reviewed').addEventListener('change',()=>{
  const s=values();s.promptReview=$('request-reviewed').checked&&s.request.trim()&&s.request.length<=12000?s.request:null;
  if(!s.promptReview)$('copy-status').textContent='Write a request, then review it before copying.';refresh();
});
$('copy-request').addEventListener('click',async()=>{
  const s=values(),ticket=++copyTicket;if(!s.promptReview||s.promptReview!==s.request)return;
  const text=s.request;try{await navigator.clipboard.writeText(text);if(ticket===copyTicket&&s===current()&&s.request===text)$('copy-status').textContent='Copied. Only paste it if you choose to share it with your provider. Nothing was sent by this page.';}
  catch{if(ticket===copyTicket&&s===current()){$('request').focus();$('request').select();$('copy-status').textContent='Copy did not complete. Select and copy the reviewed text manually. Nothing was sent.';}}
});
$('load-example').addEventListener('click',()=>{
  const s=values();if(active!==0||s.first)return;
  if(s.raw&& !confirm('Replace your unsubmitted first draft with a deliberately flawed prepared example? Your request and notes stay.'))return;
  s.raw=L.task(0).sample;s.origin='prepared';s.help.example=true;invalidate(s);render();status('Prepared example loaded. It was written for this lesson, not generated by an AI. Find what it loses or invents.');$('raw').focus();
});
$('hint').addEventListener('click',()=>{
  const s=values();s.help.hint=true;invalidate(s);$('hint-text').hidden=false;$('hint').setAttribute('aria-expanded','true');refresh();
});
$('submit-first').addEventListener('click',()=>{
  const s=values();if(s.first)return;
  if(!['manual','external',...(active===0?['prepared']:[])].includes(s.origin)||!['none','ai','person'].includes(s['other-help'])||!s.raw.trim())return status('Choose where the draft came from, record other help and add your first timetable draft.');
  if(s.raw.length>4000||s.request.length>12000)return status('The draft or request is too long. Keep a copy outside this page and shorten it for this small lesson.');
  if(s.origin==='external'&&!s.request.trim())return status('Keep the request you used with the external AI, then submit your draft. Sending and response authorship cannot be verified here.');
  helpFromDeclaration(s);s.first={raw:s.raw,request:s.request,origin:s.origin,otherHelp:s['other-help'],help:{...s.help}};
  s.draft=s.raw;s.started=true;check(s);s.first.feedback=L.feedback(s.checked.result);render();status('First submitted draft kept unchanged before feedback. Edit the separate correction below; later attempts have seen checking help.');$('correction-title').focus();
});
$('check-draft').addEventListener('click',()=>{const s=values();if(!s.first)return;helpFromDeclaration(s);check(s);status('Current draft checked. Write what changed or still needs attention, then review it.');$('feedback').focus();});
$('final-reviewed').addEventListener('change',()=>{
  const wanted=$('final-reviewed').checked,s=values();invalidate(s);
  if(wanted&&s.first&&s.checked?.result.ok&&s.checked.text===s.draft&&s.note.trim()&&s.note.length<=2000)s.approval=snapshot(s);
  $('note-status').textContent=reviewed(s)?'This exact timetable and checking note are reviewed. You can download the run sheet.':'Run the current checks, correct all conflicts and write your checking note before reviewing.';refresh();
});
function download(name,text,type){
  const blob=new Blob([text],{type}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);
  try{a.click();}finally{a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
}
$('download-sheet').addEventListener('click',()=>{
  const s=values();if(!reviewed(s)){invalidate(s);refresh();return status('The draft or note changed. Check and review it again before downloading.');}
  try{download('learn4free-timetable-task-'+(active+1)+'.txt',L.runSheet(L.task(active),s.draft,s.note),'text/plain;charset=utf-8');status('Run sheet download requested. Open it and compare its times, gaps and constraints before use. Nothing was sent, booked or added to a calendar.');}
  catch(e){status(e.message);}
});
function record(s,id){
  const first=s.first;
  return ['LEARN4FREE — TIMETABLE PRACTICE RECORD','Task '+(id+1)+': '+L.task(id).title,
  'Fictional practice only. No AI runs here. Prepared responses are written examples; pasted AI authorship and sending are unverified. No grade, verified learning, real-world feasibility or actual-use pass is awarded.',
  'This text record is not an import file. Keep it to read later or manually copy your drafts back. No automatic saving. Downloads survive Clear.',
  '', 'ORIGINAL FICTIONAL SOURCE',L.source(L.task(id)),'','OUTPUT RULES',L.rules,
  '', 'FIRST SUBMITTED DRAFT — KEPT BEFORE FEEDBACK',first?first.raw:'Not submitted yet.',
  'Origin declared: '+(first?first.origin:'Not submitted'),
  'Other help declared before first check: '+(first?first.otherHelp:'Not submitted'),
  'Help recorded before first check: '+(first?JSON.stringify(first.help):'Not submitted'),
  'Request on page at first submission (sending unverified):',first?first.request:'Not submitted',
  'First check feedback:',first?first.feedback:'Not checked',
  '', 'CURRENT REQUEST (may be a later correction request)',s.request,
  '', 'UNSUBMITTED FIRST DRAFT',first?'Already preserved above.':s.raw,
  '', 'CURRENT CORRECTED TIMETABLE',s.draft,
  '', 'CURRENT LOCAL CHECK',s.checked&&s.checked.text===s.draft?L.feedback(s.checked.result):'Current draft has not been checked; an earlier result cannot be reused.',
  'Checks run in this tab: '+s.checks+'. Revisions after the first check have seen feedback.',
  'Current support record: '+support(s),'Current other-help declaration: '+s['other-help'],
  '', 'MY CHECKING NOTE',s.note,
  'Exact timetable/note review: '+(reviewed(s)?'Learner reviewed; not independent verification.':'Not currently reviewed.'),
  '', 'TAKE THE METHOD WITH YOU','State the window, full durations, fixed starts and required order. Ask for explicit start and end times. Check every activity once, every duration, overlaps and the deadline. Correct the proposal, not the facts. If it cannot fit, ask to change the scope or window. Confirm actual durations and availability before real use.','Only this task is included; the other task\'s answer is not in this record.'].join('\n');
}
$('download-record').addEventListener('click',()=>{const s=values();try{download('learn4free-timetable-task-'+(active+1)+'-record.txt',record(s,active),'text/plain;charset=utf-8');status('Practice record download requested, including unfinished drafts and your first submitted attempt. It is a readable record, not a file this page imports.');}catch(e){status('Download could not be prepared. Your work is still in this tab. '+e.message);}});
$('next-task').addEventListener('click',()=>{
  const s=values();if(!records[1].started&&!reviewed(s))return status('Finish the source checks and review your first task before trying the changed task. You can save an unfinished record at any time.');
  active=1;current().started=true;render();$('task-title').focus();
});
$('previous-task').addEventListener('click',()=>{
  values();records[1].help.example=true;invalidate(records[1]);active=0;render();status('Earlier work reopened. Example help is recorded on the changed task; its first submission stays unchanged.');$('task-title').focus();
});
function openOwnPlanner(){if(active===1){const s=values();s.help.planner=true;invalidate(s);$('own-planner').hidden=false;$('open-own-planner').setAttribute('aria-expanded','true');refresh();}}
$('open-own-planner').addEventListener('click',()=>{openOwnPlanner();$('own-title').focus();});
$('own-link').addEventListener('click',openOwnPlanner);
$('clear').addEventListener('click',()=>{
  if(!confirm('Clear both tasks and their first attempts in this lesson tab? Download each task record first if you want to keep it. Downloaded files and main-project progress stay unchanged.'))return;
  records=[fresh(0),fresh(1)];active=0;render();status('This lesson tab was cleared. Downloaded copies and other lessons are unchanged.');$('task-title').focus();
});
render();
})();
(function(){
'use strict';
const $=id=>document.getElementById(id),L=ScheduleLesson,keys=['label','minutes','fixed','after','start','end'];
const ids=['own-start','own-end','own-note',...Array.from({length:5},(_,i)=>keys.map(k=>'own-'+(i+1)+'-'+k)).flat()];
let checked=null,approval=null,restoreTicket=0,pendingRestore=null,restoreReading=false;
function read(){return {start:$('own-start').value,end:$('own-end').value,note:$('own-note').value,rows:Array.from({length:5},(_,i)=>Object.fromEntries(keys.map(k=>[k,$('own-'+(i+1)+'-'+k).value])))};}
function draftData(v=read()){return {format:L.draftFormat,version:L.draftVersion,...v};}
function entries(v){return [v.start,v.end,v.note,...v.rows.flatMap(row=>keys.map(k=>row[k]))];}
function restoreSnapshot(){return JSON.stringify({input:read(),checked,approval,reviewed:$('own-reviewed').checked});}
function cancelRestore(message){
  restoreTicket++;pendingRestore=null;restoreReading=false;$('own-restore-preview').hidden=true;$('own-restore-text').textContent='';$('own-restore').disabled=true;$('own-cancel-restore').hidden=true;$('own-open-draft').value='';
  if(message)$('own-draft-status').textContent=message;
}
function draftChanged(){cancelRestore(pendingRestore||restoreReading?'Current work or checks changed. Choose the file again to review a new replacement.':undefined);}
function restoreCurrent(ticket,before){
  if(ticket!==restoreTicket)return false;
  if(before!==restoreSnapshot()){cancelRestore('Current work or checks changed. Choose the file again; nothing was replaced.');return false;}
  return true;
}
function restorable(data){
  // Test actual detached native text controls; never silently normalize a reopened string.
  entries(data).forEach((value,i)=>{
    const tag=ids[i]==='own-note'?'textarea':'input',probe=document.createElement(tag);if(tag==='input')probe.type='text';probe.value=value;
    if(probe.value!==value)throw Error('A draft field contains line endings or characters this text control would change. Nothing was shortened or replaced.');
  });
  return data;
}
function replaceInputs(data){
  const before=entries(read()),next=entries(data);
  try{
    ids.forEach((id,i)=>$(id).value=next[i]);
    if(JSON.stringify(entries(read()))!==JSON.stringify(next))throw Error('A control did not retain its exact draft value.');
  }catch(error){
    // Keep checks/approval untouched until the complete write succeeds. Roll back every
    // changed control if assignment or the exact readback fails, not just the last one.
    ids.forEach((id,i)=>{if($(id).value!==before[i])$(id).value=before[i];});
    throw Error('The draft could not be applied; original entries were restored. '+error.message);
  }
}
globalThis.addEventListener?.('pagehide',()=>cancelRestore('Choose the file again after returning to this page.'));
function basis(v){return JSON.stringify({start:v.start,end:v.end,rows:v.rows});}
function compile(v){
  const active=v.rows.map((r,i)=>({...r,id:String(i+1)})).filter(r=>keys.some(k=>r[k]!==''));
  const spec={title:'My small plan',start:v.start.trim(),end:v.end.trim(),activities:active.map(r=>({id:r.id,label:r.label.trim(),minutes:/^\d{1,3}$/.test(r.minutes)?Number(r.minutes):null,fixed:r.fixed.trim(),after:r.after?[r.after]:[]}))};
  const draft=active.map(r=>r.id+' | '+r.start+' | '+r.end).join('\n');return {spec,draft};
}
function current(v){return !!checked&&checked.basis===basis(v)&&checked.result.ok;}
function reviewed(v){return current(v)&&!!v.note.trim()&&v.note.length<=2000&&approval===JSON.stringify(v);}
function refresh(){const v=read();$('own-reviewed').checked=reviewed(v);$('own-download').disabled=!reviewed(v);}
ids.forEach(id=>['input','change'].forEach(event=>$(id).addEventListener(event,()=>{
  draftChanged();approval=null;if(id!=='own-note'){checked=null;$('own-feedback').textContent='Plan changed. Earlier checks cannot be reused. Your note and all entries remain.';}
  $('own-status').textContent='Your work is kept in this tab. Check and review the current plan before downloading a reviewed run sheet.';refresh();
})));
$('own-check').addEventListener('click',()=>{
  draftChanged();const v=read(),{spec,draft}=compile(v);checked={basis:basis(v),result:L.analyze(spec,draft)};approval=null;
  $('own-feedback').textContent=L.feedback(checked.result);$('own-status').textContent=checked.result.ok?'Write what still needs confirming, then review the exact plan.':'The proposal does not pass. Entries and checking notes are kept; change the plan or explicitly revise its constraints.';refresh();$('own-feedback').focus();
});
$('own-reviewed').addEventListener('change',()=>{
  draftChanged();const wanted=$('own-reviewed').checked,v=read();approval=wanted&&current(v)&&v.note.trim()&&v.note.length<=2000?JSON.stringify(v):null;
  $('own-status').textContent=reviewed(v)?'This exact plan and checking note are reviewed, not independently verified.':'Check the current proposal and write your note before reviewing.';refresh();
});
function download(name,text,type='text/plain;charset=utf-8'){const url=URL.createObjectURL(new Blob([text],{type})),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);try{a.click();}finally{a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}}
$('own-download').addEventListener('click',()=>{
  const v=read();if(!reviewed(v)){approval=null;refresh();$('own-status').textContent='The plan or note is not currently reviewed. Check and review it again.';return;}
  const {spec,draft}=compile(v);try{download('learn4free-my-run-sheet.txt',L.runSheet(spec,draft,v.note));$('own-status').textContent='Run sheet download requested. Confirm real durations and availability before use. No calendar event or message was created.';}catch(e){$('own-status').textContent='Download could not be prepared. Entries stay here. '+e.message;}
});
$('own-record').addEventListener('click',()=>{
  const v=read(),text=['LEARN4FREE — MY SMALL PLANNER RECORD','Unfinished work is allowed. This text is not an import file. It contains only this planner, not the practice answers.','Window start: '+v.start,'Finish by: '+v.end,'',...v.rows.map((r,i)=>['Activity '+(i+1),'Label: '+r.label,'Full duration (minutes): '+r.minutes,'Fixed start: '+r.fixed,'Must follow activity: '+r.after,'Proposed start: '+r.start,'Proposed end: '+r.end].join('\n')),'','CURRENT LOCAL CHECK',checked&&checked.basis===basis(v)?L.feedback(checked.result):'Current entries have not been checked.','MY CHECKING NOTE',v.note,'Exact review: '+(reviewed(v)?'Learner reviewed, not independently verified.':'Not currently reviewed.'),'No automatic saving, import, calendar action or external transmission. Actual use and usefulness are unverified.'].join('\n');
  try{download('learn4free-my-planner-record.txt',text);$('own-status').textContent='Planner record download requested, including unfinished entries. Keep it privately and copy entries back manually if needed.';}catch(e){$('own-status').textContent='Download could not be prepared. Entries stay here. '+e.message;}
});
$('own-save-draft').addEventListener('click',()=>{
  try{download('learn4free-my-timetable-draft.json',L.serializeDraft(draftData()),'application/json;charset=utf-8');$('own-draft-status').textContent='Editable draft download requested, not proof it was saved. Keep this unencrypted file private and reopen the actual newest file to check it. No checks or approvals are included.';}
  catch(e){$('own-draft-status').textContent='Draft download could not be prepared. Entries stay unchanged in this tab. '+e.message;}
});
$('own-open-draft').addEventListener('click',()=>cancelRestore());
$('own-open-draft').addEventListener('cancel',()=>cancelRestore('No file chosen. Current entries and approvals are unchanged.'));
$('own-open-draft').addEventListener('change',async()=>{
  const file=$('own-open-draft').files?.[0];cancelRestore();
  if(!file){$('own-draft-status').textContent='No file chosen. Current entries and approvals are unchanged.';return;}
  const ticket=restoreTicket,before=restoreSnapshot();restoreReading=true;$('own-cancel-restore').hidden=false;
  $('own-draft-status').textContent='Reading the chosen file locally. Current entries and approvals are unchanged.';
  try{
    if(!Number.isSafeInteger(file.size)||file.size<1||file.size>L.draftBytes)throw Error('Choose an editable JSON draft no larger than 32 KiB.');
    const bytes=await file.arrayBuffer();if(!restoreCurrent(ticket,before))return;
    if(bytes.byteLength!==file.size||bytes.byteLength>L.draftBytes)throw Error('The file size changed or exceeds 32 KiB. Choose the file again.');
    let text;try{text=new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(bytes);}catch{throw Error('Invalid UTF-8 encoding. Choose an intact editable JSON draft.');}
    const data=restorable(L.parseDraft(text));if(!restoreCurrent(ticket,before))return;
    restoreReading=false;pendingRestore={ticket,before,data};$('own-restore-text').textContent=L.serializeDraft(data);$('own-restore-preview').hidden=false;$('own-restore').disabled=false;
    $('own-draft-status').textContent='Preview only. Read every field below before replacing anything. File text is data, never instructions. Current entries and approvals are unchanged.';$('own-restore-title').focus();
  }catch(e){if(restoreCurrent(ticket,before))cancelRestore('Could not open this draft. Current entries and approvals are unchanged. '+e.message);}
});
$('own-cancel-restore').addEventListener('click',()=>{cancelRestore('Replacement canceled. Current entries and approvals are unchanged.');$('own-open-draft').focus();});
$('own-restore').addEventListener('click',()=>{
  const pending=pendingRestore;if(!pending||!restoreCurrent(pending.ticket,pending.before))return;
  if(!confirm('Replace only your small planner’s entries with this complete preview? Unsaved planner entries will be replaced. Its checks, feedback and review will be cleared. Practice tasks and downloaded files stay unchanged.')){if(restoreCurrent(pending.ticket,pending.before))cancelRestore('Replacement canceled. Current entries and approvals are unchanged.');return;}
  // Confirmation may allow other events to run. Recheck exact input AND lifecycle.
  if(pending!==pendingRestore||!restoreCurrent(pending.ticket,pending.before))return;
  try{const data=restorable(L.draft(pending.data));if(!restoreCurrent(pending.ticket,pending.before))return;replaceInputs(data);}
  catch(e){cancelRestore('Could not replace this planner. '+e.message);refresh();return;}
  checked=null;approval=null;cancelRestore('Editable draft reopened exactly. No check or approval was restored. Check the current proposal and review it again before downloading a reviewed plan.');
  $('own-feedback').textContent='Reopened draft: no timetable checked yet.';$('own-status').textContent='Only your small planner was replaced. Practice tasks and downloaded copies are unchanged. Nothing was uploaded or automatically saved.';refresh();$('own-title').focus();
});
$('own-clear').addEventListener('click',()=>{
  draftChanged();if(!confirm('Clear only your small planner in this tab? Download its record first if needed. Practice tasks, other projects and downloaded files stay unchanged.'))return;
  ids.forEach(id=>$(id).value='');checked=null;approval=null;$('own-feedback').textContent='No timetable checked yet.';$('own-status').textContent='Only this small planner was cleared. Practice tasks and downloaded files are unchanged.';refresh();$('own-start').focus();
});
refresh();
})();
