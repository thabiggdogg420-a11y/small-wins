'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function fixture(){
 const els={},downloads=[],questions=[],answers=[];const el=id=>els[id]??={id,value:'',checked:false,textContent:'',hidden:false,children:[],focus(){},replaceChildren(){},append(){},setAttribute(){}};
 const ctx=vm.createContext({document:{getElementById:el,querySelectorAll:()=>[],addEventListener(){},createElement:()=>({click(){}})},TextEncoder,console,URL:{},Blob,setTimeout,localStorage:{getItem:()=>null,setItem(){},removeItem(){}},confirm(message){questions.push(message);return answers.length?answers.shift():true;}});
 for(const f of ['result-path.js','labs.js','coach.js','progress-import.js'])vm.runInContext(fs.readFileSync('public/'+f,'utf8'),ctx);
 let app=fs.readFileSync('public/app.js','utf8');const a=app.indexOf('function render(){'),b=app.indexOf('\ndocument.querySelectorAll',a);app=app.slice(0,a)+'function render(){}'+app.slice(b);vm.runInContext(app,ctx);ctx.saveDownload=(name,text,type)=>downloads.push({name,text,type});vm.runInContext('download=saveDownload;s.started=true;s.purpose="QA project";s.artifact="A useful draft";s.resultPath=ResultPath.fresh();',ctx);
 return {ctx,el,downloads,answers,questions,run:s=>vm.runInContext(s,ctx),read:()=>JSON.parse(vm.runInContext('JSON.stringify(s)',ctx)),async select(text){el('import').files=[{size:Buffer.byteLength(text),text:async()=>text}];await el('import').onchange({target:el('import')});}};
}
(async()=>{
 const good=fixture();good.run('exportProgress()');assert.equal(good.downloads.length,1);assert.equal(good.downloads[0].name,'small-wins-learning-record.json');const restored=fixture();await restored.select(good.downloads[0].text);assert.equal(restored.el('import-review').hidden,false);restored.el('import-apply').onclick();assert.equal(restored.read().artifact,'A useful draft');assert.equal(restored.read().save,false);
 for(const mutate of ['s.artifact="x".repeat(200001)','s.evidence=Array(10).fill("€".repeat(40000))','s.resultPath.snapshot="x".repeat(12001)']){
  const h=fixture();h.run(mutate);const before=h.read();h.answers.push(false);h.run('exportProgress()');assert.equal(h.downloads.length,0);assert.deepEqual(h.read(),before);assert.match(h.questions.at(-1),/CANNOT be imported/);h.answers.push(true);h.run('exportProgress()');assert.equal(h.downloads.at(-1).name,'small-wins-archive-not-importable.txt');assert.match(h.downloads.at(-1).text,/ARCHIVAL COPY — NOT IMPORTABLE/);assert.deepEqual(h.read(),before);assert.match(h.el('storage').textContent,/cannot restore/);
 }
 // Exact byte/string/depth/node bounds share the importer, including upgrade.
 const h=fixture();const raw=JSON.stringify(h.read());assert.equal(h.run('progressImport.validateExport('+JSON.stringify(raw)+')'),true);
 for(const value of ['null','{bad',JSON.stringify({...h.read(),unknown:'x'.repeat(200001)}),JSON.stringify({...h.read(),unknown:Array(21000).fill(0)})])assert.equal(h.run('progressImport.validateExport('+JSON.stringify(value)+')'),false);
 // First-result snapshot must remain schema-valid; no silent truncation.
 h.run('Object.assign(s.resultPath,{action:"Try",expected:"Useful",observed:"Tried",check:"Compared",outcome:"checked",support:"alone",use:"Needed"});s.artifact="x".repeat(12001)');assert.match(h.run('ResultPath.firstError(s.resultPath,s.artifact)'),/12,000/);assert.equal(h.read().artifact.length,12001);h.run('s.artifact="x".repeat(12000)');assert.equal(h.run('ResultPath.firstError(s.resultPath,s.artifact)'),'');h.run('s.resultPath.snapshot=s.artifact');assert.equal(h.run('C.valid(s)'),true);
 // Prospective assistance changes are validated before asking, not lost after export.
 const t=fixture();t.run('s.resultPath.phase="transfer"');t.answers.push(false);t.run('exportProgress()');assert.equal(t.downloads.length,0);assert.equal(t.read().resultPath.transferExample,false);t.run('exportProgress()');assert.equal(JSON.parse(t.downloads[0].text).resultPath.transferExample,true);assert.equal(t.run('progressImport.validateExport('+JSON.stringify(t.downloads[0].text)+')'),true);
 const fail=fixture();fail.run('download=()=>{throw Error("blocked")}');const original=fail.read();assert.equal(fail.run('exportProgress()'),false);assert.deepEqual(fail.read(),original);assert.match(fail.el('storage').textContent,/work remains here/);
 console.log('Project recovery: exact importer preflight, UTF-8/string/structure bounds, non-importable archival fallback, round trip, help consent, failure preservation and checked draft limit passed.');
})().catch(e=>{console.error(e);process.exitCode=1});
