'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const root=__dirname+'/public/';
function fixture(){
 const elements=new Map(),listeners={};let confirmations=[],answers=[],clears=0,stored='original saved record';
 function el(id){if(!elements.has(id))elements.set(id,{id,hidden:false,value:'',textContent:'',checked:false,children:[],focus(){},setAttribute(){},replaceChildren(){},append(){}});return elements.get(id);}
 const document={getElementById:el,querySelectorAll:()=>[],addEventListener:(type,fn)=>listeners[type]=fn,createElement:()=>({click(){}})};
 const context=vm.createContext({document,TextEncoder,console,setTimeout,URL:{},Blob,localStorage:{getItem:()=>null,setItem:(k,v)=>stored=v,removeItem:()=>stored=null},confirm:message=>{confirmations.push(message);return answers.length?answers.shift():true;},clearManualBrief:()=>clears++,clearPastedDraft:()=>clears++,resetLabsContext:()=>clears++});
 for(const file of ['result-path.js','labs.js','coach.js','progress-import.js'])vm.runInContext(fs.readFileSync(root+file,'utf8'),context);
 // Execute all real app wiring and handlers; replace only visual rendering.
 let app=fs.readFileSync(root+'app.js','utf8');
 const begin=app.indexOf('function render(){'),end=app.indexOf("\ndocument.querySelectorAll",begin);
 app=app.slice(0,begin)+'function render(){}'+app.slice(end);
 vm.runInContext(app,context);
 const read=()=>JSON.parse(vm.runInContext('JSON.stringify(s)',context));
 function record(purpose='Imported goal'){return {...read(),started:true,purpose,artifact:'A harmless draft',baseline:'Old draft',save:true};}
 function file(value,opts={}){const raw=typeof value==='string'?value:JSON.stringify(value);return {size:Buffer.byteLength(raw),text:async()=>raw,...opts};}
 async function select(f){el('import').files=[f];return el('import').onchange({target:el('import')});}
 return {el,context,read,record,file,select,fire:(type,id)=>listeners[type]({type,target:el(id)}),confirmations,answers,get stored(){return stored},get clears(){return clears}};
}
function deferred(){let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b});return {promise,resolve,reject};}
(async()=>{
 let t=fixture(),before=t.read();await t.select(t.file(t.record()));
 assert.deepEqual(t.read(),before);assert.equal(t.stored,'original saved record');
 assert.equal(t.el('import-review').hidden,false);assert.match(t.el('import-preview').value,/A harmless draft/);
 t.el('import-apply').onclick();assert.equal(t.read().purpose,'Imported goal');assert.equal(t.read().save,false);assert.equal(t.stored,'original saved record');assert.equal(t.clears,3);
 assert.equal(t.el('remember').checked,false);
 t.answers.push(false);t.el('remember-import').onclick();assert.equal(t.read().save,false);assert.equal(t.stored,'original saved record');
 t.el('remember-import').onclick();assert.equal(t.read().save,true);assert.equal(JSON.parse(t.stored).purpose,'Imported goal');
 for(const bad of ['{','null','[]','{}',JSON.stringify({...t.record(),step:99}),JSON.stringify({...t.record(),sourceBasis:{origin:'manual'}}),'{"__proto__":{},"version":1}',JSON.stringify({...t.record(),junk:'x'.repeat(200001)}),JSON.stringify({...t.record(),junk:[[[[[[[[[[[[[[[[[[[[[[[]]]]]]]]]]]]]]]]]]]]]]]})]){
  t=fixture();before=t.read();await t.select(t.file(bad));assert.deepEqual(t.read(),before);assert.equal(t.stored,'original saved record');assert.equal(t.el('import-review').hidden,true);
 }
 for(const size of [0,-1,1000001,NaN,Infinity]){t=fixture();let reads=0;await t.select(t.file(t.record(),{size,text:()=>{reads++;return Promise.resolve('{}')}}));assert.equal(reads,0);}
 t=fixture();await t.select(t.file('x'.repeat(1000001),{size:5}));assert.equal(t.el('import-review').hidden,true);
 // Newer file wins even when older completes last.
 t=fixture();let d=deferred(),p=t.select(t.file(t.record('old'),{text:()=>d.promise}));
 await t.select(t.file(t.record('new')));d.resolve(JSON.stringify(t.record('old')));await p;
 t.el('import-apply').onclick();assert.equal(t.read().purpose,'new');
 // Any edit, including change-back, invalidates both reading and reviewed records.
 for(const phase of ['reading','review'])for(const event of ['input','change','click']){
  t=fixture();d=deferred();p=t.select(t.file(t.record(),{text:()=>d.promise}));
  if(phase==='review'){d.resolve(JSON.stringify(t.record()));await p;}
  t.fire(event,'artifact');
  if(phase==='reading'){d.resolve(JSON.stringify(t.record()));await p;}
  t.el('import-apply').onclick();assert.equal(t.read().started,false);assert.equal(t.clears,0);
 }
 // Unsignalled state changes also fail snapshot check.
 t=fixture();await t.select(t.file(t.record()));vm.runInContext("s.purpose='new work'",t.context);t.el('import-apply').onclick();assert.equal(t.read().purpose,'new work');
 // Late completion cannot resurrect after real Delete handler.
 t=fixture();d=deferred();p=t.select(t.file(t.record(),{text:()=>d.promise}));
 t.el('delete').onclick();d.resolve(JSON.stringify(t.record()));await p;t.el('import-apply').onclick();assert.equal(t.read().started,false);assert.equal(t.stored,null);
 // Review cancel, confirmation cancel, canceled file chooser, read rejection.
 for(const mode of ['cancel','confirm','empty','reject']){
  t=fixture();before=t.read();
  if(mode==='reject')await t.select(t.file(t.record(),{text:async()=>{throw Error('read')}}));
  else {await t.select(t.file(t.record()));if(mode==='cancel')t.el('import-cancel').onclick();if(mode==='confirm'){t.answers.push(false);t.el('import-apply').onclick();}if(mode==='empty')await t.select(undefined);}
  t.el('import-apply').onclick();assert.deepEqual(t.read(),before);assert.equal(t.clears,0);assert.equal(t.stored,'original saved record');
 }
 // Remember-on-start after importing an unstarted file still asks overwrite consent.
 t=fixture();await t.select(t.file({...t.record(),started:false}));t.el('import-apply').onclick();
 t.el('purpose').value='New goal';t.el('capability').value='new';t.el('remember').checked=true;t.answers.push(false);t.el('start').onclick();
 assert.equal(t.read().save,false);assert.equal(t.stored,'original saved record');
 // Hostile enum strings cannot create invalid starter objects.
 for(const key of ['goal','capability','tool','connection']){
  t=fixture();await t.select(t.file({...t.record(),[key]:'__proto__'}));assert.equal(t.el('import-review').hidden,true);
 }
 // Full preview is answer exposure, with explicit consent and no credit.
 t=fixture();let valueForTransfer=t.record();valueForTransfer.resultPath=vm.runInContext('ResultPath.fresh()',t.context);
 valueForTransfer.resultPath.phase='transfer';
 t.answers.push(false);await t.select(t.file(valueForTransfer));assert.equal(t.el('import-review').hidden,true);assert.equal(t.read().started,false);
 await t.select(t.file(valueForTransfer));assert.match(t.confirmations.at(-1),/example help/);
 t.el('import-apply').onclick();assert.equal(t.read().resultPath.transferExample,true);assert.equal(t.read().resultPath.transferReviewed,false);
 // Existing active transfer records disclosed help, even if replacement is canceled.
 t=fixture();vm.runInContext("s.started=true;s.resultPath=ResultPath.fresh();s.resultPath.phase='transfer';",t.context);
 await t.select(t.file(t.record()));t.el('import-cancel').onclick();
 assert.equal(t.read().resultPath.transferExample,true);assert.equal(t.read().resultPath.transferReviewed,false);
 assert.equal(t.stored,'original saved record');
 // Non-mutating clicks inside the preview should not dismiss it.
 t=fixture();await t.select(t.file(t.record()));t.el('import-review').contains=e=>e===t.el('import-summary');
 t.fire('click','import-summary');assert.equal(t.el('import-review').hidden,false);
 t.el('import').oncancel();assert.equal(t.el('import-review').hidden,true);
 // Source/help/history and the complete exported payload survive round trip.
 t=fixture();let value=t.record();value.resultPath=vm.runInContext('ResultPath.fresh()',t.context);value.resultPath.workedExampleUsed=true;
 value.sourceBasis={kind:'checklist',origin:'manual',manualFacts:'Bring paper',manualUnknowns:'Time',facts:'FACTS I SUPPLIED\nBring paper\n\nDETAILS STILL UNKNOWN\nTime',request:'Pack one item'};
 value.resultHistory=[];
 await t.select(t.file(value));t.el('import-apply').onclick();assert.deepEqual(t.read().sourceBasis,value.sourceBasis);assert.equal(t.read().resultPath.workedExampleUsed,true);
 console.log('PASS actual app import/recovery handlers: preservation, consent, bounds, hostile input, stale reads, change-back, Delete, cancel, source/help round trip');
})().catch(e=>{console.error(e);process.exitCode=1});
