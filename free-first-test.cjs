'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('public/learn-redesign.js','utf8'),workbench=fs.readFileSync('public/workbench-ui.js','utf8');
const nodes=new Map(),created=[];let nativeStarts=0;
function node(id){if(nodes.has(id))return nodes.get(id);const x={id,hidden:false,innerHTML:'',textContent:'',listeners:{},children:[],setAttribute(){},addEventListener(t,fn){this.listeners[t]=fn;},click(){this.listeners.click?.({preventDefault(){}});},after(...e){this.afterNodes=e;},before(...e){this.beforeNodes=e;},querySelector:node,append(...e){this.children.push(...e);},insertAdjacentHTML(pos,s){this.innerHTML+=s;},scrollIntoView(){this.scrolled=true;},focus(){this.focused=true;}};nodes.set(id,x);return x;}
node('beginner-now').listeners.click=()=>nativeStarts++;
vm.runInNewContext(source,{document:{querySelector:node,getElementById:node,createElement(tag){const e=node('created-'+created.length);created.push(e);return e;}}});
assert.match(node('.intro').innerHTML,/Small starts\.<br><em>Useful skills\./);
assert.match(node('.intro').innerHTML,/No card\. No Learn4Free account/);assert.equal((node('.intro').innerHTML.match(/class="primary"/g)||[]).length,1,'one primary beginner invitation');assert.match(node('.intro').innerHTML,/illustrative, made-up example/);
for(const id of ['try-first-practice','free-first-practice'])node(id).click();assert.equal(nativeStarts,2,'both entry buttons use the original practice controller');
node('choose-guided-task').click();assert.equal(created[0].scrolled,true);assert.equal(node('useful-ai-title').focused,true);
const cards=created[0].innerHTML;for(const path of ['/application-workshop/','/pack-cost.html','/ai-pack.html','/ai-notice.html','/lesson-pack.html','/ai-stock.html','/ai-schedule.html','/notes-csv.html']){assert.ok(cards.includes('href="'+path+'"'));assert.ok(fs.existsSync('public'+path+(path.endsWith('/')?'index.html':'')));}
assert.equal((cards.match(/<article>/g)||[]).length,6);assert.equal((cards.match(/You leave with:/g)||[]).length,6);
for(const a of [...cards.matchAll(/<a\b[^>]*>/g)].map(x=>x[0])){assert.match(a,/target="_blank"/);assert.match(a,/rel="noopener noreferrer"/);}
const redirect=workbench.match(/if\(!location.hash\)\{history.replaceState[^\n]+/)[0];
for(const [hash,started,expected] of [['',false,'#home'],['',true,'#journey'],['#progress',false,null],['#ai/review',true,null]]){let pushed=null,shows=0;vm.runInNewContext(redirect,{location:{hash},s:{started},history:{replaceState(a,b,h){pushed=h;}},showRoute(){shows++;}});assert.equal(pushed,expected);assert.equal(shows,expected?1:0);}
assert.doesNotMatch(source,/fetch\(|XMLHttpRequest|localStorage|sessionStorage|s\.done\s*=/);
assert.match(created[1].innerHTML,/official access FAQ/);assert.match(created[2].innerHTML,/recognised qualification/);
for(const name of ['ai-notice.html','ai-pack.html','lesson-pack.html','pack-cost.html'])assert.match(fs.readFileSync('public/'+name,'utf8'),/href="https:\/\/learn\.free4allhub\.com\/#home">See all free starting points/);
const html=fs.readFileSync('public/index.html','utf8');assert.ok(html.indexOf('workbench.css')<html.indexOf('free-first.css'));assert.match(fs.readFileSync('public/free-first.css','utf8'),/max-width:700px/);
console.log('PASS: free-first content, original practice entry handlers, focused discovery, valid separate-tab routes, retained-project and deep-link navigation, cost/outcome boundaries; no new storage or transmission.');
