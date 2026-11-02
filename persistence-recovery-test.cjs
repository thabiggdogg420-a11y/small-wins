'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const root=__dirname+'/public/';
function fixture({stored=null,readFails=false,writeFails=false}={}){
 const elements=new Map();let writes=0,route='',confirmations=0,answers=[];
 function el(id){if(!elements.has(id))elements.set(id,{id,hidden:false,value:'',textContent:'',checked:false,children:[],listeners:{},focus(){},setAttribute(){},replaceChildren(){},append(){},addEventListener(t,f){this.listeners[t]=f}});return elements.get(id);}
 const document={getElementById:el,querySelectorAll:()=>[],addEventListener(){},createElement:()=>({click(){}})};
 const ctx=vm.createContext({document,TextEncoder,console,setTimeout,URL:{},Blob,localStorage:{getItem(){if(readFails)throw Error('SecurityError');return stored},setItem(k,v){writes++;if(writeFails)throw Error('QuotaExceededError');stored=v},removeItem(){stored=null}},confirm(){confirmations++;return answers.length?answers.shift():true},appNavigate:r=>route=r});
 for(const file of ['result-path.js','labs.js','coach.js','progress-import.js'])vm.runInContext(fs.readFileSync(root+file,'utf8'),ctx);
 let app=fs.readFileSync(root+'app.js','utf8');const begin=app.indexOf('function render(){'),end=app.indexOf('\ndocument.querySelectorAll',begin);app=app.slice(0,begin)+'function render(){}'+app.slice(end);vm.runInContext(app,ctx);
 // Both real Pause handlers, including the shell's visible progress message.
 const shell=fs.readFileSync(root+'shell.js','utf8').split('\n').find(x=>x.startsWith("$('pause').addEventListener"));vm.runInContext(shell,ctx);
 const run=code=>vm.runInContext(code,ctx),read=()=>JSON.parse(run('JSON.stringify(s)'));
 function pause(expected){const before=writes;el('pause').onclick();assert.match(el('feedback').textContent,expected);el('pause').listeners.click();assert.match(el('storage').textContent,expected);assert.equal(route,'progress');assert.equal(writes,before,'Pause is read-only');}
 async function importRecord(record){const raw=JSON.stringify(record);el('import').files=[{size:Buffer.byteLength(raw),text:async()=>raw}];await el('import').onchange({target:el('import')});el('import-apply').onclick();}
 return {el,run,read,pause,importRecord,answers,set fail(v){writeFails=v},get stored(){return stored},get writes(){return writes},get confirmations(){return confirmations}};
}
(async()=>{
 let t=fixture();t.run("s.started=true;s.save=true;s.purpose='Fictional hobby';s.artifact='Saved A';persist()");const savedA=t.stored;t.pause(/Current progress was saved/);
 t.fail=true;t.run("s.artifact='Newest B';persist()");assert.match(t.el('storage').textContent,/Could not save/);assert.equal(t.read().save,true,'Remember preference remains separate');assert.equal(t.stored,savedA);t.pause(/current progress is NOT saved/);t.pause(/Export progress before closing/);assert.equal(t.stored,savedA);
 // Existing text export remains available and contains the newest session, not A.
 t.run("download=(name,text)=>globalThis.exported=text;exportProgress()");const exported=JSON.parse(t.run('exported'));assert.equal(exported.artifact,'Newest B');assert(!('lastSavedSnapshot' in exported));
 let reloaded=fixture({stored:t.stored});assert.equal(reloaded.read().artifact,'Saved A');reloaded.pause(/Current progress was saved/);
 await reloaded.importRecord(exported);assert.equal(reloaded.read().artifact,'Newest B');assert.equal(reloaded.read().save,false);assert.equal(reloaded.stored,savedA);reloaded.pause(/Session only: export/);
 reloaded.answers.push(false);reloaded.el('remember-import').onclick();assert.equal(reloaded.stored,savedA);assert.equal(reloaded.read().save,false);
 reloaded.fail=true;reloaded.el('remember-import').onclick();assert.equal(reloaded.stored,savedA);reloaded.pause(/current progress is NOT saved/);
 reloaded.fail=false;reloaded.run('persist()');reloaded.pause(/Current progress was saved/);assert.equal(JSON.parse(reloaded.stored).artifact,'Newest B');assert.equal(fixture({stored:reloaded.stored}).read().artifact,'Newest B');
 // A receipt applies to the exact record, never any later unsaved mutation.
 reloaded.run("s.artifact='Unpersisted C'");reloaded.pause(/current progress is NOT saved/);
 t=fixture({readFails:true,writeFails:true});assert.match(t.el('storage').textContent,/storage unavailable/);t.pause(/Session only: export/);t.run("s.save=true;s.artifact='Unavailable storage draft';persist()");t.pause(/current progress is NOT saved/);assert.equal(t.stored,null);
 t=fixture({stored:savedA});t.run("s.save=false;s.artifact='Session only D';persist()");t.pause(/Session only: export/);assert.equal(t.stored,savedA);assert.equal(t.writes,0);
 console.log('PASS: real persistence and both Pause handlers; failed write preserves A, exports/reimports B with consent, successful recovery/reload, startup unavailable, Remember-off, exact-record receipt, read-only Pause. Mock storage/DOM, not rendered UI or learner outcomes.');
})();
