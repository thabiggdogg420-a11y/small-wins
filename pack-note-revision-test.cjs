'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const PackCost=require('./public/pack-cost.js'),PackAI=require('./public/pack-ai.js');
const base={unit:'kg',need:'3',aSize:'0.5',aPrice:'1.20',bSize:'2',bPrice:'4.50',prediction:'A costs less'};
let consent=false,files=[];const nodes={};const n=id=>nodes[id]??={value:'',checked:false,hidden:false,disabled:false,textContent:'',handlers:{},addEventListener(t,f){this.handlers[t]=f;},replaceChildren(){},append(){},focus(){},reset(){Object.keys(base).forEach(k=>n(k).value='');}};
vm.runInNewContext(fs.readFileSync('public/pack-cost-ui.js','utf8'),{document:{getElementById:n,createElement:()=>({click(){}})},PackCost,PackAI,confirm:()=>consent,Blob:class{constructor(p){files.push(p.join(''));}},URL:{createObjectURL:()=> 'blob:qa',revokeObjectURL(){}},setTimeout:f=>f()});
const click=id=>n(id).handlers.click(),edit=(id,v)=>{n(id).value=v;n(id).handlers.input();},calc=()=>n('comparison').handlers.submit({preventDefault(){}}),approve=()=>{n('check-review').checked=true;n('check-review').handlers.change();};
const note='Six packs at 1.20 = 7.20. Delivery remains unknown.';
const retained=()=>{assert.equal(n('check').value,note);assert.equal(n('check-review').checked,false);assert.equal(n('download').disabled,true);};
const blocked=()=>{const count=files.length;click('download');assert.equal(files.length,count);assert.equal(n('check').value,note);};
const setup=()=>{Object.entries(base).forEach(([k,v])=>n(k).value=v);calc();consent=true;click('ai-prepare');edit('ai-answer','FICTIONAL QA: totals A 7.20, B 9.00');edit('ai-a','7.20');edit('ai-b','9.00');click('ai-check');edit('check',note);approve();};
setup();click('download');assert.match(files.at(-1),/Optional AI-assisted/);assert.match(files.at(-1),/Delivery remains unknown/);
click('ai-check');retained();blocked();approve();click('download');assert.match(files.at(-1),/Exact prompt:/);
calc();retained();blocked();assert.equal(n('ai-panel').hidden,false);click('ai-check');retained();approve();
// Every ordinary edit and change-back cancels approval, not prose.
for(const k of Object.keys(base)){setup();const old=n(k).value;edit(k,k==='unit'?'items':k==='prediction'?'B costs less':'4');retained();edit(k,old);retained();calc();click('ai-check');assert.match(n('ai-feedback').textContent,/Prepare a new prompt/);approve();click('download');assert.match(files.at(-1),/No checked AI-answer/);assert.doesNotMatch(files.at(-1),/Pasted answer:/);}
for(const k of ['ai-answer','ai-a','ai-b']){setup();const old=n(k).value;edit(k,'changed');retained();edit(k,old);retained();blocked();click('ai-check');retained();approve();click('download');assert.match(files.at(-1),/Pasted answer:/);}
setup();edit('check',note+' revised');assert.equal(n('download').disabled,true);edit('check',note);retained();blocked();approve();n('check-review').checked=false;n('check-review').handlers.change();retained();
// Export checks exact fields even without delivered DOM events.
for(const k of [...Object.keys(base),'check','ai-answer','ai-a','ai-b','ai-prompt']){setup();const count=files.length;n(k).value+='X';click('download');assert.equal(files.length,count,k);assert.equal(n('download').disabled,true);}
// Canceled destructive operations leave all observable state, including approval, alone.
for(const action of ['reset','example','ai-prepare']){setup();consent=false;const before=JSON.stringify(nodes,(_,v)=>typeof v==='function'?undefined:v);click(action);assert.equal(JSON.stringify(nodes,(_,v)=>typeof v==='function'?undefined:v),before,action);click('download');assert.match(files.at(-1),/Pasted answer:/);}
setup();consent=true;click('ai-prepare');retained();assert.equal(n('ai-answer').value,'');blocked();approve();click('download');assert.match(files.at(-1),/No checked AI-answer/);
for(const action of ['reset','example']){setup();consent=true;click(action);assert.equal(n('check').value,'');assert.equal(n('ai-answer').value,'');assert.equal(n('ai-prompt').value,'');assert.equal(n('download').disabled,true);}
// Claim-only drafts also require replacement consent; no stale pairing with a new prompt.
setup();edit('ai-answer','');edit('need','4');calc();consent=false;click('ai-prepare');assert.equal(n('ai-a').value,'7.20');assert.match(n('ai-prompt').value,/Quantity needed: 3/);click('ai-check');assert.match(n('ai-feedback').textContent,/Prepare a new prompt/);consent=true;click('ai-prepare');assert.equal(n('ai-a').value,'');assert.match(n('ai-prompt').value,/Quantity needed: 4/);retained();
setup();Object.keys(base).forEach(k=>n(k).value='');consent=false;click('example');assert.equal(n('check').value,note);assert.equal(n('need').value,'');consent=true;click('example');assert.equal(n('check').value,'');assert.equal(n('need').value,'10');
console.log('PASS real-offer retained notes, exact fresh review, repeated checks/calculation, all edits/reverts, stale export, calculator-only distinction, prompt identity, cancellation and explicit replacement (actual production handlers; fictional QA only)');
