'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict');
const html=fs.readFileSync('public/ai-notice.html','utf8');
const disclosure=html.match(/<details\b([^>]*)id="notice-recovery"([^>]*)>([\s\S]*?)<\/details>/);
assert.ok(disclosure,'Native recovery disclosure exists');
assert.doesNotMatch(disclosure[1]+disclosure[2],/\bopen\b/,'New visitors begin with recovery collapsed');
assert.match(disclosure[3],/^<summary>Save unfinished work or resume a working file<\/summary>/);
for(const id of ['checkpoint-save-approved','checkpoint-save','checkpoint-file','checkpoint-status','checkpoint-review','checkpoint-preview','checkpoint-apply','checkpoint-cancel']){
 assert.equal((html.match(new RegExp('id="'+id+'"','g'))||[]).length,1,id+' remains unique');
 assert.ok(disclosure[3].includes('id="'+id+'"'),id+' remains within recovery');
}
assert.match(html,/<a href="#notice-start">Start with a notice<\/a>/);
assert.match(html,/<section aria-labelledby="notice-start"><h2 id="notice-start" tabindex="-1">1\. Start with the original<\/h2>/);
assert.ok(html.indexOf('href="#notice-start"')<html.indexOf('id="notice-recovery"'));
assert.ok(html.includes('This page does not save entries automatically'),'Session-loss warning exists');
assert.ok(html.includes('Do not paste private letters'),'Privacy warning exists');
assert.ok(html.indexOf('This page does not save entries automatically')<html.indexOf('id="notice-recovery"'),'Session-loss disclosure stays visible before recovery');
assert.ok(html.indexOf('Do not paste private letters')<html.indexOf('id="notice-recovery"'),'Privacy boundaries stay visible');
assert.doesNotMatch(disclosure[3],/id="(?:source|safe|prepare|sample)"/,'First action is not hidden inside recovery');
for(const id of ['safe','prompt-reviewed','final-reviewed'])assert.match(html,new RegExp('<input id="'+id+'" type="checkbox">'));
assert.match(html,/<button id="checkpoint-save" type="button" disabled>/);
assert.match(html,/<button id="download" type="button" disabled>/);
console.log('Notice entry: collapsed native recovery, direct focusable first step, visible warnings, unique unchanged controls and review gates passed');
