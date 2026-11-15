'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),N=require('./public/notice-actions.js'),C=require('./public/notice-checkpoint.js');
let captured='',yes=true;
function node(tag='div'){return {tag,value:'',checked:false,hidden:false,disabled:false,textContent:'',children:[],handlers:{},append(x){this.children.push(x)},replaceChildren(){this.children=[]},addEventListener(k,f){this.handlers[k]=f},focus(){},click(){},remove(){},querySelector(){return null}};}
const nodes={},$=id=>nodes[id]??=node(),events={};
const ctx={document:{getElementById:$,createElement:node,addEventListener:(e,f)=>events[e]=f},NoticeActions:N,NoticeCheckpoint:C,confirm:()=>yes,navigator:{clipboard:{writeText:async()=>{}}},Blob:class{constructor(p){captured=p.join('')}},URL:{createObjectURL:()=> 'blob:test',revokeObjectURL(){}},setTimeout:f=>f()};
vm.runInNewContext(fs.readFileSync('public/notice-actions-ui.js','utf8'),ctx);
const click=id=>$(id).handlers.click(),change=id=>$(id).handlers.change(),input=id=>$(id).handlers.input();
const approve=()=>{$('followup-reviewed').checked=true;change('followup-reviewed');};
const final=()=>{click('review');$('final-check').value='SIMULATED: corrected jar count, fee remains unknown.';input('final-check');$('final-reviewed').checked=true;change('final-reviewed');};
(async()=>{
click('sample');$('safe').checked=true;click('prepare');$('prompt-reviewed').checked=true;change('prompt-reviewed');$('answer').value='SIMULATED first answer: bring two jars, fee is 5.';input('answer');click('inspect');
const fields=$('items').children[0].children.filter(x=>x.tag==='label').map(x=>x.children[0]);for(const [i,v]of ['stated','Bring one jar','Bring one empty jar.','Original says one, not two.'].entries())fields[i].value=v;
// The existing original-only route remains available.
final();assert.equal($('download').disabled,false);click('download');assert.match(captured,/No optional follow-up reply recorded/);
$('issue').value='The answer invented two jars and a fee.';input('issue');click('followup');assert.equal($('followup-reply').hidden,false);assert.equal($('followup-text').value,N.followup($('issue').value));assert.equal($('download').disabled,true);
approve();assert.equal($('followup-reviewed').checked,false);final();assert.equal($('download').disabled,true);assert.match($('review-status').textContent,/optional follow-up/);
$('followup-answer').value='SIMULATED revised answer: one empty jar; no fee stated.';input('followup-answer');$('followup-check').value='SIMULATED: one jar matches quote. Fee is unknown, not zero.';input('followup-check');approve();final();assert.equal($('download').disabled,false);click('download');for(const t of ['SIMULATED first answer','SIMULATED revised answer','MY FOLLOW-UP CHECK','Fee is unknown, not zero','authorship unverified'])assert(captured.includes(t),t);
const originalResponse=$('followup-answer').value,originalCheck=$('followup-check').value;
// Every relevant edit-and-revert revokes approval without erasing drafts.
for(const id of ['issue','answer','prompt','source','followup-answer','followup-check']){
const old=$(id).value;$(id).value+=' edit';input(id);$(id).value=old;input(id);assert.equal($('followup-reviewed').checked,false,id);assert.equal($('download').disabled,true,id);assert.equal($('followup-answer').value,originalResponse);assert.equal($('followup-check').value,originalCheck);
$('safe').checked=true;change('safe');$('prompt-reviewed').checked=true;change('prompt-reviewed');click('inspect');approve();final();assert.equal($('download').disabled,false,id);
}
// Changed issue/context cannot approve an old prompt; rebuild keeps drafts but does not approve them.
$('issue').value+=' What about deadline?';input('issue');approve();assert.equal($('followup-reviewed').checked,false);click('followup');assert.equal($('followup-answer').value,originalResponse);assert.equal($('followup-check').value,originalCheck);assert.equal($('followup-reviewed').checked,false);approve();final();assert.equal($('download').disabled,false);
click('followup');assert.equal($('download').disabled,true);approve();final();
// Export checks exact snapshots even if mutation emits no event.
$('followup-answer').value+=' stale';click('download');assert.equal($('download').disabled,true);$('followup-answer').value=originalResponse;input('followup-answer');approve();final();
// New private checkpoint carries drafts, no approvals; restore requires all reviews again.
$('checkpoint-save-approved').checked=true;change('checkpoint-save-approved');click('checkpoint-save');const saved=captured,parsed=C.parse(saved);assert.equal(JSON.parse(saved).version,2);assert.equal(parsed.followup.answer,originalResponse);assert.equal(parsed.followup.check,originalCheck);assert.equal(parsed.followup.context.answer,$('answer').value);assert.equal('reviewed' in parsed.followup,false);
$('checkpoint-file').files=[{size:saved.length,text:async()=>saved}];await change('checkpoint-file');yes=false;click('checkpoint-apply');assert.equal($('followup-reviewed').checked,true);yes=true;click('checkpoint-apply');assert.equal($('followup-answer').value,originalResponse);assert.equal($('followup-check').value,originalCheck);assert.equal($('followup-reviewed').checked,false);assert.equal($('safe').checked,false);assert.equal($('download').disabled,true);$('safe').checked=true;change('safe');$('prompt-reviewed').checked=true;change('prompt-reviewed');click('inspect');final();assert.equal($('download').disabled,true);approve();final();assert.equal($('download').disabled,false);
// Pending file and download consent revoked by preparing a new prompt, including repeated same prompt.
$('checkpoint-file').files=[{size:saved.length,text:async()=>saved}];await change('checkpoint-file');$('checkpoint-save-approved').checked=true;change('checkpoint-save-approved');click('followup');assert.equal($('checkpoint-save-approved').checked,false);assert.equal($('checkpoint-review').hidden,true);approve();final();
// Cancel removal retains full reviewed work. Confirm removes only optional follow-up.
yes=false;click('remove-followup');assert.equal($('followup-answer').value,originalResponse);assert.equal($('download').disabled,false);yes=true;click('remove-followup');assert.equal($('followup-answer').value,'');assert.match($('answer').value,/first answer/);assert.equal($('items').children.length,1);final();click('download');assert.doesNotMatch(captured,/SIMULATED revised answer/);assert.match(captured,/No optional follow-up reply recorded/);
// v1 remains accepted with no invented follow-up. v2 rejects missing/unknown/malformed fields.
const legacy={...parsed};delete legacy.followup;assert.deepEqual(C.parse(C.serialize(legacy)),legacy);assert.equal(JSON.parse(C.serialize(legacy)).version,1);
for(const invalid of [{...parsed,followup:{...parsed.followup,approved:true}},{...parsed,followup:{...parsed.followup,answer:'x'.repeat(16001)}},{...parsed,followup:{...parsed.followup,context:{...parsed.followup.context,approved:true}}}])assert.throws(()=>C.serialize(invalid));
assert.throws(()=>C.parse(JSON.stringify({format:'learn4free-notice-work',version:2,work:legacy})));assert.throws(()=>C.parse(JSON.stringify({format:'learn4free-notice-work',version:1,work:parsed})));
// Literal untrusted strings roundtrip without HTML evaluation.
const literal={...parsed,followup:{...parsed.followup,answer:'<script>malicious()</script>'}};assert.equal(C.parse(C.serialize(literal)).followup.answer,literal.followup.answer);
// Clear cancellation retains recovered follow-up, confirmed clear removes it.
$('checkpoint-file').files=[{size:saved.length,text:async()=>saved}];await change('checkpoint-file');click('checkpoint-apply');yes=false;click('clear');assert.equal($('followup-answer').value,originalResponse);yes=true;click('clear');assert.equal($('followup-answer').value,'');assert.equal($('followup-check').value,'');assert.equal($('followup-reply').hidden,true);
console.log('PASS notice follow-up: complete original/revised record, exact-context review, retention, invalidation, original-only fallback, v1/v2 checkpoints, cancellation and clear');
})().catch(e=>{console.error(e);process.exitCode=1});
