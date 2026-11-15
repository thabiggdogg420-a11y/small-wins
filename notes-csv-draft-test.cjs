'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),L=require('./public/notes-csv.js');
let assertions=0;const ok=(v,m)=>{assert.ok(v,m);assertions++;},eq=(a,b,m)=>{assert.deepEqual(a,b,m);assertions++;},throws=(f,r)=>{assert.throws(f,r);assertions++;};
const empty=()=>({format:L.draftFormat,version:1,sources:'',columns:'',csv:'',origin:'',note:'',excerpts:[]});
const notes='001 | Blue card: 8 sheets on the shelf.\n002 | Paper clips; count not recorded.\n003 | Blue card: 0 sheets in the box.';
const columns='item,count',csv='source_id,item,count\n001,Blue card,8\n002,Paper clips,\n003,Blue card,0';
const sample=()=>({...empty(),sources:notes,columns,csv,origin:'manual',note:'Check the opened spreadsheet too.',excerpts:[{key:'001:item',quote:'Blue card'},{key:'001:count',quote:'8'},{key:'002:item',quote:'Paper clips'},{key:'003:item',quote:'Blue card'},{key:'003:count',quote:'0'}]});
eq(L.parseDraft(L.serializeDraft(empty())),empty(),'empty work is portable');
eq(L.parseDraft(L.serializeDraft(sample())),sample());
const malformed={...empty(),sources:'unfinished line\n<script>ignored</script>\u0000\ud800',columns:'not valid columns',csv:'=not safe,unclosed"\r\n\u200b',note:'<img src=x>\n\udc00',excerpts:[{key:'x:item',quote:'\u0000\r\n\ud800'}]};
eq(L.parseDraft(L.serializeDraft(malformed)),malformed,'core roundtrip retains invalid/unfinished/literal Unicode text, never approves it');
for(const bad of [null,[],{},'text',4,true,{...empty(),format:'other'},{...empty(),version:2},{...empty(),version:'1'},{...empty(),origin:'verified'},{...empty(),origin:null}])throws(()=>L.draft(bad),/draft|version|origin|fields/i);
for(const field of ['harmless','checked','reviewed','finalReviewed','prompt','promptApproval','approval','verified','__proto__','constructor']){
  const bad=empty();Object.defineProperty(bad,field,{value:true,enumerable:true});throws(()=>L.draft(bad),/fields/);
}
for(const [key,max] of [['sources',7000],['columns',150],['csv',12000],['note',1600]]){
  for(const value of [null,false,[],{},1,'x'.repeat(max+1)])throws(()=>L.draft({...empty(),[key]:value}),/text within/);
  eq(L.parseDraft(L.serializeDraft({...empty(),[key]:'x'.repeat(max)}))[key].length,max);
}
for(const bad of [null,{},Array.from({length:61},(_,i)=>({key:i+':item',quote:''})),[null],[{}],[{key:'1:item',quote:'',reviewed:true}],[{key:'1:item',quote:'',unknown:true}],[{key:'1:item',quote:null}],[{key:'1:item',quote:'x'.repeat(501)}],[{key:'1:item',quote:''},{key:'1:item',quote:'again'}]])throws(()=>L.draft({...empty(),excerpts:bad}),/excerpt|fields|source-ID/i);
for(const key of ['',':x','a:source_id','-a:item','a:Item','a:a:b','a:<b>','a:x-y','a:1x','a'.repeat(25)+':item','a:'+ 'a'.repeat(25)])throws(()=>L.draft({...empty(),excerpts:[{key,quote:''}]}),/source-ID/);
const maximum={...empty(),sources:'\u0000'.repeat(7000),columns:'\u0000'.repeat(150),csv:'\u0000'.repeat(12000),note:'\u0000'.repeat(1600),excerpts:Array.from({length:60},(_,i)=>({key:String(i)+':item',quote:'\u0000'.repeat(500)}))};
const maximumText=L.serializeDraft(maximum);ok(Buffer.byteLength(maximumText)<=L.draftBytes);eq(L.parseDraft(maximumText),maximum,'worst escaped valid shape fits the file bound');
for(const text of ['','{','[]','null','{}',L.serializeDraft(empty())+' extra',' '.repeat(L.draftBytes+1),'{"version":1,"version":1}',L.serializeDraft(empty()).replace('"version": 1','"version": 1, "\\u0076ersion": 1'),L.serializeDraft(sample()).replace('"quote": "8"','"quote": "8", "quote": "0"'),'[ [[ [] ]] ]'])throws(()=>L.parseDraft(text),/JSON|draft|fields|KiB/i);
const coreSource=fs.readFileSync('public/notes-csv.js','utf8'),uiSource=fs.readFileSync('public/notes-csv-ui.js','utf8'),html=fs.readFileSync('public/notes-csv.html','utf8');
for(const text of ['Download editable draft (.json)','Reopen an editable draft','Preview only:','Replace this workbench','Cancel replacement preview','not an editable draft','never uploaded','backups or synced folders','clears every approval'])ok(html.includes(text),text);
for(const text of [coreSource,uiSource])ok(!/innerHTML|outerHTML|insertAdjacentHTML|fetch\s*\(|XMLHttpRequest|sendBeacon|localStorage|sessionStorage|eval\s*\(|new Function/.test(text));
function harness(){
  const nodes={},downloads=[],revoked=[],timers=[],windowHandlers={};let yes=true,confirms=0,confirmAction=()=>{},clipboard=async()=>{},anchorError=false;
  function node(tag='div',id=''){
    let name=id,value='';const n={tag,type:tag==='input'?'text':undefined,checked:false,hidden:false,disabled:false,children:[],handlers:{},textContent:'',files:[],focus(){this.focused=true;},select(){},setAttribute(){},append(...x){this.children.push(...x);},replaceChildren(...x){this.children=x;},remove(){this.removed=true;},addEventListener(k,f){this.handlers[k]=f;},click(){if(this.tag==='a'){if(anchorError)throw Error('download blocked');downloads.push({name:this.download,blob:this.href});}else return this.handlers.click?.();}};
    Object.defineProperty(n,'value',{get:()=>value,set:v=>{value=String(v);if(tag==='textarea')value=value.replace(/\r\n?/g,'\n');else if(tag==='input'&&n.type==='text')value=value.replace(/[\r\n]/g,'');if(n.type==='file'&&value==='')n.files=[];}});
    Object.defineProperty(n,'id',{get:()=>name,set:v=>{name=v;if(v)nodes[v]=n;}});if(id)nodes[id]=n;return n;
  }
  for(const [,tag,attrs,id] of html.matchAll(/<([a-z0-9-]+)\b([^>]*?)\bid="([^"]+)"/g)){
    const n=node(tag,id);const type=attrs.match(/type="([^"]+)"/)?.[1];if(type)n.type=type;
  }
  nodes['open-draft'].type='file';nodes['restore-preview'].hidden=true;
  const ctx={addEventListener:(type,handler)=>{windowHandlers[type]=handler;},removeEventListener:(type,handler)=>{eq(windowHandlers[type],handler,'removes the same handler');delete windowHandlers[type];},document:{getElementById:id=>{assert.ok(nodes[id],id);return nodes[id];},createElement:tag=>node(tag),body:node()},navigator:{clipboard:{writeText:t=>clipboard(t)}},confirm:()=>{confirms++;confirmAction();return yes;},Blob:class{constructor(parts,options){this.text=parts.join('');this.type=options.type;}},URL:{createObjectURL:b=>b,revokeObjectURL:b=>revoked.push(b)},setTimeout:f=>timers.push(f),TextDecoder};
  ctx.window=ctx;vm.runInNewContext(coreSource,ctx);vm.runInNewContext(uiSource,ctx);
  const input=(id,v)=>{nodes[id].value=v;nodes[id].handlers.input?.();},change=(id,v)=>{nodes[id].checked=v;return nodes[id].handlers.change?.();},click=id=>nodes[id].handlers.click();
  const file=(text,options={})=>{const buffer=Buffer.from(text,'utf8');return {size:buffer.byteLength,arrayBuffer:async()=>buffer.buffer.slice(buffer.byteOffset,buffer.byteOffset+buffer.byteLength),...options};};
  const open=async f=>{nodes['open-draft'].files=f?[f]:[];return nodes['open-draft'].handlers.change();};
  return {show:()=>windowHandlers.pageshow(),hasLeaveWarning:()=>!!windowHandlers.beforeunload,leave:()=>{const event={prevented:false,preventDefault(){this.prevented=true;}};windowHandlers.beforeunload?.(event);eq(Object.hasOwn(event,'returnValue'),event.prevented,'legacy returnValue set only when warning requested');return event.prevented;},nodes,input,change,click,file,open,downloads,revoked,timers,setYes:v=>yes=v,setConfirm:f=>confirmAction=f,setClipboard:f=>clipboard=f,setAnchorError:v=>anchorError=v,get confirms(){return confirms;},last:()=>downloads.at(-1)?.blob.text};
}
function enter(h){h.input('sources',notes);h.input('columns',columns);h.input('csv',csv);h.input('origin','manual');h.input('check-note','Check the opened spreadsheet too.');h.change('harmless',true);h.click('check');}
function approve(h){for(const [i,c] of L.cells(L.analyze(h.nodes.sources.value,h.nodes.columns.value,h.nodes.csv.value)).entries()){if(c.value)h.input('excerpt-'+i,c.value);h.change('comparison-'+i,true);}h.change('final-reviewed',true);}
function state(h){return JSON.stringify(['sources','columns','csv','origin','check-note','prompt'].map(id=>h.nodes[id].value).concat(['harmless','final-reviewed','prompt-reviewed'].map(id=>h.nodes[id].checked)));}
function deferred(){let resolve,reject;const promise=new Promise((r,j)=>{resolve=r;reject=j;});return {promise,resolve,reject};}
(async()=>{
// Exact-controller leaving/reload protection: downloads are requests, never proof of saving.
const loss=harness();ok(!loss.leave(),'untouched blank page does not warn');ok(!loss.hasLeaveWarning(),'blank page has no beforeunload listener');
loss.show();ok(!loss.hasLeaveWarning(),'blank pageshow remains listener-free');
loss.nodes.sources.value='browser-restored notes';loss.show();ok(loss.leave(),'pageshow protects browser-restored text');
loss.click('clear');loss.show();ok(!loss.hasLeaveWarning(),'cleared pageshow remains listener-free');
loss.click('download-draft');ok(!loss.leave(),'blank download does not dirty work');
loss.click('preview-practice');ok(!loss.leave(),'practice preview alone does not warn');
loss.click('cancel-restore');ok(!loss.leave());
await loss.open(loss.file(L.serializeDraft(sample())));ok(!loss.leave(),'file preview alone does not warn');
loss.setYes(false);loss.click('restore-draft');ok(!loss.leave(),'canceled replacement stays blank');
loss.setYes(true);loss.click('restore-draft');ok(loss.leave(),'applied draft warns before any further edit');
loss.click('download-draft');ok(loss.leave(),'download request never clears warning');
loss.setAnchorError(true);loss.click('download-draft');ok(loss.leave(),'blocked download retains warning');loss.setAnchorError(false);
loss.setYes(false);loss.click('clear');ok(loss.leave(),'canceled Clear retains warning');
loss.setYes(true);loss.click('clear');ok(!loss.leave(),'confirmed Clear releases warning');ok(!loss.hasLeaveWarning(),'Clear removes beforeunload listener');
loss.click('preview-practice');loss.click('restore-draft');ok(loss.leave(),'applied practice warns');loss.click('clear');
for(const id of ['sources','columns','csv','origin','check-note']){loss.input(id,id==='origin'?'manual':'unfinished');ok(loss.leave(),id+' alone warns');loss.click('clear');ok(!loss.leave());}
loss.change('harmless',true);ok(loss.leave(),'review declaration alone warns');loss.change('harmless',false);ok(!loss.leave(),'reverted empty declaration does not warn');
await loss.open(loss.file(L.serializeDraft({...empty(),excerpts:[{key:'001:item',quote:'retained excerpt'}]})));loss.click('restore-draft');ok(loss.leave(),'restored excerpts not rendered yet are protected');loss.click('clear');ok(!loss.leave());
enter(loss);approve(loss);loss.click('build-prompt');loss.change('prompt-reviewed',true);ok(loss.leave(),'reviewed work warns');
for(const id of ['download-csv','download-record','download-draft']){loss.click(id);ok(loss.leave(),id+' retains warning');}
loss.click('clear');ok(!loss.leave(),'all prompt, review and excerpt state clears');
await loss.open(loss.file(L.serializeDraft(empty())));loss.click('restore-draft');ok(!loss.leave(),'confirmed empty replacement does not warn');
ok(html.includes('browser may warn')&&html.includes('not guaranteed')&&html.includes('check that the file was saved'),'honest best-effort copy');
// Integrated practice uses preview, cancel, stale-work and explicit replacement gates.
const practice=harness();enter(practice);approve(practice);
const existing=state(practice);practice.click('preview-practice');eq(state(practice),existing);ok(!practice.nodes['restore-preview'].hidden);
const practiceData=L.parseDraft(practice.nodes['restore-text'].textContent);eq(practiceData.origin,'');eq(practiceData.note,'');eq(practiceData.excerpts,[]);eq(L.parse(practiceData.csv),[['source_id','item','count'],['001','',''],['002','',''],['003','','']]);
practice.click('cancel-restore');eq(state(practice),existing);ok(practice.nodes['restore-preview'].hidden);
practice.click('preview-practice');practice.setYes(false);practice.click('restore-draft');eq(state(practice),existing);ok(!practice.nodes['restore-preview'].hidden);
practice.setYes(true);practice.click('restore-draft');eq(practice.nodes.sources.value,practiceData.sources);eq(practice.nodes.csv.value,practiceData.csv);eq(practice.nodes.origin.value,'');ok(!practice.nodes.harmless.checked);ok(practice.nodes['download-csv'].disabled);ok(!practice.nodes['final-reviewed'].checked);ok(practice.nodes['source-title'].focused);
practice.click('preview-practice');practice.input('csv','do not overwrite me');practice.click('restore-draft');eq(practice.nodes.csv.value,'do not overwrite me');
practice.click('preview-practice');practice.setConfirm(()=>{practice.nodes.csv.value='changed during confirmation';});practice.click('restore-draft');eq(practice.nodes.csv.value,'changed during confirmation');practice.setConfirm(()=>{});
const delayed=deferred(),reading=practice.open(practice.file(L.serializeDraft(sample()),{arrayBuffer:()=>delayed.promise}));practice.click('preview-practice');const currentPreview=practice.nodes['restore-text'].textContent;delayed.resolve(await practice.file(L.serializeDraft(sample())).arrayBuffer());await reading;eq(practice.nodes['restore-text'].textContent,currentPreview);practice.click('restore-draft');eq(practice.nodes.csv.value,practiceData.csv);
practice.click('preview-practice');practice.click('preview-practice');practice.click('restore-draft');eq(practice.nodes.csv.value,practiceData.csv);ok(practice.nodes['download-csv'].disabled);

// Complete the practice route, retain a draft, and reopen with fresh review.
practice.input('csv',csv);practice.input('origin','manual');practice.input('check-note','I compared each count and kept the unstated count empty.');practice.change('harmless',true);practice.click('check');approve(practice);ok(!practice.nodes['download-csv'].disabled);practice.click('download-csv');eq(practice.last(),csv);practice.click('download-draft');const finishedPractice=practice.last();eq(L.parseDraft(finishedPractice).csv,csv);const freshPractice=harness();await freshPractice.open(freshPractice.file(finishedPractice));freshPractice.click('restore-draft');eq(freshPractice.nodes.csv.value,csv);ok(!freshPractice.nodes.harmless.checked);ok(freshPractice.nodes['download-csv'].disabled);ok(!freshPractice.nodes['final-reviewed'].checked);
const h=harness(),n=h.nodes;
h.click('download-draft');eq(JSON.parse(h.last()),empty());eq(h.downloads[0].name,'learn4free-notes-editable-draft.json');eq(h.downloads[0].blob.type,'application/json;charset=utf-8');ok(n['download-csv'].disabled);
enter(h);approve(h);h.click('build-prompt');h.change('prompt-reviewed',true);const before=state(h);ok(!n['download-csv'].disabled);ok(!n['copy-prompt'].disabled);
h.click('download-draft');const saved=h.last(),data=JSON.parse(saved);eq(data,sample());eq(state(h),before,'saving does not change checked work');for(const key of ['harmless','checked','prompt','approval','reviewed'])ok(!Object.hasOwn(data,key));
await h.open(h.file(saved));eq(state(h),before);ok(!n['restore-preview'].hidden);eq(JSON.parse(n['restore-text'].textContent),data);ok(n['restore-title'].focused);ok(!n['download-csv'].disabled,'preview does not destroy existing approvals');
h.setYes(false);h.click('restore-draft');eq(state(h),before);ok(!n['restore-preview'].hidden);h.click('cancel-restore');eq(state(h),before);ok(n['restore-preview'].hidden);ok(n['restore-draft'].disabled);
await h.open(h.file(saved));h.setYes(true);h.click('restore-draft');eq(n.sources.value,notes);eq(n.csv.value,csv);eq(n['check-note'].value,data.note);ok(!n.harmless.checked);eq(n.prompt.value,'');ok(!n['prompt-reviewed'].checked);ok(!n['final-reviewed'].checked);ok(n['copy-prompt'].disabled);ok(n['download-csv'].disabled);ok(n['download-record'].disabled);ok(n['review-panel'].hidden);ok(n['source-title'].focused);
const downloadCount=h.downloads.length;h.click('download-csv');h.click('download-record');eq(h.downloads.length,downloadCount);h.click('check');ok(n['check-result'].textContent.includes('harmless'));h.change('harmless',true);h.click('check');eq(n['excerpt-0'].value,'Blue card');eq(n['excerpt-1'].value,'8');ok(!n['comparison-0'].checked);ok(!n['comparison-3'].checked,'unknown declaration is never restored');h.change('final-reviewed',true);ok(n['download-csv'].disabled);approve(h);ok(!n['download-csv'].disabled);h.click('download-csv');eq(h.last(),csv,'rechecked restored CSV exports exact current text');
// Invalid text can be saved and restored without needing a structure check or privacy approval.
const unfinished={...empty(),sources:'001 | <img src=x onerror=bad()>\nunfinished',columns:'Item,,',csv:'source_id,item\n001,=unsafe\n"unfinished',origin:'external',note:'<script>literal</script>\nnot checked',excerpts:[{key:'001:item',quote:'<img src=x onerror=bad()>'}]};
await h.open(h.file(L.serializeDraft(unfinished)));ok(n['restore-text'].textContent.includes('<img src=x onerror=bad()>'));h.click('restore-draft');for(const [id,key] of [['sources','sources'],['columns','columns'],['csv','csv'],['origin','origin'],['check-note','note']])eq(n[id].value,unfinished[key]);h.click('download-draft');eq(JSON.parse(h.last()),unfinished);h.change('harmless',true);h.click('check');ok(n['download-csv'].disabled);eq(n.csv.value,unfinished.csv);
// Empty drafts intentionally replace only after preview + confirmation.
await h.open(h.file(L.serializeDraft(empty())));h.click('restore-draft');eq(n.csv.value,'');eq(n.sources.value,'');h.click('download-draft');eq(JSON.parse(h.last()),empty());
// Inputs that a browser would normalize are rejected before any replacement.
for(const edit of [{sources:'001 | note\r\n002 | next'},{columns:'it\nem'},{csv:'source_id,item\r\n001,x'},{note:'a\rb'},{excerpts:[{key:'001:item',quote:'a\r\nb'}]}]){
  const original=state(h);await h.open(h.file(L.serializeDraft({...empty(),...edit})));eq(state(h),original);ok(n['restore-preview'].hidden);ok(n['draft-status'].textContent.includes('would change'));
}
// Every editable input, consent change or recheck invalidates pending replacement.
enter(h);approve(h);
for(const mutate of [()=>h.input('sources',notes+' '),()=>h.input('columns',columns+' '),()=>h.input('csv',csv+'\n'),()=>h.input('origin','external'),()=>h.input('check-note','edited'),()=>h.input('excerpt-0','Blue'),()=>h.change('comparison-0',false),()=>h.change('harmless',false),()=>h.change('final-reviewed',false),()=>h.click('build-prompt'),()=>h.change('prompt-reviewed',false),()=>h.click('check')]){
  enter(h);approve(h);await h.open(h.file(saved));mutate();ok(n['restore-preview'].hidden);ok(n['restore-draft'].disabled);const altered=state(h);h.click('restore-draft');eq(state(h),altered);
}
// Direct DOM changes without events cannot use an old preview; edit+revert events cannot revive it.
enter(h);await h.open(h.file(saved));n.csv.value='direct change';h.click('restore-draft');eq(n.csv.value,'direct change');ok(n['restore-preview'].hidden);
enter(h);await h.open(h.file(saved));h.input('csv','changed');h.input('csv',csv);h.click('restore-draft');ok(n.harmless.checked);ok(n['restore-preview'].hidden);
// Confirmation-time stale work also cannot be overwritten.
await h.open(h.file(saved));h.setConfirm(()=>{n.csv.value='changed during confirmation';});h.click('restore-draft');eq(n.csv.value,'changed during confirmation');h.setConfirm(()=>{});
// Clear cancellation leaves preview and work; confirmed Clear cancels pending files/preview.
enter(h);approve(h);await h.open(h.file(saved));const keep=state(h);h.setYes(false);h.click('clear');eq(state(h),keep);ok(!n['restore-preview'].hidden);h.setYes(true);h.click('clear');eq(n.csv.value,'');ok(n['restore-preview'].hidden);h.click('restore-draft');eq(n.csv.value,'');
// Reject malformed/versioned/extra fields, oversize, damaged UTF-8 and failed reads without mutation.
enter(h);approve(h);const unchanged=state(h);
let called=0;await h.open(h.file('',{size:L.draftBytes+1,arrayBuffer:async()=>{called++;}}));eq(called,0);eq(state(h),unchanged);
for(const value of ['not JSON',JSON.stringify({...sample(),approval:true}),JSON.stringify({...sample(),version:2}),L.serializeDraft(sample()).replace('"version": 1','"version": 1,"version": 1')]){await h.open(h.file(value));eq(state(h),unchanged);ok(n['restore-preview'].hidden);}
await h.open(h.file('',{size:2,arrayBuffer:async()=>Uint8Array.from([0xc3,0x28]).buffer}));ok(n['draft-status'].textContent.includes('encoding'));eq(state(h),unchanged);
await h.open(h.file(saved,{size:1}));ok(n['draft-status'].textContent.includes('file size changed'));eq(state(h),unchanged);
await h.open(h.file(saved,{arrayBuffer:async()=>{throw Error('read failed');}}));ok(n['draft-status'].textContent.includes('read failed'));eq(state(h),unchanged);
await h.open();eq(state(h),unchanged);ok(n['restore-preview'].hidden);
// A newer file wins even if older successes or failures arrive later.
for(const fail of [false,true]){
 const d=deferred(),old=h.open(h.file(saved,{arrayBuffer:()=>d.promise})),newData={...empty(),sources:'newer draft'};await h.open(h.file(L.serializeDraft(newData)));const preview=n['restore-text'].textContent,status=n['draft-status'].textContent;
 if(fail)d.reject(Error('late error'));else d.resolve(await h.file(saved).arrayBuffer());await old;eq(n['restore-text'].textContent,preview);eq(n['draft-status'].textContent,status);h.click('cancel-restore');
}
// New invalid selection still defeats an earlier valid in-flight read.
let d=deferred(),old=h.open(h.file(saved,{arrayBuffer:()=>d.promise}));ok(!n['cancel-restore'].hidden,'cancel is available during an in-flight read');await h.open(h.file('{'));d.resolve(await h.file(saved).arrayBuffer());await old;ok(n['restore-preview'].hidden);ok(n['draft-status'].textContent.includes('Could not open'));
for(const mutate of [()=>h.input('check-note','while reading'),()=>{n.csv.value='silent change while reading';},()=>h.click('clear'),()=>h.click('cancel-restore')]){
 enter(h);d=deferred();old=h.open(h.file(saved,{arrayBuffer:()=>d.promise}));mutate();const current=state(h);d.resolve(await h.file(saved).arrayBuffer());await old;eq(state(h),current);ok(n['restore-preview'].hidden);
}
// Pending clipboard completions never approve or stamp success on restored work.
enter(h);h.click('build-prompt');h.change('prompt-reviewed',true);d=deferred();h.setClipboard(()=>d.promise);const copying=h.click('copy-prompt');await h.open(h.file(saved));h.click('restore-draft');d.resolve();await copying;eq(n['prompt-state'].textContent,'Nothing has been prepared, copied or sent.');ok(n['copy-prompt'].disabled);
// Save rejects out-of-bounds drafts as a whole and leaves every character in the editor.
for(const [id,max] of [['sources',7000],['columns',150],['csv',12000],['check-note',1600]]){
 enter(h);h.input(id,'x'.repeat(max+1));const length=h.downloads.length;h.click('download-draft');eq(h.downloads.length,length);eq(n[id].value.length,max+1);ok(n['draft-status'].textContent.includes('Nothing was shortened'));
}
enter(h);h.input('excerpt-0','x'.repeat(501));let count=h.downloads.length;h.click('download-draft');eq(h.downloads.length,count);eq(n['excerpt-0'].value.length,501);
// Changing an extracted value to blank does not destroy its excerpt draft.
enter(h);h.input('excerpt-0','Blue card');h.input('excerpt-1','8 sheets');h.input('csv',csv.replace('Blue card,8','Blue card,'));h.click('check');h.click('download-draft');ok(JSON.parse(h.last()).excerpts.some(x=>x.key==='001:count'&&x.quote==='8 sheets'));
h.input('csv',csv);h.click('check');eq(n['excerpt-1'].value,'8 sheets');ok(!n['comparison-1'].checked);
// Lossless JSON escaping preserves text that direct Blob CSV output would replace.
h.input('check-note','literal \ud800 and \u0000');h.click('download-draft');const lone=h.last();await h.open(h.file(lone));h.click('restore-draft');eq(n['check-note'].value,'literal \ud800 and \u0000');
// Download failures keep work and release object URLs.
enter(h);h.setAnchorError(true);const retained=state(h);h.click('download-draft');eq(state(h),retained);ok(n['draft-status'].textContent.includes('download blocked'));for(const timer of h.timers)timer();eq(h.revoked.length,h.downloads.length+1);
if(process.env.NOTES_CSV_DRAFT_EVIDENCE==='1'){
 const fixture=harness();fixture.input('sources','007 | Labels, "large": 5 in tray, code 0012.\n008 | Clips in drawer; count unknown, code 03/04.\n009 | Labels, "large": 0 in box, code 0012.');fixture.input('columns','item,count,code');fixture.input('csv','source_id,item,count,code\n007,"Labels, ""large""",5,0012\n008,Clips,,03/04\n009,"Labels, ""large""",0,0012');fixture.input('origin','manual');fixture.input('check-note','Fictional automated controller fixture: compare the opened spreadsheet separately.');fixture.change('harmless',true);fixture.click('check');approve(fixture);fixture.click('download-csv');ok(fixture.last(),'controller fixture exported only after fresh review');
 fs.mkdirSync('verification',{recursive:true});fs.writeFileSync('verification/notes-csv-import-fixture.csv',fixture.last());fs.writeFileSync('verification/notes-csv-editable-example.json',saved);fs.writeFileSync('verification/notes-csv-unfinished-example.json',L.serializeDraft(unfinished));
}
console.log('PASS: '+assertions+' editable CSV draft assertions: strict bounded versioned schema; duplicate/extra/approval rejection; lossless invalid drafts; literal preview; safe cancellation; fresh checks/approvals; exact restored output; edit/revert and direct changes; newer-file, Clear and clipboard races; UTF-8 and control normalization guards; failed reads/downloads.');
})().catch(e=>{console.error(e);process.exitCode=1;});
