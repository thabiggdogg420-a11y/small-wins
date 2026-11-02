/* View-only redesign: existing practice, reviews, consent and saved formats stay authoritative. */
'use strict';
(function(){
 const intro=document.querySelector('.intro');
 intro.innerHTML=`<div class="learn-hero-copy"><p class="eyebrow">A SMALL START. A USEFUL SKILL.</p><h1 tabindex="-1">Less AI jargon.<br>More <em>“I made this.”</em></h1><p>Make a clearer message, understand a letter, or organise one small task. Learn by trying—and checking what comes back.</p><div class="hero-actions"><button class="primary" id="try-first-practice">Try a made-up example →</button><button id="choose-own-win">Work on my own small task</button></div><p class="hero-note">Free. No sign-in. No live AI needed for the practice.</p></div><div class="learn-art" aria-hidden="true"><span class="art-orbit"></span><div class="sample-note"><span>THE ORIGINAL</span><p>Club starts at <b>10 am.</b></p></div><div class="checked-note"><span>DON'T JUST TRUST. CHECK.</span><p>11 am <s>✕</s><br><b>10 am ✓</b></p><small>A tiny correction.<br>A useful habit.</small></div><span class="spark">✳︎</span></div>`;
 const steps=document.createElement('ol');steps.className='learn-route';steps.setAttribute('aria-label','Your learning path');steps.innerHTML='<li><span>01</span><b>Choose</b><small>One small, useful task</small></li><li><span>02</span><b>Make</b><small>A draft, not a final answer</small></li><li><span>03</span><b>Check</b><small>Compare with the source</small></li><li><span>04</span><b>Take away</b><small>Your work & a checking habit</small></li>';intro.after(steps);
 document.getElementById('try-first-practice').addEventListener('click',()=>document.getElementById('beginner-now').click());
 document.getElementById('choose-own-win').addEventListener('click',()=>{const resume=document.getElementById('home-continue');(resume.hidden?document.getElementById('home-start'):resume).click();});
 const own=document.querySelector('#onboarding h2');own.textContent='Make something useful to you.';
 document.getElementById('onboarding').insertAdjacentHTML('afterbegin','<p class="eyebrow">YOUR OWN SMALL WIN</p>');
 const title=document.getElementById('beginner-title');title.textContent='A safe place to try. Nothing gets sent.';
 const practice=document.getElementById('beginner-start');practice.insertAdjacentHTML('afterbegin','<span class="practice-tag">START HERE IF YOU’RE NEW</span>');
 // Keep advanced options discoverable, never gate the first practice behind an interview.
 const originNote=document.createElement('p');originNote.className='origin-note';originNote.textContent='Returning with saved progress? Use the same address and browser as before. Progress is not moved between site addresses automatically.';document.getElementById('screen-progress').append(originNote);
})();
