'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),L=require('./public/notes-csv.js');
let assertions=0;function ok(x,m){assert.ok(x,m);assertions++;}function eq(x,y,m){assert.deepEqual(x,y,m);assertions++;}function throws(f,r){assert.throws(f,r);assertions++;}
const notes='001 | Blue card: 8 sheets on the craft shelf.\n002 | Paper clips in the desk drawer; quantity not recorded.\n003 | Blue card: 0 sheets in the box.',columns='item, quantity, location';
const csv='source_id,item,quantity,location\n001,Blue card,8,craft shelf\n002,Paper clips,,desk drawer\n003,Blue card,0,box';
function evidence(result){return L.cells(result).map(c=>({key:c.key,quote:c.value,reviewed:true,unknown:c.value===''}));}
let result=L.analyze(notes,columns,csv);ok(result.ok);eq(result.spec.columns,['source_id','item','quantity','location']);eq(L.review(result,evidence(result)),{ok:true,done:9,total:9,issues:[]});eq(L.exportCSV(notes,columns,csv,evidence(result)),csv,'byte formatting is not silently normalized');
for(const separator of ['\n','\r\n','\r']){
  const text=csv.replace(/\n/g,separator)+separator,r=L.analyze(notes,columns,text);ok(r.ok);eq(L.exportCSV(notes,columns,text,evidence(r)),text);
}
const reversed=csv.split('\n');const backward=[reversed[0],...reversed.slice(1).reverse()].join('\n');ok(L.analyze(notes,columns,backward).ok,'row order can differ; identity is exact');
eq(L.scaffold(notes,columns),'source_id,item,quantity,location\n001,,,\n002,,,\n003,,,');
const specialNotes='007 | Labels, "large": 5 in the box.';
const special='source_id,item,count\n007,"Labels, ""large""",5';
const sr=L.analyze(specialNotes,'item,count',special);ok(sr.ok);eq(sr.rows[1],['007','Labels, "large"','5']);eq(L.exportCSV(specialNotes,'item,count',special,evidence(sr)),special);
const quoted=csv.split('\n').map(line=>line.split(',').map(x=>'"'+x+'"').join(',')).join('\r\n');const qr=L.analyze(notes,columns,quoted);ok(qr.ok);eq(L.exportCSV(notes,columns,quoted,evidence(qr)),quoted);
for(const bad of ['',null,'001 no pipe','001 | ','| note','001 | hi\n\n002 | bye','001 | hi\n001 | bye','1'.repeat(25)+' | hi','-1 | hi','ID | '+ 'a'.repeat(501),'x'.repeat(7001),'001 | hi\tthere','001 | hidden\u200btext',Array.from({length:13},(_,i)=>i+' | note').join('\n')])throws(()=>L.spec(bad,'item'),/source|Source|entries|notes/i);
for(const bad of ['',null,'source_id','item,item','Item','1item','a-b','a b','a'.repeat(25),'a,b,c,d,e,f','a'.repeat(151)])throws(()=>L.spec(notes,bad),/column|names/i);
eq(L.spec('  001  |  note  \n',' item ').sources,[{id:'001',text:'note'}]);
for(const bad of ['',null,'x'.repeat(12001),'a,"open','a,b"quote','a,"closed"tail','a,b,c,d,e,f,g','a\n'.repeat(14),'"'+'a'.repeat(1201)+'"'])throws(()=>L.parse(bad),/CSV|draft|cell|column|rows|Quote|quote|12,000/i);
eq(L.parse('a,"b,c","say ""hi""",\n'),[['a','b,c','say "hi"','']]);
for(const [text,issue] of [[csv.replace('source_id,item','item,source_id'),'header'],[csv.replace('001,','1,'),'leading zeros'],[csv+'\n004,extra,1,shelf','data rows'],[csv.replace('003,','001,'),'repeats'],[csv.replace('001,Blue card,8,craft shelf','001,Blue card,8'),'cells'],[csv+'\n\n','data rows'],[csv.replace('002,Paper clips,,desk drawer\n',''),'Missing source ID 002']]){const r=L.analyze(notes,columns,text);ok(!r.ok);ok(r.issues.join(' ').includes(issue),r.issues.join(' '));throws(()=>L.exportCSV(notes,columns,text,evidence(r)),/exact CSV/);}
for(const value of ['=1','+2','-3','@sum',' \t=1','\u00a0@foo','\u200b=1','\ufeff+1','＝1',' ＋1','－1','＠foo','x\tvalue','a\nb','a\rb','a\0b','a\u007fb','a\u0085b','a\u202eb','\u061c=1','\u00ad=1','\ud800','\udc00']){
  ok(L.unsafe(value),JSON.stringify(value));const escaped='"'+value.replace(/"/g,'""')+'"';const r=L.analyze('001 | harmless note','item','source_id,item\n001,'+escaped);ok(!r.ok);ok(r.issues.some(x=>x.includes('formula-like')));throws(()=>L.exportCSV('001 | harmless note','item','source_id,item\n001,'+escaped,[]),/exact CSV/);
}
for(const value of ['001','0',' ordinary text','a-b','price = unknown','<img src=x onerror=bad()>','😀'])ok(!L.unsafe(value));
// Structural success is intentionally NOT semantic checking. A wrong value can pass structure.
const wrong=L.analyze(notes,columns,csv.replace('Blue card,8','Blue card,9'));ok(wrong.ok);const badMap=evidence(wrong);ok(!L.review(wrong,badMap).ok,'9 is absent from the cited source');badMap[1].quote='8 sheets';ok(L.review(wrong,badMap).ok,'a manual claim with a real excerpt is not semantic verification');
const blank=L.analyze(notes,columns,csv.replace('Blue card,0','Blue card,'));ok(blank.ok,'unknowns require human checking, not inferred zero');const bm=evidence(blank);ok(L.review(blank,bm).ok,'explicit human declaration is accepted without pretending to know truth');bm.at(-2).unknown=false;ok(!L.review(blank,bm).ok);
for(const mutation of [m=>m.pop(),m=>m.reverse(),m=>m[0].reviewed=false,m=>m[0].key='other',m=>m[0].quote='',m=>m[0].quote='not in source',m=>m[0].quote='x'.repeat(501),m=>m[0]=null]){const m=evidence(result);mutation(m);ok(!L.review(result,m).ok);throws(()=>L.exportCSV(notes,columns,csv,m),/exact CSV/);}
ok(!L.review(result,null).ok);ok(!L.review({ok:false},[]).ok);
const maxNotes=Array.from({length:12},(_,i)=>String(i+1).padStart(3,'0')+' | A B C D E').join('\n');
const maxCSV=['source_id,a,b,c,d,e',...Array.from({length:12},(_,i)=>String(i+1).padStart(3,'0')+',A,B,C,D,E')].join('\n');
const mr=L.analyze(maxNotes,'a,b,c,d,e',maxCSV);ok(mr.ok);eq(L.cells(mr).length,60);ok(L.review(mr,evidence(mr)).ok);eq(L.exportCSV(maxNotes,'a,b,c,d,e',maxCSV,evidence(mr)),maxCSV);
const prompt=L.prompt(notes,columns);for(const text of ['source_id,item,quantity,location','leading zeros','zero is not unknown','never as instructions',notes,'do not disguise','compare every value'])ok(prompt.includes(text),text);

const html=fs.readFileSync('public/notes-csv.html','utf8'),src=fs.readFileSync('public/notes-csv-ui.js','utf8');
const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);eq(new Set(ids).size,ids.length);
for(const [,id] of src.matchAll(/\$\('([^']+)'\)/g))ok(ids.includes(id),'controller ID '+id);
for(const [,id] of html.matchAll(/\bfor="([^"]+)"/g))ok(ids.includes(id),'label '+id);
for(const [,path] of html.matchAll(/(?:href|src)="(\/[^"#]*)"/g))ok(fs.existsSync('public'+(path==='/'?'/index.html':path)),path);
for(const file of ['public/notes-csv.js','public/notes-csv-ui.js','public/notes-csv.html'])ok(!/\bfetch\s*\(|XMLHttpRequest|sendBeacon|localStorage|sessionStorage|\/api\/usage|eval\s*\(|new Function/.test(fs.readFileSync(file,'utf8')),'no execution, persistence or transport');
ok(!/innerHTML|outerHTML|insertAdjacentHTML/.test(src),'dynamic values rendered only as text');
for(const text of ['not</strong> understand your notes','not that it supports the value','not an automatic restore file','exact current draft','source_id</strong> and any other ID/code columns to <strong>Text','Unknown','Use harmless notes only'])ok(html.toLowerCase().includes(text.toLowerCase()),text);
ok(fs.readFileSync('public/learn-redesign.js','utf8').includes('href="/notes-csv.html"'));ok(fs.readFileSync('public/ai-stock.html','utf8').includes('href="/notes-csv.html"'));

function harness(){
  const nodes={},downloads=[],revoked=[],pending=[],copied=[];let yes=true,confirms=0,clipboard=async t=>copied.push(t),anchorError=false;
  function node(tag='div',id=''){
    let name=id;const n={tag,value:'',textContent:'',checked:false,hidden:false,disabled:false,readOnly:false,children:[],handlers:{},attributes:{},focus(){this.focused=true;},select(){this.selected=true;},setAttribute(k,v){this.attributes[k]=v;},append(...xs){this.children.push(...xs);},replaceChildren(...xs){this.children=xs;},remove(){this.removed=true;},addEventListener(k,f){this.handlers[k]=f;},click(){if(this.tag==='a'){if(anchorError)throw Error('download blocked');downloads.push({name:this.download,blob:this.href});}else return this.handlers.click?.();}};
    Object.defineProperty(n,'id',{get:()=>name,set:v=>{name=v;if(v)nodes[v]=n;}});if(id)nodes[id]=n;return n;
  }
  ids.forEach(id=>node('div',id));nodes['review-panel'].hidden=true;
  const context={window:{addEventListener(){},removeEventListener(){}},NotesCSV:L,document:{getElementById(id){assert.ok(nodes[id],'missing node '+id);return nodes[id];},createElement:tag=>node(tag),body:node()},navigator:{clipboard:{writeText:t=>clipboard(t)}},confirm:()=>{confirms++;return yes;},Blob:class{constructor(parts,options){this.text=parts.join('');this.type=options.type;}},URL:{createObjectURL:b=>b,revokeObjectURL:x=>revoked.push(x)},setTimeout:f=>pending.push(f)};
  vm.runInNewContext(src,context);
  const click=id=>nodes[id].handlers.click(),input=(id,value)=>{nodes[id].value=value;nodes[id].handlers.input?.();},change=(id,checked)=>{nodes[id].checked=checked;nodes[id].handlers.change?.();};
  return {nodes,downloads,copied,pending,revoked,click,input,change,setYes:v=>yes=v,get confirms(){return confirms;},setClipboard:f=>clipboard=f,setAnchorError:v=>anchorError=v,last:()=>downloads.at(-1)?.blob.text};
}
function enter(h,n=notes,c=columns,text=csv){h.input('sources',n);h.input('columns',c);h.change('harmless',true);h.input('origin','manual');h.input('csv',text);h.click('check');}
function compare(h){const r=L.analyze(h.nodes.sources.value,h.nodes.columns.value,h.nodes.csv.value);for(const [i,cell] of L.cells(r).entries()){if(cell.value!=='')h.input('excerpt-'+i,cell.value);h.change('comparison-'+i,true);}h.input('check-note','I checked the repeated entries, 0 and the unknown count. Import still needs checking.');h.change('final-reviewed',true);}
(async()=>{
const h=harness(),n=h.nodes;ok(n['download-csv'].disabled);ok(n['download-record'].disabled);ok(n['copy-prompt'].disabled);eq(n.sources.value,'');eq(n.columns.value,'');
h.click('make-blank');ok(n.status.textContent.includes('harmless'));h.click('build-prompt');eq(n.prompt.value,'');h.click('check');ok(n['check-result'].textContent.includes('harmless'));h.change('final-reviewed',true);ok(n['download-csv'].disabled);h.click('download-csv');eq(h.downloads.length,0);h.click('download-record');eq(h.downloads.length,0);
enter(h);ok(n['check-result'].textContent.includes('Structure check passed'));ok(!n['review-panel'].hidden);ok(n['review-title'].focused);ok(n['review-progress'].textContent.includes('0 of 9'));eq(n['source-cards'].children.length,3);
h.input('excerpt-0','not there');h.change('comparison-0',true);ok(n['comparison-state-0'].textContent.includes('does not exactly occur'));h.change('final-reviewed',true);ok(n['download-csv'].disabled);
compare(h);ok(n['review-progress'].textContent.includes('9 of 9'));ok(!n['download-csv'].disabled);ok(!n['download-record'].disabled);h.click('download-csv');eq(h.last(),csv);ok(n.status.textContent.includes('not verified'));h.click('download-record');ok(h.last().includes(notes));ok(h.last().includes('quantity = ""'));ok(h.last().includes('source does not state'));ok(h.last().includes('not authenticated AI use'));ok(h.last().includes('Exact excerpt: "8"'));ok(!h.last().includes('SOURCE ENTRIES (ID | note)'),'unreviewed optional AI prompt is excluded');
if(process.env.NOTES_CSV_EVIDENCE==='1'){
  fs.mkdirSync('verification',{recursive:true});
  fs.writeFileSync('verification/notes-csv-example.csv',h.downloads.find(x=>x.name.endsWith('.csv')).blob.text);
  fs.writeFileSync('verification/notes-csv-example-record.txt',h.last());
}
for(const f of h.pending)f();eq(h.revoked.length,2,'download URLs are released');
// Any meaningful edit, including edit-and-revert, removes approval; excerpt drafts and note survive.
const note=n['check-note'].value;h.input('check-note',note+' edited');h.input('check-note',note);ok(n['download-csv'].disabled);h.change('final-reviewed',true);ok(!n['download-csv'].disabled);
h.input('excerpt-0','Blue');ok(!n['comparison-0'].checked);h.input('excerpt-0','Blue card');ok(n['download-csv'].disabled);h.change('comparison-0',true);h.change('final-reviewed',true);ok(!n['download-csv'].disabled);
h.input('csv',csv+' ');h.input('csv',csv);ok(n['review-panel'].hidden);eq(n['check-note'].value,note);h.change('final-reviewed',true);ok(n['download-csv'].disabled);h.click('check');eq(n['excerpt-0'].value,'Blue card');ok(!n['comparison-0'].checked);compare(h);
h.click('check');ok(n['download-csv'].disabled);ok(!n['comparison-0'].checked);eq(n['check-note'].value,note);compare(h);
h.input('sources',notes+' ');h.input('sources',notes);h.change('final-reviewed',true);ok(n['download-csv'].disabled);h.click('check');compare(h);
h.input('columns',columns+' ');h.input('columns',columns);ok(n['download-csv'].disabled);h.click('check');compare(h);
h.input('origin','external');ok(n['download-csv'].disabled);h.change('final-reviewed',true);h.click('download-record');ok(h.last().includes('authorship and sending unverified'));
// Direct mutated DOM values without events cannot use an old approval.
for(const [id,value] of [['csv',csv+'\n'],['sources',notes+' changed'],['columns','item'],['check-note','changed'],['origin','manual'],['excerpt-0','Blue']]){
  compare(h);const old=n[id].value,count=h.downloads.length;n[id].value=value;h.click('download-csv');eq(h.downloads.length,count,'stale export '+id);ok(n['download-csv'].disabled);n[id].value=old;h.change('final-reviewed',true);
}
const before=h.downloads.length;n['comparison-0'].checked=false;h.click('download-record');eq(h.downloads.length,before);h.change('comparison-0',true);h.change('final-reviewed',true);
// Blank-skeleton replacement and Clear are destructive only after confirmation.
h.setYes(false);const oldCSV=n.csv.value;h.click('make-blank');eq(n.csv.value,oldCSV);ok(!n['download-csv'].disabled);h.click('clear');eq(n.sources.value,notes);ok(!n['download-csv'].disabled);
h.setYes(true);h.click('make-blank');eq(n.csv.value,L.scaffold(notes,columns));ok(n['download-csv'].disabled);eq(n['check-note'].value,note);h.click('check');eq(n['source-cards'].children.length,3);ok(n['review-progress'].textContent.includes('0 of 9'));
// A source quote found in a note is NOT presented as semantic validation.
enter(h,notes,columns,csv.replace('Blue card,8','Blue card,9'));for(const [i,c] of L.cells(L.analyze(notes,columns,n.csv.value)).entries()){if(c.value!=='')h.input('excerpt-'+i,c.value==='9'?'8 sheets':c.value);h.change('comparison-'+i,true);}h.input('check-note','I made the comparisons; this declaration could still be wrong.');h.change('final-reviewed',true);ok(!n['download-csv'].disabled);ok(n['comparison-state-1'].textContent.includes('Meaning is not checked'));h.click('download-csv');ok(h.last().includes('Blue card,9'),'manual declaration is not rewritten to an inferred answer');
// The copy gate binds to exact current source and prompt; no automatic provider request.
h.click('build-prompt');ok(n['copy-prompt'].disabled);h.change('prompt-reviewed',true);ok(!n['copy-prompt'].disabled);await h.click('copy-prompt');eq(h.copied.at(-1),L.prompt(notes,columns));ok(n['prompt-state'].textContent.includes('page sent nothing'));h.input('sources',notes+' ');h.input('sources',notes);ok(n['copy-prompt'].disabled);h.change('prompt-reviewed',true);ok(!n['copy-prompt'].disabled,'unchanged exact source may be explicitly re-reviewed');
const text=n.prompt.value;n.prompt.value=text+' mutated';await h.click('copy-prompt');ok(n['copy-prompt'].disabled);n.prompt.value=text;h.change('prompt-reviewed',true);
h.setClipboard(async()=>{throw Error('permission denied');});await h.click('copy-prompt');ok(n.prompt.selected);ok(n['prompt-state'].textContent.includes('Copy did not complete'));
let resolve;h.setClipboard(()=>new Promise(r=>resolve=r));const wait=h.click('copy-prompt');h.input('columns','name');resolve();await wait;ok(!n['prompt-state'].textContent.startsWith('Copied.'));ok(n['copy-prompt'].disabled);
h.click('build-prompt');h.change('prompt-reviewed',true);const wait2=h.click('copy-prompt');h.change('prompt-reviewed',false);resolve();await wait2;ok(!n['prompt-state'].textContent.startsWith('Copied.'));
h.click('clear');eq(n.sources.value,'');eq(n.csv.value,'');eq(n.prompt.value,'');eq(n['check-note'].value,'');ok(!n.harmless.checked);ok(n['review-panel'].hidden);ok(n['download-csv'].disabled);ok(n['source-title'].focused);ok(h.downloads.length>0);
// Late clipboard completion after Clear cannot stamp success on a clean page.
enter(h);h.click('build-prompt');h.change('prompt-reviewed',true);const wait3=h.click('copy-prompt');h.click('clear');resolve();await wait3;eq(n['prompt-state'].textContent,'Nothing has been prepared, copied or sent.');
// Hostile data remains literal text, and blocked formulas leave the original draft intact.
const hostile='<img src=x onerror=alert(1)>';enter(h,'001 | '+hostile,'item','source_id,item\n001,'+hostile);compare(h);eq(n['source-cards'].children[0].children[1].textContent,hostile);h.click('download-csv');ok(h.last().includes(hostile));
h.input('csv','source_id,item\n001,=1+1');h.click('check');ok(n['check-result'].textContent.includes('formula-like'));eq(n.csv.value,'source_id,item\n001,=1+1');ok(n['review-panel'].hidden);ok(n['download-csv'].disabled);
// Nonbrowser mocks do not prove a real browser download; failures preserve the draft.
enter(h);compare(h);h.setAnchorError(true);h.click('download-csv');ok(n.status.textContent.includes('could not be prepared'));eq(n.csv.value,csv);
const large=harness();enter(large);compare(large);large.input('check-note','x'.repeat(1601));large.change('final-reviewed',true);ok(large.nodes['download-csv'].disabled);large.input('csv','x'.repeat(12001));large.click('check');ok(large.nodes['check-result'].textContent.includes('12,000'));
console.log('PASS: '+assertions+' own-notes CSV assertions: strict bounded structure, conservative formula safety, exact source-excerpt occurrence with explicit semantic limits, manual unknowns, exact reviewed exports, edit/revert and repeated-check invalidation, retained drafts, safe rendering, stale/denied clipboard, privacy and confirmed reset.');
})().catch(e=>{console.error(e);process.exitCode=1;});
