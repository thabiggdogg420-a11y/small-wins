'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const PackCost=require('./public/pack-cost.js'),AICheckpoint=require('./public/ai-checkpoint.js');
function harness(){
  const nodes={},downloads=[];let yes=true;
  const node=id=>nodes[id]??={value:'',checked:false,textContent:'',hidden:false,disabled:false,style:{},handlers:{},addEventListener(t,f){this.handlers[t]=f;},focus(){},select(){},querySelector(){return {focus(){}};}};
  for(const id of ['step2','step3','followup-panel','final'])node(id).hidden=true;
  vm.runInNewContext(fs.readFileSync('public/ai-pack.js','utf8'),{document:{getElementById:node,createElement:()=>({click(){}})},PackCost,AICheckpoint,navigator:{},Blob:class{constructor(parts){downloads.push(parts.join(''));}},URL:{createObjectURL:()=> 'blob:qa',revokeObjectURL(){}},setTimeout:f=>f(),confirm:()=>yes,Error});
  const fire=(id,type)=>node(id).handlers[type]({target:node(id),type});
  return {node,downloads,click:id=>fire(id,'click'),input(id,value,type='input'){if(id==='checkpoint-text')node('recovery').open=true;node(id).value=value;return fire(id,type);},review(id){node(id).checked=true;fire(id,'change');},yes:value=>yes=value,choose(file){node('recovery').open=true;node('checkpoint-file').files=file?[file]:[];return fire('checkpoint-file','change');}};
}
function guided(h,enter=true){
  for(const [id,value] of Object.entries({answer1:'SIMULATED: A 4.20, B 7.50',costA1:'4.20',costB1:'7.50'}))h.input(id,value);
  h.click('compare1');h.input('finding','error','change');h.input('reason','A needs two whole packs.');h.click('build-followup');h.input('answer2','SIMULATED: A 8.40, B 7.50');h.input('correction-check','2 x 4.20 = 8.40');h.review('followup-reviewed');if(enter)h.click('continue');
}
function resume(h,text){h.input('checkpoint-text',text);h.click('restore-checkpoint');}
function recheck(h){h.click('compare1');h.click('build-followup');h.review('followup-reviewed');h.click('continue');}
function finish(h){for(const [id,value] of Object.entries({'own-prompt':'Compare 14 items: A 8 for 5.60, B 5 for 3.75.',answer3:'SIMULATED: A 11.20, B 11.25',costA3:'11.20',costB3:'11.25',help:'own'}))h.input(id,value);h.click('compare3');h.input('final-check','2 x 5.60 = 11.20 and 3 x 3.75 = 11.25.');h.review('final-reviewed');assert.equal(h.node('record').disabled,false);h.click('record');return JSON.parse(h.downloads.at(-1));}
function save(h){h.click('save-checkpoint');return h.downloads.at(-1);}
function assisted(record){assert.equal(record.templateOrAnswerHelp,true);assert.equal(record.latestChangedAttempt.help,'help');}
const seed=harness();guided(seed);seed.input('own-prompt','Unfinished changed-task prompt');const checkpoint=save(seed),saved=JSON.parse(checkpoint);
assert.equal(saved.version,1);assert.equal(saved.firstChangedAttempt,null);assert.equal(saved.usedHelp,false);

