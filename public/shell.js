'use strict';
// View-only navigation. All original controls remain mounted so drafts and consent
// survive switching sections; no project data is put into URLs or history.
const main=document.querySelector('main');
function screen(id,title){const e=document.createElement('section');e.id='screen-'+id;e.className='app-screen';e.dataset.screen=id;e.setAttribute('aria-label',title);main.append(e);return e;}
const screens={home:screen('home','Home'),learn:screen('learn','Learn'),ai:screen('ai','My AI'),progress:screen('progress','Progress')};
const intro=document.querySelector('.intro');screens.home.append(intro);intro.innerHTML='<p class="eyebrow">SMALL STEPS. REAL SKILLS.</p><h1 tabindex="-1">Make something useful.</h1><p>Guided practice · optional on-device AI</p>'; 
const homeActions=document.createElement('div');homeActions.className='home-actions next-win';homeActions.innerHTML='<p class="eyebrow">YOUR NEXT SMALL WIN</p><h2 id="home-next-title">Choose something useful.</h2><p id="home-next-detail">Start with a small, harmless goal. No perfect prompt needed.</p><button class="primary" data-route="home" id="home-start">Choose my first win →</button><button class="primary" data-route="learn" id="home-continue">Continue my small win →</button><button data-route="ai">Explore my AI options</button>';screens.home.append(homeActions,$('onboarding'));
const notice=document.querySelector('.notice');const about=document.createElement('details');about.innerHTML='<summary>How Small Wins works · privacy</summary>';about.append(notice);screens.home.append(about);
screens.learn.innerHTML='<h1 class="screen-title" tabindex="-1">My small win</h1><p class="screen-caption">Make it useful. Check it. Try the next one with less help.</p><div id="learn-empty" class="card"><h2>Your first win starts here</h2><p>Choose a small goal first. You do not need to know a prompt.</p><button class="primary" data-route="home">Choose my goal →</button></div>';
screens.learn.append($('workspace'));
const checkpointContext=document.createElement('p');checkpointContext.id='checkpoint-context';checkpointContext.className='notice';checkpointContext.textContent='Supporting practice for your win: choose a skill to work on, then apply it to the same project. These optional checkpoint notes do not automatically count as a useful real-world result. Return to My win to record that result.';$('workspace').prepend(checkpointContext);
const stepNav=$('steps');const map=document.createElement('details');map.className='checkpoint-map';map.innerHTML='<summary>Choose a checkpoint</summary>';stepNav.before(map);map.append(stepNav);
const taskCard=$('step-title').closest('.card');taskCard.id='task-pane';
const projectCard=$('artifact').closest('.card');projectCard.id='project-pane';
const practice=document.createElement('section');practice.id='practice-pane';practice.className='card';practice.innerHTML='<h2 tabindex="-1">Try it & reflect</h2><p>Record what you noticed, not what you think the coach wants to hear.</p>';
// Move the evidence/reflection/review block, preserving all listeners.
let n=document.querySelector('label[for="evidence"]');while(n){const next=n.nextSibling;practice.append(n);n=next;}
projectCard.after(practice);
const taskActions=document.createElement('div');taskActions.className='actions';taskActions.innerHTML='<button class="primary" data-route="learn/project">Work on my project →</button><button data-route="learn/reflect">I tried it — reflect</button><button data-route="ai">Ask my AI for help</button>';taskCard.append(taskActions);
const projectActions=document.createElement('div');projectActions.className='actions';projectActions.innerHTML='<button class="primary" data-route="learn/reflect">Optional checkpoint reflection →</button>';projectCard.append(projectActions);
const learnTabs=document.createElement('nav');learnTabs.className='segment-nav';learnTabs.setAttribute('aria-label','Learning activity');learnTabs.innerHTML='<button data-route="learn">My win</button><button data-route="learn/project">Project</button><button data-route="learn/checkpoints">Optional checkpoints</button>';$('workspace').querySelector('.layout').before(learnTabs);
screens.ai.innerHTML='<h1 class="screen-title" tabindex="-1">My AI</h1><p class="screen-caption">Your choice of AI. Your choice of what to share.</p>';
screens.ai.append($('ai-handoff'));
// Split the handoff into three focused views, retaining its explicit consent gate.
const aiCard=$('ai-handoff');const aiTabs=document.createElement('nav');aiTabs.className='segment-nav';aiTabs.setAttribute('aria-label','AI handoff');aiTabs.innerHTML='<button data-route="ai">1 Choose</button><button data-route="ai/review">2 Review</button><button data-route="ai/return">3 Return</button>';aiCard.before(aiTabs);
function moveRange(start,end,id){const box=document.createElement('div');box.id=id;start.before(box);let e=start;while(e&&e!==end){const next=e.nextSibling;box.append(e);e=next;}return box;}
const reviewStart=$('handoff-options'),returnStart=$('handoff-return-title');
const choose=moveRange(aiCard.firstChild,reviewStart,'ai-choose-pane');
const review=moveRange(reviewStart,returnStart,'ai-review-pane');
const returned=moveRange(returnStart,null,'ai-return-pane');
const chooseNext=document.createElement('button');chooseNext.className='primary';chooseNext.dataset.route='ai/review';chooseNext.textContent='Prepare my coaching prompt →';choose.append(chooseNext);
const reviewNext=document.createElement('button');reviewNext.dataset.route='ai/return';reviewNext.textContent='I used my AI — bring back a note →';const reviewOpen=document.createElement('a');reviewOpen.id='review-open-provider';reviewOpen.className='file-button';reviewOpen.target='_blank';reviewOpen.rel='noopener noreferrer';reviewOpen.textContent='Open chosen AI ↗';reviewOpen.href=$('open-provider').href;$('provider').addEventListener('change',()=>reviewOpen.href=$('open-provider').href);review.append(reviewOpen,reviewNext);
const returnNext=document.createElement('button');returnNext.id='main-return-next';returnNext.dataset.route='learn';returnNext.className='primary';returnNext.textContent='Back to my small win →';returned.append(returnNext);
screens.progress.innerHTML='<h1 class="screen-title" tabindex="-1">My progress</h1><section class="card"><p class="eyebrow">SMALL STEPS COUNT</p><h2>Your useful work</h2><p id="app-progress-goal"></p><p id="result-progress-summary"></p><h3>Supporting practice</h3><p id="app-progress-count"></p><p>Optional checkpoints practise skills for your goal. Their notes are preserved separately; completing them does not prove an outside result or award independent mastery.</p><button data-route="learn/checkpoints">Review supporting checkpoints →</button><p>These are your own checked observations, not an assessment or certificate.</p><button data-route="learn" class="primary">Back to my next action →</button></section>';
screens.progress.append($('finish'),document.querySelector('footer'));
const nav=document.createElement('nav');nav.className='app-nav';nav.setAttribute('aria-label','Main navigation');nav.innerHTML=[['home','home','Home'],['learn','learn','My win'],['ai','ai','My AI'],['progress','progress','Progress']].map(([r,i,t])=>`<button data-route="${r}"><span class="nav-icon icon-${i}" aria-hidden="true"></span>${t}</button>`).join('');document.body.append(nav);
const brand=document.querySelector('.brand');brand.href='#home';
const skip=document.createElement('a');skip.className='skip-link';skip.href='#screen-home';skip.textContent='Skip to current section';document.body.prepend(skip);
const routes=['home','learn','learn/project','learn/reflect','learn/checkpoints','ai','ai/review','ai/return','progress'];
function currentRoute(){const r=location.hash.slice(1);return routes.includes(r)?r:'home';}
function appNavigate(route){if(!routes.includes(route))route='home';if(currentRoute()===route){showRoute(true);return;}location.hash=route;}
function resumeWinRoute(){const r=s.resultPath;return (!r||!r.action&&!r.expected&&!r.observed&&!r.reviewed)&&(s.step>0||s.done.some(Boolean)||s.evidence.slice(1).some(x=>x.trim()))?'learn/checkpoints':'learn';}
function refreshAppShell(){if(!document.body.classList.contains('app-ready'))return;$('home-continue').hidden=!s.started;$('home-start').hidden=s.started;$('home-continue').dataset.route=resumeWinRoute();$('home-next-title').textContent=s.started?(resumeWinRoute()==='learn/checkpoints'?'Continue supporting practice: '+C.stage(s)[0]:s.resultPath?.phase==='transfer'?'Try your related task':s.resultPath?.firstView==='reflect'?'Check your result':'Try your small action'):'Choose something useful.';$('home-next-detail').textContent=s.started?s.purpose:'Start with a small, harmless goal. No perfect prompt needed.';$('learn-empty').hidden=s.started;$('app-progress-count').textContent=`${s.done.filter(Boolean).length} / 10 optional checkpoints checked`;$('home-continue').textContent=resumeWinRoute()==='learn/checkpoints'?'Continue my supporting practice →':'Continue my small win →';$('app-progress-goal').textContent=s.started?s.purpose:'No project yet. Start with one small goal.';if($('result-progress-summary'))$('result-progress-summary').textContent=!s.started?'Choose your first useful task.':s.resultPath?.transferReviewed?'Two-task record: related attempt self-reported checked.':s.resultPath?.reviewed?'Two-task record: first result self-reported checked; related task next.':'Two-task record: first useful result not yet checked.';}
function showRoute(focus){const route=currentRoute(),[page,part]=route.split('/');for(const [key,el] of Object.entries(screens))el.hidden=key!==page;for(const b of nav.querySelectorAll('button')){if(b.dataset.route===page)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');}
for(const [id,active] of [['task-pane',part==='checkpoints'],['project-pane',part==='project'],['practice-pane',part==='reflect']])$(id).hidden=!active;
if($('checkpoint-context'))$('checkpoint-context').hidden=page!=='learn'||!['checkpoints','reflect'].includes(part);map.hidden=page!=='learn'||!['checkpoints','reflect'].includes(part);$('workspace').querySelector('.progress-row').hidden=map.hidden;$('progress').hidden=map.hidden;
for(const [id,active] of [['ai-choose-pane',!part],['ai-review-pane',part==='review'],['ai-return-pane',part==='return']])$(id).hidden=!active;
for(const b of document.querySelectorAll('.segment-nav button'))b.setAttribute('aria-pressed',String(b.dataset.route===route));
skip.href='#screen-'+page;document.title=`${{home:'Home',learn:'Learn',ai:'My AI',progress:'Progress'}[page]} · Small Wins`;refreshAppShell();
if(focus){const heading=(page==='learn'&&s.started?$(part==='project'?'project-pane':part==='reflect'?'practice-pane':part==='checkpoints'?'task-pane':document.getElementById('result-title')?'result-path-pane':'task-pane'):screens[page]).querySelector('h1,h2');if(heading){heading.tabIndex=-1;heading.focus({preventScroll:true});}window.scrollTo(0,0);}}
skip.addEventListener('click',e=>{e.preventDefault();const el=screens[currentRoute().split('/')[0]];el.tabIndex=-1;el.focus();});
$('home-start').addEventListener('click',()=>{$('onboarding').scrollIntoView({block:'start'});$('purpose').focus({preventScroll:true});});
document.addEventListener('click',e=>{const b=e.target.closest('[data-route]');if(b&&b.id!=='home-start')appNavigate(b.dataset.route);});
window.addEventListener('hashchange',()=>showRoute(true));
// Rendering changes learning checkpoints, not navigation; explicitly return to task.
$('continue').addEventListener('click',()=>{if($('review-panel').hidden)appNavigate('learn/checkpoints');});
$('steps').addEventListener('click',e=>{if(e.target.closest('button')){map.open=false;appNavigate('learn/checkpoints');}});
$('delete').addEventListener('click',()=>{if(!s.started)appNavigate('home');});
$('pause').addEventListener('click',()=>{appNavigate('progress');$('storage').textContent=pauseMessage();});
// Conservative keyboard layout aid, not universal keyboard detection.
// Pinch zoom also shrinks the visual viewport: keep navigation while zoomed or not editing.
if(window.visualViewport){
 const viewport=window.visualViewport;
 const checkKeyboard=()=>{const active=document.activeElement;const editing=!!active&&!active.disabled&&!active.readOnly&&(active.tagName==='TEXTAREA'||active.tagName==='INPUT'&&['text','search','url','tel','email','password','number'].includes(active.type));const unzoomed=Number.isFinite(viewport.scale)&&Math.abs(viewport.scale-1)<.01;const reduced=Number.isFinite(viewport.height)&&viewport.height>0&&window.innerHeight-viewport.height>140;document.body.classList.toggle('keyboard-open',editing&&unzoomed&&reduced);};
 viewport.addEventListener('resize',checkKeyboard);document.addEventListener('focusin',checkKeyboard);
 // Restore immediately on blur; a following focusin checks the next field afresh.
 document.addEventListener('focusout',()=>document.body.classList.remove('keyboard-open'));
 checkKeyboard();
}
document.body.classList.add('app-ready');showRoute(false);
