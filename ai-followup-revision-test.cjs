'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const PackCost=require('./public/pack-cost.js'),AICheckpoint=require('./public/ai-checkpoint.js');
function harness(){const nodes={};let saved='',yes=true;function node(id){return nodes[id]??={value:'',checked:false,textContent:'',hidden:false,disabled:false,style:{},handlers:{},addEventListener(t,f){this.handlers[t]=f;},focus(){},select(){},querySelector(){return{focus(){}}},click(){}};}
vm.runInNewContext(fs.readFileSync('public/ai-pack.js','utf8'),{document:{getElementById:node,createElement:()=>({click(){}})},PackCost,AICheckpoint,navigator:{},Blob:class{constructor(parts){saved=parts.join('')}},URL:{createObjectURL:()=> 'blob:test',revokeObjectURL(){}},setTimeout:f=>f(),confirm:()=>yes});
const click=id=>node(id).handlers.click(),input=(id,value,event='input')=>{node(id).value=value;node(id).handlers[event]?.();},approve=()=>{node('followup-reviewed').checked=true;node('followup-reviewed').handlers.change();};
function prepare(){input('answer1','SIMULATED FIRST: A 4.20, B 7.50');input('costA1','4.20');input('costB1','7.50');click('compare1');input('finding','error','change');input('reason','A needs two packs.');click('build-followup');input('answer2','SIMULATED FOLLOW-UP: A 8.40, B 7.50');input('correction-check','Two packs times 4.20 is 8.40.');}
const reviewFinal=()=>{node('final-reviewed').checked=true;node('final-reviewed').handlers.change();};
return {node,click,input,approve,reviewFinal,prepare,saved:()=>saved,setYes:v=>yes=v};}
const answer='SIMULATED FOLLOW-UP: A 8.40, B 7.50',note='Two packs times 4.20 is 8.40.';
for(const [field,value,event] of [['answer1','Reworded first answer','input'],['costA1','8.40','input'],['costB1','7.60','input'],['finding','unsure','change'],['reason','A needs two whole packs for ten items.','input']]){
 const h=harness();h.prepare();h.approve();h.click('continue');assert.equal(h.node('step3').hidden,false);
 h.input(field,value,event);assert.equal(h.node('answer2').value,answer,field+' preserves answer');assert.equal(h.node('correction-check').value,note,field+' preserves note');assert.equal(h.node('followup-reviewed').checked,false);assert.equal(h.node('step3').hidden,true);assert.match(h.node('followup-status').textContent,/kept as drafts/);
 h.click('continue');assert.equal(h.node('step3').hidden,true);h.click('compare1');h.click('build-followup');assert.match(h.node('followup-status').textContent,/Retained draft/);h.click('continue');assert.equal(h.node('step3').hidden,true);h.approve();h.click('continue');assert.equal(h.node('step3').hidden,false);
}
for(const field of ['answer2','correction-check']){const h=harness();h.prepare();h.approve();h.click('continue');const old=h.node(field).value;h.input(field,old+' revised');h.input(field,old);assert.equal(h.node('followup-reviewed').checked,false);assert.equal(h.node('step3').hidden,true);h.click('continue');assert.equal(h.node('step3').hidden,true);h.approve();h.click('continue');assert.equal(h.node('step3').hidden,false);}
{
 const h=harness();h.prepare();h.approve();h.click('build-followup');assert.equal(h.node('followup-reviewed').checked,false,'Repeated rebuild needs review');h.click('continue');assert.equal(h.node('step3').hidden,true);h.approve();h.node('answer2').value='Changed without event';h.click('continue');assert.equal(h.node('step3').hidden,true,'Exact snapshot catches a stale approved answer');
 h.input('answer2','');h.approve();assert.equal(h.node('followup-reviewed').checked,false,'Empty answer cannot be approved');h.input('answer2',answer);h.input('correction-check','');h.approve();assert.equal(h.node('followup-reviewed').checked,false,'Empty note cannot be approved');
}
{
 const h=harness();h.prepare();h.approve();h.click('save-checkpoint');const text=h.saved(),parsed=AICheckpoint.parse(text);assert.equal(parsed.entries.answer2,answer);assert.equal(parsed.entries['correction-check'],note);assert.ok(!text.includes('followup-reviewed'),'Approval never leaves tab');
 h.setYes(false);h.click('restart');assert.equal(h.node('answer2').value,answer,'Cancelled clear preserves draft');assert.equal(h.node('followup-reviewed').checked,true);h.setYes(true);h.click('restart');assert.equal(h.node('answer2').value,'');assert.equal(h.node('correction-check').value,'');assert.equal(h.node('followup-reviewed').checked,false);
 h.node('checkpoint-text').value=text;h.click('restore-checkpoint');assert.equal(h.node('answer2').value,answer);assert.equal(h.node('correction-check').value,note);assert.equal(h.node('followup-reviewed').checked,false);h.click('compare1');h.click('build-followup');h.click('continue');assert.equal(h.node('step3').hidden,true);h.approve();h.click('continue');assert.equal(h.node('step3').hidden,false);
}
{
 const h=harness();h.prepare();h.approve();h.click('continue');
 for(const [id,value] of [['own-prompt','Fictional changed task'],['answer3','SIMULATED CHANGED: A 11.20 B 11.25'],['costA3','11.20'],['costB3','11.25'],['help','own']])h.input(id,value);
 h.click('compare3');h.input('final-check','Checked changed task.');h.reviewFinal();h.click('record');const before=h.saved();assert.ok(before.includes('firstChangedAttempt'));
 h.click('earlier');h.node('followup-reviewed').checked=false;h.node('followup-reviewed').handlers.change();assert.equal(h.node('step3').hidden,true,'Revoking earlier approval hides changed task');h.click('compare3');h.input('final-check','Must not bypass review');h.click('record');assert.equal(h.saved(),before,'Revoked review cannot produce another record');
 h.approve();h.click('continue');h.click('earlier');h.click('build-followup');assert.equal(h.node('step3').hidden,true,'Rebuild hides already-open changed task');h.click('compare3');assert.equal(h.node('final').hidden,true);h.approve();h.click('continue');h.click('compare3');h.input('final-check','Fresh check');h.reviewFinal();h.click('record');assert.equal(JSON.parse(h.saved()).templateOrAnswerHelp,true,'Earlier-answer help stays recorded');
}
// Both actual DOM event paths preserve the draft but never carry its approval.
for(const field of ['own-prompt','answer3','costA3','costB3','help'])for(const event of ['input','change']){
 const h=harness();h.prepare();h.approve();h.click('continue');for(const [id,value]of [['own-prompt','Fictional request'],['answer3','SIMULATED: A 11.20 B 11.25'],['costA3','11.20'],['costB3','11.25'],['help','own']])h.input(id,value);
 h.click('compare3');h.input('final-check','Old changed-task note');h.reviewFinal();h.node(field).handlers[event]({type:event,target:h.node(field)});assert.equal(h.node('final-check').value,'Old changed-task note',field+'/'+event+' preserves final note draft');assert.equal(h.node('final-reviewed').checked,false);h.click('compare3');assert.equal(h.node('record').disabled,true,'Fresh final note review required');h.reviewFinal();assert.equal(h.node('record').disabled,false);
}
const html=fs.readFileSync('public/ai-pack.html','utf8');assert.match(html,/<input id="followup-reviewed" type="checkbox">/);assert.equal((html.match(/id="followup-reviewed"/g)||[]).length,1);assert.match(html,/id="followup-status" role="status"/);assert.doesNotMatch(fs.readFileSync('public/ai-checkpoint.js','utf8'),/followup-reviewed/);
console.log('Follow-up revision: all upstream drafts retained; fresh exact review after edits/revert/rebuild/restore; unchanged checkpoint schema; cancel and clear passed');
