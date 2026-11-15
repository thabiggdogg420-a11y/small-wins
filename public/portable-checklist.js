(function(root){
'use strict';
// The factory is deliberately self-contained. Each working copy embeds this
// owned runtime and literal data, never a clone of the current document.
function createPortableChecklist(){
 const MAX_TEXT=12000,MAX_ITEMS=120;
 function problem(value){
  if(!value||value.version!==1||!Array.isArray(value.items)||value.items.length<1||value.items.length>MAX_ITEMS)return 'Use 1–120 checklist items. Nothing was shortened or downloaded.';
  let length=0;
  for(const item of value.items){
   if(!item||typeof item.text!=='string'||typeof item.done!=='boolean')return 'This checklist could not be read. Keep the original file; nothing was replaced.';
   length+=item.text.length;
  }
  return length>MAX_TEXT?'The checklist is over 12,000 characters. Nothing was shortened or downloaded. Keep this tab open and shorten it yourself or copy all your text to another private document.':'';
 }
 function copy(value){return {version:1,items:value.items.map(item=>({text:item.text,done:item.done}))};}
 function fromArtifact(text){
  if(typeof text!=='string')throw Error('Your project text could not be read. Nothing was downloaded.');
  // Preserve bullets, spacing, blank lines and final newline. A textarea edit
  // may normalize line endings, but untouched model text remains byte-exact.
  const value={version:1,items:text.split('\n').map(text=>({text,done:false}))};
  const error=problem(value);if(error)throw Error(error);return value;
 }
 function build(value){
  const error=problem(value);if(error)throw Error(error);
  const data=JSON.stringify(copy(value)).replace(/[<>&\u2028\u2029]/g,c=>'\\u'+c.charCodeAt(0).toString(16).padStart(4,'0'));
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'none'; form-action 'none'; base-uri 'none'; object-src 'none'"><title>My reusable checklist</title><style>body{font:18px/1.6 system-ui;max-width:760px;margin:32px auto;padding:20px;background:#f4f6ef;color:#193c32}h1{line-height:1.2}label{display:block;margin:8px 0}fieldset{border:1px solid #a1b4a8;background:white;border-radius:12px;margin:16px 0;padding:16px;min-width:0}legend{font-weight:700}textarea,button{font:inherit;border:1px solid #527562;border-radius:6px;padding:12px;box-sizing:border-box}textarea{display:block;width:100%;min-height:88px;resize:vertical;background:#fff;color:#193c32}input{width:24px;height:24px;vertical-align:middle}button{background:#19583f;color:white;min-height:48px;cursor:pointer;max-width:100%;white-space:normal}fieldset button{margin-top:12px}button:disabled{opacity:.6}textarea:focus-visible,button:focus-visible,input:focus-visible{outline:3px solid #a44219;outline-offset:3px}#copy-status{white-space:pre-wrap;border-left:4px solid #527562;padding:12px}footer{margin-top:24px}small{display:block}</style></head><body><main><h1>My reusable checklist</h1><p>Edit the text, tick items, and add or remove tasks as your plans change. <strong>Download an updated working copy before closing.</strong> Open the newest saved HTML file to continue with its text and ticks. The original file does not update itself.</p><p>Keep this file privately: it contains your text and tick marks. Use harmless details. This tool makes no network requests, uses no AI or account, and does not sync or save automatically. A downloads folder may be synced by your own device settings.</p><p>This is a working checklist, not a backup of your full Small Wins learning record. Ticks are your own task marks, not verified completion or learning credit. Changes here do not update the website project.</p><p id="item-limits">Each project line is kept as an item, including blank lines. Keep 1–120 items and up to 12,000 characters of item text. Add puts a blank item at the end. Edit the last remaining item instead of removing it. Over-limit text stays visible for you to repair; it is never silently shortened.</p><p id="undo-help">Undo restores only the latest removal, in its earlier position, while this tab is open. Another removal replaces that undo. Undo cannot insert into a full 120-item list. New downloads contain only remaining items, not removed text or undo history. Removing an item here does not change older files.</p><noscript>JavaScript is needed to show and edit the checklist. Keep this file and open it in a browser that allows local scripts.</noscript><section id="checklist-items" aria-label="Editable checklist"></section><p id="item-count" role="status" aria-live="polite"></p><p><button id="add-item" type="button" aria-describedby="item-limits item-count" disabled>Add item</button> <button id="undo-remove" type="button" aria-describedby="undo-help item-count" disabled>Undo last removal</button></p><button id="download-copy" type="button" disabled>Download updated working copy</button><p id="copy-status" role="status" aria-live="polite">Opening the checklist. If no items appear, keep this file and try a browser that allows local scripts.</p><footer><small>HTML opening and downloading vary by browser and device. Your browser may warn before leaving an edited copy, but the warning is not guaranteed and does not save your work. After each download request, find the actual file and reopen it to check your text and tick marks before closing this tab or relying on it. A request is not proof of a saved file. If your browser cancels or blocks the download, your work stays here while this tab remains open.</small></footer></main><script id="checklist-data" type="application/json">${data}<\/script><script>const PortableChecklist=(${createPortableChecklist.toString()})();try{PortableChecklist.install(window,JSON.parse(document.getElementById('checklist-data').textContent));}catch(error){document.getElementById('copy-status').textContent='Could not open this checklist. Keep the original file; nothing was replaced.';}<\/script></body></html>`;
 }
 function install(env,initial){
  const doc=env.document,list=doc.getElementById('checklist-items'),button=doc.getElementById('download-copy'),status=doc.getElementById('copy-status'),add=doc.getElementById('add-item'),undo=doc.getElementById('undo-remove'),count=doc.getElementById('item-count');
  const error=problem(initial);if(error){status.textContent=error;return null;}
  const opened=copy(initial),value=copy(initial);
  let leaveWarningAttached=false,removed=null;
  function hasChanges(){return value.items.length!==opened.items.length||value.items.some((item,index)=>item.text!==opened.items[index].text||item.done!==opened.items[index].done);}
  // Best effort only: browsers may suppress this warning. A download request
  // cannot confirm saving, so only reverting to the opened model clears it.
  function warnBeforeLeaving(event){if(hasChanges()){event.preventDefault();event.returnValue='';}}
  function changed(message){
   const needed=hasChanges();
   if(needed!==leaveWarningAttached){env[needed?'addEventListener':'removeEventListener']('beforeunload',warnBeforeLeaving);leaveWarningAttached=needed;}
   status.textContent=(message?message+' ':'')+(problem(value)||'Changes are only in this open tab. Download an updated working copy to keep this text and these ticks.');
  }
  function controls(){
   add.disabled=value.items.length>=MAX_ITEMS;undo.disabled=!removed||value.items.length>=MAX_ITEMS;
   count.textContent=value.items.length+' of 120 items. '+(value.items.length===1?'Keep this last item and edit its text. ':value.items.length===MAX_ITEMS?'The list is full; Add and Undo are unavailable. ':'')+(removed?(value.items.length===MAX_ITEMS?'Another removal replaces the previous undo.':'Undo can restore item '+(removed.index+1)+'.'):'No removal to undo in this tab.');
  }
  function render(focusIndex){
   list.replaceChildren();
   value.items.forEach((item,index)=>{
    const row=doc.createElement('fieldset'),legend=doc.createElement('legend'),markLabel=doc.createElement('label'),mark=doc.createElement('input'),textLabel=doc.createElement('label'),input=doc.createElement('textarea'),remove=doc.createElement('button');
    legend.textContent='Item '+(index+1);mark.type='checkbox';mark.id='item-done-'+index;mark.checked=item.done;markLabel.htmlFor=mark.id;markLabel.append(mark,doc.createTextNode(' Done (my own mark)'));
    input.id='item-text-'+index;input.rows=2;input.value=item.text;textLabel.htmlFor=input.id;textLabel.textContent='Item text';
    // Structural changes render from the model too, not normalized DOM values.
    // Only an actual input event replaces a retained exact original string.
    input.addEventListener('input',()=>{if(row.parentNode!==list)return;item.text=input.value;changed();});
    mark.addEventListener('change',()=>{if(row.parentNode!==list)return;item.done=mark.checked;changed();});
    remove.id='item-remove-'+index;remove.type='button';remove.textContent='Remove item '+(index+1);remove.disabled=value.items.length===1;remove.setAttribute('aria-describedby','item-limits undo-help');
    remove.addEventListener('click',()=>{
     if(row.parentNode!==list||value.items[index]!==item||value.items.length===1)return;
     removed={item,index};value.items.splice(index,1);render(Math.min(index,value.items.length-1));changed('Removed item '+(index+1)+'. Undo is available in this tab.');
    });
    row.append(legend,markLabel,textLabel,input,remove);list.append(row);
   });
   controls();if(focusIndex!==undefined)doc.getElementById('item-text-'+focusIndex).focus();
  }
  add.addEventListener('click',()=>{
   if(value.items.length>=MAX_ITEMS)return;
   value.items.push({text:'',done:false});render(value.items.length-1);changed('Added a blank item at the end.');
  });
  undo.addEventListener('click',()=>{
   if(!removed||value.items.length>=MAX_ITEMS)return;
   const index=removed.index;value.items.splice(index,0,removed.item);removed=null;render(index);changed('Restored the removed item. Other items keep their latest edits and ticks.');
  });
  render();
  button.disabled=false;status.textContent='Opened this working copy. Text and tick marks are from this file. New changes are not saved automatically.';
  let busy=false;
  function requestDownload(){
   if(busy)return false;
   const error=problem(value);if(error){status.textContent=error;return false;}
   busy=true;button.disabled=true;let url=null,anchor=null,requested=false;
   try{
    const html=build(value),blob=new env.Blob([html],{type:'text/html;charset=utf-8'});
    url=env.URL.createObjectURL(blob);anchor=doc.createElement('a');anchor.href=url;anchor.download='my-small-win-checklist.html';doc.body.append(anchor);anchor.click();requested=true;
    status.textContent='Updated working-copy download requested. Find and reopen the actual saved HTML file to check it. A request is not proof of saving; a canceled or blocked download leaves your work here.';
   }catch(error){status.textContent='Could not prepare the updated download. Your text and ticks remain in this open tab. Try again or copy your text privately; keep this tab open.';}
   finally{
    if(anchor)try{anchor.remove();}catch(error){}
    if(url){const pending=url;try{env.setTimeout(()=>{try{env.URL.revokeObjectURL(pending);}catch(error){}},30000);}catch(error){/* Keep a usable request if cleanup scheduling is unavailable. */}}
    busy=false;button.disabled=false;
   }
   return requested;
  }
  button.addEventListener('click',requestDownload);
  return {requestDownload};
 }
 return {MAX_TEXT,MAX_ITEMS,problem,fromArtifact,build,install};
}
const api=createPortableChecklist();if(typeof module!=='undefined')module.exports=api;root.PortableChecklist=api;
})(typeof window==='undefined'?globalThis:window);
