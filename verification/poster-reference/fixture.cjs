'use strict';
// Production scripts with explicit DOM, storage and SVG metric adapters.
// Derived unchanged in behavior from poster-output-test.cjs, with counters and event hooks.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
function fixture(stored=null, root=process.cwd()){
 const C=require(path.join(root,'public/coach.js'));
 const source=file=>fs.readFileSync(path.join(root,'public',file),'utf8');
 const nodes=new Map(),listeners={},downloads=[],answers=[],windows={};let route='journey',writes=0;
 const h={measure:'fit',failDownload:false};
 const decode=s=>s.replace(/&(amp|lt|gt|quot|apos);/g,(_,x)=>({amp:'&',lt:'<',gt:'>',quot:'"',apos:"'"}[x]));
 class Node{
  constructor(id=''){this.id=id;this._value='';this.textContent='';this.checked=false;this.hidden=false;this.disabled=false;this.dataset={};this.children=[];this.attrs={};this.handlers={};this._html='';}
  set id(v){this._id=v;if(v)nodes.set(v,this);}get id(){return this._id;}
  set value(v){this.valueWrites=(this.valueWrites||0)+1;this._value=String(v).replace(/\r\n?/g,'\n');this.selectionStart=this.selectionEnd=this._value.length;}get value(){return this._value;}
  set innerHTML(v){this.htmlWrites=(this.htmlWrites||0)+1;this._html=v;}get innerHTML(){return this._html;}
  setAttribute(k,v){this.attrs[k]=String(v);}addEventListener(t,f){(this.handlers[t]??=[]).push(f);}focus(){h.focus=this.id;}scrollIntoView(){}before(){}
  append(...children){this.children.push(...children);}replaceChildren(){this.clears=(this.clears||0)+1;this.children=[];this._html='';}contains(t){return t===this;}
  querySelector(q){if(q==='svg')return this._html.startsWith('<svg')?{querySelectorAll:()=>Array.from(this._html.matchAll(/<text[^>]*y="(\d+)"[^>]*>([\s\S]*?)<\/text>/g),m=>{const text=decode(m[2]),y=Number(m[1]);return {textContent:text,getBBox(){if(h.measure==='throw')throw Error('not supported');return text?{x:64,y:y-38,width:h.measure==='overflow'?710:Math.max(10,Array.from(text).length*12),height:40}:{x:0,y:0,width:0,height:0};},getComputedTextLength:()=>h.measure==='missing'?NaN:Array.from(text).length*12};})}:null;return el(q.replace(/[^a-z-]/g,''));}
  click(){fire(this.id);}
 }
 function el(id){return nodes.get(id)||new Node(id);}
 const kinds=Object.keys(C.projectKinds).map(kind=>Object.assign(el('kind-'+kind),{dataset:{kind}}));
 const document={getElementById:el,createElement:()=>new Node(),querySelector:()=>el('artifact-label'),querySelectorAll:q=>q==='[data-kind]'?kinds:[],addEventListener(t,f,capture){(listeners[t]??=[]).push({f,capture:!!capture});},fonts:{addEventListener(t,f){windows['fonts:'+t]=f;}}};
 const ctx=vm.createContext({document,TextEncoder,console,URL,Blob,setTimeout,location:{href:'https://learn.example/#journey'},window:{addEventListener(t,f){(windows[t]??=[]).push(f);}},localStorage:{getItem:()=>stored,setItem(k,v){if(h.failSave)throw Error('denied');stored=v;writes++;},removeItem(){stored=null;}},confirm:()=>answers.length?answers.shift():true,appNavigate:r=>{route=r;},currentRoute:()=>route,showRoute(){}});
 ctx.addEventListener=ctx.window.addEventListener;ctx.window=ctx;
 const run=code=>vm.runInContext(code,ctx),load=file=>run(source(file));
 for(const file of ['result-path.js','labs.js','coach.js','tool-starter.js','manual-brief.js','progress-import.js'])load(file);
 let app=source('app.js'),a=app.indexOf('function render(){'),b=app.indexOf('\ndocument.querySelectorAll',a);run(app.slice(0,a)+'function render(){}'+app.slice(b));
 ctx.recordDownload=(name,text,type)=>{if(h.failDownload)throw Error('download');downloads.push({name,text,type});};run('download=(name,text,type)=>recordDownload(name,text,type)');
 if(!stored)run("s.started=true;s.projectKind='poster';s.purpose='Fictional poster';s.artifact=Coach.templateFor(s);s.baseline=s.artifact;s.resultPath=ResultPath.fresh()");
 for(const file of ['result-path-ui.js','poster-output.js','poster-output-controller.js','poster-output-ui.js'])load(file);
 function fire(id,type='click'){const e=el(id),event={target:e,type};for(const x of listeners[type]||[])if(x.capture)x.f(event);h.afterCapture?.(event);e['on'+type]?.(event);for(const f of e.handlers[type]||[])f(event);for(const x of listeners[type]||[])if(!x.capture)x.f(event);}
 function input(id,value,type='input'){el(id).value=value;fire(id,type);}
 function approve(){for(const id of ['facts','readable','private']){el('poster-'+id).checked=true;fire('poster-'+id,'change');}}
 async function select(value){const raw=typeof value==='string'?value:JSON.stringify(value);await el('import').onchange({target:{files:[{size:Buffer.byteLength(raw),text:async()=>raw}],value:'file'}});}
 const read=()=>JSON.parse(run('JSON.stringify(s)'));
 return Object.assign(h,{el,fire,run,input,approve,select,downloads,answers,read,route(r){route=r;for(const fn of windows.hashchange||[])fn();},event(t){for(const f of windows[t]||[])f();},font(){windows['fonts:loadingdone']();},getStored:()=>stored,getWrites:()=>writes, listen(type,fn,capture=false){(listeners[type]??=[]).push({f:fn,capture});}});
}
module.exports={fixture};
