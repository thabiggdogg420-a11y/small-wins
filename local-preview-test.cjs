'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const http=require('node:http');
const {createServer}=require('./scripts/preview-local.cjs');
(async()=>{
 const server=createServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));const port=server.address().port;
 const request=(url,method='GET')=>new Promise((resolve,reject)=>{const q=http.request({hostname:'127.0.0.1',port,path:url,method},r=>{const chunks=[];r.on('data',x=>chunks.push(x));r.on('end',()=>resolve({status:r.statusCode,headers:r.headers,body:Buffer.concat(chunks)}));});q.on('error',reject);q.end();});
 let count=0;try{
 for(const [url,file] of [['/','index.html'],['/notes-csv','notes-csv.html'],['/notes-csv.html','notes-csv.html'],['/application-workshop/','application-workshop/index.html'],['/notes-csv.js','notes-csv.js']]){const r=await request(url);assert.equal(r.status,200,url);assert.deepEqual(r.body,fs.readFileSync('public/'+file));count++;}
 const head=await request('/notes-csv.html','HEAD');assert.equal(head.status,200);assert.equal(head.body.length,0);assert.equal(Number(head.headers['content-length']),fs.statSync('public/notes-csv.html').size);count++;
 const js=await request('/notes-csv.js');assert.match(js.headers['content-type'],/^text\/javascript/);assert.equal(js.headers['x-content-type-options'],'nosniff');count++;
 for(const url of ['/does-not-exist','/.git/config','/%2e%2e/README.md','/%2e%2e%2fREADME.md','/%5c..%5cREADME.md','/%00','/api/usage']){assert.equal((await request(url)).status,404,url);count++;}
 assert.equal((await request('/%zz')).status,400);count++;
 for(const method of ['POST','PUT','DELETE']){assert.equal((await request('/notes-csv.html',method)).status,405);count++;}
 console.log('Local preview: '+count+' HTTP scenarios passed (exact page bytes, aliases, HEAD, MIME, missing files, traversal, invalid URL, API and mutation rejection).');
 }finally{await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
