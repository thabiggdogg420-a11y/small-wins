'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const R=require('./public/result-path.js'),C=require('./public/coach.js'),M=require('./public/manual-brief.js'),J=require('./public/project-journey.js'),H=require('./public/handoff.js'),D=require('./public/device-task.js');
let count=0;const ok=fn=>{fn();count++;},clone=x=>JSON.parse(JSON.stringify(x));
const brief={facts:'Fictional club: Friday, 2 pm, Room D.',unknowns:'Price, exact date and accessibility details.',task:'Write a clear poster headline, supplied details and one action; keep unknowns in the brief.'};
const basis=M.build(brief,'poster');
ok(()=>assert(R.basisValid(basis)));ok(()=>assert.equal(basis.origin,'manual'));ok(()=>assert.equal(basis.response,undefined));
for(const origin of [undefined,'local-model','pasted-ai','prepared-example'])ok(()=>assert(!R.basisValid({...basis,origin,response:'A pretend response'})));
for(const bad of [{...basis,facts:'An altered composite'},{...basis,response:'Fake AI'},{...basis,manualFacts:''},{...basis,manualUnknowns:'x'.repeat(401)}])ok(()=>assert(!R.basisValid(bad)));
ok(()=>assert.equal(D.build('poster','Harmless facts'),''));
for(const kind of Object.keys(C.projectKinds)){
 const s=C.fresh();s.projectKind=kind;s.started=true;s.artifact=C.templateFor(s);s.resultPath=R.fresh();
 ok(()=>assert(C.valid(s)));ok(()=>assert(C.templateFor(s).length>30));ok(()=>assert(R.plan(s).check.length>30));ok(()=>assert(R.workedExample(s).repair.length>30));
 if(kind==='poster'){
  for(let i=1;i<9;i++)ok(()=>assert.notDeepEqual(C.stage(s,i),C.stages[i]));
  ok(()=>assert.match(C.kindTransfer(s),/poster copy and a layout brief/));ok(()=>assert.match(J.state(s,R).kind,/poster/));
  s.hints[3]=2;s.step=3;ok(()=>assert.match(C.hint(s),/price unknown/));
  const draft=s.artifact;s.done.fill(true);s.resultPath.support='example';s.resultPath.workedExampleUsed=true;
  ok(()=>assert.equal(M.apply(s,basis,R),''));ok(()=>assert.equal(s.artifact,draft));ok(()=>assert.equal(s.resultHistory[0].kind,'poster'));ok(()=>assert(R.historyValid(s.resultHistory)));ok(()=>assert(s.done.every(x=>!x)));ok(()=>assert(!s.resultPath.reviewed));ok(()=>assert(s.resultPath.workedExampleUsed));ok(()=>assert.equal(s.resultPath.support,'example'));ok(()=>assert(C.valid(clone(s))));
  ok(()=>assert(!C.valid({...s,projectKind:'message'})));ok(()=>assert.match(J.portable(s,R),/Project type: A checked poster draft/));ok(()=>assert.match(J.portable(s,R),/Price, exact date and accessibility/));
  const before=JSON.stringify(s);ok(()=>assert(M.apply(s,basis,R)));ok(()=>assert.equal(JSON.stringify(s),before));
  s.resultHistory=Array.from({length:5},()=>clone(s.resultHistory[0]));const full=JSON.stringify(s);
  ok(()=>assert(M.apply(s,M.build({...brief,task:'A changed poster task'},'poster'),R)));ok(()=>assert.equal(JSON.stringify(s),full));
 }
}
// Hub poster-brief.txt's four source lines, retained verbatim without a year.
const hubLines=['SKETCH TOGETHER','Saturday 14 November','3 pm - Room C','FICTIONAL QA - NOT AN EVENT'];
const poster={...C.fresh(),projectKind:'poster'},seed=C.templateFor(poster);
const copy=seed.split('POSTER COPY — PRACTICE, NOT FOR SHARING\n')[1].split('\n\nLAYOUT BRIEF')[0];
ok(()=>assert.deepEqual(copy.split('\n'),hubLines));
ok(()=>assert.match(seed,/Original: SKETCH TOGETHER; Saturday 14 November; 3 pm - Room C; FICTIONAL QA - NOT AN EVENT/));
ok(()=>assert.match(seed,/First deliberate change: replace 3 pm with 4 pm/));
ok(()=>assert.match(seed,/Unknown: year, price, supplies, accessibility and organizer details. Do not invent them/));
ok(()=>assert.doesNotMatch(seed,/Friday|2 pm|Room D|bring paper|a pencil|202[0-9]/));
const revision=C.stage(poster,4).join(' ');
for(const text of [revision,C.worked({...poster,step:3}),C.worked({...poster,step:6}),C.stage(poster,3).join(' '),R.workedExample(poster).expected]){
 for(const fact of ['SKETCH TOGETHER','Saturday 14 November','3 pm','4 pm','Room C','FICTIONAL QA - NOT AN EVENT'])ok(()=>assert(text.includes(fact),fact+' in '+text));
 ok(()=>assert.match(text,/deliberate|deliberately/));
}
for(const step of [3,6]){
 const text=C.worked({...poster,step});ok(()=>assert.match(text,/4 pm - Room C/));ok(()=>assert.match(text,/layout/));ok(()=>assert.doesNotMatch(text,/2 pm|Room D/));
}
const example=R.workedExample(poster);
for(const fact of ['SKETCH TOGETHER','Saturday 14 November','4 pm - Room C','FICTIONAL QA - NOT AN EVENT'])ok(()=>assert(example.repair.includes(fact)));
ok(()=>assert.match(example.check,/4 pm against the deliberate revision, not the original 3 pm/));
ok(()=>assert.match(example.repair,/price and supplies unknown/));ok(()=>assert.match(example.repair,/visual layout separately/));
ok(()=>assert.match(C.hint({...poster,step:3,hints:Array(10).fill(2)}),/assisted practice, not proof of mastery/));
const old=C.fresh();delete old.projectKind;old.evidence[2]='Old checklist evidence';old.done[2]=true;const upgraded=C.upgrade(clone(old));ok(()=>assert.equal(upgraded.projectKind,'checklist'));ok(()=>assert.equal(upgraded.evidence[2],old.evidence[2]));ok(()=>assert.equal(upgraded.done[2],true));
// Run real selection/start, manual brief, handoff, import/export, save and delete
// controllers with a minimal DOM. Only the unrelated main render is stubbed.
function fixture(stored=null){
 const nodes=new Map(),listeners={},downloads=[],copied=[],answers=[],routes=[];let writes=0;
 function el(id){if(!nodes.has(id))nodes.set(id,{id,value:'',textContent:'',checked:false,hidden:false,disabled:false,dataset:{},children:[],attrs:{},handlers:{},setAttribute(k,v){this.attrs[k]=v},addEventListener(t,f){(this.handlers[t]??=[]).push(f)},focus(){},before(){},append(){},replaceChildren(){this.children=[]},querySelector(){return el('query')},click(){fire(id)}});return nodes.get(id);}
 const kinds=Object.keys(C.projectKinds).map(kind=>Object.assign(el('kind-'+kind),{dataset:{kind}}));
 const document={getElementById:el,createElement:()=>el('new-node-'+nodes.size),querySelector:()=>el('artifact-label'),querySelectorAll:q=>q==='[data-kind]'?kinds:[],addEventListener(t,f){(listeners[t]??=[]).push(f)}};
 const ctx=vm.createContext({document,TextEncoder,console,URL,Blob,setTimeout,navigator:{clipboard:{async writeText(s){copied.push(s)}}},location:{href:'https://learn.example/#journey'},window:{addEventListener(t,f){(listeners['window:'+t]??=[]).push(f)}},localStorage:{getItem:()=>stored,setItem(k,v){stored=v;writes++},removeItem(){stored=null}},confirm:()=>answers.length?answers.shift():true,appNavigate:r=>routes.push(r),currentRoute:()=> 'journey'});
 ctx.addEventListener=ctx.window.addEventListener;ctx.window=ctx;
 const run=code=>vm.runInContext(code,ctx),load=file=>run(fs.readFileSync('public/'+file,'utf8'));
 for(const file of ['result-path.js','labs.js','coach.js','tool-starter.js','manual-brief.js','progress-import.js'])load(file);
 let app=fs.readFileSync('public/app.js','utf8'),a=app.indexOf('function render(){'),b=app.indexOf('\ndocument.querySelectorAll',a);
 run(app.slice(0,a)+'function render(){}'+app.slice(b));
 run('download=(name,text,type)=>recordDownload(name,text,type)');ctx.recordDownload=(name,text,type)=>downloads.push({name,text,type});
 el('provider').value='chatgpt';el('handoff-mode').value='kickoff';
 for(const file of ['project-kinds.js','handoff.js','handoff-ui.js','learner-loop.js','manual-brief-ui.js'])load(file);
 function fire(id,type='click'){const e=el(id),event={target:e,type};e['on'+type]?.(event);for(const f of e.handlers[type]||[])f(event);for(const f of listeners[type]||[])f(event);}
 const read=()=>JSON.parse(run('JSON.stringify(s)'));
 async function select(record){const raw=JSON.stringify(record);await el('import').onchange({target:{files:[{size:Buffer.byteLength(raw),text:async()=>raw}],value:'file'}});}
 return {el,fire,run,read,select,downloads,copied,answers,routes,get stored(){return stored},get writes(){return writes}};
}
(async()=>{
 const t=fixture();t.fire('kind-poster');ok(()=>assert.equal(t.read().projectKind,'poster'));ok(()=>assert.equal(t.el('kind-poster').attrs['aria-pressed'],'true'));
 t.fire('suggest-goal');ok(()=>assert.match(t.el('purpose').value,/poster copy and a layout brief/));t.el('capability').value='new';t.fire('start');
 ok(()=>assert.equal(t.read().projectKind,'poster'));ok(()=>assert.match(t.read().artifact,/POSTER COPY/));ok(()=>assert.equal(t.read().baseline,t.read().artifact));ok(()=>assert.equal(t.stored,null));ok(()=>assert.equal(t.writes,0));
 ok(()=>assert.match(t.el('manual-brief-task').placeholder,/poster headline/));
 const started=JSON.stringify(t.read());t.fire('kind-message');ok(()=>assert.equal(JSON.stringify(t.read()),started));
 t.run('refreshProjectKind()');ok(()=>assert.match(t.el('artifact-label').textContent,/poster copy and layout brief/));ok(()=>assert.match(t.el('download-kind-note').textContent,/not a poster image or PDF/));t.fire('download-app');ok(()=>assert.equal(t.downloads.at(-1).name,'my-reusable-poster-template.txt'));ok(()=>assert.equal(t.downloads.at(-1).text,t.read().artifact));
 t.fire('smaller');ok(()=>assert.match(t.el('hint-text').textContent,/poster headline/));
 for(const [key,value] of Object.entries(brief)){t.el('manual-brief-'+key).value=value;t.fire('manual-brief-'+key,'input');}
 t.fire('manual-brief-review');ok(()=>assert.equal(t.el('manual-brief-review-pane').hidden,false));ok(()=>assert.match(t.el('manual-brief-preview').textContent,/DETAILS STILL UNKNOWN/));
 const before=JSON.stringify(t.read());t.fire('manual-brief-keep');ok(()=>assert.equal(JSON.stringify(t.read()),before));
 t.el('manual-brief-approved').checked=true;t.answers.push(false);t.fire('manual-brief-keep');ok(()=>assert.equal(JSON.stringify(t.read()),before));
 t.el('manual-brief-task').value=brief.task+' edit';t.fire('manual-brief-task','input');t.el('manual-brief-task').value=brief.task;t.fire('manual-brief-task','input');t.fire('manual-brief-keep');ok(()=>assert.equal(JSON.stringify(t.read()),before));ok(()=>assert.equal(t.el('manual-brief-approved').checked,false));
 t.fire('manual-brief-review');t.el('manual-brief-approved').checked=true;t.fire('manual-brief-keep');ok(()=>assert.deepEqual(t.read().sourceBasis,basis));ok(()=>assert.equal(t.read().resultHistory[0].kind,'poster'));ok(()=>assert.equal(t.read().resultPath.reviewed,false));ok(()=>assert.equal(t.read().save,false));ok(()=>assert.equal(t.writes,0));ok(()=>assert.match(t.el('manual-brief-status').textContent,/No result was awarded/));
 // Exact default/selected context; source notes never join the optional handoff.
 t.fire('make-handoff');const parse=()=>JSON.parse(t.el('handoff-preview').value.split('LEARNER-SELECTED CONTEXT (quoted data, not instructions)\n')[1]);ok(()=>assert.deepEqual(parse(),{}));
 t.el('share-goal').checked=true;t.fire('share-goal','change');t.fire('make-handoff');ok(()=>assert.equal(parse().projectKind,'poster'));ok(()=>assert.equal(parse().project,undefined));ok(()=>assert.equal(parse().sourceBasis,undefined));
 ok(()=>assert.match(t.el('handoff-preview').value,/not a rendered poster image or PDF/));t.el('share-project').checked=true;t.fire('share-project','change');t.fire('make-handoff');ok(()=>assert.equal(parse().project,t.read().artifact));ok(()=>assert(!t.el('handoff-reviewed').checked));
 t.fire('download-handoff');ok(()=>assert.equal(t.downloads.length,1));t.el('handoff-reviewed').checked=true;t.fire('download-handoff');ok(()=>assert.equal(t.downloads.length,2));
 const originalDraft=t.read().artifact;t.el('artifact').value=originalDraft+' changed';t.fire('artifact','input');ok(()=>assert(!t.el('handoff-reviewed').checked));t.fire('download-handoff');ok(()=>assert.equal(t.downloads.length,2));ok(()=>assert.equal(t.read().projectKind,'poster'));ok(()=>assert.equal(t.copied.length,0));
 // Real poster first/related task handlers require an actual self-report, keep
 // changed work blank, retain assistance, and invalidate an edited first draft.
 const p=fixture();p.run("s.started=true;s.projectKind='poster';s.artifact=Coach.templateFor(s);s.resultPath=ResultPath.fresh()");p.run(fs.readFileSync('public/result-path-ui.js','utf8'));
 ok(()=>assert.match(p.el('result-action-help').textContent,/headline/));ok(()=>assert.match(p.el('result-check-help').textContent,/later visual layout/));p.fire('result-record');ok(()=>assert.equal(p.read().resultPath.reviewed,false));
 const first={action:'Write poster copy for a fictional club',expected:'All supplied details are easy to find',observed:'I found an unsupported price and removed it',check:'Compared each word with my original facts',outcome:'checked',support:'alone',use:'The draft now avoids promising an unknown price'};
 for(const [key,value] of Object.entries(first)){p.el('result-'+key).value=value;p.fire('result-'+key,'input');}
 p.fire('result-example');ok(()=>assert.equal(p.read().resultPath.workedExampleUsed,true));ok(()=>assert.match(p.el('result-example-title').textContent,/poster/));p.el('result-support').value='alone';p.fire('result-support','input');p.fire('result-record');ok(()=>assert.equal(p.read().resultPath.reviewed,false));
 p.el('result-support').value='example';p.fire('result-support','input');p.fire('result-record');ok(()=>assert.equal(p.read().resultPath.reviewed,true));ok(()=>assert.equal(p.read().resultPath.phase,'transfer'));ok(()=>assert.equal(p.read().resultPath.transferDraft,''));ok(()=>assert.equal(p.el('result-first').hidden,true));ok(()=>assert.equal(p.el('result-transfer').hidden,false));ok(()=>assert.match(p.el('result-transfer-help').textContent,/different fictional event and audience/));
 p.fire('result-transfer-record');ok(()=>assert.equal(p.read().resultPath.transferReviewed,false));
 for(const [key,value] of Object.entries({transferTask:'A fictional book club for a new audience and small screen',transferDraft:'Book club headline and supplied details; high-contrast layout notes',transferObserved:'The draft has only supplied facts',transferCheck:'Compared every detail; actual visual layout not yet tested',transferOutcome:'checked',transferSupport:'alone'})){p.el('result-'+key).value=value;p.fire('result-'+key,'input');}
 p.fire('result-transfer-record');ok(()=>assert.equal(p.read().resultPath.transferReviewed,true));ok(()=>assert.match(p.el('result-status').textContent,/not verified independence/));ok(()=>assert.equal(p.read().done.some(Boolean),false));
 p.fire('result-back');ok(()=>assert.equal(p.read().resultPath.transferExample,true));ok(()=>assert.equal(p.read().resultPath.transferReviewed,false));ok(()=>assert.match(p.read().resultPath.transferDraft,/Book club/));
 p.run("s.artifact+=' changed';refreshResultPath()");ok(()=>assert.equal(p.read().resultPath.reviewed,false));ok(()=>assert.equal(p.read().resultPath.phase,'first'));
 // Save, exact export, reload and reviewed import retain the same poster record.
 t.run('s.save=true;persist()');const saved=t.stored;ok(()=>assert(saved));t.fire('export');const exported=JSON.parse(t.downloads.at(-1).text);ok(()=>assert.equal(exported.projectKind,'poster'));ok(()=>assert.deepEqual(exported.sourceBasis,basis));
 const reloaded=fixture(saved);ok(()=>assert.equal(reloaded.read().artifact,exported.artifact));ok(()=>assert.equal(reloaded.read().projectKind,'poster'));ok(()=>assert.deepEqual(reloaded.read().sourceBasis,basis));ok(()=>assert.equal(reloaded.read().resultHistory[0].kind,'poster'));ok(()=>assert.match(reloaded.el('artifact-label').textContent,/poster/));
 const incoming={...exported,purpose:'Updated harmless poster',artifact:'Updated poster copy'};await reloaded.select(incoming);ok(()=>assert.equal(reloaded.read().purpose,exported.purpose));ok(()=>assert.match(reloaded.el('import-summary').textContent,/Type: poster/));
 reloaded.answers.push(false);reloaded.fire('import-apply');ok(()=>assert.equal(reloaded.read().artifact,exported.artifact));
 await reloaded.select(incoming);reloaded.fire('import-apply');ok(()=>assert.equal(reloaded.read().artifact,'Updated poster copy'));ok(()=>assert.equal(reloaded.read().save,false));ok(()=>assert.equal(reloaded.stored,saved));ok(()=>assert.deepEqual(reloaded.read().sourceBasis,basis));
 reloaded.answers.push(false);reloaded.fire('remember-import');ok(()=>assert.equal(reloaded.stored,saved));reloaded.fire('remember-import');ok(()=>assert.equal(JSON.parse(reloaded.stored).artifact,'Updated poster copy'));
 reloaded.answers.push(false);reloaded.fire('delete');ok(()=>assert.equal(reloaded.read().projectKind,'poster'));reloaded.fire('delete');ok(()=>assert.equal(reloaded.read().projectKind,'checklist'));ok(()=>assert.equal(reloaded.stored,null));
 // A saved pre-alignment poster is user work, not a seed to migrate.
 const legacy=C.fresh();Object.assign(legacy,{started:true,projectKind:'poster',purpose:'My existing drawing club',artifact:'My edited poster: Friday, 2 pm, Room D; bring paper and a pencil.',baseline:'Original poster: Friday, 2 pm, Room D; bring paper and a pencil.',sourceBasis:clone(basis),save:true,resultPath:R.fresh()});
 Object.assign(legacy.resultPath,first,{reviewed:true,snapshot:legacy.artifact});
 legacy.evidence[3]='Checked Friday, 2 pm and Room D against my original brief';legacy.done[3]=true;
 legacy.reflections[3]={outcome:'checked',support:'independent',check:'Compared Friday, 2 pm, Room D',observed:'All original details retained',reviewed:true};
 legacy.resultHistory=[{kind:'poster',goal:'Earlier drawing club',artifact:legacy.baseline,basis:clone(basis),record:clone(legacy.resultPath)}];
 ok(()=>assert(C.valid(legacy)));ok(()=>assert(R.valid(legacy.resultPath)));ok(()=>assert(R.historyValid(legacy.resultHistory)));
 ok(()=>assert.deepEqual(C.upgrade(clone(legacy)),legacy));
 const keptKeys=['projectKind','purpose','artifact','baseline','sourceBasis','resultHistory','resultPath','evidence','done','reflections'];
 const retains=record=>{for(const key of keptKeys)ok(()=>assert.deepEqual(record[key],legacy[key],key+' must not migrate'));};
 const existing=fixture(JSON.stringify(legacy));retains(existing.read());existing.run('persist()');retains(JSON.parse(existing.stored));
 const reopened=fixture(existing.stored);retains(reopened.read());reopened.fire('export');const oldExport=JSON.parse(reopened.downloads.at(-1).text);retains(oldExport);
 const destination=fixture();await destination.select(oldExport);ok(()=>assert.equal(destination.read().projectKind,'checklist'));destination.fire('import-apply');retains(destination.read());ok(()=>assert.equal(destination.read().save,false));ok(()=>assert.equal(destination.stored,null));
 destination.fire('remember-import');retains(JSON.parse(destination.stored));retains(fixture(destination.stored).read());
 const older=fixture(JSON.stringify(upgraded));ok(()=>assert.equal(older.read().projectKind,'checklist'));ok(()=>assert.equal(older.read().evidence[2],'Old checklist evidence'));
 const index=fs.readFileSync('public/index.html','utf8');ok(()=>assert.match(index,/<button data-kind="poster" aria-pressed="false">A checked poster draft/));ok(()=>assert.match(index,/not an image or PDF/));
 for(const file of ['coach-guide.txt','coach-guide.html'])ok(()=>assert(fs.readFileSync('public/'+file,'utf8').includes('For a poster draft, help with a headline')));
 ok(()=>assert.equal(fs.readFileSync('public/coach-guide.txt','utf8').trim(),H.guide.trim()));
 console.log(`PASS: ${count} poster-project assertions: fifth native route, source/history compatibility, exact manual review, no invented AI provenance, selection/start lock, labels/text download, explicit handoff/privacy, real save/reload/export/import/delete handlers, old records unchanged. Mock DOM/storage only; browser rendering and real learner outcomes untested.`);
})().catch(error=>{console.error(error);process.exitCode=1});
