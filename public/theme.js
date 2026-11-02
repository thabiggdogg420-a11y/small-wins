'use strict';
// A cosmetic preference only. Never reads or changes the learner's saved record.
(function(){
 const key='small-wins-theme-v1',modes=['system','light','dark'];
 const media=typeof matchMedia==='function'?matchMedia('(prefers-color-scheme: dark)'):null;
 let mode='system',canSave=true;
 try{const saved=localStorage.getItem(key);if(modes.includes(saved))mode=saved;}catch{canSave=false;}
 function apply(){const resolved=mode==='system'?(media&&media.matches?'dark':'light'):mode;document.documentElement.dataset.theme=resolved;document.documentElement.style.colorScheme=resolved;}
 function changed(){if(mode==='system')apply();}
 if(media){if(media.addEventListener)media.addEventListener('change',changed);else if(media.addListener)media.addListener(changed);}
 apply();
 document.addEventListener('DOMContentLoaded',()=>{
  const select=document.getElementById('theme'),status=document.getElementById('theme-status');
  if(!select)return;select.value=mode;
  select.addEventListener('change',()=>{mode=modes.includes(select.value)?select.value:'system';apply();
   try{if(mode==='system')localStorage.removeItem(key);else localStorage.setItem(key,mode);canSave=true;}catch{canSave=false;}
   if(status)status.textContent=(mode==='system'?'Following your device theme.':mode==='dark'?'Dark theme selected.':'Light theme selected.')+(canSave?' Appearance preference only; learning progress is unchanged.':' This browser could not remember the appearance choice; it works for this page only.');
  });
 });
})();
