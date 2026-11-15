'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const R=require('./public/result-path.js'),C=require('./public/coach.js'),J=require('./public/project-journey.js'),H=require('./public/handoff.js');
function project(kind='checklist'){const s=C.fresh();s.started=true;s.purpose='A useful harmless task';s.capability='new';s.projectKind=kind;s.artifact='A private draft marker';s.resultPath=R.fresh();return s;}
function checked(s){const r=s.resultPath;Object.assign(r,{action:'Try the first item',expected:'Have all three materials',observed:'One material missing, then added',check:'Compared each item with the source',outcome:'checked',support:'example',use:'Found a missing item before the real task',reviewed:true,snapshot:s.artifact,phase:'transfer'});}
function transfer(s){Object.assign(s.resultPath,{transferTask:'Half the time',transferDraft:'My new draft',transferObserved:'It fit the limit',transferCheck:'Added every minute',transferOutcome:'checked',transferSupport:'alone',transferReviewed:true});}
for(const kind of ['checklist','message','comparison','tool']){
 const s=project(kind);assert.equal(J.state(s,R).stage,'plan');assert.match(J.portable(s,R),/not currently checked/);checked(s);assert.equal(J.state(s,R).stage,'transfer');transfer(s);assert.equal(J.state(s,R).stage,'continue');assert.match(J.portable(s,R),/less help/);s.artifact+=' edit';assert.equal(J.state(s,R).first,false);assert.equal(J.state(s,R).second,false);assert.doesNotMatch(J.portable(s,R),/Current status: self-reported checked/);
}
assert.equal(J.state(C.fresh(),R).stage,'choose');
{
 const s=project();s.sourceBasis={kind:'checklist',facts:'SOURCE marker',request:'Task marker',origin:'pasted-ai',response:'ORIGINAL ANSWER OMIT marker'};s.resultHistory=[{artifact:'HISTORY OMIT marker'}];s.externalNote='PORTABLE NOTE OMIT marker';const kit=J.portable(s,R);assert.match(kit,/SOURCE marker/);assert.doesNotMatch(kit,/ORIGINAL ANSWER OMIT marker|HISTORY OMIT marker|PORTABLE NOTE OMIT marker/);assert.match(kit,/not an import file/);assert.match(kit,/No automatic saving/);assert.match(kit,/No message, purchase/);
}
for(const phase of ['first','transfer']){const s=project();s.resultPath.phase=phase;s.resultPath.reviewed=true;s.resultPath.transferReviewed=true;const draft=s.artifact;J.support(s,R);assert.equal(s.artifact,draft);assert.equal(s.resultPath.transferReviewed,false);if(phase==='transfer'){assert.equal(s.resultPath.reviewed,true);assert.equal(s.resultPath.transferExample,true);assert.equal(s.resultPath.transferSupport,'example');}else{assert.equal(s.resultPath.reviewed,false);assert.equal(s.resultPath.workedExampleUsed,true);assert.equal(s.resultPath.support,'example');}}
function harness(initial=project()){
 const nodes={},listeners={},downloads=[],routes=[],events=[];let yes=true;const n=id=>nodes[id]??={id,value:'',checked:false,disabled:false,hidden:false,dataset:{},handlers:{},children:[],className:'',textContent:'',addEventListener(t,f){(this.handlers[t]??=[]).push(f);},append(x){this.children.push(x);},prepend(x){this.children.unshift(x);},scrollIntoView(){},focus(){events.push('focus:'+id);}};
 const ctx={s:initial,ProjectJourney:J,ResultPath:R,screens:{journey:n('screen-journey')},$:n,document:{getElementById:n,createElement:()=>n('generated-'+Object.keys(nodes).length),querySelector:()=>n('hero-actions'),addEventListener(t,f){(listeners[t]??=[]).push(f);}},window:{addEventListener(t,f){(listeners['window:'+t]??=[]).push(f);}},render(){},persist(){events.push('persist');},resultRecord(){return ctx.s.resultPath||(ctx.s.resultPath=R.fresh());},pauseMessage:()=> 'Session only. Export before closing.',appNavigate(route){routes.push(route);},refreshResultPath(){},contextSummary(){},makeHandoff(){ctx.preview=H.build({mode:n('handoff-mode').value,context:{goal:n('share-goal').checked?ctx.s.purpose:undefined,project:n('share-project').checked?ctx.s.artifact:undefined,myWin:n('share-result').checked?ctx.s.resultPath.phase:undefined}});n('handoff-reviewed').checked=false;},download(name,text,type){downloads.push({name,text,type});},exportProgress(){const choice=R.reviewFullExport(ctx.s,()=>yes);if(choice.allowed)downloads.push({name:'progress.json',text:JSON.stringify(ctx.s)});},confirm(){return yes;}};
 for(const id of ['journey-kit-panel','journey-support-text'])n(id).hidden=true;
 n('result-back').click=()=>{const r=ctx.s.resultPath;r.phase='first';r.firstView='reflect';r.transferExample=true;r.transferHelp=true;r.transferReviewed=false;r.transferSupport='example';};
 vm.runInNewContext(fs.readFileSync('public/project-journey-ui.js','utf8'),ctx);
 function fire(id,type='click'){const el=n(id);if(type==='click')el.onclick?.({target:el,type});for(const f of el.handlers[type]||[])f({target:el,type});for(const f of listeners[type]||[])f({target:el,type});}
 for(const el of Object.values(nodes))if(!el.click)el.click=()=>fire(el.id);
 return {ctx,n,downloads,routes,events,fire,yes(v){yes=v;},refresh(){for(const f of listeners['window:hashchange']||[])f();},edit(id,value,mutate){n(id).value=value;mutate?.();fire(id,'input');},check(id){n(id).checked=true;fire(id,'change');}};
}
// Complete kit is gated by exact preview review; no network or provider transmission.
{
 const h=harness();h.fire('journey-kit');assert.equal(h.downloads.length,0);assert.equal(h.n('journey-kit-panel').hidden,false);h.fire('journey-kit-download');assert.equal(h.downloads.length,0);h.check('journey-kit-reviewed');h.fire('journey-kit-download');assert.equal(h.downloads.length,1);assert.match(h.downloads[0].text,/A private draft marker/);
}
// Any included silent mutation, accepted state replacement, and real edit/revert reject stale export.
for(const mutate of [s=>s.purpose+=' edit',s=>s.capability='comfortable',s=>s.projectKind='message',s=>s.artifact+=' edit',s=>s.sourceBasis={facts:'new'},s=>s.resultPath.check='new',s=>s.resultPath.transferDraft='new']){
 const h=harness();h.fire('journey-kit');h.check('journey-kit-reviewed');mutate(h.ctx.s);h.fire('journey-kit-download');assert.equal(h.downloads.length,0);assert.equal(h.n('journey-kit-panel').hidden,true);
}
{
 const h=harness();h.fire('journey-kit');h.check('journey-kit-reviewed');h.ctx.s=JSON.parse(JSON.stringify(h.ctx.s));h.fire('journey-kit-download');assert.equal(h.downloads.length,0);
 const v=h.ctx.s.artifact;h.fire('journey-kit');h.check('journey-kit-reviewed');h.edit('artifact',v+'x',()=>h.ctx.s.artifact=v+'x');h.edit('artifact',v,()=>h.ctx.s.artifact=v);h.fire('journey-kit-download');assert.equal(h.downloads.length,0);
}
// Canceled/invalid import or unrelated form changes do not erase the kit.
{const h=harness();h.fire('journey-kit');h.check('journey-kit-reviewed');h.fire('import','change');h.fire('import-cancel');h.edit('manual-brief-facts','Unsubmitted unrelated draft');assert.equal(h.n('journey-kit-panel').hidden,false);assert.equal(h.n('journey-kit-reviewed').checked,true);h.fire('journey-kit-download');assert.equal(h.downloads.length,1);}
// Preview itself records help; cancellation has no exposure, changes or downloads.
for(const accept of [false,true]){
 const s=project();checked(s);const h=harness(s);h.yes(accept);h.fire('journey-kit');assert.equal(s.resultPath.transferExample,accept);assert.equal(h.n('journey-kit-panel').hidden,!accept);assert.equal(h.downloads.length,0);assert.equal(s.artifact,'A private draft marker');
}
// Completed retrospective kit does not inflate assistance.
{
 const s=project();checked(s);transfer(s);const h=harness(s);h.fire('journey-kit');assert.equal(s.resultPath.transferExample,false);assert.equal(s.resultPath.transferReviewed,true);
}
// A preview from before transfer cannot reappear as hidden answer exposure later.
{
 const s=project(),h=harness(s);h.fire('journey-kit');checked(s);h.refresh();assert.equal(h.n('journey-kit-panel').hidden,true);assert.equal(h.n('journey-kit-preview').value,'');assert.equal(s.resultPath.transferExample,false);
}
// Coach preparation has selected context, resets other shares, preserves draft and records examples.
for(const phase of ['first','transfer']){
 const s=project(),h=harness(s);s.resultPath.phase=phase;for(const id of ['share-project','share-evidence','share-note'])h.n(id).checked=true;h.fire('journey-coach');assert.equal(h.n('share-goal').checked,true);assert.equal(h.n('share-result').checked,true);assert.equal(h.n('share-project').checked,phase==='first');assert.equal(h.n('share-evidence').checked,false);assert.equal(h.n('share-note').checked,false);assert.equal(h.n('handoff-reviewed').checked,false);assert.equal(h.routes.at(-1),'ai/review');assert.equal(h.downloads.length,0);assert.equal(s.artifact,'A private draft marker');if(phase==='transfer'){assert.doesNotMatch(h.ctx.preview,/A private draft marker/);assert.equal(s.resultPath.transferExample,true);}else{assert.match(h.ctx.preview,/A private draft marker/);assert.equal(s.resultPath.workedExampleUsed,true);}
}
// No Start re-invocation; active navigation and incomplete transfer are non-destructive.
{
 const h=harness();h.fire('journey-plan');assert.equal(h.routes.at(-1),'learn');assert.equal(h.ctx.s.artifact,'A private draft marker');h.fire('journey-transfer');assert.notEqual(h.routes.at(-1),'journey');assert.equal(h.ctx.s.resultPath.phase,'first');h.fire('journey-hint');assert.equal(h.ctx.s.resultPath.recoveryUsed,true);assert.equal(h.n('journey-support-text').hidden,false);checked(h.ctx.s);h.refresh();assert.equal(h.n('journey-support-text').hidden,true);h.fire('journey-hint');assert.equal(h.ctx.s.resultPath.transferHelp,true);assert.equal(h.ctx.s.resultPath.transferExample,false);
}
// Route is integrated, no private data URL or extra storage/telemetry introduced.
const ui=fs.readFileSync('public/project-journey-ui.js','utf8'),core=fs.readFileSync('public/project-journey.js','utf8'),shell=fs.readFileSync('public/shell.js','utf8'),html=fs.readFileSync('public/index.html','utf8');assert.match(shell,/journey:screen/);assert.match(shell,/const routes=\['journey'/);assert.match(html,/project-journey-ui\.js/);assert.doesNotMatch(ui+core,/fetch\(|XMLHttpRequest|localStorage|sessionStorage|\.innerHTML\s*=\s*(?:s\.|r\.)/);assert.match(ui,/ResultPath\.reviewFullExport/);console.log('Project journey: all types, status, tailored support, exact reviewed portable kit, assistance at preview, stale/import/revert, preserved drafts and no new sharing/storage passed.');
