(function(root){
'use strict';
// Derived views of the existing project record. No second save format or network.
const names={poster:'A checked poster draft',checklist:'A reusable routine or plan',message:'A clear unsent message',comparison:'A checked comparison',tool:'A small local tool or specification'};
function state(s,R){
 const r=s.resultPath||R.fresh(),first=!!s.started&&R.firstReady(r,s.artifact),second=first&&r.transferReviewed&&!R.transferError(r,s.artifact);
 const planned=!!s.started&&!!r.action.trim()&&!!r.expected.trim();
 const stage=!s.started?'choose':!planned?'plan':!first?'make-check':!second?'transfer':'continue';
 return {stage,planned,first,second,kind:names[s.projectKind]||names.checklist,help:R.summary(r),next:{choose:'Choose one useful project',plan:'Name a small action and what useful means','make-check':r.outcome==='stuck'||r.outcome==='uncertain'?'Repair one part, then try and check again':'Make it, try it, and check against the requirement',transfer:'Try a related task with less help',continue:'Keep your work and choose a next use'}[stage]};
}
function snapshot(s){return JSON.stringify({started:s.started,purpose:s.purpose,capability:s.capability,projectKind:s.projectKind,artifact:s.artifact,sourceBasis:s.sourceBasis||null,resultPath:s.resultPath||null});}
function portable(s,R){
 const x=state(s,R),r=s.resultPath||R.fresh(),p=R.plan(s),basis=s.sourceBasis;
 const line=(label,value)=>label+': '+(value||'Not recorded');
 return ['LEARN4FREE — MY PRACTICAL PROJECT & CONTINUATION KIT',
 'This is your supplied work and self-reported checking, not verified learning, an assessment or proof of real-world success.',
 'Private local download: review before sharing. No message, purchase, booking, account connection or reminder is made.',
 '',line('Goal',s.purpose),line('Project type',x.kind),line('Starting point',s.capability),line('Next useful step',x.next),
 '', 'MY CURRENT DELIVERABLE',s.artifact||'No draft yet.',
 '', 'MY ORIGINAL BASIS — SUPPLIED, NOT INDEPENDENTLY VERIFIED',line('Source description',basis?R.originLabel(basis):''),line('Facts and unknowns',basis?.facts),line('Original request',basis?.request),
 '', 'FIRST PROJECT: TRY, CHECK, REVISE',line('Small action',r.action),line('Useful would mean',r.expected),line('What actually happened',r.observed),line('My check and its result',r.check),line('Why it was useful',r.use),line('Reported outcome',r.outcome),line('Reported support',r.support),
 'Recorded help: '+JSON.stringify({hint:!!r.recoveryUsed,workedExample:!!r.workedExampleUsed,localAiAnswer:!!r.localAiUsed,pastedAnswer:!!r.pastedAnswerUsed}),
 'Current status: '+(x.first?'self-reported checked':'not currently checked; retained notes are not fresh approval'),
 '', 'RELATED PROJECT: TRY WITH LESS HELP',line('Changed requirement',r.transferTask),line('My attempt',r.transferDraft),line('What actually happened',r.transferObserved),line('My new check',r.transferCheck),line('Reported outcome',r.transferOutcome),line('Reported support',r.transferSupport),
 'Recorded help: '+JSON.stringify({hint:!!r.transferHelp,example:!!r.transferExample}),
 'Current status: '+(x.second?x.help:'not currently checked; no successful transfer claimed'),
 ...(r.posterLayouts?['','POSTER DISPLAY DRAFTS — EDITABLE TEXT, NOT VISUAL APPROVAL','First task layout: '+r.posterLayouts.first.preset,r.posterLayouts.first.text,'First task visual-check note: '+(r.posterLayouts.first.note||'Not recorded; fresh note required for SVG download.'),'Related task layout: '+r.posterLayouts.transfer.preset,r.posterLayouts.transfer.text,'Related task visual-check note: '+(r.posterLayouts.transfer.note||'Not recorded; fresh note required for SVG download.'),'Keep progress JSON to restore these editable fields. Rebuild and review the SVG after reopening.']:[]),
 '', 'A CHECKING ROUTINE TO REUSE',p.check,'State the expected result before trying. Compare actual with expected. Keep unknowns visible. Repair one part and check again. Ask for help when useful and keep a record of it.',
 '', 'NEXT TIME',x.second?'Choose a genuinely useful new task or use this deliverable in a harmless situation. Before reopening examples, recall one check. Record what happens; future reuse is not established by this file.':x.next+'. Keep incomplete or uncertain work labelled honestly.',
 p.transfer,
 '', 'RESUME HERE', 'Return to Learn4Free at the same site address. This text is readable but not an import file. To restore editable fields, separately use Export progress to download the existing JSON learning record, then Progress → Import progress. Restoring does not validate facts or learning. No automatic saving unless you chose Remember.',
 '', 'OPTIONAL FREE SUPPORT', 'Use My AI to build and review a Resume prompt for an available free provider, or continue manually. Nothing from this file is shared automatically. Do not pay or provide an API key for this exercise. A person you already trust may help if they freely agree; no mentor has been booked or promised.',
 'Older project history, original pasted replies and optional checkpoint notes are intentionally not included in this readable kit. The full progress JSON can contain them; review it privately before sharing.'
 ].join('\n');
}
function support(s,R){
 const r=s.resultPath||(s.resultPath=R.fresh());
 if(r.phase==='transfer'){r.transferHelp=true;r.transferExample=true;r.transferReviewed=false;r.transferSupport='example';}
 else {r.workedExampleUsed=true;r.support='example';R.invalidate(r);}
 // The existing complete coach guide includes examples. Opening it is support,
 // not evidence that an external AI was contacted or supplied an answer.
}
const api={names,state,snapshot,portable,support};if(typeof module!=='undefined')module.exports=api;root.ProjectJourney=api;
})(typeof window==='undefined'?globalThis:window);
