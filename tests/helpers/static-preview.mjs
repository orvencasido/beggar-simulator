import {createServer} from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {resolve,join,extname} from 'node:path';
export async function staticPreview(directory){
 const root=resolve(directory);const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.svg':'image/svg+xml','.woff2':'font/woff2'};
 const server=createServer(async(req,res)=>{try{
  const path=decodeURIComponent(new URL(req.url,'http://localhost').pathname);let file=resolve(root,`.${path}`);
  if(file!==root&&!file.startsWith(root+'/')){res.writeHead(403).end();return;}
  try{if((await stat(file)).isDirectory())file=join(file,'index.html');}catch{file=join(root,path.replace(/^\//,'')+'.html');}
  try{await stat(file);}catch{file=join(root,'index.html');}
  const content=await readFile(file);res.writeHead(200,{'content-type':types[extname(file)]??'application/octet-stream'}).end(content);
 }catch{res.writeHead(404).end('Not found');}});
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
 return {url:`http://127.0.0.1:${server.address().port}`,close:()=>new Promise(resolve=>server.close(resolve))};
}
