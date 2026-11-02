const assert=require('node:assert/strict'),fs=require('node:fs');
const read=n=>fs.readFileSync('public/'+n,'utf8');
for(const name of ['lesson-pack','lesson-worksheet','lesson-checks']){
 const html=read(name+'.html');assert.match(html,/<html lang="en">/);assert.match(html,/name="viewport"/);assert.match(html,/href="#main"/);assert(!/<script|<form|<input|<textarea|localStorage|fetch\(/.test(html));
 for(const [,path] of html.matchAll(/href="\/(lesson-[^"#]+)"/g)){assert(fs.existsSync('public/'+(path.includes('.')?path:path+'.html')),path);}
}
const w=read('lesson-worksheet.html'),c=read('lesson-checks.html');
assert(!w.includes('3 whole packs'));assert(!w.includes('24 sheets'));assert(!read('lesson-worksheet.txt').includes('24 sheets'));assert.match(c,/24 sheets/);assert.match(c,/3 whole packs/);assert.match(c,/1:40 pm/);assert.match(w,/source|Source/);assert.match(w,/Keep my first attempt unchanged/);assert.match(w,/AI is optional/);assert.match(c,/Do not count an AI or maintainer QA/);assert.match(read('index.html'),/href="\/lesson-pack.html"/);assert.match(read('lesson-pack.css'),/@media print/);
assert.equal(Math.ceil(12*2/10),3);assert.equal(3*10-12*2,6);
console.log('PASS lesson pack links, no collection/scripts, worksheet/answer separation, assistance boundaries, printable/text paths, exact arithmetic');
