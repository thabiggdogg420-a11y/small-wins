'use strict';
const $=id=>document.getElementById(id), C=Coach, KEY='small-wins-coach-v1';let s=C.fresh();var progressImport;
// Remember is a preference, not proof that the current record reached storage.
// This receipt is tab-only and never exported or imported.
let lastSavedSnapshot=null;
function pauseMessage(){if(!s.save)return 'Session only: export before closing to keep your progress. This current session is not saved automatically.';return lastSavedSnapshot===JSON.stringify(s)?'Current progress was saved on this browser. You can return here; no reminders are sent.':'Your current progress is NOT saved on this browser. Export progress before closing to keep it. An older saved record, if any, may return on reload.';}
try{const raw=localStorage.getItem(KEY);if(raw){const parsed=JSON.parse(raw);if(C.valid(parsed)){s=C.upgrade(parsed);lastSavedSnapshot=JSON.stringify(s);}else $('storage').textContent='Saved progress was not compatible. Start fresh or import a valid export.';}}catch{$('storage').textContent='Browser storage unavailable. You can still use and export this session.';}
function persist(){if(progressImport)progressImport.invalidate();if(s.save){if(progressImport&&!progressImport.allowSave()){s.save=false;return;}try{const snapshot=JSON.stringify(s);localStorage.setItem(KEY,snapshot);lastSavedSnapshot=snapshot;$('storage').textContent='Progress saved on this browser only.';}catch{lastSavedSnapshot=null;$('storage').textContent='Could not save here. Export your progress before closing.';}}}
function invalidateAttempt(){C.invalidate(s);const current=$('steps').children[s.step];if(current)current.textContent=`${s.step+1}. ${C.stage(s)[0]}`;$('review-panel').hidden=true;if(s.started){const count=s.done.filter(Boolean).length;$('progress').value=count;$('progress-label').textContent=`${count} of 10 self-reported checked checkpoints`;$('finish').hidden=count!==10;}if(typeof refreshAppShell==='function')refreshAppShell();}
function download(name,content,type){const a=document.createElement('a'),u=URL.createObjectURL(new Blob([content],{type}));a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),2000);}
function progressExportText(value){return JSON.stringify({...value,exportNote:'Self-reported practice, not verified mastery. Prepared rules do not assess mastery. Explicitly adopted draft/example, source, original pasted response, check and earlier task history are included; unadopted AI/pasted-panel text is not.'},null,2);}
function exportProgress(){
 const report=message=>{for(const id of ['storage','journey-status']){const el=$(id);if(el)el.textContent=message;}};
 try {
  // Preflight the exact prospective assistance-aware record against the same
  // importer, before claiming editable recovery or changing any help history.
  const prospective=JSON.parse(JSON.stringify(s));
  if(typeof ResultPath!=='undefined'&&ResultPath.unfinishedTransfer(prospective)&&!prospective.resultPath.transferExample){Object.assign(prospective.resultPath,{transferHelp:true,transferExample:true,transferSupport:'example',transferReviewed:false});}
  const recoverable=!!progressImport?.validateExport(progressExportText(prospective));
  if(!recoverable&&!confirm('This full record is outside the safe import limits (1 MB total, bounded fields/structure). Download a clearly labelled archival TEXT copy instead? It preserves your notes but CANNOT be imported as editable progress. Nothing will be shortened or deleted. Cancel keeps your work here.')){report('No export made. Work is unchanged. You can keep individual project text or review a readable project kit.');return false;}
  if(typeof ResultPath!=='undefined'){const choice=ResultPath.reviewFullExport(s,message=>confirm(message));if(!choice.allowed)return false;if(choice.changed){persist();if(typeof refreshResultPath==='function')refreshResultPath();}}
  const raw=progressExportText(s);
  if(recoverable&&!progressImport.validateExport(raw)){report('The record changed during export. Nothing was downloaded. Try again to review the current recovery size.');return false;}
  download(recoverable?'small-wins-learning-record.json':'small-wins-archive-not-importable.txt',recoverable?raw:'LEARN4FREE ARCHIVAL COPY — NOT IMPORTABLE\nThis preserves notes as text only. It is not an editable recovery file. Nothing was shortened. Review privately before sharing.\n\n'+raw,recoverable?'application/json':'text/plain');
  report(recoverable?'Editable JSON download requested and checked against the current importer limits. Keep the actual file before closing; a request is not proof your browser saved it.':'Archival text download requested. This file cannot restore editable progress. Your current project remains here unchanged.');return true;
 } catch {report('Could not prepare this download. Your work remains here. Keep the tab open and use the project text or readable kit if available.');return false;}
}
function render(){ if(typeof refreshResultPath==='function')refreshResultPath(); if(typeof refreshLabs==='function')refreshLabs(); if(typeof refreshAppShell==='function')refreshAppShell(); if(typeof refreshHandoffState==='function')refreshHandoffState(); $('onboarding').hidden=s.started;$('workspace').hidden=!s.started;if(!s.started)return;const n=s.step,st=C.stage(s),count=s.done.filter(Boolean).length;$('progress').value=count;$('progress-label').textContent=`${count} of 10 self-reported checked checkpoints`;$('steps').replaceChildren();C.stages.forEach((_,i)=>{const x=C.stage(s,i);const b=document.createElement('button');b.textContent=`${s.done[i]?'✓ ':''}${i+1}. ${x[0]}`;if(i===n)b.setAttribute('aria-current','step');b.onclick=()=>{s.step=i;render();persist();$('step-title').focus();};$('steps').append(b);});$('step-number').textContent=`Checkpoint ${n+1} / 10`;$('step-title').textContent=st[0];$('coach-lead').textContent=st[1];$('activity').textContent=n===9?C.kindTransfer(s):st[2];$('context').textContent=`${s.localAiReplacedProject?'Retained earlier-task evidence and reflections need fresh checking before reuse with this draft. Newly recorded checks are still your self-report. ':''}${s.legacyAttempts?'Older notes were preserved; revisit reflections before counting them as self-checked. ':''}Your win: ${s.purpose.replace(/[.!?]+$/,'')}. ${n===9?'Try independently first. Hints are hidden for this checkpoint.':s.capability==='new'?'Try one small action. You can pause or ask for a hint.':s.capability==='tried'?'Focus on why the result works, not just whether it looks polished.':'Challenge: explain your check and test a new example before marking practice.'}`;$('evidence').value=s.evidence[n];$('artifact').value=s.artifact;$('baseline').textContent=s.baseline;$('baseline-caption').textContent=s.baselineHistorical?'Earlier project baseline — historical, not a checked version of this draft':'Compare with your first version';$('restore').disabled=!!s.baselineHistorical;$('tool-choice').hidden=n!==5;$('connection-choice').hidden=n!==8;$('reusable').hidden=n!==7;if(typeof refreshProjectKind==='function')refreshProjectKind();$('tool').value=s.tool;$('connection').value=s.connection;$('hint').hidden=n===9;$('smaller').hidden=n===9;$('hint-text').hidden=true;$('feedback').textContent='';$('complete').textContent='Reflect & get my next action';const r=s.reflections[n];$('outcome').value=r.outcome;$('support').value=r.support;$('observed').value=r.observed;$('check-note').value=r.check;$('review-panel').hidden=true;$('finish').hidden=count!==10;$('assistance').textContent=`Hints used: ${s.hints.reduce((a,b)=>a+b,0)}. ${s.hints.some(v=>v===3)?'A worked example was shown: revisit that checkpoint without help.':'Try the next task with less support.'}`;}
document.querySelectorAll('[data-goal]').forEach(b=>b.onclick=()=>{s.goal=b.dataset.goal;document.querySelectorAll('[data-goal]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));});
$('start').onclick=()=>{const p=$('purpose').value.trim();if(!p){$('start-error').textContent='Tell me one small thing you would like to finish. The examples above are a starting point.';$('purpose').focus();return;}s.purpose=p;s.capability=$('capability').value;s.save=$('remember').checked;s.started=true;s.artifact=C.templateFor(s);s.baseline=s.artifact;s.evidence[0]=p;persist();render();if(typeof appNavigate==='function')appNavigate('learn');$('step-title').focus();};
$('evidence').oninput=e=>{s.evidence[s.step]=e.target.value;invalidateAttempt();persist();};$('artifact').oninput=e=>{s.artifact=e.target.value;invalidateAttempt();persist();};$('tool').onchange=e=>{s.tool=e.target.value;invalidateAttempt();persist();};$('connection').onchange=e=>{s.connection=e.target.value;invalidateAttempt();persist();};
function showReview(){const error=C.check(s)||C.reviewCheck(s);if(error){$('feedback').textContent=error;return;}const a=C.advice(s);s.reflections[s.step].reviewed=true;$('review-panel').hidden=false;$('review-why').textContent=a.why;$('review-action').textContent=a.action;$('review-observation').textContent='Your observation: '+s.reflections[s.step].observed;$('continue').textContent=a.verified?'Record self-checked practice & continue':'Move on, keeping this unverified';$('feedback').textContent='';persist();}
$('complete').onclick=showReview;
for(const [id,key] of [['outcome','outcome'],['support','support'],['observed','observed'],['check-note','check']])$(id).oninput=e=>{s.reflections[s.step][key]=e.target.value;invalidateAttempt();persist();};
$('retry').onclick=()=>{$('review-panel').hidden=true;$('feedback').textContent='Stay here and try one smaller change. Update your observation and check when ready.';if(typeof appNavigate==='function')appNavigate('learn/project');$('artifact').focus();};
$('continue').onclick=()=>{if(!s.reflections[s.step].reviewed||C.check(s)||C.reviewCheck(s)){showReview();return;}s.done[s.step]=C.advice(s).verified;if(s.step===1&&!s.done[1])$('feedback').textContent='This attempt stays unverified.';if(s.step===1&&s.done[1]){s.baseline=s.artifact;s.baselineHistorical=false;}if(s.step<9)s.step++;persist();render();$('step-title').focus();if(s.done.every(Boolean))$('feedback').textContent='Your self-reported learning record is ready to export. It is not verified mastery.';};
$('hint').onclick=()=>{$('hint-text').hidden=false;$('hint-text').textContent=C.hint(s);s.hints[s.step]=Math.min(3,s.hints[s.step]+1);invalidateAttempt();persist();};
$('smaller').onclick=()=>{$('hint-text').hidden=false;$('hint-text').textContent=(C.kind(s)==='poster'?'Try only the poster headline or one factual detail.':'Try only one small part of your project.')+' Write what you expect, check what you got, and change just that item. If you are tired, export and pause; there is no streak to lose.';};
$('restore').onclick=()=>{if(s.baselineHistorical)return;if(confirm('Replace your current project with the first version? Your learning notes will stay.')){s.artifact=s.baseline;$('artifact').value=s.artifact;invalidateAttempt();persist();}};
$('pause').onclick=()=>{$('feedback').textContent=pauseMessage();};
$('download-project').onclick=()=>download('my-small-win.txt',s.artifact,'text/plain');$('export').onclick=exportProgress;$('export-finish').onclick=exportProgress;
$('delete').onclick=()=>{
 if(!confirm('Delete this session and saved progress from this browser? Export first if you want to keep it.'))return;
 // Do not discard newer session work until removal of the stored copy is confirmed.
 // A failed/uncertain attempt must not silently re-create a copy via automatic saving.
 lastSavedSnapshot=null;
 try{
  localStorage.removeItem(KEY);
  if(localStorage.getItem(KEY)!==null)throw Error('Saved progress is still present.');
 }catch{
  s.save=false;$('remember').checked=false;
  if(progressImport)progressImport.invalidate('Deletion could not be confirmed. Current work was kept.');
  render();
  $('storage').textContent='Could not confirm removal of saved browser progress. Your current project and notes are kept in this tab, with automatic saving OFF. An older saved record may still return on reload. Export current work before closing; no downloaded files were removed.';
  return;
 }
 if(progressImport)progressImport.deleted();
 s=C.fresh();if(typeof clearPastedDraft==='function')clearPastedDraft();if(typeof clearManualBrief==='function')clearManualBrief();if(typeof resetLabsContext==='function')resetLabsContext();$('purpose').value='';$('remember').checked=false;document.querySelectorAll('[data-goal]').forEach(x=>x.setAttribute('aria-pressed',String(x.dataset.goal==='week')));render();
 $('storage').textContent='This session was cleared and the saved browser copy was checked as removed. Another tab can save its own copy again. Any files you downloaded remain on your device.';
};
progressImport=createProgressImport({
 element:$, document, getState:()=>s, setState:value=>{s=value;},
 valid:value=>C.valid(value), upgrade:value=>C.upgrade(value), confirm:message=>confirm(message),
 render, persist, reviewExposure:incoming=>{
  const current=typeof ResultPath!=='undefined'&&ResultPath.unfinishedTransfer(s)&&!s.resultPath.transferExample;
  const imported=typeof ResultPath!=='undefined'&&ResultPath.unfinishedTransfer(incoming)&&!incoming.resultPath.transferExample;
  if(!current&&!imported)return true;
  if(!confirm('The full import preview reveals earlier drafts, facts and answers. Viewing it counts as example help on '+(current&&imported?'both your current and imported unfinished related tasks':current?'your current unfinished related task':'the imported unfinished related task')+'. This help stays recorded even if you cancel replacement. Review the full record?'))return false;
  for(const state of [current?s:null,imported?incoming:null])if(state){const r=state.resultPath;r.transferHelp=true;r.transferExample=true;r.transferSupport='example';r.transferReviewed=false;}
  if(current){persist();if(typeof refreshResultPath==='function')refreshResultPath();}
  return true;
 }, clearPanels:()=>{
  if(typeof clearPastedDraft==='function')clearPastedDraft();
  if(typeof clearManualBrief==='function')clearManualBrief();
  if(typeof resetLabsContext==='function')resetLabsContext();
  $('remember').checked=false;
 }
});
// Both the optional checkpoint and Keep area use the current authoritative draft.
function downloadChecklist(){
 const report=message=>{for(const id of ['download-kind-note','journey-status']){const el=$(id);if(el)el.textContent=message;}};
 if(!s.started||C.kind(s)!=='checklist')return false;
 const project=s,artifact=s.artifact,result=s.resultPath,resultSnapshot=JSON.stringify(result);
 const current=()=>s===project&&s.artifact===artifact&&C.kind(s)==='checklist'&&s.resultPath===result;
 let html,stale=false;
 try{html=PortableChecklist.build(PortableChecklist.fromArtifact(artifact));}
 catch(error){report((error&&error.message?error.message:'Could not prepare this checklist.')+' Your project remains here unchanged.');return false;}
 if(typeof ResultPath!=='undefined'){
  const choice=ResultPath.reviewFullExport(project,()=>{
   const accepted=confirm('This checklist contains your first project draft. Downloading it during an unfinished related task counts as example help. Continue and record that help? Cancel keeps your work unchanged and makes no download.');
   stale=!current()||JSON.stringify(result)!==resultSnapshot;return accepted&&!stale;
  });
  if(stale||!current()){report('The project changed during confirmation. Nothing was downloaded. Review the current project and try again.');return false;}
  if(!choice.allowed){report('No checklist download requested. Your work is unchanged.');return false;}
  if(choice.changed){persist();if(typeof refreshResultPath==='function')refreshResultPath();}
 }
 if(!current()){report('The project changed before download. Nothing was downloaded. Review the current project and try again.');return false;}
 try{download('my-small-win-checklist.html',html,'text/html');}
 catch(error){report('Could not prepare the checklist download. Your project remains here. Keep this tab open and try again. Any accepted example-help choice stays recorded.');return false;}
 report('Checklist working-copy download requested. Keep it privately and reopen the actual HTML file to check it. Edit and tick items there, then explicitly download an updated copy before closing. No automatic saving or sync; this is not recovery for your full learning record.');return true;
}
$('download-app').onclick=()=>{if(C.kind(s)==='tool'){if(!ToolStarter.valid(s.toolConfig||ToolStarter.defaults)){$('download-kind-note').textContent='Use non-empty option labels and valid non-negative starting numbers before downloading.';const bad=[...document.querySelectorAll('#tool-config input')].find(e=>e.id.startsWith('tool-label')?(!e.value.trim()||e.value.length>80):(!e.value.trim()||!Number.isFinite(Number(e.value))||Number(e.value)<0));if(bad)bad.focus();return;}download('my-cost-comparison-tool.html',ToolStarter.build(s.purpose,s.toolConfig||ToolStarter.defaults),'text/html');return;}if(C.kind(s)!=='checklist'){download('my-reusable-'+C.kind(s)+'-template.txt',s.artifact,'text/plain');return;}downloadChecklist();};
render();

$('import-button').onclick=()=>{progressImport.invalidate('Previous import review canceled.');$('import').click();};