// A genuine early restore and an uninterrupted first attempt are not inflated.
{
  const early=harness();guided(early,false);const fresh=harness();resume(fresh,save(early));assert.equal(fresh.node('help').value,'');recheck(fresh);assert.equal(finish(fresh).templateOrAnswerHelp,false);
  const uninterrupted=harness();guided(uninterrupted);assert.equal(finish(uninterrupted).templateOrAnswerHelp,false);
}
// Legacy version-1 drafts trigger honest help on resume without losing prose.
for(const field of ['own-prompt','answer3','costA3','costB3','help','final-check']){
  const data=JSON.parse(checkpoint);for(const id of ['own-prompt','answer3','costA3','costB3','help','final-check'])data.entries[id]='';data.entries[field]=field==='help'?'own':'Retained draft';
  const h=harness();resume(h,JSON.stringify(data));if(field!=='help')assert.equal(h.node(field).value,'Retained draft');assert.equal(h.node('help').value,'help');assert.equal(h.node('record').disabled,true);assert.equal(h.node('followup-reviewed').checked,false);recheck(h);const record=finish(h);assisted(record);assert.equal(record.firstChangedAttempt.help,'help');assert.equal(record.firstChangedAttempt.usedHelp,true);
}
// Pasted exposure is recorded at preview, even before/canceling replacement.
for(const cancel of [false,true]){
  const h=harness();guided(h);h.input('own-prompt','Keep this unfinished draft');h.input('checkpoint-text',checkpoint);assert.equal(h.node('own-prompt').value,'Keep this unfinished draft');assert.equal(h.node('help').value,'help');assert.match(h.node('checkpoint-status').textContent,/even if you cancel/);
  if(cancel){h.yes(false);h.click('restore-checkpoint');assert.equal(h.node('own-prompt').value,'Keep this unfinished draft');}
  assisted(finish(h));
}
// Current-tab stage is known even before its first typed character.
{
  const h=harness();guided(h);h.input('checkpoint-text',checkpoint);assisted(finish(h));
}
// A preview staged before transfer is hidden, retained, and only counted if reopened.
for(const reopen of [false,true]){
  const h=harness();guided(h,false);h.node('recovery').open=true;h.input('checkpoint-text',checkpoint);assert.equal(h.node('help').value,'');h.click('continue');assert.equal(h.node('recovery').open,false);assert.equal(h.node('checkpoint-text').value,checkpoint);
  if(reopen){h.node('recovery').open=true;h.node('recovery').handlers.toggle();assert.match(h.node('checkpoint-status').textContent,/reopened during/);assisted(finish(h));}
  else assert.equal(finish(h).templateOrAnswerHelp,false);
}
// Preserved first-attempt content is still answer-bearing if current fields are empty.
{
  const old=harness();guided(old);const first=finish(old);const data=JSON.parse(save(old));for(const key of Object.keys(data.entries))data.entries[key]='';assert.deepEqual(data.firstChangedAttempt,first.firstChangedAttempt);
  const h=harness();guided(h);h.input('checkpoint-text',JSON.stringify(data));h.yes(false);h.click('restore-checkpoint');assisted(finish(h));
}
// Invalid/empty previews have not displayed a valid worked checkpoint.
for(const text of ['','{broken']){
  const h=harness();guided(h);h.input('checkpoint-text',text);assert.equal(finish(h).templateOrAnswerHelp,false);
}
// Existing first submissions stay immutable; new exposure invalidates final review.
{
  const h=harness();guided(h);const first=finish(h);h.input('checkpoint-text',checkpoint);assert.equal(h.node('record').disabled,true);assert.equal(h.node('final-reviewed').checked,false);const count=h.downloads.length;h.click('record');assert.equal(h.downloads.length,count);const later=finish(h);assisted(later);assert.deepEqual(later.firstChangedAttempt,first.firstChangedAttempt);
  const fresh=harness();resume(fresh,save(h));recheck(fresh);const restored=finish(fresh);assisted(restored);assert.deepEqual(restored.firstChangedAttempt,first.firstChangedAttempt);
}
// Clearing the lesson removes the tab's help history and entries explicitly.
{
  const h=harness();guided(h);h.input('checkpoint-text',checkpoint);h.click('restart');guided(h);assert.equal(finish(h).templateOrAnswerHelp,false);
}
(async()=>{
  // Real asynchronous file-read handler: mark only when valid content is shown.
  for(const cancel of [false,true]){
    const h=harness();guided(h);h.input('own-prompt','File-preview draft');await h.choose({size:checkpoint.length,text:async()=>checkpoint});assert.equal(h.node('checkpoint-text').value,checkpoint);assert.equal(h.node('help').value,'help');assert.match(h.node('checkpoint-status').textContent,/draft text unchanged/);if(cancel){h.yes(false);h.click('restore-checkpoint');}assert.equal(h.node('own-prompt').value,'File-preview draft');assisted(finish(h));
  }
  // A delayed valid file arriving in a closed disclosure is not yet exposure.
  for(const closeByContinue of [false,true])for(const reopen of [false,true]){
    const h=harness();guided(h,!closeByContinue);let resolve;const pending=h.choose({size:checkpoint.length,text:()=>new Promise(r=>resolve=r)});
    if(closeByContinue)h.click('continue');else h.node('recovery').open=false;
    resolve(checkpoint);await pending;assert.equal(h.node('recovery').open,false);assert.equal(h.node('checkpoint-text').value,checkpoint);assert.equal(h.node('help').value,'');
    if(reopen){h.node('recovery').open=true;h.node('recovery').handlers.toggle();assisted(finish(h));}
    else assert.equal(finish(h).templateOrAnswerHelp,false);
  }
  // Stale read must neither show the file nor record help for unseen content.
  {
    const h=harness();guided(h);let resolve;const pending=h.choose({size:checkpoint.length,text:()=>new Promise(r=>resolve=r)});h.input('checkpoint-text','');resolve(checkpoint);await pending;assert.equal(h.node('checkpoint-text').value,'');assert.equal(finish(h).templateOrAnswerHelp,false);
  }
  for(const file of [null,{size:600001,text:async()=>checkpoint},{size:4,text:async()=>'{bad'}]){
    const h=harness();guided(h);await h.choose(file);assert.equal(finish(h).templateOrAnswerHelp,false);
  }
  console.log('Resume help: version-1 draft restore, file/paste preview, cancel/no-restore, stale reads, early controls, immutable first attempts, fresh review and clear passed');
})().catch(error=>{console.error(error);process.exitCode=1;});
