'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),L=require('./public/ai-stock.js');
let assertions=0;function ok(v,m){assert.ok(v,m);assertions++;}function eq(a,b,m){assert.deepEqual(a,b,m);assertions++;}function throws(fn,re){assert.throws(fn,re);assertions++;}
const good=id=>L.csv([L.columns,...L.task(id).rows]);
// Parsed-cell equality, not a brittle byte-for-byte CSV comparison.
for(let id=0;id<2;id++){
  const rows=[L.columns,...L.task(id).rows],text=good(id);
  eq(L.parse(text),rows);ok(L.analyze(id,text).ok);ok(L.analyze(id,text.replace(/\r\n/g,'\n')).ok);
  const quoted=rows.map(row=>row.map(cell=>'"'+cell.replace(/"/g,'""')+'"').join(',')).join('\r');
  ok(L.analyze(id,quoted).ok);eq(L.parse(L.exportCSV(id,quoted)),rows);
  ok(L.analyze(id,L.csv([L.columns,...L.task(id).rows.slice().reverse()])).ok,'row order is not evidence of correctness');
  eq(L.parse(L.exportCSV(id,text)),rows,'export changes serialization, not cell values');
}
ok(!L.analyze(0,L.task(0).sample).ok);const initialFeedback=L.feedback(L.analyze(0,L.task(0).sample));
for(const expected of ['Missing source ID 003','001 quantity','004 quantity','005 location'])ok(initialFeedback.includes(expected),expected);
for(const [change,issue] of [
  [r=>r[1][0]='1','three digits'],[r=>r[4][2]='0','empty cell'],[r=>r[4][2]='unknown','empty cell'],
  [r=>r[1][2]='06','001 quantity'],[r=>r.push(r[1].slice()),'appears more than once'],
  [r=>r.splice(3,1),'Missing source ID 003'],[r=>r[1][1]='PAINT BRUSHES','001 item'],
  [r=>r[0].reverse(),'header'],[r=>r[1].push('extra'),'not 4'],[r=>r.push(['999','extra','1','here']),'not in this task']
]){const rows=JSON.parse(JSON.stringify([L.columns,...L.task(0).rows]));change(rows);const result=L.analyze(0,L.csv(rows));ok(!result.ok);ok(L.feedback(result).includes(issue));throws(()=>L.exportCSV(0,L.csv(rows)),/correct every/);}
ok(!L.analyze(1,good(1).replace('kit boxes,0','kit boxes,')).ok,'zero cannot become unknown');
for(const text of ['', 'x'.repeat(12001),'a,"unterminated','a,"closed"junk','a,b"quote','a,'.repeat(9),'a\n'.repeat(66),'"'+ 'a'.repeat(2001)+'"'])throws(()=>L.parse(text),/draft|12,000|closed|quote|columns|rows|long/i);
eq(L.parse('a,"b,c","say ""hi""",\r\n'),[['a','b,c','say "hi"','']]);
eq(L.parse('a,"line 1\nline 2"'),[['a','line 1\nline 2']]);
ok(!L.analyze(0,good(0)+'\n').ok,'extra blank rows are not silently dropped');
for(const cell of ['=1+1','+SUM(1)','-1','@foo',' \t=1','\r\n+1','\u0000x','\u000bx']){
  ok(L.unsafe(cell));throws(()=>L.csv([['safe',cell]]),/Unsafe/);
  ok(!L.analyze(0,good(0).replace('paint brushes',cell)).ok);
}
eq(L.parse(good(0))[1][0],'001','no apostrophe prefix or numeric conversion');
throws(()=>L.task(99),/Unknown/);throws(()=>L.task('0'),/Unknown/);

const html=fs.readFileSync('public/ai-stock.html','utf8'),src=fs.readFileSync('public/ai-stock-ui.js','utf8');
const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);eq(new Set(ids).size,ids.length,'unique DOM IDs');
for(const match of src.matchAll(/\$\('([^']+)'\)/g))ok(ids.includes(match[1]),'controller target exists: '+match[1]);
for(const f of ['public/ai-stock.js','public/ai-stock-ui.js','public/ai-stock.html'])ok(!/\bfetch\s*\(|XMLHttpRequest|sendBeacon|localStorage|sessionStorage|\/api\/usage|eval\s*\(|new Function/.test(fs.readFileSync(f,'utf8')),'no execution, persistence or transport');
ok(!/innerHTML/.test(src),'learner content is never rendered as HTML');
for(const path of [...html.matchAll(/(?:src|href)="(\/[^"#]*)"/g)].map(m=>m[1]))ok(fs.existsSync('public'+(path==='/'?'/index.html':path)),path);
for(const label of [...html.matchAll(/\bfor="([^"]+)"/g)].map(m=>m[1]))ok(ids.includes(label),'label target '+label);
ok(html.includes('set <strong>source_id</strong> to <strong>Text</strong>'));
ok(html.includes('No AI runs here'));ok(html.includes('not an automatic resume/import file'));
ok(fs.readFileSync('public/learn-redesign.js','utf8').includes('href="/ai-stock.html"'));

function harness(){
  const nodes={},downloads=[];let yes=true,confirms=0,clipboard=async()=>{},pending=[];
  function node(id=''){return {id,value:'',textContent:'',checked:false,hidden:false,disabled:false,readOnly:false,children:[],handlers:{},attributes:{},focus(){this.focused=true;},select(){this.selected=true;},setAttribute(k,v){this.attributes[k]=v;},append(...e){this.children.push(...e);},replaceChildren(...e){this.children=e;},remove(){},addEventListener(k,f){this.handlers[k]=f;},click(){if(this.id)return this.handlers.click?.();downloads.push({name:this.download,blob:this.href});}};}
  ids.forEach(id=>nodes[id]=node(id));
  const context={StockLesson:L,document:{getElementById(id){assert.ok(nodes[id],'missing ID '+id);return nodes[id];},createElement:()=>node(),body:node()},navigator:{clipboard:{writeText:t=>clipboard(t)}},confirm:()=>{confirms++;return yes;},Blob:class{constructor(parts,options){this.text=parts.join('');this.type=options.type;}},URL:{createObjectURL:b=>b,revokeObjectURL(){}},setTimeout:f=>pending.push(f)};
  vm.runInNewContext(src,context);
  const click=id=>nodes[id].handlers.click(),input=(id,value)=>{nodes[id].value=value;nodes[id].handlers.input();},change=(id,checked)=>{nodes[id].checked=checked;nodes[id].handlers.change();};
  return {nodes,downloads,click,input,change,setYes:v=>yes=v,get confirms(){return confirms;},setClipboard:f=>clipboard=f,last:()=>downloads.at(-1)?.blob.text};
}
(async()=>{
const h=harness(),n=h.nodes;
ok(n['copy-request'].disabled);ok(n['download-csv'].disabled);ok(n.correction.hidden);eq(n['task-number'].textContent,'Task 1 of 2');
h.click('submit-first');ok(n.status.textContent.includes('Choose'));h.click('next-task');eq(n['task-number'].textContent,'Task 1 of 2');
h.click('download-record');ok(h.last().includes('Not submitted yet.'));ok(h.last().includes('Not currently reviewed.'));
h.input('raw','Keep this draft');h.setYes(false);h.click('load-example');eq(n.raw.value,'Keep this draft');h.setYes(true);h.click('load-example');eq(n.raw.value,L.task(0).sample);eq(n.origin.value,'prepared');
h.input('other-help','none');h.click('submit-first');ok(n.raw.readOnly);ok(n.origin.disabled);ok(!n.correction.hidden);ok(n.feedback.textContent.includes('Missing source ID 003'));eq(n.draft.value,L.task(0).sample);ok(n['correction-title'].focused);
h.click('download-record');const firstRecord=h.last();ok(firstRecord.includes(L.task(0).sample));ok(firstRecord.includes('"example":true'));ok(!firstRecord.includes('kit boxes'));
h.input('draft',good(0));h.input('note','I restored 003 and checked every count. 004 remains blank; import IDs as text.');h.change('final-reviewed',true);ok(n['download-csv'].disabled,'typing correct text is not a checked result');h.click('check-draft');h.change('final-reviewed',true);ok(!n['download-csv'].disabled);h.click('download-csv');eq(L.parse(h.last()),L.parse(good(0)));ok(h.last().includes('001,'));ok(!h.last().includes("'001"));
// Repeated clicks cannot replace the first submitted attempt or mark extra mastery.
const frozen=n.raw.value;h.click('submit-first');eq(n.raw.value,frozen);h.click('download-record');ok(h.last().includes('Checks run in this tab: 2.'));
// A request edit and revert still revokes the current final review.
const request=n.request.value;h.input('request',request+' Edited.');h.input('request',request);ok(n['download-csv'].disabled);h.change('final-reviewed',true);ok(!n['download-csv'].disabled);
h.click('download-record');const completed=h.last();ok(completed.includes('Learner reviewed; not independent verification.'));ok(completed.includes(L.task(0).sample));ok(completed.includes('First check feedback:'));ok(completed.includes('source-check feedback (answer-level)'));ok(completed.includes('"feedback":false'),'first support frozen before checking answers');
// Editing and reverting preserves notes, but never restores approval or stale check.
const note=n.note.value;h.input('draft',good(0)+' ');h.input('draft',good(0));ok(n['download-csv'].disabled);eq(n.note.value,note);h.change('final-reviewed',true);ok(n['download-csv'].disabled);h.click('check-draft');h.change('final-reviewed',true);ok(!n['download-csv'].disabled);
h.input('note',note+' Revised.');h.input('note',note);ok(n['download-csv'].disabled);h.change('final-reviewed',true);ok(!n['download-csv'].disabled);
// Support is monotonic and can never rewrite the first-attempt snapshot.
h.input('other-help','person');h.input('other-help','none');ok(n['download-csv'].disabled);ok(n['help-status'].textContent.includes('person'));h.change('final-reviewed',true);h.click('download-record');ok(h.last().includes('"person":false'),'first attempt retains pre-feedback support');ok(h.last().includes('Current support record: example, person'));
// Correct table cannot be bypassed through a stale checkbox / direct button invocation.
n.draft.value=good(0).replace('paint brushes,6','paint brushes,7');const count=h.downloads.length;h.click('download-csv');eq(h.downloads.length,count);ok(n['download-csv'].disabled);h.input('draft',good(0));h.click('check-draft');h.change('final-reviewed',true);
h.click('next-task');eq(n['task-number'].textContent,'Task 2 of 2');eq(n.raw.value,'');eq(n.draft.value,'');eq(n.request.value,'');eq(n.note.value,'');ok(n['load-example'].hidden);ok(n['first-guidance'].hidden);ok(!n['changed-guidance'].hidden);ok(n.correction.hidden);ok(n['task-title'].focused);
h.click('download-record');ok(!h.last().includes('paint brushes'),'changed-task evidence never leaks first answer');
h.input('origin','external');h.input('other-help','none');h.input('raw',good(1));h.click('submit-first');ok(!n.raw.readOnly,'external first submission requires its request');h.input('request','Use the new fictional notes and output contract to produce CSV.');h.change('request-reviewed',true);ok(!n['copy-request'].disabled);await h.click('copy-request');ok(n['copy-status'].textContent.includes('Nothing was sent'));h.input('request',n.request.value+' Changed.');ok(n['copy-request'].disabled);ok(!n['request-reviewed'].checked);
h.click('submit-first');ok(n.feedback.textContent.includes('All five'));h.input('note','Zero stays 0 on 011; 013 is unknown. I checked the doubled quotes and IDs.');h.change('final-reviewed',true);ok(!n['download-csv'].disabled);h.click('download-record');const secondRecord=h.last();ok(secondRecord.includes('"example":false'));ok(secondRecord.includes('"external":true'));ok(!secondRecord.includes('paint brushes'));
h.click('previous-task');eq(n['task-number'].textContent,'Task 1 of 2');eq(n.raw.value,L.task(0).sample);ok(n['next-task'].textContent.includes('Return'));h.input('note','Revisiting my earlier note must not trap my started changed task.');ok(n['download-csv'].disabled);h.click('next-task');eq(n['task-number'].textContent,'Task 2 of 2');eq(n.raw.value,good(1));ok(n['download-csv'].disabled);ok(n['help-status'].textContent.includes('example'));h.click('download-record');ok(h.last().includes('"example":false'),'reopening cannot alter historical first support');ok(h.last().includes('Current support record: example, external'));
h.click('hint');ok(!n['hint-text'].hidden);eq(n.hint.attributes['aria-expanded'],'true');ok(n['help-status'].textContent.includes('hint'));h.change('final-reviewed',true);ok(!n['download-csv'].disabled);
h.setYes(false);h.click('clear');eq(n.raw.value,good(1));h.setYes(true);h.click('clear');eq(n.raw.value,'');eq(n['task-number'].textContent,'Task 1 of 2');ok(n.correction.hidden);ok(n['download-csv'].disabled);ok(h.downloads.length>0,'Clear does not erase downloaded copies');
// Invalid, hostile and overlong drafts remain literal data, with no false pass.
h.input('origin','manual');h.input('other-help','none');h.input('raw','<img src=x onerror=alert(1)>');h.click('submit-first');ok(n.feedback.textContent.includes('header'));h.click('download-record');ok(h.last().includes('<img src=x onerror=alert(1)>'));ok(n['download-csv'].disabled);
const b=harness();b.input('origin','manual');b.input('other-help','none');b.input('raw','x'.repeat(12001));b.click('submit-first');ok(!b.nodes.raw.readOnly);ok(b.nodes.status.textContent.includes('too long'));
// Clipboard completion cannot stamp success on a newer task, edit or cleared record.
const c=harness();let resolve;c.setClipboard(()=>new Promise(r=>resolve=r));c.change('request-reviewed',true);const pending=c.click('copy-request');c.input('request','A new request');resolve();await pending;ok(!c.nodes['copy-status'].textContent.includes('Copied.'));ok(c.nodes['copy-request'].disabled);
c.change('request-reviewed',true);c.setClipboard(async()=>{throw Error('denied');});await c.click('copy-request');ok(c.nodes['copy-status'].textContent.includes('Copy did not complete'));ok(c.nodes.request.selected);
console.log('PASS: '+assertions+' stock lesson assertions: strict parsed CSV/source reconciliation, safe export, exact review, frozen evidence, correction retention, changed task, support/history isolation, stale clipboard and confirmed Clear.');
})().catch(e=>{console.error(e);process.exitCode=1;});
