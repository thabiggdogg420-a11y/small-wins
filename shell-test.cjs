'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict');
const html=fs.readFileSync('public/index.html','utf8'),shell=fs.readFileSync('public/shell.js','utf8'),app=fs.readFileSync('public/app.js','utf8'),css=fs.readFileSync('public/style.css','utf8');
const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]);assert.equal(new Set(ids).size,ids.length,'existing control IDs stay unique');
for(const id of ['onboarding','workspace','ai-handoff','artifact','evidence','reflection','review-panel','handoff-reviewed','handoff-preview','export','import','delete','finish'])assert(ids.includes(id),id);
assert(html.indexOf('shell.js')>html.indexOf('handoff-ui.js'));
assert(shell.includes("window.addEventListener('hashchange'"));assert(shell.includes('location.hash=route'));
assert(!/localStorage\.(setItem|removeItem)|fetch\(|XMLHttpRequest/.test(shell),'navigation must not save/delete/transmit learner data');
assert(shell.includes("if(b&&b.id!=='home-start')"));assert(shell.includes("skip.addEventListener('click'"));
assert(app.includes("appNavigate('learn')"));assert(css.includes('safe-area-inset-bottom'));assert(css.includes('.keyboard-open .app-nav{display:none}'));
console.log('PASS: shell integration contracts, retained control IDs, state-free hash navigation, skip/start actions, safe-area/keyboard CSS. Static checks only; rendered interaction QA remains required.');

assert(shell.includes("returnStart=$('handoff-return-title')"),'return pane must use stable marker, not first heading');assert(html.includes('id="handoff-return-title"'));

// Primary route coherently separates optional checkpoints without changing evidence.
const vm=require('node:vm'),resumeSource=shell.match(/function resumeWinRoute\(\)\{[^\n]+/)[0];let state=Cstate();function Cstate(){return {step:0,done:Array(10).fill(false),evidence:Array(10).fill('')}}
const ctx={s:state};vm.createContext(ctx);vm.runInContext(resumeSource,ctx);assert.equal(ctx.resumeWinRoute(),'learn');state.step=4;assert.equal(ctx.resumeWinRoute(),'learn/checkpoints');state.resultPath={action:'Try a useful task'};assert.equal(ctx.resumeWinRoute(),'learn');state.resultPath={action:'',expected:'',observed:'',reviewed:false};state.done[2]=true;assert.equal(ctx.resumeWinRoute(),'learn/checkpoints');assert(shell.includes('Supporting practice'));assert(shell.includes("part==='checkpoints'"));assert(shell.includes('result-progress-summary'));console.log('PASS: legacy checkpoint resume, new active result resume, supporting-practice route and coherent progress contracts.');
