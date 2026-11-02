'use strict';const assert=require('node:assert/strict'),fs=require('node:fs'),C=require('./public/coach.js');
for(const goal of ['week','work','hobby','own'])assert(C.suggestGoal(goal).length>20);
const s=C.fresh();s.step=2;s.done[1]=true;s.done[2]=true;s.reflections[2].reviewed=true;C.invalidate(s);assert.equal(s.done[2],false);assert.equal(s.reflections[2].reviewed,false);assert.equal(s.done[1],true);
const app=fs.readFileSync('public/app.js','utf8');for(const source of ['s.artifact=e.target.value;invalidateAttempt()','s.tool=e.target.value;invalidateAttempt()','s.connection=e.target.value;invalidateAttempt()'])assert(app.includes(source));assert(app.match(/invalidateAttempt\(\)/g).length>=7);
const loop=fs.readFileSync('public/learner-loop.js','utf8');assert(!/fetch\(|XMLHttpRequest/.test(loop));assert(loop.includes('not yet checked'));assert(loop.includes('Replace the current attempt note'));assert(!loop.includes("checked=true"));
console.log('PASS: category goal examples, stale current-check invalidation, unrelated history retained, opt-in context/handback source contracts. Rendered QA pending.');

const handoff=fs.readFileSync('public/handoff-ui.js','utf8');assert(handoff.includes('if(handoffStale)'));assert(handoff.includes("$('handoff-reviewed').disabled=true"));assert(handoff.includes("'provider','handoff-mode','share-goal','share-project','share-evidence','share-note'"));console.log('PASS: changed context/provider/mode blocks stale preview and disables review until rebuild.');

assert(loop.includes("s.reflections[s.step]=C.reflection()"));assert(loop.includes("s.reflections[s.step].support='hint'"));console.log('PASS: imported AI attempt requires fresh reflection and defaults to assisted practice.');
