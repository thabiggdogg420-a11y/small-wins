'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const BeginnerStart=require('./public/beginner-start.js'),Coach=require('./public/coach.js');
const entrySource=fs.readFileSync('public/learn-redesign.js','utf8');
const workspaceSource=fs.readFileSync('public/workbench-ui.js','utf8');
let assertions=0;function check(fn){fn();assertions++;}
// Actual entry and beginner controllers, with a small explicit DOM adapter.
// This is not a browser render or an accessibility acceptance test.
function harness(){
 const nodes=new Map(),created=[],events=[],downloads=[];let serial=0,starts=0,confirmed=false;
 function node(key){
  if(nodes.has(key))return nodes.get(key);
  const n={hidden:false,open:false,disabled:false,value:'',checked:false,textContent:'',innerHTML:'',children:[],attrs:{},dataset:{},handlers:{},parentNode:null,
   setAttribute(k,v){this.attrs[k]=v;},addEventListener(k,f){(this.handlers[k]??=[]).push(f);},
   append(...items){for(const item of items){if(item.parentNode)item.parentNode.children=item.parentNode.children.filter(x=>x!==item);item.parentNode=this;this.children.push(item);}},
   prepend(...items){this.append(...items);this.children=[...items,...this.children.filter(x=>!items.includes(x))];},
   before(...items){this.beforeNodes=items;},after(...items){this.afterNodes=items;},replaceChildren(){this.children=[];},
   insertAdjacentHTML(pos,text){this.innerHTML+=text;},scrollIntoView(){events.push('scroll:'+this.id);},
   focus(){events.push('focus:'+this.id);},click(){this.onclick?.({target:this,preventDefault(){}});for(const f of this.handlers.click||[])f({target:this,preventDefault(){}});},
   querySelector(selector){if(selector==='div:not([hidden]) > h3'){const phase=['question','recommendation','demo','guided-pane','transfer','finish'].find(x=>!node('beginner-'+x).hidden);return phase?node('beginner-'+(phase==='guided-pane'?'guided':phase)+'-title'):null;}return node(selector);}
  };let id=key;Object.defineProperty(n,'id',{get:()=>id,set:v=>{id=v;nodes.set(v,n);}});nodes.set(key,n);return n;
 }
 node('delete').onclick=()=>{};
 const ctx={BeginnerStart,s:Coach.fresh(),$:node,confirm:()=>confirmed,
  AggregateFunnel:{record(type){if(type==='start')starts++;}},download(name,text){downloads.push({name,text});},appNavigate(route){events.push('route:'+route);},
  document:{getElementById:node,querySelector:node,createElement(tag){const n=node('generated-'+(++serial));n.tagName=tag.toUpperCase();created.push(n);return n;}}
 };
 vm.createContext(ctx);vm.runInContext(fs.readFileSync('public/beginner-start-ui.js','utf8'),ctx);vm.runInContext(entrySource,ctx);
 return {node,ctx,events,created,starts:()=>starts,confirmed:v=>confirmed=v,
  fire:id=>node(id).click(),input(id,value){node(id).value=value;for(const f of node(id).handlers.input||[])f({target:{value}});},
  record(){node('beginner-download').click();return downloads.at(-1).text;}};
}
const h=harness(),e=h.node;
check(()=>assert.equal(e('entry-practice').open,false));
check(()=>assert.equal(e('beginner-start').parentNode,e('entry-practice'),'reparent the original practice, do not clone it'));
for(const id of ['onboarding','.home-actions','.interview-start'])check(()=>assert.equal(e(id).parentNode,e('entry-workspace')));
h.fire('try-first-practice');
check(()=>assert.equal(h.starts(),1));check(()=>assert.equal(e('entry-practice').open,true));check(()=>assert.equal(e('beginner-demo').hidden,false));check(()=>assert.equal(h.events.filter(x=>x.startsWith('focus:')).at(-1),'focus:beginner-demo-title'));
h.fire('beginner-guided');h.input('beginner-guided-draft','My own unfinished wording');h.input('beginner-guided-issue','time');h.fire('beginner-guided-hint');
const record=h.record(),main=JSON.stringify(h.ctx.s);
e('entry-practice').open=false;h.fire('try-first-practice');h.fire('free-first-practice');
check(()=>assert.equal(h.starts(),1,'repeat entry must not start a fresh route or increment starts'));
check(()=>assert.equal(h.record(),record,'draft, choices and recorded hint survive both entry buttons'));
check(()=>assert.equal(e('beginner-guided-draft').value,'My own unfinished wording'));
check(()=>assert.equal(h.events.filter(x=>x.startsWith('focus:')).at(-1),'focus:beginner-guided-title'));
h.fire('beginner-pause');check(()=>assert.equal(e('beginner-welcome').hidden,false));e('entry-practice').open=false;h.fire('try-first-practice');
check(()=>assert.equal(e('beginner-guided-pane').hidden,false));check(()=>assert.equal(h.starts(),1));check(()=>assert.equal(h.record(),record,'paused work resumes using the native Resume handler'));
h.fire('beginner-reset');check(()=>assert.equal(h.record(),record,'cancelled native clear keeps the work'));
h.confirmed(true);h.fire('beginner-reset');h.fire('beginner-interview');const question=e('beginner-question-title').textContent;h.fire('try-first-practice');
check(()=>assert.equal(e('beginner-question-title').textContent,question));check(()=>assert.equal(e('beginner-question').hidden,false));check(()=>assert.equal(h.starts(),1,'optional interview is not replaced with a practice route'));
check(()=>assert.equal(JSON.stringify(h.ctx.s),main,'entry has not changed any main-project state'));
h.fire('home-start');check(()=>assert.equal(e('entry-workspace').open,true));check(()=>assert.equal(h.events.at(-1),'focus:purpose'));
h.fire('choose-guided-task');check(()=>assert.equal(h.events.at(-1),'focus:useful-ai-title'));
// Exercise the actual new workspace handlers against the original kind chooser.
const shortcutSource=workspaceSource.slice(workspaceSource.indexOf('// Entry shortcuts'));
for(const started of [false,true]){
 const s=Coach.fresh();Object.assign(s,{started,save:true,projectKind:'message',purpose:'Existing purpose',artifact:'Do not replace this draft',externalNote:'Keep this note',resultPath:{phase:'transfer',reviewed:true,transferReviewed:true,transferDraft:'Keep related attempt'}});
 const items=new Map(),focus=[],kinds=['poster','checklist','message','comparison','tool'].map(kind=>({dataset:{kind},setAttribute(){},click(){this.onclick();}}));
 function node(id){if(!items.has(id))items.set(id,{id,children:[],hidden:false,textContent:'',prepend(n){this.children.unshift(n);}});return items.get(id);}
 let refreshes=0;const ctx={s,$:node,refreshAppShell(){refreshes++;},focusProjectControl(id){focus.push(id);},document:{querySelectorAll:()=>kinds,querySelector:q=>kinds.find(x=>q.includes('"'+x.dataset.kind+'"'))}};
 vm.createContext(ctx);vm.runInContext(fs.readFileSync('public/project-kinds.js','utf8').split('\n')[1],ctx);vm.runInContext(shortcutSource,ctx);
 check(()=>assert.equal(node('entry-project-actions').children[0],node('choose-personal-project')));
 check(()=>assert.equal(refreshes,1));check(()=>assert.equal(node('entry-existing-project-note').hidden,!started));
 for(const kind of ['poster','checklist']){
  const before=JSON.stringify(s);node('entry-'+kind).onclick();check(()=>assert.equal(focus.at(-1),started?'journey-next':'purpose'));
  if(started){check(()=>assert.equal(JSON.stringify(s),before,'active project and checked statuses are byte-for-byte unchanged'));check(()=>assert.equal(node('entry-'+kind).textContent,'Open current workspace →'));}
  else{const after=JSON.parse(JSON.stringify(s));after.projectKind='message';const expected=JSON.parse(before);expected.projectKind='message';check(()=>assert.deepEqual(after,expected,'unstarted shortcut changes only the native selection'));check(()=>assert.equal(s.projectKind,kind));check(()=>assert.equal(s.started,false));}
 }
}
// Content and boundaries: every previous lesson remains available, original links stay ordinary.
const markup=h.created.map(x=>x.innerHTML).join('\n')+e('.intro').innerHTML;
for(const path of ['/notes-csv.html','/application-workshop/','/pack-cost.html','/ai-pack.html','/ai-notice.html','/lesson-pack.html','/ai-stock.html','/ai-schedule.html']){
 check(()=>assert.ok(markup.includes('href="'+path+'"')));check(()=>assert.ok(fs.existsSync('public'+path+(path.endsWith('/')?'index.html':''))));
}
check(()=>assert.match(markup,/Import \/ manage progress/));check(()=>assert.match(markup,/not an image or PDF/));check(()=>assert.match(markup,/not a completed learner result/));check(()=>assert.match(markup,/Check spreadsheet import separately/));
check(()=>assert.equal((e('.intro').innerHTML.match(/class="primary"/g)||[]).length,1));
check(()=>assert.doesNotMatch(entrySource+shortcutSource,/fetch\(|XMLHttpRequest|localStorage|sessionStorage|\.checked\s*=|\.reviewed\s*=|\.done\s*=/));
const css=fs.readFileSync('public/free-first.css','utf8');
for(const contract of [/--learn-blue:#c9daf6/,/--learn-blue-ink:#233f67/,/html\[data-theme=dark\]/,/max-width:700px/,/max-width:480px/,/prefers-reduced-motion/,/grid-template-columns:1fr/,/\.app-ready \.intro\{[^}]*max-width:none;width:100%/s])check(()=>assert.match(css,contract));
console.log('PASS '+assertions+' Learn entry assertions: original-node recomposition, one primary start, real beginner repeat/pause/interview retention, native guarded project shortcuts, active draft/review isolation, discoverable import and all lesson routes. DOM-adapter/source checks only.');
