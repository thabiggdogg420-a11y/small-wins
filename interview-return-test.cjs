'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('public/interview-ui.js','utf8');let html='',first=0,resume=0,inserted=0;const els={onboarding:{hidden:false,after(card){assert.equal(typeof card.setAttribute,'function');inserted++}},'home-start':{click(){first++}},'home-continue':{click(){resume++}}};
const $=id=>els[id]||(els[id]={value:'',textContent:'',focus(){},select(){}});
vm.runInNewContext(source,{$,SmallWinsInterview:require('./public/interview-prompt.js'),navigator:{},document:{createElement(){return{setAttribute(){},set innerHTML(v){html=v}}}}});
assert.equal(inserted,1);
for(let i=0;i<2;i++)$('interview-practice').onclick();assert.equal(first,2);assert.equal(resume,0);
$('onboarding').hidden=true;for(let i=0;i<2;i++)$('interview-practice').onclick();assert.equal(first,2);assert.equal(resume,2);
$('onboarding').hidden=false;$('interview-practice').onclick();assert.equal(first,3); // reset/delete returns to goal setup
assert.match(html,/data-route="ai\/return"/);assert.match(html,/Choose a goal before adding/);assert.match(html,/not your interview answers/);assert.match(html,/An AI suggestion alone is not a checked win/);assert.match(html,/Nothing is imported automatically/);
assert(!/localStorage|fetch\(|XMLHttpRequest|sendBeacon|persist\(|\bs\.(?:purpose|artifact|started|done|save)/.test(source));
assert.match(require('./public/interview-prompt.js').prompt,/ten-answer entrance fee/);
console.log('PASS: new goal, existing project, repeated clicks and reset branch reuse existing handlers; explicit return route and privacy/check boundaries; no persistence/network/state mutation; optional early-start interview boundary. DOM-stub test, not rendered browser QA.');
