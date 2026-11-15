'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),L=require('./public/ai-schedule.js');
let assertions=0;function ok(v,m){assert.ok(v,m);assertions++;}function eq(a,b,m){assert.deepEqual(a,b,m);assertions++;}function throws(fn,re){assert.throws(fn,re);assertions++;}
const good=[
'setup | 09:10 | 09:30\nwelcome | 09:30 | 09:40\nmake | 09:45 | 10:30\nbreak | 10:30 | 10:45\npack | 11:10 | 11:30',
'setup | 10:00 | 10:25\ndemo | 10:30 | 10:50\nbreak | 10:50 | 11:00\npractice | 11:00 | 11:40\npack | 11:45 | 12:00'];
const clone=x=>JSON.parse(JSON.stringify(x));
for(let id=0;id<2;id++){
  const spec=L.task(id),r=L.analyze(spec,good[id]);ok(r.ok);eq(r.rows.length,5);eq(r.total,110);eq(r.gaps.reduce((n,g)=>n+g.minutes,0),id?10:40);
  ok(L.analyze(spec,good[id].split('\n').reverse().join('\r\n')).ok,'line order does not determine correctness');
  ok(L.analyze(spec,'  '+good[id]+'\n').ok,'harmless whitespace is accepted');
  const sheet=L.runSheet(spec,good[id],'I checked the fixed start and full durations. Confirm real availability.');
  ok(sheet.includes('UNALLOCATED TIME'));ok(sheet.includes('No calendar date'));ok(sheet.includes('not independent verification'));ok(sheet.includes('SOURCE CONSTRAINTS'));
  for(const a of spec.activities)ok(sheet.includes(a.label));
}
const alternate='setup | 09:00 | 09:20\nwelcome | 09:30 | 09:40\nmake | 09:40 | 10:25\nbreak | 10:25 | 10:40\npack | 10:40 | 11:00';
ok(L.analyze(L.task(0),alternate).ok,'any valid schedule passes, not one answer key');
for(const spec of [null,{}, {activities:[null]}, {activities:[1]}, {activities:[{id:'a',after:null}]}]){ok(L.specIssues(spec).length>0);ok(!L.analyze(spec,good[0]).ok);}
const bad=L.analyze(L.task(0),L.task(0).sample);ok(!bad.ok);const badText=L.feedback(bad);
for(const text of ['setup: needs 20','welcome: must start exactly 09:30','pack: needs 20','make overlaps break','break: must start after make'])ok(badText.includes(text),text);
for(const [text,issue] of [
  [good[0].replace('09:10','08:10'),'outside'],[good[0].replace('11:30','11:31'),'needs 20'],[good[0].replace('09:30 | 09:40','09:31 | 09:41'),'exactly 09:30'],
  [good[0]+'\nsetup | 09:00 | 09:20','more than once'],[good[0].replace('pack | 11:10 | 11:30','extra | 11:10 | 11:30'),'Unknown activity'],
  [good[0].split('\n').slice(1).join('\n'),'Missing activity setup'],[good[0].replace('09:10 | 09:30','23:50 | 00:10'),'end must be later'],
  [good[0].replace('09:10 | 09:30','09:10 | 09:10'),'needs 20'],[good[0].replace('09:45 | 10:30','09:35 | 10:20'),'after welcome'],
  [good[0].replace('09:45 | 10:30','09:20 | 10:05'),'welcome overlaps make']
]){const r=L.analyze(L.task(0),text);ok(!r.ok);ok(L.feedback(r).includes(issue),issue);throws(()=>L.runSheet(L.task(0),text,'check'),/correct the current/);}
for(const value of ['24:00','24:01','9:00','09:60','-1:00','09:00:00','','00:0',' 09:00','Infinity','NaN'])eq(L.time(value),null);
eq(L.time('00:00'),0);eq(L.time('23:59'),1439);eq(L.time('24:00',true),1440);eq(L.time('24:01',true),null);
for(const text of ['', 'x'.repeat(4001),'activity | start | end','setup,09:00,09:20','setup | 09:00 | 09:20 | extra','```\n'+good[0]+'\n```', 'a | 00:00 | 00:01\n'.repeat(11)])throws(()=>L.parse(text),/draft|4,000|Line|ten/);
throws(()=>L.task(2),/Unknown/);throws(()=>L.task('0'),/Unknown/);
for(const note of ['', 'x'.repeat(2001),null])throws(()=>L.runSheet(L.task(0),good[0],note),/checking note/);
const one={title:'Own plan',start:'23:00',end:'24:00',activities:[{id:'1',label:'One harmless task',minutes:60,fixed:'23:00',after:[]}]};
ok(L.analyze(one,'1 | 23:00 | 24:00').ok,'24:00 is valid only as same-day end');
for(const [change,issue] of [
  [s=>s.start='24:00','same-day'],[s=>s.end='00:00','same-day'],[s=>s.activities[0].minutes=null,'whole duration'],[s=>s.activities[0].minutes=0,'whole duration'],
  [s=>s.activities[0].minutes=1.5,'whole duration'],[s=>s.activities[0].minutes=721,'whole duration'],[s=>s.activities[0].fixed='24:00','fixed start'],
  [s=>s.activities[0].fixed='23:30','cannot fit'],[s=>s.activities[0].label='','label'],[s=>s.activities[0].label='A\nB','label'],
  [s=>s.activities[0].after=['2'],'missing'],[s=>s.activities[0].after=['1'],'cycle'],[s=>s.activities.push({...s.activities[0]}),'unique'],
  [s=>s.activities[0].minutes=61,'more than'],[s=>s.activities=[],'one to five'],[s=>s.activities=Array(6).fill(s.activities[0]),'one to five']
]){const s=clone(one);change(s);const issues=L.specIssues(s);ok(issues.length>0);ok(issues.join('\n').includes(issue),issue);ok(!L.analyze(s,'1 | 23:00 | 24:00').ok);}
const cycle={start:'09:00',end:'10:00',activities:[{id:'1',label:'A',minutes:20,fixed:'',after:['2']},{id:'2',label:'B',minutes:20,fixed:'',after:['1']}]};ok(L.specIssues(cycle).join('').includes('cycle'));
const impossible=clone(cycle);impossible.activities.forEach(a=>{a.after=[];a.fixed='09:00';});ok(!L.analyze(impossible,'1 | 09:00 | 09:20\n2 | 09:00 | 09:20').ok,'conflicting fixed starts cannot pass');
const literal=clone(one);literal.activities[0].label='<img src=x onerror=alert(1)>';ok(L.runSheet(literal,'1 | 23:00 | 24:00','<b>Literal note</b>').includes('<img src=x onerror=alert(1)>'),'download is plain text, not rendered markup');

