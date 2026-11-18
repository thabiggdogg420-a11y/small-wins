'use strict';
// Read-only, loopback-only preview. No hosted database, tracking or account services.
const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'../public');
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.txt':'text/plain; charset=utf-8','.json':'application/json','.webmanifest':'application/manifest+json','.svg':'image/svg+xml','.png':'image/png'};
function createServer(){return http.createServer((req,res)=>{
  const finish=(code,body='')=>{res.writeHead(code,{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(req.method==='HEAD'?'':body);};
  if(!['GET','HEAD'].includes(req.method))return finish(405,'Local preview is read-only.');
  let pathname;try{pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);}catch{return finish(400,'Invalid URL.');}
  if(pathname.includes('\0')||pathname.includes('\\')||pathname.split('/').some(x=>x==='..'||x.startsWith('.')))return finish(404,'Not found');
  // Never turn unavailable hosted APIs into a successful HTML response.
  if(pathname.startsWith('/api/'))return finish(404,'Hosted services are unavailable in local preview.');
  const names=pathname==='/'?['index.html']:[pathname.slice(1),pathname.slice(1)+'.html',pathname.replace(/^\//,'').replace(/\/$/,'')+'/index.html'];
  for(const name of names){
    const candidate=path.resolve(root,name);
    if(!candidate.startsWith(root+path.sep))continue;
    let real,stat;try{real=fs.realpathSync(candidate);stat=fs.statSync(real);}catch{continue;}
    if(!real.startsWith(root+path.sep)||!stat.isFile())continue;
    res.writeHead(200,{'Content-Type':types[path.extname(real)]||'application/octet-stream','Content-Length':stat.size,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
    if(req.method==='HEAD')res.end();else fs.createReadStream(real).on('error',()=>res.destroy()).pipe(res);return;
  }
  finish(404,'Not found');
});}
if(require.main===module){
  const raw=process.argv[2]||'8000',port=Number(raw);
  if(!/^\d+$/.test(raw)||!Number.isInteger(port)||port<1024||port>65535){console.error('Use an unprivileged port from 1024 to 65535, e.g. node scripts/preview-local.cjs 8000');process.exitCode=1;}
  else{const server=createServer();server.on('error',e=>{console.error('Preview could not start: '+e.message);process.exitCode=1;});server.listen(port,'127.0.0.1',()=>console.log('Learn4Free local preview: http://127.0.0.1:'+port+'\nRead-only local pages; hosted services are unavailable. Stop with Ctrl+C.'));}
}
module.exports={createServer};
