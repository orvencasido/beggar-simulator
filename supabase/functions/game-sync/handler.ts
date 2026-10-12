import { createGame, replayActions, validateAction, validateCatalog, validateGameState } from '../../../src/game-core/index.ts';
import type { GameAction, GameState } from '../../../src/game-core/index.ts';
export interface SyncServices { authenticate(token:string):Promise<string|null>; rpc(name:string,args:Record<string,unknown>):Promise<unknown> }
const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS'};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,'content-type':'application/json'}});
const uuid=(v:unknown):v is string=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
export async function boundedJson(request:Request,limit=65536):Promise<Record<string,unknown>> {
 if(!request.body)throw new Error('invalid_request');const reader=request.body.getReader();let size=0;const parts:Uint8Array[]=[];
 while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>limit){await reader.cancel();throw new Error('payload_too_large');}parts.push(value);}
 const all=new Uint8Array(size);let cursor=0;for(const p of parts){all.set(p,cursor);cursor+=p.length;}const value=JSON.parse(new TextDecoder().decode(all));
 if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('invalid_request');return value;
}
function validateBody(body:Record<string,unknown>){
 const operation=body.operation;if(!['bootstrap','initialize','sync'].includes(operation as string)||!uuid(body.requestId)||typeof body.deviceId!=='string'||body.deviceId.length<1||body.deviceId.length>128)throw new Error('invalid_request');
 const fields=operation==='sync'?['operation','requestId','deviceId','sessionId','baseRevision','startSequence','catalogVersion','actions']:['operation','requestId','deviceId'];
 if(Object.keys(body).length!==fields.length||fields.some(k=>!(k in body)))throw new Error('invalid_request');
 if(operation==='sync'){
  if(!uuid(body.sessionId)||!Number.isSafeInteger(body.baseRevision)||(body.baseRevision as number)<0||!Number.isSafeInteger(body.startSequence)||(body.startSequence as number)<0||typeof body.catalogVersion!=='string'||body.catalogVersion.length>64||!Array.isArray(body.actions)||body.actions.length<1||body.actions.length>512||body.actions.some(a=>!validateAction(a)))throw new Error('invalid_batch');
 }
}
export function createGameSyncHandler(services:SyncServices){return async(request:Request):Promise<Response>=>{
 if(request.method==='OPTIONS')return new Response(null,{headers:cors});if(request.method!=='POST')return json({error:'method_not_allowed'},405);
 try {
  const bearer=request.headers.get('authorization');if(!bearer?.startsWith('Bearer '))return json({error:'authentication_required'},401);
  const owner=await services.authenticate(bearer.slice(7));if(!owner)return json({error:'authentication_required'},401);
  const body=await boundedJson(request);validateBody(body);
  const context=await services.rpc('get_game_v2_context',{owner_id:owner,device_id:body.deviceId,request_id:body.requestId,payload:body}) as Record<string,unknown>;
  if(context.receipt)return json(context.receipt);
  if(context.conflict)return json({...context,processed:0,stopReason:context.conflict,requestId:body.requestId});
  const catalog=validateCatalog(context.catalog),nextCatalog=validateCatalog(context.nextCatalog??context.catalog);
  if(body.operation==='initialize'){
   if(context.state)return json(context);
   if(typeof context.seed!=='number'||typeof context.sessionId!=='string')throw new Error('invalid_server_context');
   const state=createGame(context.seed,catalog,context.sessionId);
   const initialized=await services.rpc('initialize_game_v2',{owner_id:owner,device_id:body.deviceId,state,catalog_version:catalog.manifest.version,seed:context.seed});
   return json(initialized);
  }
  if(body.operation==='bootstrap')return json(context);
  if(!context.state)return json({error:'initialize_required'},409);
  if(!validateGameState(context.state,catalog))throw new Error('invalid_server_state');
  const revision=context.revision as number,sequence=(context.sequence??context.seq) as number;
  if(revision!==body.baseRevision||sequence!==(body.startSequence as number)-1)return json({...context,processed:0,stopReason:'revision_conflict',conflict:true,requestId:body.requestId});
  if(body.catalogVersion!==catalog.manifest.version)throw new Error('catalog_mismatch');
  const replay=replayActions(context.state as GameState,body.actions as GameAction[],catalog,nextCatalog);
  // Insufficient server-clock allowance never consumes the valid journal or records a gameplay rejection.
  if(typeof context.dayAllowance!=='number'||replay.dayCost>context.dayAllowance)return json({error:'rate_limited'},429);
  const result=await services.rpc('commit_game_v2',{owner_id:owner,device_id:body.deviceId,request_id:body.requestId,payload:body,expected_revision:revision,expected_seq:sequence,next_seq:sequence+replay.processed,days_used:replay.dayCost,state:replay.state,response:{processed:replay.processed,stopReason:replay.stopReason,sessionId:context.sessionId,catalog:replay.state.catalogVersion===catalog.manifest.version?catalog:nextCatalog,nextCatalog}});
  return json(result);
 }catch(error){const reason=error instanceof Error?error.message:'sync_failed';const known=['request_id_reused','receipt_expired','writer_conflict','revision_conflict','rate_limited','catalog_mismatch','invalid_request','invalid_batch','payload_too_large','initialize_required'];const publicReason=known.find(x=>reason.includes(x))??(reason.startsWith('catalog')?'invalid_catalog':'sync_failed');return json({error:publicReason},publicReason==='payload_too_large'?413:publicReason==='writer_conflict'||publicReason==='revision_conflict'?409:400);}
};}
