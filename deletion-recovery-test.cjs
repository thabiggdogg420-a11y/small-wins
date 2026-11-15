'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const root=__dirname+'/public/';
let checks=0;function ok(value,message){assert.ok(value,message);checks++;}
function fixture({appPath=root+'app.js',stored=null,removeMode='normal',readMode='normal'}={}){
 const els={},downloads=[],questions=[],answers=[];let removes=0,writes=0,reads=0,clears=0;
 const el=id=>els[id]??={id,value:'',checked:false,textContent:'',hidden:false,children:[],focus(){},replaceChildren(){},append(){},setAttribute(){}};
 const ctx=vm.createContext({document:{getElementById:el,querySelectorAll:()=>[],addEventListener(){},createElement:()=>({click(){}})},TextEncoder,console,URL:{},Blob,setTimeout,
 localStorage:{getItem(){reads++;if(readMode==='fail'||(readMode==='after-remove'&&removes))throw Error('SecurityError');return stored;},setItem(k,v){writes++;stored=v;},removeItem(){removes++;if(removeMode==='throw')throw Error('SecurityError');if(removeMode==='noop')return;if(removeMode==='race'){stored=stored.replace('Saved version A','Another tab version C');return;}stored=null;if(removeMode==='clear-throw')throw Error('Unknown outcome');}},
 confirm(text){questions.push(text);return answers.length?answers.shift():true;},clearPastedDraft(){clears++},clearManualBrief(){clears++},resetLabsContext(){clears++}});
 for(const f of ['result-path.js','labs.js','coach.js','progress-import.js'])vm.runInContext(fs.readFileSync(root+f,'utf8'),ctx);
 let app=fs.readFileSync(appPath,'utf8');const a=app.indexOf('function render(){'),b=app.indexOf('\ndocument.querySelectorAll',a);app=app.slice(0,a)+'function render(){}'+app.slice(b);vm.runInContext(app,ctx);
 ctx.saveDownload=(name,text,type)=>downloads.push({name,text,type});vm.runInContext('download=saveDownload',ctx);
 const run=x=>vm.runInContext(x,ctx),read=()=>JSON.parse(run('JSON.stringify(s)'));
 function setup(){run("s.started=true;s.projectKind='poster';s.purpose='Fictional poster';s.artifact='Saved version A';s.save=true;s.resultPath=ResultPath.fresh();s.resultPath.observed='Retained checking notes';persist();s.artifact='Newest unsaved version B'");el('purpose').value='Fictional poster';return read();}
 async function imported(raw){el('import').files=[{size:Buffer.byteLength(raw),text:async()=>raw}];await el('import').onchange({target:el('import')});el('import-apply').onclick();}
 return {el,run,read,setup,imported,downloads,questions,answers,get stored(){return stored},get removes(){return removes},get writes(){return writes},get reads(){return reads},get clears(){return clears},set removeMode(x){removeMode=x},set readMode(x){readMode=x}};
}
(async()=>{
 for(const mode of ['throw','noop','race','clear-throw']){
  const h=fixture({removeMode:mode}),before=h.setup();h.el('delete').onclick();
  assert.deepEqual(h.read(),{...before,save:false});checks++;ok(h.removes===1,'no hidden remove retry');ok(h.clears===0,'unsubmitted panels retained');ok(/Could not confirm removal/.test(h.el('storage').textContent));ok(/automatic saving OFF/.test(h.el('storage').textContent));ok(/Session only/.test(h.run('pauseMessage()')));ok(h.el('purpose').value==='Fictional poster');
  const writes=h.writes;h.run("s.resultPath.check='Later retained check';persist()");ok(h.writes===writes,'edits cannot recreate removed storage');h.run('exportProgress()');ok(h.downloads.length===1,'retained newest session remains recoverable');const raw=h.downloads[0].text;ok(JSON.parse(raw).artifact==='Newest unsaved version B');
  const reopened=fixture();await reopened.imported(raw);ok(reopened.read().artifact==='Newest unsaved version B');ok(reopened.read().resultPath.observed==='Retained checking notes');ok(reopened.read().save===false);
  h.removeMode='normal';h.readMode='normal';h.el('delete').onclick();ok(!h.read().started&&h.read().artifact==='');ok(h.stored===null);ok(h.clears===3);ok(/checked as removed/.test(h.el('storage').textContent));ok(!fixture({stored:h.stored}).read().started,'verified deletion stays blank after reload');
 }
 const uncertain=fixture({readMode:'after-remove'}),before=uncertain.setup();uncertain.el('delete').onclick();assert.deepEqual(uncertain.read(),{...before,save:false});checks++;ok(uncertain.stored===null);ok(uncertain.clears===0);ok(/Could not confirm/.test(uncertain.el('storage').textContent));
 const cancelled=fixture();const same=cancelled.setup(),saved=cancelled.stored,n=cancelled.reads;cancelled.answers.push(false);cancelled.el('delete').onclick();assert.deepEqual(cancelled.read(),same);checks++;ok(cancelled.stored===saved&&cancelled.removes===0&&cancelled.reads===n&&cancelled.clears===0);
 const empty=fixture();empty.el('delete').onclick();ok(empty.stored===null&&!empty.read().started);ok(empty.removes===1);
 // A failed deletion in an imported session must retain its future overwrite consent boundary.
 const source=fixture();source.setup();source.run('exportProgress()');const h=fixture({removeMode:'throw'});h.setup();const prior=h.stored;await h.imported(source.downloads[0].text);h.el('delete').onclick();h.answers.push(false);h.el('remember-import').onclick();ok(h.stored===prior&&h.read().save===false);ok(/Remember this imported/.test(h.questions.at(-1)));
 console.log('PASS '+checks+' deletion recovery assertions: real app handler, failure/uncertainty/race/cancel, no resaving, latest draft export/import, verified deletion and fresh reload; mocked DOM/storage only.');
})().catch(e=>{console.error(e);process.exitCode=1});
