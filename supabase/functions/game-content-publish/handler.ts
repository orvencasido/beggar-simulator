import { canonicalJson, validateCatalog } from '../../../src/game-core/catalog.ts';
import { boundedJson } from '../game-sync/handler.ts';
export interface PublishServices {secret:string;additionalSecrets?:string[];publish(catalog:unknown,digest:string,activate:boolean):Promise<unknown>}
function equal(left:string,right:string){const a=new TextEncoder().encode(left),b=new TextEncoder().encode(right);let result=a.length^b.length;for(let i=0;i<Math.max(a.length,b.length);i++)result|=(a[i]??0)^(b[i]??0);return result===0;}
export function createPublishHandler(services:PublishServices){return async(request:Request)=>{
 const json=(body:unknown,status=200)=>Response.json(body,{status});
 if(request.method!=='POST')return json({error:'method_not_allowed'},405);
 const bearer=request.headers.get('authorization');const credential=request.headers.get('apikey')??(bearer?.startsWith('Bearer ')?bearer.slice(7):null);
 const trusted=[services.secret,...(services.additionalSecrets??[])];
 if(!credential||!trusted.some(secret=>secret.length>0&&equal(credential,secret)))return json({error:'privileged_authentication_required'},401);
 try{
  const body=await boundedJson(request,1024*1024);if(Object.keys(body).some(k=>!['catalog','digest','activate'].includes(k))||typeof body.digest!=='string'||!/^[a-f0-9]{64}$/.test(body.digest)||typeof body.activate!=='boolean')throw new Error('invalid_publication');
  const catalog=validateCatalog(body.catalog);const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(canonicalJson(catalog)));const digest=Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('');
  if(digest!==body.digest)throw new Error('catalog_digest_mismatch');
  return json(await services.publish(catalog,digest,body.activate));
 }catch(error){return json({error:error instanceof Error?error.message:'publication_failed'},400);}
};}
