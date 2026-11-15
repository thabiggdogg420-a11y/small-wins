'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
const {fixture}=require('./verification/poster-reference/fixture.cjs');
const P=require('./public/poster-output.js');
let count=0;const ok=(v,m)=>{assert.ok(v,m);count++;},eq=(a,b,m)=>{assert.deepEqual(a,b,m);count++;};
const sample='SKETCH TOGETHER\nSaturday 14 November\n4 pm - Room C\nFICTIONAL QA - NOT AN EVENT';
const note='Compared all source lines, corrected the time and found no clipping.';
const checks=['facts','readable','private'];
function built(t,approved=true){t.input('poster-text',sample);t.input('poster-note',note);t.fire('poster-build');if(approved)t.approve();ok(!t.el('poster-review').hidden);return t.el('poster-preview').innerHTML;}
function reference(t,bytes){eq(t.el('poster-preview').innerHTML,bytes,'retain exact existing rendering');ok(!t.el('poster-review').hidden,'reference visible');ok(/UNAPPROVED/.test(t.el('poster-preview-title').textContent),'visible unapproved heading');ok(!t.el('poster-reference-help').hidden,'reference warning visible');ok(t.el('poster-download').disabled,'download disabled');for(const id of checks){eq(t.el('poster-'+id).checked,false,'all approvals cleared');ok(t.el('poster-'+id).disabled,'review needs rebuild');}}
function cleared(t,label){eq(t.el('poster-preview').innerHTML,'',label);ok(t.el('poster-review').hidden,label+' hidden');ok(t.el('poster-download').disabled,label+' disabled');for(const id of checks)eq(t.el('poster-'+id).checked,false,label+' unchecked');const n=t.downloads.length;t.el('poster-download').onclick();eq(t.downloads.length,n,label+' handler refuses');}
function retained(){const t=fixture(),bytes=built(t);t.input('poster-note',note+' edited');reference(t,bytes);return {t,bytes};}
(async()=>{
 // The production capture listener must revoke before the target handler writes
 // state; the real persist wrapper then retains only this explicit note edit.
 const t=fixture(),bytes=built(t);let captures=0;
 const staleDownload=t.el('poster-download').onclick,staleChecks=checks.map(id=>t.el('poster-'+id).onchange);
 const image=t.el('poster-preview'),writes=image.htmlWrites,clears=image.clears;
 t.afterCapture=event=>{if(event.target===t.el('poster-note')){captures++;reference(t,bytes);eq(t.read().resultPath.posterLayouts.first.note,note,'capture precedes state write');}};
 t.input('poster-note',note+' edited');delete t.afterCapture;eq(captures,1);reference(t,bytes);eq(image.htmlWrites,writes,'no regeneration');eq(image.clears,clears,'no detach/clear');eq(t.read().resultPath.posterLayouts.first.note,note+' edited');
 staleDownload();eq(t.downloads.length,0,'retained download callback refuses');reference(t,bytes);
 for(let i=0;i<checks.length;i++){t.el('poster-'+checks[i]).checked=true;staleChecks[i]();reference(t,bytes);}eq(t.downloads.length,0);
 // Repeated input, edit/revert, same-value input, blur/change and redraw neither
 // restore approval nor reset the textarea caret or replace its existing DOM.
 for(const raw of [note+' edited again',note,note,'','x','x'.repeat(2001),'Literal check <script> & no SVG leakage']){
  const e=t.el('poster-note');e.value=raw;e.selectionStart=e.selectionEnd=Math.min(5,raw.length);e.focus();const assignments=e.valueWrites;
  t.fire('poster-note','input');reference(t,bytes);eq(e.valueWrites,assignments,'controller does not assign active textarea');eq(e.selectionStart,Math.min(5,raw.length),'caret retained');eq(t.focus,'poster-note','note focus retained');eq(t.read().resultPath.posterLayouts.first.note,raw,'raw note exact');
  t.fire('poster-note','change');reference(t,bytes);t.run('render();refreshResultPath()');reference(t,bytes);eq(image.htmlWrites,writes);eq(image.clears,clears);
 }
 t.input('poster-note',note);t.approve();reference(t,bytes);staleDownload();eq(t.downloads.length,0,'checks cannot adopt a reference');
 t.fire('poster-build');eq(t.el('poster-preview-title').textContent,'Check this exact rendered preview');ok(t.el('poster-reference-help').hidden);for(const id of checks){ok(!t.el('poster-'+id).disabled);eq(t.el('poster-'+id).checked,false);}ok(t.el('poster-download').disabled);staleDownload();eq(t.downloads.length,0,'explicit build alone insufficient');
 t.approve();ok(!t.el('poster-download').disabled);t.fire('poster-download');eq(t.downloads.length,1);eq(t.downloads[0].text,P.build({text:sample,preset:'paper'}));ok(!t.downloads[0].text.includes(note));
 // Reference is allowed even before the initial note exists, never without an
 // actually built rendering, nor as a substitute for note completeness.
 const blank=fixture();blank.input('poster-text',sample);blank.fire('poster-build');const blankBytes=blank.el('poster-preview').innerHTML;blank.input('poster-note','I');reference(blank,blankBytes);blank.fire('poster-build');blank.approve();blank.fire('poster-download');eq(blank.downloads.length,0,'current note completeness required');
 const never=fixture();never.input('poster-note',note);cleared(never,'no prior rendering invented');
 // Each ordinary input, relevant state/identity change and lifecycle transition
 // clears, even if later reverted. None may take the note-specific persist path.
 const mutations=[
  ['display edit/revert',x=>{x.input('poster-text',sample+' edit');x.input('poster-text',sample);}],
  ['preset edit/revert',x=>{x.input('poster-preset','night','change');x.input('poster-preset','paper','change');}],
  ['source draft edit/revert',x=>{const v=x.read().artifact;x.input('artifact',v+' edit');x.input('artifact',v);}],
  ['source object',x=>x.run("s.sourceBasis={kind:'poster',origin:'manual',facts:'New facts'};refreshResultPath()")],
  ['requirement',x=>x.input('result-transferTask','Changed requirement')],
  ['related draft',x=>x.input('result-transferDraft','Changed related draft')],
  ['ordinary note',x=>x.input('result-check','A different source check')],
  ['persist alone',x=>x.run('persist()')],
  ['equal owner replacement',x=>x.run('s=JSON.parse(JSON.stringify(s));render()')],
  ['equal record replacement',x=>x.run('s.resultPath=JSON.parse(JSON.stringify(s.resultPath));refreshResultPath()')],
  ['equal layout replacement',x=>x.run('s.resultPath.posterLayouts=JSON.parse(JSON.stringify(s.resultPath.posterLayouts));refreshResultPath()')],
  ['equal active draft replacement',x=>x.run('s.resultPath.posterLayouts.first={...s.resultPath.posterLayouts.first};refreshResultPath()')],
  ['programmatic note without event',x=>x.run("s.resultPath.posterLayouts.first.note+=' changed';refreshResultPath()")],
  ['project kind',x=>x.run("s.projectKind='checklist';render()")],
  ['navigation away and return',x=>{x.route('learn');x.route('journey');}],
  ['first-project exposure and return',x=>{x.route('learn/project');x.route('journey');}],
  ['Close',x=>x.fire('poster-close')],
  ['pagehide/pageshow',x=>{x.event('pagehide');x.event('pageshow');}],
  ['font loading',x=>x.font()],
  ['restore baseline',x=>x.fire('restore')],
  ['reset route',x=>x.fire('result-reset')],
  ['reset project',x=>x.fire('delete')],
  ['adopt source',x=>x.run("ManualBrief.apply(s,ManualBrief.build({facts:'New Room Z',unknowns:'Time',task:'New poster'},'poster'),ResultPath);persist();refreshResultPath()")],
  ['archive/history change',x=>x.run("s.resultHistory=[{record:s.resultPath}];persist()")],
  ['DOM tamper',x=>{x.el('poster-preview').innerHTML+='<script>bad()</script>';x.run('refreshResultPath()');}],
  ['geometry unavailable',x=>{x.measure='missing';x.run('refreshResultPath()');}],
  ['geometry overflow',x=>{x.measure='overflow';x.run('refreshResultPath()');}]
 ];
 for(const [label,action] of mutations){const {t:x}=retained();const callback=x.el('poster-download').onclick;action(x);cleared(x,label);callback();eq(x.downloads.length,0,label+' old callback refuses');x.input('poster-note',note);cleared(x,label+' cannot resurrect by note edit');}
 // Direct target callbacks cannot retain after changes occurring between the
 // capture listener and handler, or before a new note event and sync.
 for(const code of ["s.artifact+='changed'",'s=JSON.parse(JSON.stringify(s))','s.resultPath=JSON.parse(JSON.stringify(s.resultPath))']){
  const {t:x}=retained();x.afterCapture=e=>{if(e.target===x.el('poster-note'))x.run(code);};x.input('poster-note',note);delete x.afterCapture;cleared(x,'context changed between capture and target');
  const {t:y}=retained();y.run(code);y.el('poster-note').oninput({target:y.el('poster-note')});cleared(y,'direct note handler after changed context');
 }
 const {t:source}=retained();source.run("s.sourceBasis={kind:'poster',origin:'manual',facts:'Known fact'};persist()");source.fire('poster-build');source.input('poster-note',note+' edited');source.run('s.sourceBasis={...s.sourceBasis};refreshResultPath()');cleared(source,'equal source object replacement');
 for(const body of ["s.artifact+='unexpected';return originalPersist()",'originalPersist();return originalPersist()']){
  const {t:x}=retained();x.run('const originalPersist=persist;persist=function(){'+body+'}');x.input('poster-note',note);cleared(x,'unexpected or repeated persistence cannot reuse exception');
 }
 // First and changed tasks retain only their own graphics and notes. Revisit
 // still uses the production example-help accounting and cannot adopt a ref.
 const phase=fixture();const firstBytes=built(phase);phase.input('poster-note',note+' first');const firstRaw=phase.read().resultPath.posterLayouts.first;
 const fields={action:'Make exact words visible',expected:'All four fictional lines',observed:'Compared every line',check:'The time revision is four',outcome:'checked',support:'alone',use:'Draft only'};
 for(const [k,v] of Object.entries(fields))phase.input('result-'+k,v);phase.fire('result-record');eq(phase.read().resultPath.phase,'transfer');cleared(phase,'phase transition clears first image');eq(phase.el('poster-note').value,'');ok(!phase.el('poster-source').textContent.includes('SKETCH'));eq(phase.read().resultPath.transferExample,false);
 phase.input('result-transferTask','Different fictional book event');phase.input('result-transferDraft','Known Room Z, unknown time');phase.input('poster-text','READ TOGETHER\nRoom Z\nFICTIONAL QA - NOT AN EVENT');phase.fire('poster-build');const secondBytes=phase.el('poster-preview').innerHTML;ok(secondBytes!==firstBytes);phase.input('poster-note','Compared new room; time still unknown.');reference(phase,secondBytes);eq(phase.read().resultPath.posterLayouts.first,firstRaw);eq(phase.read().resultPath.reviewed,true,'related note preserves first self-report');eq(phase.read().resultPath.transferReviewed,false);eq(phase.read().resultPath.transferExample,false,'same-task ref adds no help');
 phase.fire('poster-revisit');cleared(phase,'revisit clears changed-task reference');eq(phase.read().resultPath.transferExample,true);eq(phase.read().resultPath.transferHelp,true);eq(phase.el('poster-note').value,firstRaw.note);phase.input('poster-note',firstRaw.note);cleared(phase,'returning note does not restore earlier reference');
 const credit=fixture();built(credit);credit.run('s.resultPath.reviewed=true;s.resultPath.transferReviewed=true;persist()');credit.fire('poster-build');credit.input('poster-note',note+' edited');eq(credit.read().resultPath.reviewed,false);eq(credit.read().resultPath.transferReviewed,false);
 // Remember/JSON/legacy/raw/archives remain the existing contracts, with no
 // reference, DOM, review-token or download state serialized anywhere.
 const save=fixture();save.run('s.save=true;persist()');const saveBytes=built(save);save.input('poster-note',note+' saved');reference(save,saveBytes);const stored=save.getStored(),record=JSON.parse(stored);eq(record.resultPath.posterLayouts.first.note,note+' saved');ok(!/UNAPPROVED|<svg|"prepared"|"reference"|"approved"|"dom"/.test(stored));cleared(fixture(stored),'cold Remember load never restores reference');save.fire('export');const exported=JSON.parse(save.downloads.at(-1).text);eq(exported.resultPath.posterLayouts,record.resultPath.posterLayouts);
 const restored=fixture();built(restored);await restored.select(exported);restored.fire('import-apply');cleared(restored,'confirmed imported state');eq(restored.read().resultPath.posterLayouts,exported.resultPath.posterLayouts);eq(restored.read().save,false);
 const legacy=fixture();legacy.run("s.resultPath.posterLayouts={version:1,first:{text:'Raw\\r\\nline',preset:'night'},transfer:{text:'Other raw\\r\\nline',preset:'paper'}};refreshResultPath()");legacy.fire('poster-build');const legacyBytes=legacy.el('poster-preview').innerHTML;legacy.input('poster-note',note);reference(legacy,legacyBytes);eq(legacy.read().resultPath.posterLayouts.first.text,'Raw\r\nline');eq(legacy.read().resultPath.posterLayouts.transfer.text,'Other raw\r\nline');eq(legacy.read().resultPath.posterLayouts.transfer.note,'');eq(legacy.read().resultPath.posterLayouts.version,2);
 const raw='Compared source\r\n literal note; room uncertain.';legacy.run('s.resultPath.posterLayouts.first.note='+JSON.stringify(raw)+';persist();refreshResultPath()');legacy.fire('poster-build');legacy.run('render();refreshResultPath()');legacy.fire('export');eq(JSON.parse(legacy.downloads.at(-1).text).resultPath.posterLayouts.first.note,raw,'untouched raw note stays exact');
 const {t:failed,bytes:failedBytes}=retained();failed.failSave=true;failed.run('s.save=true;persist()');failed.fire('poster-build');failed.input('poster-note',note+' save fails');reference(failed,failedBytes);ok(/NOT saved/.test(failed.run('pauseMessage()')));eq(failed.read().resultPath.posterLayouts.first.note,note+' save fails');
 const ui=fs.readFileSync('public/poster-output-ui.js','utf8');ok(ui.includes('id="poster-reference-help" hidden'));ok(ui.includes('UNAPPROVED reference only.'));ok(ui.includes('controller.beforePersist('));ok(!/maxlength=/.test(ui));
 console.log('PASS: '+count+' poster-reference assertions using production capture/target/persist/bubble handlers with synthetic DOM/geometry/storage. No browser, native file, physical device or novice-outcome claim.');
})().catch(e=>{console.error(e);process.exitCode=1;});
