'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const R=require('./public/result-path.js'),C=require('./public/coach.js'),H=require('./public/handoff.js');
function test({route='learn',text='RETAINED first answer',phase='transfer',complete=false}={}){
 const nodes={},events={},windows={},el=id=>nodes[id]??={value:'',checked:false,disabled:false,textContent:'',hidden:false,addEventListener(t,f){(this.handlers??={})[t]=f;},focus(){},select(){}};
 el('provider').value='chatgpt';el('handoff-mode').value='kickoff';const s=C.fresh();s.started=true;s.purpose='QA';s.artifact='Original draft';s.resultPath=R.fresh();const r=s.resultPath;Object.assign(r,{action:'Try',expected:'Useful',observed:'It worked',check:'Compared source',outcome:'checked',support:'example',use:'Useful',reviewed:true,snapshot:s.artifact,phase,transferTask:'Changed',transferDraft:'New',transferObserved:'Observed',transferCheck:'Checked',transferSupport:'alone',transferOutcome:'checked',transferReviewed:complete});
 const ctx={s,C,ResultPath:R,Handoff:H,$:el,document:{addEventListener:(t,f)=>events[t]=f},window:{addEventListener:(t,f)=>windows[t]=f},location:{href:'https://learn.free4allhub.com/'},URL,navigator:{clipboard:{writeText:async()=>{}}},download(){},persist(){},refreshResultPath(){},currentRoute:()=>route};vm.createContext(ctx);vm.runInContext(fs.readFileSync('public/handoff-ui.js','utf8'),ctx);el('handoff-preview').value=text;return {s,r,el,ctx,events,windows,route(v){route=v;}};
}
for(const event of ['hashchange','click','input']){
 const h=test();h.route('ai/review');if(event==='hashchange')h.windows.hashchange();else h.events[event]();assert.equal(h.r.transferExample,true);assert.equal(h.r.transferHelp,true);assert.equal(h.r.transferReviewed,false);assert.equal(h.r.reviewed,true);assert.equal(h.el('handoff-preview').value,'RETAINED first answer');assert.equal(h.el('handoff-reviewed').checked,false);assert.match(h.el('handoff-status').textContent,/visible coaching preview/);
}
for(const settings of [{route:'ai'},{route:'journey'},{route:'ai/review',text:''},{route:'ai/review',phase:'first'},{route:'ai/review',complete:true}]){
 const h=test(settings);h.windows.hashchange();assert.equal(h.r.transferExample,false);
}
// Initial shell visibility must check an already-built guide without interaction.
{const h=test({route:'ai/review'});vm.runInContext('recordVisibleHandoffHelp()',h.ctx);assert.equal(h.r.transferExample,true);const shell=fs.readFileSync('public/shell.js','utf8');assert.match(shell,/refreshAppShell\(\);if\(typeof recordVisibleHandoffHelp===\'function\'\)recordVisibleHandoffHelp\(\);/);}
console.log('Retained handoff exposure: visible review route/event records help before reuse, preserves prose and first result, hidden/empty/first/completed controls pass.');
