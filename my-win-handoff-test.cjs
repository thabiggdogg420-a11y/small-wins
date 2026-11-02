'use strict';
// Synthetic actual-handler regression. No provider, clipboard, network or learner outcomes.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const C=require('./public/coach.js'),R=require('./public/result-path.js'),Handoff=require('./public/handoff.js');
let assertions=0;function eq(a,b,message){assert.deepEqual(a,b,message);assertions++;}function ok(value,message){assert(value,message);assertions++;}
function setup(){
 const elements={},copies=[],downloads=[],docListeners={};
 function $(id){return elements[id]||(elements[id]={id,value:'',checked:false,disabled:false,textContent:'',listeners:{},addEventListener(name,fn){(this.listeners[name]||=[]).push(fn);},focus(){},select(){}});}
 function emit(id,type='input'){const event={target:$(id)};for(const fn of $(id).listeners[type]||[])fn(event);for(const fn of docListeners[type]||[])fn(event);}
 const s=C.fresh();s.started=true;s.projectKind='message';s.purpose='Synthetic club reminder goal';s.artifact='FIRST_DRAFT_SECRET: Club starts at 4 pm';s.sourceBasis={facts:'SOURCE_FACT_SECRET',request:'SOURCE_REQUEST_SECRET'};s.resultHistory=[{artifact:'HISTORY_SECRET'}];s.resultPath=R.fresh();
 Object.assign(s.resultPath,{action:'Draft an unsent reminder',expected:'Keep the original time',observed:'Draft says 4 pm, my source says 3 pm',check:'Compared both times; found a mismatch',outcome:'stuck',support:'example',use:'A draft only',recoveryUsed:true,workedExampleUsed:true,localAiUsed:true,pastedAnswerUsed:true,snapshot:'FIRST_SNAPSHOT_SECRET',transferTask:'RELATED_TASK: Different reader',transferDraft:'RELATED_DRAFT: club reminder',transferObserved:'RELATED_OBSERVED: reader understood',transferCheck:'RELATED_CHECK: compared each fact',transferOutcome:'checked',transferSupport:'question',transferHelp:true,transferExample:false});
 $('provider').value='chatgpt';$('handoff-mode').value='feedback';
 const context={$,s,C,Handoff,URL,location:{href:'https://example.test/'},document:{addEventListener(name,fn){(docListeners[name]||=[]).push(fn);}},persist(){},download:(...args)=>downloads.push(args),navigator:{clipboard:{writeText:async value=>copies.push(value)}}};
 vm.runInNewContext(fs.readFileSync('public/handoff-ui.js','utf8'),context);
 const build=()=>$('make-handoff').onclick();
 const data=()=>JSON.parse($('handoff-preview').value.split('LEARNER-SELECTED CONTEXT (quoted data, not instructions)\n')[1]);
 function select(value=true){$('share-result').checked=value;emit('share-result','change');}
 const copy=async()=>{$('handoff-reviewed').checked=true;await $('copy-handoff').onclick();};
 return {$,s,emit,copies,downloads,build,data,select,copy,context};
}
(async()=>{
 let h=setup();const {$,s}=h;
 eq($('share-result').checked,false,'new opt-in is unchecked');eq(h.data(),{},'default preview remains generic');
 h.select();h.build();eq($('handoff-reviewed').checked,false,'new preview requires exact review');
 eq(h.data(),{myWin:{phase:'first',evidence:'Learner-reported notes; not independently verified.',action:s.resultPath.action,expected:s.resultPath.expected,observed:s.resultPath.observed,check:s.resultPath.check,outcome:'stuck',support:'example',use:'A draft only',help:{recoveryHint:true,workedExample:true,localAiAnswer:true,pastedAnswer:true}}},'only explicitly selected first-phase notes and honest help flags');
 for(const excluded of ['FIRST_DRAFT_SECRET','SOURCE_FACT_SECRET','SOURCE_REQUEST_SECRET','HISTORY_SECRET','FIRST_SNAPSHOT_SECRET','RELATED_TASK','RELATED_DRAFT','RELATED_OBSERVED','RELATED_CHECK'])ok(!$('handoff-preview').value.includes(excluded),'first-only opt-in excludes '+excluded);
 await $('copy-handoff').onclick();eq(h.copies.length,0,'copy before review blocked');await h.copy();eq(h.copies.length,1,'reviewed exact preview copies once');eq(h.copies[0],$('handoff-preview').value,'copy equals visible text');
 h.select(false);eq($('handoff-reviewed').checked,false,'opt-out clears review');eq($('handoff-reviewed').disabled,true,'opt-out stales old answer-bearing preview');await h.copy();$('download-handoff').onclick();eq(h.copies.length,1,'stale copy blocked');eq(h.downloads.length,0,'stale download blocked');h.build();eq(h.data(),{},'opt-out and rebuild remove notes');
 h.select();s.resultPath.phase='transfer';h.build();
 eq(h.data(),{myWin:{phase:'transfer',evidence:'Learner-reported notes; not independently verified.',task:s.resultPath.transferTask,draft:s.resultPath.transferDraft,observed:s.resultPath.transferObserved,check:s.resultPath.transferCheck,outcome:'checked',support:'question',help:{hint:true,example:false}}},'related-phase only mapping');
 for(const excluded of ['FIRST_DRAFT_SECRET','SOURCE_FACT_SECRET','SOURCE_REQUEST_SECRET','HISTORY_SECRET','FIRST_SNAPSHOT_SECRET',s.resultPath.action,s.resultPath.observed,s.resultPath.check])ok(!$('handoff-preview').value.includes(excluded),'related-only opt-in excludes '+excluded);
 await h.copy();const copiesBefore=h.copies.length;s.resultPath.transferCheck='A changed check without a UI event';await h.copy();eq(h.copies.length,copiesBefore,'selected source fingerprint rejects changed content at copy');$('download-handoff').onclick();eq(h.downloads.length,0,'fingerprint also rejects download');
 h.build();await h.copy();eq(h.copies.length,copiesBefore+1,'rebuilt exact preview can be reviewed again');
 s.resultPath.phase='first';h.build();await h.copy();const beforeRoundTrip=h.copies.length,original=s.resultPath.observed;s.resultPath.observed='Temporary change';h.emit('result-observed');s.resultPath.observed=original;h.emit('result-observed');eq($('handoff-reviewed').checked,false,'input event invalidates consent');await h.copy();eq(h.copies.length,beforeRoundTrip,'change-and-change-back cannot restore review');
 h.build();$('handoff-reviewed').checked=true;$('handoff-preview').value+='\nLearner-edited note';$('handoff-preview').oninput();eq($('handoff-reviewed').checked,false,'editable preview changes require new review');await $('copy-handoff').onclick();eq(h.copies.length,beforeRoundTrip,'unreviewed edited preview blocked');await h.copy();eq(h.copies.at(-1),$('handoff-preview').value,'reviewed editable preview preserved verbatim');
 const routeBefore=JSON.stringify(s.resultPath);$('reset-handoff').onclick();eq($('share-result').checked,false,'reset removes opt-in');eq($('handoff-preview').value,'','reset clears exact preview');eq(JSON.stringify(s.resultPath),routeBefore,'reset does not change learning record');h.build();eq(h.data(),{},'reset rebuild is generic');
 h=setup();h.select();h.s.started=false;h.build();eq(h.data(),{},'unstarted work cannot expose retained result notes');h.s.started=true;delete h.s.resultPath;h.build();eq(h.data(),{},'missing route notes are not manufactured');
 h=setup();h.build();h.$('handoff-reviewed').checked=true;h.s.resultPath.observed='Changed unselected route';h.emit('result-observed');await h.$('copy-handoff').onclick();eq(h.copies.length,1,'unselected result notes do not invalidate generic preview');
 h=setup();h.select();h.build();h.$('handoff-reviewed').checked=true;h.s.resultPath.transferDraft='Changed inactive related draft';h.emit('result-transferDraft');await h.$('copy-handoff').onclick();eq(h.copies.length,1,'inactive related notes do not invalidate first-phase preview');
 h=setup();h.select();h.build();h.$('handoff-reviewed').checked=true;h.s.resultPath.phase='transfer';h.emit('result-record','click');await h.$('copy-handoff').onclick();eq(h.copies.length,0,'changing active phase through a real click invalidates first-phase preview');h.build();eq(h.data().myWin.phase,'transfer','rebuild uses new active phase');
 h=setup();h.select();h.build();h.$('handoff-reviewed').checked=true;h.s.resultPath.outcome='uncertain';h.emit('result-outcome','change');await h.$('copy-handoff').onclick();eq(h.copies.length,0,'selected dropdown change invalidates review');
 h=setup();h.select();h.build();h.$('share-project').checked=true;h.emit('share-project','change');h.build();eq(h.data().project,h.s.artifact,'separate existing project opt-in remains independent');ok(!!h.data().myWin,'new route opt-in coexists with project opt-in');
 console.log(`PASS: ${assertions} synthetic My win handoff actual-handler assertions; phase-limited opt-in, privacy exclusions, exact review, stale source/selection, round-trip edits, reset and generic defaults. No real clipboard/provider calls or beginner outcome claim.`);
})().catch(error=>{console.error(error);process.exitCode=1;});
