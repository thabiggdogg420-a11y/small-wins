'use strict';
// Unified workspace presentation. Native controllers retain every write/review gate.
document.querySelector('main').before(document.querySelector('.app-nav'));
const paperLessonLink=document.querySelector('main > .origin-note');if(paperLessonLink)screens.home.append(paperLessonLink);
const manualBriefPanel=document.querySelector('#project-pane .manual-brief');
if(manualBriefPanel){const details=document.createElement('details'),summary=document.createElement('summary');details.className='journey-brief';summary.textContent='Add facts and requirements to check against (optional)';details.append(summary,manualBriefPanel);$('project-pane').append(details);}
const journeyWorkspace=createJourneyWorkspace({element:$,state:()=>s,route:currentRoute,anchor(id){const marker=document.createElement('span');marker.hidden=true;marker.dataset.workspaceHome=id;return marker;}});
function syncJourneyWorkspace(){
 const view=journeyWorkspace.sync(),x=ProjectJourney.state(s,ResultPath),r=s.resultPath||ResultPath.fresh();
 $('screen-journey').dataset.started=String(!!s.started);
 $('journey-transfer').textContent=x.second?'4 · Review related attempt':'4 · Try a changed task';
 $('journey-title').textContent=s.started?'Your project workspace.':'Make something useful. Learn by doing.';
 for(const [id,selected] of [['journey-plan',x.stage==='choose'||x.stage==='plan'],['journey-make',x.stage==='make-check'&&r.firstView!=='reflect'],['journey-check',x.stage==='make-check'&&r.firstView==='reflect'],['journey-transfer',x.stage==='transfer'],['journey-keep',x.stage==='continue']]){
  $(id).setAttribute('aria-current',selected?'step':'false');
 }
 if(view.active){$('result-title').textContent=view.first?'Your action. Your check.':'A changed task. A fresh attempt.';}
}
const refreshBeforeWorkspace=refreshResultPath;
refreshResultPath=function(){refreshBeforeWorkspace();syncJourneyWorkspace();};
let pendingJourneyFocus=null;
function focusJourneyNode(id){const node=$(id);if(/^H[1-6]$/.test(node.tagName))node.tabIndex=-1;node.scrollIntoView({block:'center',behavior:'auto'});node.focus({preventScroll:true});}
function focusProjectControl(id){pendingJourneyFocus=currentRoute()==='journey'?null:id;appNavigate('journey');showRoute(false);syncJourneyWorkspace();focusJourneyNode(id);}
function openFirstProject(id){if(!s.started)return focusProjectControl('purpose');if(resultRecord().phase==='transfer')$('result-back').click();resultRecord().firstView=id==='result-observed'?'reflect':'plan';persist();refreshResultPath();focusProjectControl(id);}
$('journey-plan').onclick=()=>openFirstProject('result-action');
$('journey-make').onclick=()=>openFirstProject('artifact');
$('journey-check').onclick=()=>openFirstProject('result-observed');
$('journey-transfer').onclick=()=>{if(!ProjectJourney.state(s,ResultPath).first){$('journey-status').textContent='Try and check the first result before starting related practice.';return;}resultRecord().phase='transfer';persist();refreshResultPath();focusProjectControl('result-transferTask');};
$('journey-keep').onclick=()=>focusProjectControl('journey-keep-title');
$('journey-resume').onclick=()=>{const x=ProjectJourney.state(s,ResultPath);if(!s.started)return focusProjectControl('purpose');if(x.stage==='plan')return openFirstProject('result-action');if(x.stage==='make-check')return openFirstProject(s.resultPath?.firstView==='reflect'?'result-observed':'artifact');if(x.stage==='transfer')return $('journey-transfer').click();$('journey-keep').click();};
$('choose-personal-project').onclick=()=>focusProjectControl(s.started?'journey-next':'purpose');
// Shortcuts from within the unified workspace keep the live editor/checks together.
$('project-pane').addEventListener('click',event=>{if(currentRoute()!=='journey')return;const button=event.target.closest('[data-route="learn/project"]');if(button){event.preventDefault();event.stopPropagation();openFirstProject('artifact');}});
$('result-path-pane').addEventListener('click',event=>{if(currentRoute()!=='journey')return;const button=event.target.closest('[data-route="learn/project"]');if(button){event.preventDefault();event.stopPropagation();openFirstProject('artifact');}});
const reflectBeforeWorkspace=showResultReflection;
showResultReflection=function(){if(currentRoute()!=='journey')return reflectBeforeWorkspace();resultRecord().firstView='reflect';persist();refreshResultPath();focusProjectControl('result-observed');};
$('result-tried').onclick=showResultReflection;$('result-project-return').onclick=showResultReflection;
for(const type of ['input','change','click'])document.addEventListener(type,syncJourneyWorkspace);
window.addEventListener('hashchange',()=>{syncJourneyWorkspace();const id=pendingJourneyFocus;pendingJourneyFocus=null;if(id&&currentRoute()==='journey')focusJourneyNode(id);});
// New visitors see the free alternatives; retained projects still resume directly.
if(!location.hash){history.replaceState(null,'',s.started?'#journey':'#home');showRoute(false);}
const shellRefreshBeforeWorkspace=refreshAppShell;
refreshAppShell=function(){shellRefreshBeforeWorkspace();if(s.started)$('home-continue').dataset.route='journey';$('choose-own-win').hidden=!s.started;$('choose-personal-project').hidden=!!s.started;};
refreshAppShell();
syncJourneyWorkspace();

// Entry shortcuts reuse the native kind chooser and workspace. An active project
// is never replaced, restarted, regraded or given a different type by navigation.
$('entry-project-actions').prepend($('choose-personal-project'));
function openEntryProject(kind){
 if(!s.started)document.querySelector('#project-kinds [data-kind="'+kind+'"]').click();
 focusProjectControl(s.started?'journey-next':'purpose');
}
$('entry-poster').onclick=()=>openEntryProject('poster');
$('entry-checklist').onclick=()=>openEntryProject('checklist');
const refreshBeforeEntry=refreshAppShell;
refreshAppShell=function(){
 refreshBeforeEntry();
 $('entry-poster').textContent=s.started?'Open current workspace →':'Start a poster draft →';
 $('entry-checklist').textContent=s.started?'Open current workspace →':'Start a useful checklist →';
 $('entry-existing-project-note').hidden=!s.started;
};
refreshAppShell();
