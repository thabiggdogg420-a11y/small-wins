'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');let n=0;
const source=fs.readFileSync('public/shell.js','utf8');const code=source.slice(source.indexOf('// Conservative keyboard layout aid'),source.indexOf("document.body.classList.add('app-ready')"));
function check(f){f();n++}
function setup(options={}){const {active,height,scale,inner,available}=Object.assign({active:null,height:800,scale:1,inner:800,available:true},options);const listeners={},classes=new Set(),viewport={height,scale,addEventListener:(k,fn)=>listeners['viewport:'+k]=fn};const document={activeElement:active,body:{classList:{toggle:(k,on)=>on?classes.add(k):classes.delete(k),remove:k=>classes.delete(k)}},addEventListener:(k,fn)=>listeners[k]=fn};const window={innerHeight:inner,visualViewport:available?viewport:undefined};const ctx={window,document};vm.createContext(ctx);vm.runInContext(code,ctx);return {viewport,document,window,listeners,hidden:()=>classes.has('keyboard-open')};}
const field=(tagName='TEXTAREA',type='text')=>({tagName,type,disabled:false,readOnly:false});
let x=setup();check(()=>assert(!x.hidden()));check(()=>assert(x.listeners['focusin']&&x.listeners['focusout']&&x.listeners['viewport:resize']));
// Exact original defect: zoom without editing must never hide navigation.
x=setup({height:400,scale:2});check(()=>assert(!x.hidden()));x.listeners['viewport:resize']();check(()=>assert(!x.hidden()));
for(const scale of [0.5,0.9,1.02,1.25,2,4,NaN,undefined,Infinity]){x=setup({active:field(),height:300,scale});check(()=>assert(!x.hidden()));}
for(const tag of ['BODY','BUTTON','H3','SELECT','A']){x=setup({active:field(tag),height:300});check(()=>assert(!x.hidden()));}
for(const type of ['checkbox','radio','range','file','color','button','submit','reset','hidden','date','time']){x=setup({active:field('INPUT',type),height:300});check(()=>assert(!x.hidden()));}
for(const type of ['text','search','url','tel','email','password','number']){x=setup({active:field('INPUT',type),height:300});check(()=>assert(x.hidden()));}
x=setup({active:field(),height:300});check(()=>assert(x.hidden())); // immediate initialization
x.document.activeElement=field('BUTTON');x.listeners.focusout();check(()=>assert(!x.hidden()));x.listeners.focusin();check(()=>assert(!x.hidden()));
x.document.activeElement=field();x.listeners.focusin();check(()=>assert(x.hidden()));x.viewport.scale=2;x.listeners['viewport:resize']();check(()=>assert(!x.hidden()));x.viewport.scale=1;x.listeners['viewport:resize']();check(()=>assert(x.hidden()));
x.viewport.height=800;x.listeners['viewport:resize']();check(()=>assert(!x.hidden()));x.viewport.height=659;x.listeners['viewport:resize']();check(()=>assert(x.hidden()));x.viewport.height=660;x.listeners['viewport:resize']();check(()=>assert(!x.hidden()));
for(const height of [0,-1,NaN,Infinity,800]){x=setup({active:field(),height});check(()=>assert(!x.hidden()));}
for(const prop of ['disabled','readOnly']){const active=field();active[prop]=true;x=setup({active,height:300});check(()=>assert(!x.hidden()));}
x=setup({available:false});check(()=>assert(!x.hidden()));check(()=>assert.equal(Object.keys(x.listeners).length,0));
// Focusout does not rely on when a browser updates activeElement; restore even if it is stale.
x=setup({active:field(),height:300});x.listeners.focusout();check(()=>assert(!x.hidden()));x.listeners.focusin();check(()=>assert(x.hidden()));
const active=field();Object.defineProperty(active,'value',{get(){throw Error('must not read text')}});x=setup({active,height:300});check(()=>assert(x.hidden()));
check(()=>assert(!/localStorage|sessionStorage|fetch\(|sendBeacon|preventDefault|\.focus\(/.test(code)));
console.log('PASS: '+n+' keyboard-layout assertions: initialization, zoom/no-editing fail-open navigation, input types, focus recovery, threshold boundaries and no learner-text/storage reads. Extracted real handler with mocked viewport; not physical/mobile runtime.');
