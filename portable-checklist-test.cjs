'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),os=require('node:os');
const BASE=process.env.LEARN_BASE||__dirname;
const source=name=>fs.readFileSync(fs.existsSync(path.join(__dirname,'public',name))?path.join(__dirname,'public',name):path.join(BASE,'public',name),'utf8');
const P=require('./public/portable-checklist.js');
let checks=0;const check=(condition,label)=>{assert.ok(condition,label);checks++;};
const equal=(actual,expected,label)=>{assert.deepEqual(actual,expected,label);checks++;};
function adapter(){
 const nodes={},events=[],blobs=[],clicks=[],revoked=[],timers=[],windowHandlers={};
 let count=0;const h={nodes,events,blobs,clicks,revoked,timers,fail:null,onClick:null};
 class Node{
  constructor(tag,id){this.tagName=tag.toUpperCase();this.id=id;this.children=[];this.handlers={};this.dataset={};this.textContent='';this._value='';this.checked=false;this.disabled=false;this.hidden=false;this.parentNode=null;}
  set value(v){this._value=String(v).replace(/\r\n?/g,'\n');}get value(){return this._value;}
  append(...values){for(const child of values){if(child.parentNode)child.remove();this.children.push(child);child.parentNode=this;if(child.id)nodes[child.id]=child;}}
  remove(){if(this.parentNode){const p=this.parentNode;p.children.splice(p.children.indexOf(this),1);this.parentNode=null;}}
  replaceChildren(...children){for(const child of this.children)child.parentNode=null;this.children=[];this.append(...children);}
  addEventListener(type,fn){(this.handlers[type]??=[]).push(fn);}
  setAttribute(k,v){this[k]=String(v);}focus(){h.activeElement=this;events.push('focus:'+this.id);}scrollIntoView(){}
  click(){if(this.disabled)return;if(this.tagName==='A'){if(h.fail==='click')throw Error('click failed');clicks.push({href:this.href,name:this.download});h.onClick?.();}else{this.onclick?.({target:this});for(const fn of this.handlers.click||[])fn({target:this});}}
 }
 const n=id=>nodes[id]??=(new Node('div',id));
 const document={getElementById:n,createElement(tag){if(h.fail==='element'&&tag==='a')throw Error('create failed');return new Node(tag,'');},createTextNode(text){const node=new Node('text','');node.textContent=text;return node;},querySelectorAll:()=>[],querySelector:()=>n('query'),addEventListener(){},body:new Node('body','body')};
 class TestBlob extends Blob{constructor(parts,opts){if(h.fail==='blob')throw Error('blob failed');super(parts,opts);blobs.push(this);}}
 h.env={document,addEventListener(type,fn){(windowHandlers[type]??=new Set()).add(fn);},removeEventListener(type,fn){windowHandlers[type]?.delete(fn);},Blob:TestBlob,URL:{createObjectURL(){if(h.fail==='url')throw Error('URL failed');return 'blob:test/'+(++count);},revokeObjectURL(url){if(h.fail==='revoke')throw Error('revoke failed');revoked.push(url);}},setTimeout(fn,ms){if(h.fail==='timer')throw Error('timer failed');timers.push({fn,ms});return timers.length;}};
 h.n=n;h.input=(id,value)=>{const node=n(id);node.value=value;for(const fn of node.handlers.input||[])fn({target:node});};h.mark=(index,value)=>{const node=n('item-done-'+index);node.checked=value;for(const fn of node.handlers.change||[])fn({target:node});};
 h.rows=()=>n('checklist-items').children;h.item=(index,tag)=>h.rows()[index]?.children.find(node=>node.tagName===tag.toUpperCase());
 h.view=()=>h.rows().map(row=>({text:row.children.find(node=>node.tagName==='TEXTAREA').value,done:row.children.find(node=>node.tagName==='LABEL').children.find(node=>node.tagName==='INPUT').checked}));
 h.warningCount=()=>windowHandlers.beforeunload?.size||0;
 h.leave=()=>{const event={prevented:false,preventDefault(){this.prevented=true;}};for(const fn of windowHandlers.beforeunload||[])fn(event);return event;};
 return h;
}
function leave(h,expected,label){const event=h.leave();equal(event.prevented,expected,label+' preventDefault');equal(Object.hasOwn(event,'returnValue'),expected,label+' legacy returnValue only when dirty');if(expected)equal(event.returnValue,'',label+' legacy value');equal(h.warningCount(),expected?1:0,label+' listener only when dirty, never duplicated');}
function coldOpen(bytes){
 const html=Buffer.from(bytes).toString('utf8');
 const scripts=[...html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)];
 equal(scripts.length,2,'exactly one data script and one owned runtime, not recursive DOM cloning');
 check(scripts[0][1].includes('type="application/json"'),'data stays inert');
 check(!/<(?:iframe|img|link|form|object|embed)\b/i.test(html),'no external markup from adversarial text');
 const h=adapter();h.html=html;h.data=JSON.parse(scripts[0][2]);h.n('checklist-data').textContent=scripts[0][2];h.n('download-copy').disabled=true;
 for(const id of ['download-copy','add-item','undo-remove']){const markup=html.match(new RegExp('<button id="'+id+'"[^>]*>'));if(markup){h.n(id).tagName='BUTTON';h.n(id).disabled=/\bdisabled\b/.test(markup[0]);}}
 const env=h.env;env.window=env;const context=vm.createContext(env);vm.runInContext(scripts[1][2],context);h.context=context;
 check(!h.n('download-copy').disabled,'cold file runtime enables download');equal(h.clicks.length,0,'opening never downloads');equal(h.blobs.length,0,'opening never creates files');
 return h;
}
async function saved(h){const bytes=Buffer.from(await h.blobs.at(-1).arrayBuffer());const filename=path.join(os.tmpdir(),'small-wins-checklist-'+process.pid+'.html');fs.writeFileSync(filename,bytes);const read=fs.readFileSync(filename);equal(read,bytes,'read actual generated file bytes');return coldOpen(read);}
function press(h,id){h.n(id).click();}
function rows(h,expected,label){equal(h.view(),expected.map(item=>({...item,text:item.text.replace(/\r\n?/g,'\n')})),label+' displayed order, text and ticks');equal(h.rows().length,expected.length,label+' item count');}
function focus(h,index,label){equal(h.activeElement,h.item(index,'textarea'),label+' focuses current textarea');}
function controls(h,label){
 const length=h.rows().length;
 equal(h.n('add-item').disabled,length===120,label+' Add bound');
 for(let index=0;index<length;index++){
  const row=h.rows()[index],input=h.item(index,'textarea'),remove=h.item(index,'button');
  equal(row.tagName,'FIELDSET',label+' native group');equal(row.children[0].textContent,'Item '+(index+1),label+' numbered legend');
  equal(input.id,'item-text-'+index,label+' unique text id');equal(row.children[2].htmlFor,input.id,label+' text label');
  equal(row.children[1].htmlFor,'item-done-'+index,label+' tick label');
  equal(remove.textContent,'Remove item '+(index+1),label+' distinct removal name');equal(remove.type,'button',label+' removal is not submit');
  equal(remove.disabled,length===1,label+' last row protected');check(remove['aria-describedby'].includes('item-limits'),label+' removal limits description');
 }
}
async function itemChanges(){
 const data={version:1,items:[{text:'First: keep  \r\n🧵 café e\u0301',done:false},{text:'Obsolete </script><script>globalThis.INJECTED=true</script> \u2028\u2029',done:true},{text:'Last\rCR\nLF\u0000\ud800',done:false}]};
 const h=coldOpen(Buffer.from(P.build(data)));
 check(h.html.includes('id="add-item"')&&h.html.includes('id="undo-remove"'),'new exported runtime offers add and undo controls');
 check(h.html.includes('Keep 1–120 items')&&h.html.includes('Another removal replaces that undo')&&h.html.includes('Undo cannot insert into a full 120-item list'),'visible count, one-level undo and full-list limits');
 check(h.html.includes('not removed text or undo history')&&h.html.includes('does not change older files'),'visible undo export and older-file boundary');
 const expected=structuredClone(data.items);rows(h,expected,'opened variable checklist');controls(h,'opened controls');leave(h,false,'opened structural file');
 check(h.n('undo-remove').disabled,'no undo before removal');
 press(h,'add-item');expected.push({text:'',done:false});rows(h,expected,'add appends one blank unchecked item');focus(h,3,'add');leave(h,true,'count increase warns');
 h.input('item-text-3','New <img src=x onerror=bad()> & \u2028🚲');h.mark(3,true);expected[3]={text:'New <img src=x onerror=bad()> & \u2028🚲',done:true};
 const obsolete=h.item(1,'button'),oldInput=h.item(0,'textarea');press(h,'item-remove-1');const removed=expected.splice(1,1)[0];rows(h,expected,'remove middle preserves surviving rows');focus(h,1,'remove middle');leave(h,true,'removal stays dirty');
 // A detached event must not delete a different item at the former index.
 obsolete.click();rows(h,expected,'detached remove ignored');oldInput.value='Forged detached edit';for(const fn of oldInput.handlers.input||[])fn({target:oldInput});rows(h,expected,'detached edit ignored');
 h.input('item-text-1','Latest edit after removal\nwith new line');h.mark(0,true);expected[1].text='Latest edit after removal\nwith new line';expected[0].done=true;
 press(h,'undo-remove');expected.splice(1,0,removed);rows(h,expected,'undo earlier index keeps later edits and ticks');focus(h,1,'undo');controls(h,'renumbered restored controls');check(h.n('undo-remove').disabled,'undo consumed once');obsolete.click();rows(h,expected,'detached remove ignored even when its item is restored at same index');
 press(h,'undo-remove');rows(h,expected,'repeated undo no duplicate');leave(h,true,'undo does not clear unrelated changes');
 press(h,'download-copy');const next=await saved(h);equal(next.data,{version:1,items:expected},'structural edits survive actual written and reread file bytes');leave(h,true,'structural download never clears old uncertainty');leave(next,false,'structural saved bytes open clean');check(next.n('undo-remove').disabled,'reopened file has no undo history');
 // Remove a raw CR/LF/Unicode item, edit another, then undo and save it exactly.
 const raw=expected[0],stale=h.item(1,'button');press(h,'item-remove-0');expected.splice(0,1);stale.click();rows(h,expected,'detached index now different item cannot remove');
 h.input('item-text-2','Later surviving edit 🪴');expected[2].text='Later surviving edit 🪴';press(h,'undo-remove');expected.splice(0,0,raw);press(h,'download-copy');const rawBack=await saved(h);equal(rawBack.data,{version:1,items:expected},'undo preserves raw CR/LF/Unicode and later other edits exactly');
 // A second removal replaces the first undo; files carry neither removed item.
 const secret1='REMOVED_ONLY_4477',secret2='REMOVED_ONLY_8822';const session=coldOpen(Buffer.from(P.build({version:1,items:[{text:secret1,done:true},{text:secret2,done:false},{text:'Keep',done:true}]})));
 press(session,'item-remove-0');press(session,'item-remove-0');rows(session,[{text:'Keep',done:true}],'successive removals');focus(session,0,'remove first to last');controls(session,'one remaining');
 press(session,'download-copy');const deleted=await saved(session);equal(deleted.data,{version:1,items:[{text:'Keep',done:true}]},'download contains only remaining items');check(!deleted.html.includes(secret1)&&!deleted.html.includes(secret2),'generated HTML excludes all removed literal data');check(deleted.n('undo-remove').disabled,'removed text cannot return after reopening');
 press(session,'undo-remove');rows(session,[{text:secret2,done:false},{text:'Keep',done:true}],'only latest removal restored');press(session,'download-copy');const restored=await saved(session);check(!restored.html.includes(secret1)&&restored.html.includes(secret2),'only explicitly restored removed data exports');
 // Exact full reverts compare length and ordered text/ticks, not operation history.
 const revert=coldOpen(Buffer.from(P.build({version:1,items:[{text:'A',done:false},{text:'B',done:true}]})));
 press(revert,'add-item');leave(revert,true,'append alone dirty');press(revert,'item-remove-2');leave(revert,false,'remove appended row restores opened bytes');check(!revert.n('undo-remove').disabled,'undo record itself does not make model dirty');
 press(revert,'item-remove-0');leave(revert,true,'remove original row dirty');press(revert,'undo-remove');leave(revert,false,'undo original restores exact model');
 press(revert,'item-remove-0');press(revert,'add-item');revert.input('item-text-1','A');rows(revert,[{text:'B',done:true},{text:'A',done:false}],'same count but changed order');leave(revert,true,'changed item order remains dirty');
 revert.input('item-text-0','A');revert.mark(0,false);revert.input('item-text-1','B');revert.mark(1,true);leave(revert,false,'exact ordered model restored despite different row identities');
 // Last-row protection and removal focus at list end.
 const one=coldOpen(Buffer.from(P.build({version:1,items:[{text:'One',done:true}]})));press(one,'item-remove-0');rows(one,[{text:'One',done:true}],'cannot remove last item');leave(one,false,'blocked last removal stays clean');
 press(one,'add-item');one.input('item-text-1','Two');press(one,'item-remove-1');focus(one,0,'remove last focuses preceding item');leave(one,false,'last removal full revert');
 // Full list never exceeds 120, even direct events dispatched on disabled controls.
 const fullData={version:1,items:Array.from({length:120},(_,i)=>({text:'Item '+i,done:i%2===0}))};const full=coldOpen(Buffer.from(P.build(fullData)));controls(full,'full list');
 press(full,'add-item');for(const fn of full.n('add-item').handlers.click||[])fn();rows(full,fullData.items,'full add guarded');leave(full,false,'blocked full add clean');
 press(full,'item-remove-40');focus(full,40,'full middle removal');press(full,'add-item');check(full.n('undo-remove').disabled,'undo disabled after full capacity reused');check(full.n('item-count').textContent.includes('Another removal replaces'),'full undo loss limit visible');
 for(const fn of full.n('undo-remove').handlers.click||[])fn();equal(full.rows().length,120,'forced undo event cannot exceed 120');leave(full,true,'full changed list dirty');
 press(full,'download-copy');const fullNext=await saved(full);equal(fullNext.data.items.length,120,'full changed list downloadable');check(fullNext.n('undo-remove').disabled,'full next file has no undo');
 // Undo may restore over-limit text without losing it; download must refuse.
 const bound=coldOpen(Buffer.from(P.build({version:1,items:[{text:'x'.repeat(12000),done:true},{text:'',done:false}]})));
 press(bound,'item-remove-0');bound.input('item-text-0','extra');press(bound,'undo-remove');equal(bound.n('item-text-0').value.length,12000,'undo restores full long text without truncating');press(bound,'download-copy');equal(bound.clicks.length,0,'over-limit undo state cannot download');check(bound.n('copy-status').textContent.includes('Nothing was shortened'),'over-limit undo explains preservation');leave(bound,true,'over-limit undo remains dirty');bound.input('item-text-1','');leave(bound,false,'over-limit undo repaired to exact opened model');press(bound,'download-copy');equal((await saved(bound)).data.items[0].text.length,12000,'exact total text limit can save');
 check(!P.problem({version:1,items:[{text:'x'.repeat(11998)+'🧵',done:false}]}),'existing text limit counts UTF-16 code units exactly');check(P.problem({version:1,items:[{text:'x'.repeat(11999)+'🧵',done:false}]}),'Unicode over bound rejected without shortening');
 // Removing over-limit text repairs the export without carrying it into the file.
 const repair=coldOpen(Buffer.from(P.build({version:1,items:[{text:'keep',done:false},{text:'old',done:true}]})));repair.input('item-text-1','z'.repeat(12001));press(repair,'download-copy');equal(repair.clicks.length,0,'over-limit edit blocked');press(repair,'item-remove-1');press(repair,'download-copy');const repaired=await saved(repair);equal(repaired.data.items,[{text:'keep',done:false}],'removing over-limit row repairs export');check(!repaired.html.includes('z'.repeat(12001)),'removed over-limit data excluded');leave(repair,true,'repaired structural download remains dirty');
 // Failed requests and possible cancellation preserve structure, undo and warnings.
 for(const fail of ['blob','url','element','click']){
  const f=coldOpen(Buffer.from(P.build(data)));press(f,'add-item');f.input('item-text-3','keep new');press(f,'item-remove-1');const view=f.view();f.fail=fail;press(f,'download-copy');equal(f.view(),view,fail+' failure preserves structural edits');equal(f.clicks.length,0,fail+' structural failure no request');leave(f,true,fail+' structural failure warns');check(!f.n('undo-remove').disabled,fail+' failure keeps undo available');f.fail=null;press(f,'undo-remove');press(f,'download-copy');const retry=await saved(f);equal(retry.data.items,[...data.items,{text:'keep new',done:false}],fail+' retry preserves restored original and new item');leave(f,true,fail+' retry does not clear uncertainty');
 }
 const cancel=coldOpen(Buffer.from(P.build(data)));press(cancel,'item-remove-1');press(cancel,'add-item');cancel.input('item-text-2','new pending');press(cancel,'download-copy');const first=await cancel.blobs[0].text();press(cancel,'download-copy');equal(await cancel.blobs[1].text(),first,'possibly canceled structural download repeats same bytes');check(!cancel.n('undo-remove').disabled,'possibly canceled requests keep removal undo');leave(cancel,true,'possibly canceled structural request still dirty');press(cancel,'undo-remove');rows(cancel,[...data.items,{text:'new pending',done:false}],'undo still works after uncertain requests');
 let generation=next;
 for(let i=0;i<4;i++){press(generation,'add-item');generation.input('item-text-'+(generation.rows().length-1),'Generation '+i);press(generation,'download-copy');const opened=await saved(generation);equal(opened.data.items.at(-1).text,'Generation '+i,'later generation keeps new capability');leave(generation,true,'later-generation add remains dirty');leave(opened,false,'later-generation bytes clean');generation=opened;}
 press(generation,'download-copy');const same=await saved(generation);equal(same.html,generation.html,'stable data has stable generated bytes after structural edits');equal(same.context.INJECTED,undefined,'hostile text remains literal across structural generations');
}
function mainHarness(){
 const h=adapter(),questions=[],answers=[];h.questions=questions;h.answers=answers;let saves=0;
 const env={...h.env,TextEncoder,TextDecoder,console,localStorage:{getItem:()=>null,setItem(){saves++;},removeItem(){}},confirm(message){questions.push(message);h.onConfirm?.();return answers.length?answers.shift():true;},refreshResultPath(){h.refreshes=(h.refreshes||0)+1;}};
 env.window=env;env.window.addEventListener=()=>{};env.screens={journey:h.n('screen-journey')};env.appNavigate=()=>{};env.resultRecord=()=>h.run('s.resultPath');env.contextSummary=()=>{};env.makeHandoff=()=>{};
 const context=vm.createContext(env);h.context=context;h.run=script=>vm.runInContext(script,context);
 for(const file of ['result-path.js','labs.js','coach.js','progress-import.js','portable-checklist.js','tool-starter.js','app.js'])h.run(source(file));
 h.run('s.started=true;s.purpose="Harmless project";s.artifact="- First item\\n\\n• Second item  ";s.resultPath=ResultPath.fresh();');
 h.read=()=>JSON.parse(h.run('JSON.stringify(s)'));h.saves=()=>saves;
 return h;
}
(async()=>{
 await itemChanges();
 const literal='\n- Keep spacing  \n\n• café 🧵 e\u0301\n</script><script>globalThis.INJECTED=true</script><img src=x onerror=bad()> & " \'\nzero 0\n';
 const value=P.fromArtifact(literal);equal(value.items.map(x=>x.text).join('\n'),literal,'initial line/bullet/blank/Unicode preservation');
 check(!P.problem(value),'valid harmless literal text');
 const initial=P.build(value);check(initial.includes("connect-src 'none'")&&initial.includes("form-action 'none'")&&initial.includes("base-uri 'none'"),'network/navigation policies');
 check(initial.includes('not a backup of your full')&&initial.includes('Keep this file privately')&&initial.includes('does not sync or save automatically'),'clear private-file and recovery scope');
 // Best-effort event requests, not proof of browser prompts or OS saving.
 const loss=coldOpen(Buffer.from(initial));leave(loss,false,'untouched opened file');
 loss.input('item-text-1',value.items[1].text);leave(loss,false,'identical input event');
 loss.input('item-text-1','Changed');leave(loss,true,'text edit');leave(loss,true,'repeat leave request');
 loss.input('item-text-1','Changed again');leave(loss,true,'repeated text edit');
 loss.input('item-text-1',value.items[1].text);leave(loss,false,'text fully reverted');
 loss.mark(1,true);leave(loss,true,'tick only');loss.mark(1,false);leave(loss,false,'tick reverted');
 loss.input('item-text-1','Keep this change');loss.mark(2,true);loss.input('item-text-1',value.items[1].text);leave(loss,true,'text revert retains other tick change');
 loss.mark(2,false);leave(loss,false,'all changes reverted');
 loss.mark(2,true);loss.input('item-text-1','Keep this change');loss.mark(2,false);leave(loss,true,'tick revert retains text change');
 loss.input('item-text-1',value.items[1].text);leave(loss,false,'second complete revert');
 check(initial.includes('warning is not guaranteed and does not save your work'),'visible best-effort warning limit');
 const h=coldOpen(Buffer.from(initial));equal(h.data,value,'exact initial data');equal(h.context.INJECTED,undefined,'adversarial source is not executed');
 equal(h.n('checklist-items').children.length,value.items.length,'one accessible fieldset per original line');
 check(h.n('item-text-0').id==='item-text-0'&&h.n('item-done-0').type==='checkbox','labelled native controls');
 h.input('item-text-1','Changed <b>literal</b>\nsecond line & quotes "');h.mark(1,true);h.mark(3,true);h.n('download-copy').click();equal(h.clicks.length,1,'one explicit file request');equal(h.clicks[0].name,'my-small-win-checklist.html','clear HTML working-copy filename');
 check(/requested/.test(h.n('copy-status').textContent)&&/not proof/.test(h.n('copy-status').textContent),'request never claimed to be saved');
 leave(h,true,'successful download request keeps warning');
 const expected=structuredClone(value);expected.items[1]={text:'Changed <b>literal</b>\nsecond line & quotes "',done:true};expected.items[3].done=true;
 const next=await saved(h);equal(next.data,expected,'cold reopened updated text and tick marks');equal(next.context.INJECTED,undefined,'reopened adversarial string remains inert');
 leave(next,false,'exact downloaded bytes open clean');next.mark(1,false);leave(next,true,'untick opened true mark');next.mark(1,true);leave(next,false,'revert to opened true mark');
 next.input('item-text-3','Different draft 🐢\u2028\u2029');next.mark(1,false);next.n('download-copy').click();const third=await saved(next);expected.items[3].text='Different draft 🐢\u2028\u2029';expected.items[1].done=false;equal(third.data,expected,'second-generation changed text and unticked mark');
 third.n('download-copy').click();const fourth=await saved(third);equal(fourth.data,expected,'third generation without edits is exact');equal(fourth.html,third.html,'same data produces identical bytes, no growing runtime or DOM');
 leave(next,true,'second generation download keeps warning');leave(third,false,'later downloaded file opens clean');leave(fourth,false,'unchanged repeated generation stays clean');
 check(!/localStorage|sessionStorage|indexedDB|fetch\(|XMLHttpRequest|sendBeacon|innerHTML|outerHTML|cloneNode|eval\(/.test(source('portable-checklist.js')),'owned runtime has no storage/network/DOM serialization/eval');
 // Damaged or incompatible working-copy data fails visibly without replacing it.
 for(const payload of ['{broken',JSON.stringify({version:2,items:[]}),JSON.stringify({version:1,items:[{text:'Keep me',done:'yes'}]})]){
  const bad=adapter();bad.n('checklist-data').textContent=payload;bad.n('download-copy').disabled=true;bad.env.window=bad.env;const code=[...initial.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)][1][2];vm.runInNewContext(code,bad.env);check(bad.n('download-copy').disabled,'damaged file stays disabled');check(bad.n('copy-status').textContent.length>0,'damaged file gets visible error');equal(bad.n('checklist-data').textContent,payload,'damaged raw data not rewritten');equal(bad.clicks.length,0,'damaged file no download');leave(bad,false,'damaged file no leave warning');
 }
 // Exact model retention despite browser text-control normalization.
 const raw={version:1,items:[{text:'\r\nleading\rCR\nLF\r\n\u0000\ud800',done:true}]};const cr=coldOpen(Buffer.from(P.build(raw)));leave(cr,false,'display normalization alone is clean');cr.mark(0,false);leave(cr,true,'raw text with changed mark');cr.mark(0,true);leave(cr,false,'raw text exact model after mark revert');equal(cr.n('item-text-0').value,raw.items[0].text.replace(/\r\n?/g,'\n'),'explicit adapter models textarea line ending normalization');cr.n('download-copy').click();const crNext=await saved(cr);equal(crNext.data,raw,'unedited CR/LF, NUL and lone surrogate survive JSON/Blob bytes');leave(crNext,false,'raw bytes reopened clean');crNext.mark(0,false);crNext.n('download-copy').click();equal((await saved(crNext)).data.items[0].text,raw.items[0].text,'mark edits do not normalize retained text');
 crNext.input('item-text-0','new\r\ntext');crNext.n('download-copy').click();equal((await saved(crNext)).data.items[0].text,'new\ntext','actual edit adopts text-control value honestly');
 const normalized=coldOpen(Buffer.from(P.build(raw)));normalized.input('item-text-0',normalized.n('item-text-0').value);leave(normalized,true,'actual normalized input differs from exact opened model');
 // Request cancellation is outside the API: work remains and no saved state is invented.
 const canceled=coldOpen(Buffer.from(initial));canceled.input('item-text-0','Unsaved retained text');canceled.mark(0,true);canceled.n('download-copy').click();leave(canceled,true,'possibly canceled first request');const firstRequest=await canceled.blobs[0].text();canceled.n('download-copy').click();equal(await canceled.blobs[1].text(),firstRequest,'repeat after browser cancel is same full snapshot');leave(canceled,true,'repeat possibly blocked request');equal(canceled.n('item-text-0').value,'Unsaved retained text','request/cancel leaves current work');check(canceled.n('copy-status').textContent.includes('canceled or blocked'),'visible cancellation limit');canceled.input('item-text-0','Later edit');check(canceled.n('copy-status').textContent.includes('only in this open tab'),'edit after request revokes optimistic request status');leave(canceled,true,'later edit still warns');canceled.input('item-text-0',value.items[0].text);canceled.mark(0,false);leave(canceled,false,'full revert after requests clears warning');
 for(const fail of ['blob','url','element','click']){
  const f=coldOpen(Buffer.from(initial));f.input('item-text-0','Retain on '+fail);f.mark(0,true);const before=f.view();f.fail=fail;f.n('download-copy').click();equal(f.view(),before,fail+' keeps text and ticks');equal(f.clicks.length,0,fail+' no successful request');check(f.n('copy-status').textContent.includes('remain in this open tab'),fail+' visible error');check(!f.n('download-copy').disabled,fail+' retry enabled');leave(f,true,fail+' failed download keeps warning');f.fail=null;f.n('download-copy').click();const reopened=await saved(f);equal(reopened.data.items[0],{text:'Retain on '+fail,done:true},fail+' retries complete snapshot');leave(f,true,fail+' successful retry keeps old tab warning');leave(reopened,false,fail+' retried bytes reopen clean');
 }
 const cleanup=coldOpen(Buffer.from(initial));cleanup.input('item-text-0','Keep through cleanup failure');cleanup.fail='timer';cleanup.n('download-copy').click();check(cleanup.n('copy-status').textContent.includes('requested'),'cleanup failure does not misstate issued request');cleanup.fail=null;cleanup.n('download-copy').click();for(const timer of cleanup.timers){equal(timer.ms,30000,'URLs remain usable during request');timer.fn();}check(cleanup.revoked.length===1,'scheduled object URL cleanup');leave(cleanup,true,'cleanup failure and later cleanup preserve warning');
 const busy=coldOpen(Buffer.from(initial));busy.mark(0,true);busy.onClick=()=>busy.n('download-copy').click();busy.n('download-copy').click();equal(busy.clicks.length,1,'reentrant request blocked');busy.onClick=null;busy.n('download-copy').click();equal(busy.clicks.length,2,'later explicit request allowed');leave(busy,true,'reentrant and repeated requests preserve warning');
 const large=coldOpen(Buffer.from(initial));large.input('item-text-0','x'.repeat(P.MAX_TEXT+1));large.mark(0,true);large.n('download-copy').click();equal(large.clicks.length,0,'over-limit draft not downloaded');equal(large.n('item-text-0').value.length,P.MAX_TEXT+1,'over-limit draft remains visible, not truncated');check(large.n('copy-status').textContent.includes('Nothing was shortened'),'bound error remains visible after mark edit/export');leave(large,true,'over-limit rejected export keeps warning');large.input('item-text-0','Repaired');large.n('download-copy').click();equal((await saved(large)).data.items[0],{text:'Repaired',done:true},'repair preserves ticks');leave(large,true,'repaired export keeps warning');large.input('item-text-0',value.items[0].text);large.mark(0,false);leave(large,false,'over-limit work fully reverted');
 for(const artifact of ['x'.repeat(P.MAX_TEXT+1),'x\n'.repeat(P.MAX_ITEMS)]){assert.throws(()=>P.fromArtifact(artifact));checks++;}
 equal(P.fromArtifact('').items,[{text:'',done:false}],'empty draft remains an editable blank item');check(!P.problem(P.fromArtifact('x'.repeat(P.MAX_TEXT))),'exact text bound accepted');check(!P.problem(P.fromArtifact(Array(P.MAX_ITEMS).fill('').join('\n'))),'exact item bound accepted');
 // Execute actual app and download helper against explicit DOM/Blob adapters.
 const main=mainHarness(),before=main.read();main.n('download-app').click();equal(main.clicks.length,1,'old checkpoint invokes same real checklist controller');equal(main.read(),before,'export never grants completion/learning credit or changes source');equal((await saved(main)).data.items.map(x=>x.text).join('\n'),before.artifact,'app exports exact authoritative artifact only');
 const appSource=source('app.js');
 const branchSource=appSource.slice(appSource.indexOf("$('download-app').onclick"),appSource.indexOf('downloadChecklist();};',appSource.indexOf("$('download-app').onclick")));
 const expectedBranch="$('download-app').onclick=()=>{if(C.kind(s)==='tool'){if(!ToolStarter.valid(s.toolConfig||ToolStarter.defaults)){$('download-kind-note').textContent='Use non-empty option labels and valid non-negative starting numbers before downloading.';const bad=[...document.querySelectorAll('#tool-config input')].find(e=>e.id.startsWith('tool-label')?(!e.value.trim()||e.value.length>80):(!e.value.trim()||!Number.isFinite(Number(e.value))||Number(e.value)<0));if(bad)bad.focus();return;}download('my-cost-comparison-tool.html',ToolStarter.build(s.purpose,s.toolConfig||ToolStarter.defaults),'text/html');return;}if(C.kind(s)!=='checklist'){download('my-reusable-'+C.kind(s)+'-template.txt',s.artifact,'text/plain');return;}";
 equal(branchSource,expectedBranch,'calculator and text-template branch bytes unchanged from v83');
 for(const kind of ['message','poster','comparison','tool']){const branch=mainHarness();branch.run('s.projectKind='+JSON.stringify(kind));branch.n('download-app').click();equal(branch.clicks.length,1,kind+' branch still works');check(branch.clicks[0].name.includes(kind==='tool'?'cost-comparison-tool':kind),kind+' filename unchanged');}
 for(const accept of [false,true]){const f=mainHarness();f.run('s.resultPath.phase="transfer";s.resultPath.transferDraft="My changed attempt";s.resultPath.transferReviewed=false;s.save=true;');const before=f.read();f.answers.push(accept);f.n('download-app').click();equal(f.questions.length,1,'unfinished transfer requests consent');equal(f.clicks.length,accept?1:0,'canceled exposure never downloads');equal(f.read().artifact,before.artifact,'consent never changes original draft');equal(f.read().resultPath.transferDraft,before.resultPath.transferDraft,'consent preserves changed draft');equal(f.read().resultPath.transferExample,accept,'only accepted exposure records example');equal(f.saves(),accept?1:0,'canceled exposure does not persist');equal(f.read().done,before.done,'download does not grant checkpoints');if(!accept)equal(f.read(),before,'cancel preserves all learning state');else{f.n('download-app').click();equal(f.questions.length,1,'already recorded exposure does not repeat confirmation');equal(f.clicks.length,2,'repeat allowed');}}
 const invalid=mainHarness();invalid.run('s.artifact="x".repeat(12001);s.resultPath.phase="transfer";');const invalidBefore=invalid.read();invalid.n('download-app').click();equal(invalid.read(),invalidBefore,'invalid project leaves all learning state intact');equal(invalid.questions.length,0,'preflight failure does not request exposure');equal(invalid.clicks.length,0,'invalid project no request');check(invalid.n('download-kind-note').textContent.includes('Nothing was shortened'),'main draft error shown');
 const failed=mainHarness();failed.run('s.resultPath.phase="transfer";');failed.fail='blob';failed.n('download-app').click();equal(failed.clicks.length,0,'main Blob failure no request');check(failed.read().resultPath.transferExample,'accepted assistance kept honestly on failed request');check(failed.n('journey-status').textContent.includes('Could not prepare'),'Keep error visible');failed.fail=null;failed.n('download-app').click();equal(failed.clicks.length,1,'main retry works');equal(failed.questions.length,1,'retry honors recorded assistance');
 for(const mutate of ['s.artifact="Changed during confirm";','s=JSON.parse(JSON.stringify(s));','s.projectKind="message";','s.resultPath=ResultPath.fresh();','s.resultPath.transferDraft="A newer attempt";']){
  const stale=mainHarness();stale.run('s.resultPath.phase="transfer";globalThis.oldProject=s;');stale.onConfirm=()=>stale.run(mutate);stale.n('download-app').click();equal(stale.clicks.length,0,'changed confirmation cannot export a stale artifact');check(!stale.read().resultPath.transferExample,'replacement/current state never gains stale assistance');check(!stale.run('oldProject.resultPath.transferExample'),'original reference not mutated by stale acceptance');check(stale.n('journey-status').textContent.includes('changed during confirmation'),'stale confirmation visible');equal(stale.saves(),0,'stale consent never persists replacement');
 }
 const completed=mainHarness();completed.run('Object.assign(s.resultPath,{phase:"transfer",transferTask:"A different task",transferDraft:"A new useful draft",transferObserved:"It worked",transferCheck:"Compared original instructions",transferOutcome:"checked",transferSupport:"alone",transferReviewed:true,action:"Try it",expected:"Useful",observed:"Worked",check:"Compared",outcome:"checked",support:"alone",use:"Useful",reviewed:true,snapshot:s.artifact});');check(!completed.run('ResultPath.unfinishedTransfer(s)'),'completed fixture truly retrospective');const completeBefore=completed.read();completed.n('download-app').click();equal(completed.questions.length,0,'completed retrospective download no new help');equal(completed.read(),completeBefore,'completed record unchanged');
 // Main journey button reads existing state through shared function, never a clone.
 const journey=mainHarness();journey.run(source('project-journey.js'));journey.run(source('project-journey-ui.js'));check(!journey.n('journey-checklist').hidden,'checklist Keep entry visible');journey.run('s.artifact="Newest authoritative text";');journey.n('journey-checklist').click();equal((await saved(journey)).data.items[0].text,'Newest authoritative text','Keep reads latest existing editor state');journey.run('s.projectKind="poster";render();');check(journey.n('journey-checklist').hidden,'non-checklist Keep entry hidden');const count=journey.clicks.length;journey.n('journey-checklist').click();equal(journey.clicks.length,count,'forged non-checklist click has no effect');journey.run('s.projectKind="checklist";s.started=false;render();');check(journey.n('journey-checklist').hidden,'unstarted Keep entry hidden');journey.n('journey-checklist').click();equal(journey.clicks.length,count,'unstarted click has no effect');
 for(const accept of [false,true]){
  const keep=mainHarness();keep.run('s.resultPath.phase="transfer";');keep.run(source('project-journey.js'));keep.run(source('project-journey-ui.js'));check(keep.n('journey-checklist').textContent.includes('records example help'),'Keep warns before first-answer exposure');const before=keep.read();keep.answers.push(accept);keep.n('journey-checklist').click();equal(keep.clicks.length,accept?1:0,'Keep respects consent cancellation');equal(keep.read().resultPath.transferExample,accept,'Keep uses shared assistance boundary');if(!accept)equal(keep.read(),before,'Keep cancel preserves entire record');
 }
 const privateScope=mainHarness();privateScope.run('s.sourceBasis={facts:"SOURCE OMIT",response:"RESPONSE OMIT"};s.resultHistory=[{artifact:"HISTORY OMIT"}];s.externalNote="NOTE OMIT";');privateScope.n('download-app').click();const scoped=await saved(privateScope);check(!/SOURCE OMIT|RESPONSE OMIT|HISTORY OMIT|NOTE OMIT/.test(scoped.html),'checklist does not include source, answers, history or learning notes');
 const html=source('index.html');check(html.indexOf('portable-checklist.js')<html.indexOf('app.js'),'runtime available before app binds export');
 console.log(`PASS ${checks} portable checklist assertions: addition/removal/latest undo, structural dirty reverts/limits/focus and removed-data exclusion, actual generated-byte cold reopening, exact Unicode/line endings and marks across generations, literal adversarial text, dirty-only beforeunload event requests and full reverts, DOM/Blob failure/cancel/repeat/edit/bounds, actual app/Keep assistance and unchanged other branches. Explicit adapters only; no browser, OS-save or learner acceptance claim.`);
})().catch(error=>{console.error(error);process.exitCode=1;});
