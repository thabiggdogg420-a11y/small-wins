'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),L=require('./public/ai-schedule.js');
let assertions=0;const ok=(v,m)=>{assert.ok(v,m);assertions++;},eq=(a,b,m)=>{assert.deepEqual(a,b,m);assertions++;},throws=(f,r)=>{assert.throws(f,r);assertions++;};
const clone=x=>JSON.parse(JSON.stringify(x)),keys=['label','minutes','fixed','after','start','end'];
const empty=()=>({format:L.draftFormat,version:1,start:'',end:'',note:'',rows:Array.from({length:5},()=>Object.fromEntries(keys.map(k=>[k,''])))});
const sample=()=>{const d=empty();d.start='09:00';d.end='10:30';d.note='Confirm realistic durations and available materials.\nFictional QA only.';d.rows[0]={label:'Prepare materials',minutes:'020',fixed:'09:00',after:'',start:'09:00',end:'09:20'};d.rows[2]={label:'Make a sample',minutes:'030',fixed:'',after:'1',start:'09:20',end:'09:50'};d.rows[4]={label:'Pack materials',minutes:'010',fixed:'',after:'3',start:'10:00',end:'10:10'};return d;};
const partial=()=>{const d=sample();d.rows[4].end='';d.note='  café e\u0301 🦉\n<svg onload=bad()>\\ quoted "text"  ';d.rows[0].label='  Keep  spacing  ';return d;};
for(const data of [empty(),sample(),partial()])eq(L.parseDraft(L.serializeDraft(data)),data,'lossless raw schema');
for(const data of [null,{},[],5,'x',{...empty(),format:'other'},{...empty(),version:2},{...empty(),version:'1'}])throws(()=>L.draft(data),/fields|version/);
for(const field of ['checked','approval','feedback','reviewed','prompt','first','help','learningCredit','__proto__','constructor']){const d=empty();Object.defineProperty(d,field,{value:true,enumerable:true});throws(()=>L.draft(d),/fields/);}
for(const [key,max] of [['start',5],['end',5],['note',2000]]){
  for(const val of [null,3,false,{},[],'x'.repeat(max+1)])throws(()=>L.draft({...empty(),[key]:val}),/text within/);
  eq(L.parseDraft(L.serializeDraft({...empty(),[key]:'x'.repeat(max)}))[key].length,max);
}
for(const rows of [null,{},[],Array(5),Array(4).fill({}),Array(6).fill({}),[...empty().rows.slice(0,4),null]])throws(()=>L.draft({...empty(),rows}),/rows|fields/);
for(let i=0;i<5;i++){
  for(const [key,max] of [['label',100],['minutes',3],['fixed',5],['start',5],['end',5]]){
    for(const val of [null,3,false,{},[],'x'.repeat(max+1)]){const d=empty();d.rows[i][key]=val;throws(()=>L.draft(d),/text within/);}
    const d=empty();d.rows[i][key]='x'.repeat(max);eq(L.parseDraft(L.serializeDraft(d)),d);
  }
  for(const after of ['x','0','6',String(i+1),null,2,false,' 1']){const d=empty();d.rows[i].after=after;throws(()=>L.draft(d),/follow|text within/);}
  for(const after of ['',...['1','2','3','4','5'].filter(k=>k!==String(i+1))]){const d=empty();d.rows[i].after=after;eq(L.parseDraft(L.serializeDraft(d)),d,'dependency identity survives blank target');}
  for(const field of ['id','checked','approval','extra']){const d=empty();d.rows[i][field]='x';throws(()=>L.draft(d),/fields/);}
}
const maximum=empty();maximum.start=maximum.end='\u0000'.repeat(5);maximum.note='\u0000'.repeat(2000);maximum.rows.forEach((r,i)=>keys.forEach(k=>r[k]=k==='after'?String((i+1)%5+1):'\u0000'.repeat(k==='label'?100:k==='minutes'?3:5)));
const maxText=L.serializeDraft(maximum);ok(Buffer.byteLength(maxText)<L.draftBytes);eq(L.parseDraft(maxText),maximum);
const valid=L.serializeDraft(sample());
for(const text of ['', '{', 'null','[]','{}',valid+' trailing',' '.repeat(L.draftBytes+1),'[ [[ [] ]] ]',valid.replace('"version": 1','"version": 1, "version": 1'),valid.replace('"version": 1','"version": 1, "\\u0076ersion": 1'),valid.replace('"minutes": "020"','"minutes": "020", "\\u006dinutes": "030"'),valid.replace('"rows": [','"rows": {}, "rows": ['),'\ufeff'+valid])throws(()=>L.parseDraft(text),/JSON|fields|KiB/);
const weird=partial();weird.rows[1].label='literal \ud800 \u0000';weird.note+='\udc00';eq(L.parseDraft(L.serializeDraft(weird)),weird,'escaped unpaired code units survive JSON without UTF-8 replacement');
const html=fs.readFileSync('public/ai-schedule.html','utf8'),core=fs.readFileSync('public/ai-schedule.js','utf8'),ui=fs.readFileSync('public/ai-schedule-ui.js','utf8');
for(const text of [core,ui])ok(!/innerHTML|outerHTML|insertAdjacentHTML|fetch\s*\(|XMLHttpRequest|sendBeacon|localStorage|sessionStorage|eval\s*\(|new Function/.test(text));
for(const text of ['Save or reopen my editable planner','unencrypted','actual newest file','does not prove saving','Clear does not delete downloaded copies','never practice answers','Nothing is uploaded or automatically saved'])ok(html.includes(text),text);
const ownIds=['own-start','own-end','own-note',...Array.from({length:5},(_,i)=>keys.map(k=>'own-'+(i+1)+'-'+k)).flat()];eq(ownIds.length,33);
function harness(sources={core,ui}){
  const nodes={},downloads=[],revoked=[],timers=[],globalHandlers={};let yes=true,confirmAction=()=>{},confirms=0,anchorError=false,writeFault=null;
  function node(tag='div',id=''){
    let value='';const n={tag,id,type:tag==='input'?'text':undefined,checked:false,hidden:false,disabled:false,children:[],handlers:{},attributes:{},textContent:'',files:[],focus(){this.focused=true;},select(){},setAttribute(k,v){this.attributes[k]=v;},append(...e){this.children.push(...e);},replaceChildren(...e){this.children=e;},remove(){this.removed=true;},addEventListener(k,f){(this.handlers[k]??=[]).push(f);},emit(k){let result;for(const f of this.handlers[k]||[])result=f();return result;},click(){if(tag==='a'){if(anchorError)throw Error('download blocked');downloads.push({name:this.download,blob:this.href});}else return this.emit('click');}};
    // Native textarea.type is getter-only; strict-mode assignment must throw.
    if(tag==='textarea')Object.defineProperty(n,'type',{get:()=> 'textarea',configurable:false});
    Object.defineProperty(n,'value',{get:()=>value,set:v=>{
      if(writeFault&&id===writeFault.id&&v===writeFault.value){const fault=writeFault;writeFault=null;if(fault.normalize){value='normalized';return;}throw Error('simulated writeback failure');}
      value=String(v);if(tag==='textarea')value=value.replace(/\r\n?/g,'\n');else if(tag==='input'&&n.type==='text')value=value.replace(/[\r\n]/g,'');else if(tag==='select'&&id.startsWith('own-')&&id.endsWith('-after')&&!['','1','2','3','4','5'].filter(k=>k!==id.split('-')[1]).includes(value))value='';if(n.type==='file'&&value==='')n.files=[];
    }});return n;
  }
  for(const [,tag,attrs,id,tail] of html.matchAll(/<([a-z0-9-]+)\b([^>]*?)\bid="([^"]+)"([^>]*)>/g)){
    const n=nodes[id]=node(tag,id),all=attrs+tail,type=all.match(/type="([^"]+)"/)?.[1];if(type)n.type=type;n.hidden=/\bhidden\b/.test(all);n.disabled=/\bdisabled\b/.test(all);
  }
  const ctx={document:{getElementById:id=>{assert.ok(nodes[id],id);return nodes[id];},createElement:tag=>node(tag),body:node()},navigator:{clipboard:{writeText:async()=>{}}},confirm:()=>{confirms++;confirmAction();return yes;},Blob,URL:{createObjectURL:b=>b,revokeObjectURL:b=>revoked.push(b)},TextDecoder,setTimeout:f=>timers.push(f),addEventListener:(type,fn)=>globalHandlers[type]=fn};ctx.window=ctx;
  vm.runInNewContext(sources.core,ctx);vm.runInNewContext(sources.ui,ctx);
  const click=id=>nodes[id].emit('click'),input=(id,v)=>{nodes[id].value=v;return nodes[id].emit('input');},change=(id,v)=>{nodes[id].checked=v;return nodes[id].emit('change');};
  const file=(text,overrides={})=>{const bytes=Buffer.from(text,'utf8');return {size:bytes.length,arrayBuffer:async()=>bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.length),...overrides};};
  return {nodes,downloads,revoked,timers,click,input,change,file,open:async f=>{nodes['own-open-draft'].files=f?[f]:[];return nodes['own-open-draft'].emit('change');},pagehide:()=>globalHandlers.pagehide?.(),setYes:v=>yes=v,setConfirm:f=>confirmAction=f,setAnchorError:v=>anchorError=v,setWriteFault:f=>writeFault=f,get confirms(){return confirms;},last:async()=>downloads.at(-1)?.blob.text()};
}
function values(h){const n=h.nodes;return {start:n['own-start'].value,end:n['own-end'].value,note:n['own-note'].value,rows:Array.from({length:5},(_,i)=>Object.fromEntries(keys.map(k=>[k,n['own-'+(i+1)+'-'+k].value])))};}
function enter(h,data=sample()){const list=[data.start,data.end,data.note,...data.rows.flatMap(row=>keys.map(k=>row[k]))];ownIds.forEach((id,i)=>h.input(id,list[i]));}
function approve(h){h.click('own-check');h.change('own-reviewed',true);ok(!h.nodes['own-download'].disabled);}
function state(h){return JSON.stringify({values:values(h),reviewed:h.nodes['own-reviewed'].checked,disabled:h.nodes['own-download'].disabled,feedback:h.nodes['own-feedback'].textContent});}
function previewed(h){return !h.nodes['own-restore-preview'].hidden&&!h.nodes['own-restore'].disabled;}
function deferred(){let resolve,reject;const promise=new Promise((r,j)=>{resolve=r;reject=j;});return {promise,resolve,reject};}
(async()=>{
const h=harness(),n=h.nodes;
h.click('own-save-draft');eq(JSON.parse(await h.last()),empty());eq(h.downloads[0].name,'learn4free-my-timetable-draft.json');eq(h.downloads[0].blob.type,'application/json;charset=utf-8');
enter(h);approve(h);const before=state(h);h.click('own-save-draft');const saved=await h.last();eq(JSON.parse(saved),sample());eq(state(h),before);await h.open(h.file(saved));eq(state(h),before);ok(previewed(h));eq(JSON.parse(n['own-restore-text'].textContent),sample());ok(n['own-restore-title'].focused);
h.setYes(false);h.click('own-restore');eq(state(h),before);ok(!previewed(h),'declining confirmation cancels this lifecycle');h.setYes(true);await h.open(h.file(saved));h.click('own-cancel-restore');eq(state(h),before);ok(!previewed(h));
await h.open(h.file(saved));h.click('own-restore');eq(values(h),(({format,version,...v})=>v)(sample()));ok(n['own-download'].disabled);ok(!n['own-reviewed'].checked);ok(n['own-feedback'].textContent.includes('no timetable checked'));h.change('own-reviewed',true);ok(n['own-download'].disabled);h.click('own-download');eq(h.downloads.length,2);approve(h);h.click('own-download');ok((await h.last()).includes('SOURCE CONSTRAINTS'));
// True cold byte roundtrip: a new controller sees only the saved UTF-8 file, no in-memory model.
enter(h,partial());h.click('own-save-draft');const bytes=Buffer.from(await h.downloads.at(-1).blob.arrayBuffer());const cold=harness();await cold.open(cold.file('',{size:bytes.length,arrayBuffer:async()=>bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.length)}));ok(previewed(cold));cold.click('own-restore');eq(values(cold),(({format,version,...v})=>v)(partial()));cold.click('own-save-draft');eq(await cold.last(),bytes.toString('utf8'));eq(cold.nodes['own-2-label'].value,'');eq(cold.nodes['own-3-after'].value,'1');eq(cold.nodes['own-1-minutes'].value,'020');eq(cold.nodes['own-5-end'].value,'');ok(cold.nodes['own-download'].disabled);cold.click('own-check');ok(cold.nodes['own-download'].disabled);cold.input('own-5-end','10:10');approve(cold);cold.click('own-download');ok((await cold.last()).includes('Pack materials'));
// Every one of the 33 strings, including holes/dependencies/Unicode, is read from the raw editor.
const all=empty();all.start=' bad ';all.end='24:00';all.note='  🦉 e\u0301\n\\ <script>literal</script>\u0000\ud800';all.rows.forEach((r,i)=>Object.assign(r,{label:'  row '+(i+1)+' 🦉  ',minutes:'00'+i,fixed:'nope ',after:String((i+1)%5+1),start:'09:0'+i,end:'??:??'}));enter(h,all);h.click('own-save-draft');eq(JSON.parse(await h.last()),all);const other=harness();await other.open(other.file(await h.last()));other.click('own-restore');eq(values(other),(({format,version,...v})=>v)(all));other.click('own-check');ok(other.nodes['own-download'].disabled,'invalid and cyclic drafts cannot import success');
// Invalid native-control normalization never reaches replacement, even in otherwise valid JSON.
enter(h);approve(h);for(const change of [d=>d.start='\r9:00',d=>d.rows[1].label='a\nb',d=>d.rows[2].minutes='2\r',d=>d.note='a\rb',d=>d.note='a\r\nb']){const d=sample();change(d);const old=state(h);await h.open(h.file(L.serializeDraft(d)));eq(state(h),old);ok(!previewed(h));ok(n['own-draft-status'].textContent.includes('would change'));}
// Invalid/malformed/oversize/read failure preserves approved work; stale failures never stamp over newer work.
const stable=state(h);let calls=0;await h.open(h.file('',{size:L.draftBytes+1,arrayBuffer:async()=>{calls++;}}));eq(calls,0);eq(state(h),stable);
for(const bad of ['{','not json',JSON.stringify({...sample(),approval:true}),JSON.stringify({...sample(),version:2}),saved.replace('"version": 1','"version": 1,"\\u0076ersion": 1'),'\ufeff'+saved]){await h.open(h.file(bad));eq(state(h),stable);ok(!previewed(h));}
await h.open(h.file('',{size:2,arrayBuffer:async()=>Uint8Array.from([0xc3,0x28]).buffer}));ok(n['own-draft-status'].textContent.includes('encoding'));eq(state(h),stable);
await h.open(h.file(saved,{size:1}));ok(n['own-draft-status'].textContent.includes('file size changed'));eq(state(h),stable);
await h.open(h.file(saved,{arrayBuffer:async()=>{throw Error('read failed');}}));ok(n['own-draft-status'].textContent.includes('read failed'));eq(state(h),stable);
await h.open();eq(state(h),stable);ok(!previewed(h));
// Each own-field event, edit/revert, checker/review, selection/cancel and lifecycle invalidates review.
for(const id of ownIds){enter(h);approve(h);await h.open(h.file(saved));const value=n[id].value;h.input(id,id.endsWith('-after')?'':value+'x');h.input(id,value);ok(!previewed(h),id);const changed=state(h);h.click('own-restore');eq(state(h),changed);}
for(const action of [()=>h.click('own-check'),()=>h.change('own-reviewed',false),()=>h.click('own-open-draft'),()=>n['own-open-draft'].emit('cancel'),()=>h.pagehide()]){enter(h);approve(h);await h.open(h.file(saved));action();ok(!previewed(h));const after=state(h);h.click('own-restore');eq(state(h),after);}
enter(h);approve(h);await h.open(h.file(saved));n['own-note'].value='direct edit without event';h.click('own-restore');eq(n['own-note'].value,'direct edit without event');ok(!previewed(h));
// Reentrant confirmation cannot overwrite changed work, checks, a newer file, or Clear.
for(const action of [()=>{n['own-note'].value='during confirmation';},()=>{h.input('own-note','edit');h.input('own-note',sample().note);},()=>h.click('own-check'),()=>h.change('own-reviewed',false),()=>h.click('own-cancel-restore'),()=>h.pagehide(),()=>h.open(h.file(saved))]){
  enter(h);approve(h);await h.open(h.file(L.serializeDraft(partial())));h.setConfirm(action);h.click('own-restore');h.setConfirm(()=>{});eq(n['own-5-end'].value,'10:10');await Promise.resolve();h.click('own-cancel-restore');
}
// Read races: newer valid/invalid selection, edits, resets, pagehide and cancellation always win.
for(const fail of [false,true]){enter(h);approve(h);const d=deferred(),p=h.open(h.file(saved,{arrayBuffer:()=>d.promise}));await h.open(h.file(L.serializeDraft(partial())));const preview=n['own-restore-text'].textContent,status=n['own-draft-status'].textContent;if(fail)d.reject(Error('late failure'));else d.resolve(await h.file(saved).arrayBuffer());await p;eq(n['own-restore-text'].textContent,preview);eq(n['own-draft-status'].textContent,status);}
for(const action of [()=>h.input('own-note','changed while reading'),()=>{n['own-note'].value='silent read edit';},()=>h.click('own-check'),()=>h.change('own-reviewed',false),()=>h.click('own-clear'),()=>h.click('own-cancel-restore'),()=>n['own-open-draft'].emit('cancel'),()=>h.pagehide(),()=>h.open(h.file('{'))])for(const fail of [false,true]){
  enter(h);approve(h);const d=deferred(),p=h.open(h.file(saved,{arrayBuffer:()=>d.promise}));ok(!n['own-cancel-restore'].hidden);await action();const changed=state(h);if(fail)d.reject(Error('late failure'));else d.resolve(await h.file(saved).arrayBuffer());await p;eq(state(h),changed);ok(!previewed(h));ok(!n['own-draft-status'].textContent.includes('late failure'));
}
// Exact control readback failures roll back prior assignments without revoking prior approval.
for(const normalize of [false,true]){enter(h);approve(h);const d=partial();d.start='08:00';const old=state(h);await h.open(h.file(L.serializeDraft(d)));h.setWriteFault({id:'own-5-end',value:'',normalize});h.click('own-restore');eq(state(h),old);ok(n['own-draft-status'].textContent.includes('original entries were restored'));ok(!previewed(h));}
// Independent reset scopes, including retained first-attempt practice evidence and help boundary.
const lesson=harness();enter(lesson);approve(lesson);lesson.input('origin','manual');lesson.input('other-help','none');const good='setup | 09:10 | 09:30\nwelcome | 09:30 | 09:40\nmake | 09:45 | 10:30\nbreak | 10:30 | 10:45\npack | 11:10 | 11:30';lesson.input('raw',good);lesson.click('submit-first');lesson.input('note','Check actual availability.');lesson.change('final-reviewed',true);lesson.click('download-record');const record=await lesson.last();await lesson.open(lesson.file(saved));lesson.click('own-restore');lesson.click('download-record');eq(await lesson.last(),record,'restore does not alter practice evidence or review');lesson.click('next-task');ok(lesson.nodes['own-planner'].hidden);lesson.click('open-own-planner');ok(!lesson.nodes['own-planner'].hidden);ok(lesson.nodes['help-status'].textContent.includes('separate planner opened'));
lesson.input('raw','Retain my changed attempt');lesson.click('own-clear');eq(lesson.nodes.raw.value,'Retain my changed attempt');enter(lesson);approve(lesson);const own=state(lesson);await lesson.open(lesson.file(saved));lesson.setYes(false);lesson.click('clear');eq(state(lesson),own);ok(previewed(lesson));lesson.setYes(true);lesson.click('clear');eq(state(lesson),own);ok(previewed(lesson),'lesson reset leaves isolated planner preview alone');lesson.setYes(false);lesson.click('own-clear');eq(state(lesson),own);ok(!previewed(lesson));lesson.setYes(true);lesson.click('own-clear');eq(values(lesson),(({format,version,...v})=>v)(empty()));ok(lesson.nodes['own-download'].disabled);
// Download failure/oversize does not mutate work or assert OS-save success.
enter(h);approve(h);const prior=state(h),count=h.downloads.length;h.setAnchorError(true);h.click('own-save-draft');eq(h.downloads.length,count);eq(state(h),prior);ok(n['own-draft-status'].textContent.includes('download blocked'));h.setAnchorError(false);for(const timer of h.timers)timer();eq(h.revoked.length,h.downloads.length+1);
for(const [id,max] of [['own-start',5],['own-end',5],['own-note',2000],['own-1-label',100],['own-1-minutes',3],['own-1-fixed',5],['own-1-start',5],['own-1-end',5]]){enter(h);h.input(id,'x'.repeat(max+1));const count=h.downloads.length;h.click('own-save-draft');eq(h.downloads.length,count);eq(n[id].value.length,max+1);ok(n['own-draft-status'].textContent.includes('Nothing was shortened'));}
// Existing .txt outputs are pinned to fixtures captured from untouched public-v87 source.
let outputs=harness();if(process.env.SCHEDULE_CAPTURE_BASELINE==='1'){const cp=require('node:child_process'),sha='f327f9143a042398d65dbd1978111b91b8f97b41';outputs=harness({core:cp.execFileSync('git',['show',sha+':public/ai-schedule.js'],{encoding:'utf8'}),ui:cp.execFileSync('git',['show',sha+':public/ai-schedule-ui.js'],{encoding:'utf8'})});}
async function fixture(name){const text=await outputs.last(),path='verification/timetable-draft/'+name;if(process.env.SCHEDULE_CAPTURE_BASELINE==='1')fs.writeFileSync(path,text);else eq(text,fs.readFileSync(path,'utf8'),'exact baseline '+name);}
enter(outputs,partial());outputs.click('own-record');await fixture('baseline-unfinished-record.txt');enter(outputs);approve(outputs);outputs.click('own-download');await fixture('baseline-reviewed-plan.txt');outputs.click('own-record');await fixture('baseline-reviewed-record.txt');
outputs.input('origin','manual');outputs.input('other-help','none');outputs.input('raw',good);outputs.click('submit-first');outputs.input('note','Check actual availability.');outputs.change('final-reviewed',true);outputs.click('download-record');await fixture('baseline-task1-record.txt');outputs.click('download-sheet');await fixture('baseline-task1-sheet.txt');outputs.click('next-task');outputs.input('origin','manual');outputs.input('other-help','none');outputs.input('raw','setup | 10:00 | 10:25\ndemo | 10:30 | 10:50\nbreak | 10:50 | 11:00\npractice | 11:00 | 11:40\npack | 11:45 | 12:00');outputs.click('submit-first');outputs.input('note','Keep the break before practice.');outputs.change('final-reviewed',true);outputs.click('download-record');await fixture('baseline-task2-record.txt');outputs.click('download-sheet');await fixture('baseline-task2-sheet.txt');
if(process.env.SCHEDULE_DRAFT_EVIDENCE==='1'){fs.writeFileSync('verification/timetable-draft/unfinished-draft.json',L.serializeDraft(partial()));fs.writeFileSync('verification/timetable-draft/checked-input-draft.json',saved);fs.writeFileSync('verification/timetable-draft/cold-reopened-draft.json',bytes);}
console.log('PASS: '+assertions+' own-timetable draft assertions: strict raw 33-field schema; cold UTF-8 roundtrip; exact row identity; literal Unicode and invalid work; fresh checks; cancellation; normalized-input rejection; late reads/failures; confirm reentrancy; rollback; stage/help/reset isolation; unchanged baseline TXT bytes.');
})().catch(e=>{console.error(e);process.exitCode=1;});
