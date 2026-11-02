(function(root){'use strict';
const limits={facts:1600,request:4000,response:6000,draft:1600,check:1600};
function error(v){if(!v||!['message','checklist'].includes(v.kind))return 'Choose a message or checklist.';if(!['pasted-ai','prepared-example'].includes(v.origin))return 'Say whether this is a pasted AI reply or a prepared example.';for(const key of ['facts','request','response'])if(typeof v[key]!=='string'||!v[key].trim()||v[key].length>limits[key])return 'Add '+({facts:'the harmless original facts',request:'the original request or example brief',response:'the pasted reply or example'}[key])+' (up to '+limits[key]+' characters). Nothing is shortened automatically.';return '';}
function snapshot(v){if(error(v))return null;return Object.fromEntries(['kind','origin','facts','request','response'].map(k=>[k,v[k]]));}
function same(a,b){return !!a&&!!b&&['kind','origin','facts','request','response'].every(k=>a[k]===b[k]);}
function signature(bundle,draft,check){return JSON.stringify([bundle,draft,check]);}
function checkField(draft,check){return ['draft','check'].find(key=>{const val=key==='draft'?draft:check;return typeof val!=='string'||!val.trim()||val.length>limits[key];})||'';}
function checkError(draft,check){const field=checkField(draft,check);return field==='draft'?'Write your own corrected draft (up to 1,600 characters).':field==='check'?'Describe your actual comparison, including any mismatch or uncertainty (up to 1,600 characters).':'';}
const api={limits,error,snapshot,same,signature,checkError,checkField};if(typeof module!=='undefined')module.exports=api;root.PastedDraft=api;
})(typeof window==='undefined'?globalThis:window);
