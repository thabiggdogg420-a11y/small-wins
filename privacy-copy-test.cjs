const fs=require('fs'),assert=require('assert');
for(const name of fs.readdirSync('public').filter(n=>/\.(js|html)$/.test(n))){const s=fs.readFileSync('public/'+name,'utf8');assert(!s.includes('Nothing is automated or sent from this website.'),name);assert(!s.includes('No account sync or tracking.'),name);}
assert(fs.readFileSync('public/interview-ui.js','utf8').includes('No interview answers are automatically sent'));
assert(fs.readFileSync('public/index.html','utf8').includes('daily'));
console.log('PASS narrow privacy copy preserves explicit aggregate-counter disclosure');