const html=fs.readFileSync('public/ai-schedule.html','utf8'),src=fs.readFileSync('public/ai-schedule-ui.js','utf8');
const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);eq(new Set(ids).size,ids.length,'unique DOM IDs');
for(const match of src.matchAll(/\$\('([^']+)'\)/g))ok(ids.includes(match[1]),'controller target exists: '+match[1]);
for(const label of [...html.matchAll(/\bfor="([^"]+)"/g)].map(m=>m[1]))ok(ids.includes(label),'label target '+label);
for(const path of [...html.matchAll(/(?:src|href)="(\/[^"#]*)"/g)].map(m=>m[1]))ok(fs.existsSync('public'+(path==='/'?'/index.html':path)),path);
for(const f of ['public/ai-schedule.js','public/ai-schedule-ui.js','public/ai-schedule.html'])ok(!/\bfetch\s*\(|XMLHttpRequest|sendBeacon|localStorage|sessionStorage|\/api\/usage|eval\s*\(|new Function/.test(fs.readFileSync(f,'utf8')),'no execution, persistence or transport');
ok(!/innerHTML/.test(src));ok(html.includes('No AI runs here'));ok(html.includes('unknown duration is not zero'));ok(html.includes('not an automatic resume/import file'));
ok(fs.readFileSync('public/learn-redesign.js','utf8').includes('href="/ai-schedule.html"'));
function harness(){
  const nodes={},downloads=[];let yes=true,confirms=0,clipboard=async()=>{},pending=[];
  function node(id=''){return {id,value:'',textContent:'',checked:false,hidden:false,disabled:false,readOnly:false,children:[],handlers:{},attributes:{},focus(){this.focused=true;},select(){this.selected=true;},setAttribute(k,v){this.attributes[k]=v;},append(...e){this.children.push(...e);},replaceChildren(...e){this.children=e;},remove(){},addEventListener(k,f){this.handlers[k]=f;},click(){if(this.id)return this.handlers.click?.();downloads.push({name:this.download,blob:this.href});}};}
  ids.forEach(id=>nodes[id]=node(id));
  const context={ScheduleLesson:L,document:{getElementById(id){assert.ok(nodes[id],'missing ID '+id);return nodes[id];},createElement:()=>node(),body:node()},navigator:{clipboard:{writeText:t=>clipboard(t)}},confirm:()=>{confirms++;return yes;},Blob:class{constructor(parts,options){this.text=parts.join('');this.type=options.type;}},URL:{createObjectURL:b=>b,revokeObjectURL(){}},setTimeout:f=>pending.push(f)};
  vm.runInNewContext(src,context);const click=id=>nodes[id].handlers.click(),input=(id,value)=>{nodes[id].value=value;nodes[id].handlers.input();},change=(id,checked)=>{nodes[id].checked=checked;nodes[id].handlers.change();};
  return {nodes,downloads,click,input,change,setYes:v=>yes=v,get confirms(){return confirms;},setClipboard:f=>clipboard=f,last:()=>downloads.at(-1)?.blob.text};
}
(async()=>{
const h=harness(),n=h.nodes;
ok(n['copy-request'].disabled);ok(n['download-sheet'].disabled);ok(n.correction.hidden);eq(n['task-number'].textContent,'Task 1 of 2');ok(n['own-download'].disabled);
h.click('submit-first');ok(n.status.textContent.includes('Choose'));h.click('next-task');eq(n['task-number'].textContent,'Task 1 of 2');
h.click('download-record');ok(h.last().includes('Not submitted yet.'));ok(h.last().includes('Not currently reviewed.'));
h.input('raw','Keep this draft');h.setYes(false);h.click('load-example');eq(n.raw.value,'Keep this draft');h.setYes(true);h.click('load-example');eq(n.raw.value,L.task(0).sample);eq(n.origin.value,'prepared');
h.input('other-help','none');h.click('submit-first');ok(n.raw.readOnly);ok(n.origin.disabled);ok(!n.correction.hidden);ok(n.feedback.textContent.includes('overlaps'));eq(n.draft.value,L.task(0).sample);ok(n['correction-title'].focused);
h.click('download-record');ok(h.last().includes('"example":true'));ok(h.last().includes('"feedback":false'));ok(!h.last().includes('Hands-on practice'));
h.input('draft',good[0]);h.input('note','I kept all durations and welcome at 09:30. Real room availability still needs checking.');h.change('final-reviewed',true);ok(n['download-sheet'].disabled,'typing a plausible plan is not checking it');h.click('check-draft');h.change('final-reviewed',true);ok(!n['download-sheet'].disabled);h.click('download-sheet');ok(h.last().includes('09:10–09:30 | Set up the room'));ok(h.last().includes('UNALLOCATED TIME'));eq(h.downloads.at(-1).blob.type,'text/plain;charset=utf-8');
const raw=n.raw.value;h.click('submit-first');eq(n.raw.value,raw);h.click('download-record');ok(h.last().includes('Checks run in this tab: 2.'));
const note=n.note.value;h.input('draft',alternate);ok(n['download-sheet'].disabled);eq(n.note.value,note);h.input('draft',good[0]);h.change('final-reviewed',true);ok(n['download-sheet'].disabled,'edit/revert does not restore checks');h.click('check-draft');h.change('final-reviewed',true);ok(!n['download-sheet'].disabled);
h.input('note',note+' revised');h.input('note',note);ok(n['download-sheet'].disabled);h.change('final-reviewed',true);ok(!n['download-sheet'].disabled);
const request=n.request.value;h.input('request','Revised request');h.input('request',request);ok(n['download-sheet'].disabled);h.change('final-reviewed',true);ok(!n['download-sheet'].disabled);
h.input('other-help','person');h.input('other-help','none');ok(n['help-status'].textContent.includes('person'));ok(n['download-sheet'].disabled);h.change('final-reviewed',true);h.click('download-record');ok(h.last().includes('"person":false'));ok(h.last().includes('Current support record: example, person'));
let count=h.downloads.length;n.draft.value=good[0].replace('09:10','09:11');h.click('download-sheet');eq(h.downloads.length,count);ok(n['download-sheet'].disabled);h.input('draft',good[0]);h.click('check-draft');h.change('final-reviewed',true);
n.request.value='Changed without event';h.click('download-sheet');eq(h.downloads.length,count,'exact source/request snapshot checked at export');h.input('request',request);h.change('final-reviewed',true);
h.click('next-task');eq(n['task-number'].textContent,'Task 2 of 2');for(const id of ['raw','draft','request','note'])eq(n[id].value,'');ok(n['load-example'].hidden);ok(n['first-guidance'].hidden);ok(!n['changed-guidance'].hidden);ok(n.correction.hidden);ok(n['task-title'].focused);ok(n['own-planner'].hidden);ok(!n['open-own-planner'].hidden);
h.click('download-record');ok(!h.last().includes('Making session'));ok(!h.last().includes('09:10'));
h.input('origin','external');h.input('other-help','none');h.input('raw',good[1]);h.click('submit-first');ok(!n.raw.readOnly);h.input('request','Use the changed brief, fixed demo and full durations.');h.change('request-reviewed',true);await h.click('copy-request');ok(n['copy-status'].textContent.includes('Nothing was sent'));h.click('submit-first');ok(n.feedback.textContent.includes('satisfies every'));h.input('note','Break must finish before practice, unlike task 1. No real event is verified.');h.change('final-reviewed',true);ok(!n['download-sheet'].disabled);h.click('download-record');ok(h.last().includes('"example":false'));ok(h.last().includes('"external":true'));ok(!h.last().includes('Making session'));
h.click('previous-task');eq(n.raw.value,L.task(0).sample);h.input('note','Earlier note changed');ok(n['download-sheet'].disabled);h.click('next-task');eq(n.raw.value,good[1]);ok(n['download-sheet'].disabled);ok(n['help-status'].textContent.includes('example'));h.click('download-record');ok(h.last().includes('"example":false'),'historical help not rewritten');ok(h.last().includes('Current support record: example, external'));
h.click('hint');ok(!n['hint-text'].hidden);eq(n.hint.attributes['aria-expanded'],'true');h.change('final-reviewed',true);ok(!n['download-sheet'].disabled);h.click('hint');ok(n['download-sheet'].disabled,'repeat hint revokes review without deleting entries');h.change('final-reviewed',true);
h.click('open-own-planner');ok(!n['own-planner'].hidden);ok(n['own-title'].focused);ok(n['help-status'].textContent.includes('separate planner opened'));ok(n['download-sheet'].disabled);h.click('download-record');ok(h.last().includes('\"planner\":false'),'first help snapshot survives later planner exposure');
// Own planner is available without learning credit, blank rather than a copied answer.
for(let i=1;i<=5;i++)for(const key of ['label','minutes','fixed','after','start','end'])eq(n['own-'+i+'-'+key].value,'');
h.click('own-check');ok(n['own-feedback'].textContent.includes('one to five'));h.change('own-reviewed',true);ok(n['own-download'].disabled);
h.input('own-start','09:00');h.input('own-end','10:00');h.input('own-1-label','Prepare materials');h.input('own-1-start','09:00');h.input('own-1-end','09:20');h.click('own-check');ok(n['own-feedback'].textContent.includes('whole duration'),'unknown duration does not become zero');h.input('own-1-minutes','0');h.click('own-check');ok(n['own-feedback'].textContent.includes('whole duration'));h.input('own-1-minutes','20');h.input('own-1-fixed','09:00');h.input('own-2-label','Make a sample');h.input('own-2-minutes','30');h.input('own-2-after','1');h.input('own-2-start','09:20');h.input('own-2-end','09:50');h.input('own-note','Check whether twenty minutes is realistic and whether materials are available.');h.click('own-check');ok(n['own-feedback'].textContent.includes('satisfies every'));h.change('own-reviewed',true);ok(!n['own-download'].disabled);h.click('own-download');ok(h.last().includes('Prepare materials'));ok(h.last().includes('09:50–10:00 | 10 min'));ok(!h.last().includes('Demonstration'));
const ownNote=n['own-note'].value;h.input('own-2-start','09:19');eq(n['own-note'].value,ownNote);ok(n['own-download'].disabled);h.click('own-check');ok(n['own-feedback'].textContent.includes('overlaps'));h.input('own-2-start','09:20');h.change('own-reviewed',true);ok(n['own-download'].disabled);h.click('own-check');h.change('own-reviewed',true);ok(!n['own-download'].disabled);
h.input('own-note',ownNote+' More.');h.input('own-note',ownNote);ok(n['own-download'].disabled);h.change('own-reviewed',true);ok(!n['own-download'].disabled);
count=h.downloads.length;n['own-2-minutes'].value='31';h.click('own-download');eq(h.downloads.length,count);ok(n['own-download'].disabled);h.input('own-2-minutes','30');h.click('own-check');h.change('own-reviewed',true);
// Constraint edits, including labels and fixed slots, revoke review; impossible inputs remain recoverable.
h.input('own-1-label','New label');ok(n['own-download'].disabled);h.input('own-end','09:40');h.click('own-check');ok(n['own-feedback'].textContent.includes('more than'));eq(n['own-2-minutes'].value,'30');eq(n['own-note'].value,ownNote);
h.input('own-end','10:00');h.input('own-1-after','2');h.click('own-check');ok(n['own-feedback'].textContent.includes('cycle'));h.input('own-1-after','');h.input('own-3-after','5');h.click('own-check');ok(n['own-feedback'].textContent.includes('label'),'partly filled row is not silently dropped');h.input('own-3-after','');
h.input('own-1-fixed','09:40');h.click('own-check');ok(n['own-feedback'].textContent.includes('exactly'));h.input('own-1-fixed','09:00');h.input('own-2-after','5');h.click('own-check');ok(n['own-feedback'].textContent.includes('missing'));h.input('own-2-after','1');h.input('own-1-label','<img src=x onerror=alert(1)>');h.click('own-check');h.change('own-reviewed',true);h.click('own-record');ok(h.last().includes('<img src=x onerror=alert(1)>'));ok(h.last().includes('Learner reviewed'));ok(!h.last().includes('Hands-on practice'));
// A canceled reset cannot delete anything; the two reset scopes are independent.
h.setYes(false);h.click('clear');eq(n.raw.value,good[1]);h.click('own-clear');eq(n['own-note'].value,ownNote);h.setYes(true);h.click('clear');eq(n.raw.value,'');eq(n['task-number'].textContent,'Task 1 of 2');eq(n['own-note'].value,ownNote);ok(!n['own-download'].disabled);h.click('own-clear');eq(n['own-note'].value,'');eq(n['own-1-label'].value,'');ok(n['own-download'].disabled);ok(n['own-start'].focused);ok(h.downloads.length>0);
h.click('own-record');ok(h.last().includes('Not currently reviewed'));ok(h.last().includes('Current entries have not been checked'));
// Hostile and overlong lesson drafts are literal and cannot claim a pass.
h.input('origin','manual');h.input('other-help','none');h.input('raw','<img src=x onerror=alert(1)>');h.click('submit-first');ok(n.feedback.textContent.includes('Line 1'));h.click('download-record');ok(h.last().includes('<img src=x onerror=alert(1)>'));ok(n['download-sheet'].disabled);
const b=harness();b.input('origin','manual');b.input('other-help','none');b.input('raw','x'.repeat(4001));b.click('submit-first');ok(!b.nodes.raw.readOnly);ok(b.nodes.status.textContent.includes('too long'));
// Clipboard completion cannot stamp success on later text or a cleared record.
const c=harness();let resolve;c.setClipboard(()=>new Promise(r=>resolve=r));c.change('request-reviewed',true);let pending=c.click('copy-request');c.input('request','A new request');resolve();await pending;ok(!c.nodes['copy-status'].textContent.includes('Copied.'));ok(c.nodes['copy-request'].disabled);
c.change('request-reviewed',true);c.setClipboard(async()=>{throw Error('denied');});await c.click('copy-request');ok(c.nodes['copy-status'].textContent.includes('Copy did not complete'));ok(c.nodes.request.selected);
c.setClipboard(()=>new Promise(r=>resolve=r));pending=c.click('copy-request');c.click('clear');resolve();await pending;ok(!c.nodes['copy-status'].textContent.includes('Copied.'));
console.log('PASS: '+assertions+' schedule lesson assertions: valid alternatives, duration/fixed/order/overlap/window failures, impossible/cyclic/unknown constraints, midnight bounds, immutable first evidence, correction retention, exact review, separate own planner, confirmed resets, literal text and stale clipboard.');
})().catch(e=>{console.error(e);process.exitCode=1;});
