/// <reference types="node" />
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile,readdir } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { defaultCatalog } from '../src/game-core/catalog.generated';
import { before,after,test } from 'node:test';

let db:PGlite;
const alice='00000000-0000-4000-8000-000000000011',bob='00000000-0000-4000-8000-000000000012',guest='00000000-0000-4000-8000-000000000013';
const catalog:any={...defaultCatalog,manifest:{...defaultCatalog.manifest,version:'test_v2'}};
before(async()=>{db=new PGlite();await db.exec(`create role anon nologin;create role authenticated nologin;create role service_role nologin bypassrls;
 create schema auth;create table auth.users(id uuid primary key,is_anonymous boolean default false,email text,email_confirmed_at timestamptz);
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 grant usage on schema auth,public to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;
 insert into auth.users(id) values('${alice}'),('${bob}');insert into auth.users(id,is_anonymous) values('${guest}',true);`);
 for(const file of (await readdir('supabase/migrations')).filter(f=>f.endsWith('.sql')).sort()) await db.exec(await readFile(`supabase/migrations/${file}`,'utf8'));
 await service(()=>rpc('select publish_game_catalog($1::jsonb,$2,true) as result',[JSON.stringify(catalog),'a'.repeat(64)]));});
after(async()=>{await db?.close()});
async function role<T>(name:string,fn:()=>Promise<T>){await db.exec(`set role ${name}`);try{return await fn()}finally{await db.exec('reset role')}}
async function user<T>(id:string,fn:()=>Promise<T>){await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id]);return role('authenticated',fn)}
const service=<T>(fn:()=>Promise<T>)=>role('service_role',fn);
async function rpc(sql:string,args:unknown[]=[]):Promise<any>{return (await db.query<{result:any}>(sql,args)).rows[0].result}
const context=(id=alice,device='phone',request=randomUUID(),payload:any={operation:'bootstrap'})=>service(()=>rpc('select get_game_v2_context($1::uuid,$2,$3::uuid,$4::jsonb) as result',[id,device,request,JSON.stringify(payload)]));
const initial=(ctx:any)=>({protocolVersion:2,catalogVersion:ctx.catalog.manifest.version,seed:ctx.seed,lifeId:ctx.sessionId,money:'0',workEarned:'0',jobEarnings:{},legacy:[],jobId:'begging',ownedItemIds:[],qualifications:[],accountLevel:1,rebirthCount:0,completedLifetimes:0});
async function init(id=alice){const ctx=await context(id);return service(()=>rpc('select initialize_game_v2($1::uuid,$2,$3::jsonb,$4,$5::integer) as result',[id,'phone',JSON.stringify(initial(ctx)),ctx.catalog.manifest.version,ctx.seed]));}
async function commit(ctx:any,state:any,options:any={}){const requestId=options.requestId??randomUUID(),payload=options.payload??{sessionId:ctx.sessionId,actions:[{type:'work'}]};return service(()=>rpc('select commit_game_v2($1::uuid,$2,$3::uuid,$4::jsonb,$5::integer,$6::bigint,$7::bigint,$8::integer,$9::jsonb,$10::jsonb) as result',[options.owner??alice,options.device??'phone',requestId,JSON.stringify(payload),options.revision??ctx.revision,options.seq??ctx.seq,options.nextSeq??ctx.seq+1,options.days??1,JSON.stringify(state),JSON.stringify({processed:options.processed??1,stopReason:null})]));}
const settings=(extra:any={})=>({name:'Alex',avatar:'leaf',visible:true,showJob:true,showTotal:true,titleId:null,qualificationId:null,itemIds:[],...extra});

test('bootstrap context preserves v1 until explicit initialized transition',async()=>{
 await user(alice,()=>rpc('select start_run($1::uuid) as result',[randomUUID()]));
 const ctx=await context();assert.equal(ctx.state,null);assert.equal(ctx.catalog.manifest.version,'test_v2');
 await user(alice,()=>rpc('select submit_actions(($1::jsonb->\'run\'->>\'id\')::uuid,$2::uuid,0,$3::jsonb) as result',[JSON.stringify(ctx.legacyV1),randomUUID(),'[{"type":"work"}]']));
 const ready=await init();assert.equal(ready.state.money,'0');assert.equal(ready.legacyV1.run.earned==='0',false);
 await user(alice,()=>assert.rejects(rpc('select submit_actions(($1::jsonb->\'run\'->>\'id\')::uuid,$2::uuid,1,$3::jsonb) as result',[JSON.stringify(ctx.legacyV1),randomUUID(),'[{"type":"work"}]']),/legacy_read_only/));
});
test('player cannot mutate trusted state, initialize, commit or publish',async()=>{await user(alice,async()=>{
 await assert.rejects(db.query('select * from game_private.players_v2'),/permission denied/);
 await assert.rejects(rpc('select publish_game_catalog($1::jsonb,$2,true) as result',[JSON.stringify(catalog),'a'.repeat(64)]),/permission denied/);
 const ctx=await rpc('select get_game_v2_snapshot() as result');
 await assert.rejects(rpc('select initialize_game_v2($1::uuid,$2,$3::jsonb,$4,$5::integer) as result',[alice,'phone',JSON.stringify(ctx.state),'test_v2',ctx.seed]),/permission denied/);
});await role('anon',()=>assert.rejects(rpc('select get_game_v2_snapshot() as result'),/permission denied/));});
test('receipt exact replay precedes conflict and rejects changed request payload',async()=>{
 const ctx=await context(),requestId=randomUUID(),payload={sessionId:ctx.sessionId,actions:[{type:'work'}]};
 const state={...ctx.state,money:'15',workEarned:'15',jobEarnings:{begging:'15'}};
 const first=await commit(ctx,state,{requestId,payload});assert.equal(first.revision,1);
 assert.deepEqual(await commit(ctx,state,{requestId,payload}),first);
 const replay=await context(alice,'phone',requestId,payload);assert.deepEqual(replay.receipt,first);
 await assert.rejects(commit(ctx,state,{requestId,payload:{...payload,actions:[{type:'rest'}]}}),/request_id_reused/);
 await assert.rejects(commit(ctx,state),/revision_conflict/);
});
test('rate limit applies to all elapsed days and rolls back projection',async()=>{
 const ctx=await context();await assert.rejects(commit(ctx,{...ctx.state,money:'1000',workEarned:'1000',jobEarnings:{begging:'1000'}},{days:512,nextSeq:ctx.seq+512}),/rate_limited/);
 assert.equal((await context()).state.money,'15');
 await db.query("update game_private.players_v2 set checkpoint_at=clock_timestamp()-interval '1 hour' where user_id=$1",[alice]);
 assert.equal((await context()).dayAllowance,1200);
});
test('takeover rotates session and rejects former device even with new revision',async()=>{
 const old=await context();const takeover=await user(alice,()=>rpc('select takeover_game_v2($1,true) as result',['tablet']));
 assert.notEqual(takeover.sessionId,old.sessionId);
 await assert.rejects(commit(takeover,takeover.state,{device:'phone'}),/writer_conflict/);
 await assert.rejects(commit(takeover,takeover.state,{device:'tablet',payload:{sessionId:old.sessionId,actions:[]}}),/writer_conflict/);
 await user(alice,()=>rpc('select takeover_game_v2($1,true) as result',['phone']));
});
test('idle bootstrap renews a same-writer lease without minting allowance or changing revision',async()=>{
 await db.query("update game_private.players_v2 set checkpoint_at=clock_timestamp()-interval '10 minutes',day_tokens=3 where user_id=$1",[alice]);
 const renewed=await context();
 assert.equal(renewed.dayAllowance,1200);
 assert.ok(Date.parse(renewed.leaseUntil)-Date.parse(renewed.serverTime)>299_000);
 await db.query("update game_private.players_v2 set checkpoint_at=clock_timestamp()-interval '10 minutes',day_tokens=3 where user_id=$1",[alice]);
 const syncing=await context(alice,'phone',randomUUID(),{operation:'sync'});
 assert.ok(Date.parse(syncing.leaseUntil)<Date.parse(syncing.serverTime));
 const foreign=await context(alice,'foreign-phone');assert.equal(foreign.conflict,'writer_conflict');
 assert.ok(Date.parse(foreign.leaseUntil)<Date.parse(foreign.serverTime));
 assert.equal(renewed.revision,syncing.revision);
 await context();
});
test('own showcase preference read is private and denied to anonymous role',async()=>{
 const own=await user(alice,()=>rpc('select get_my_game_showcase() as result'));
 assert.equal(own.name,'Player');assert.equal(own.visible,false);
 await role('anon',()=>assert.rejects(rpc('select get_my_game_showcase() as result'),/permission denied/));
});
test('published versions are immutable and rebound only at rebirth',async()=>{
 await assert.rejects(service(()=>rpc('select publish_game_catalog($1::jsonb,$2,true) as result',[JSON.stringify({...catalog,jobs:[]}), 'a'.repeat(64)])),/catalog_version_immutable|starter_job_missing/);
 await service(()=>rpc('select publish_game_catalog($1::jsonb,$2,true) as result',[JSON.stringify({...catalog,manifest:{...catalog.manifest,version:'test_v3'}}),'b'.repeat(64)]));
 let ctx=await context();assert.equal(ctx.catalog.manifest.version,'test_v2');assert.equal(ctx.nextCatalog.manifest.version,'test_v3');
 await assert.rejects(commit(ctx,{...ctx.state,catalogVersion:'test_v3'},{days:0}),/invalid_verified_state/);
 const result=await commit(ctx,{...ctx.state,catalogVersion:'test_v3',rebirthCount:1},{days:0});assert.equal(result.state.catalogVersion,'test_v3');
 ctx=await context();assert.equal(ctx.catalog.manifest.version,'test_v3');
});
test('showcase cannot claim items, degrees or titles; opt-in needs linked account',async()=>{
 await user(alice,()=>assert.rejects(rpc('select update_game_showcase($1::jsonb) as result',[JSON.stringify(settings({itemIds:['villa']}))]),/unowned_item/));
 await user(alice,()=>assert.rejects(rpc('select update_game_showcase($1::jsonb) as result',[JSON.stringify(settings({qualificationId:'computing_degree'}))]),/unearned_qualification/));
 await user(alice,()=>assert.rejects(rpc('select update_game_showcase($1::jsonb) as result',[JSON.stringify(settings({titleId:'senior_engineer'}))]),/unearned_title/));
 await init(guest);
 await user(guest,()=>assert.rejects(rpc('select update_game_showcase($1::jsonb) as result',[JSON.stringify(settings())]),/linked_account_required/));
});
test('legacy showcase survives rebirth with explicit historical ownership and private scope',async()=>{
 const ctx=await context();const state={...ctx.state,jobEarnings:{begging:'15',senior_engineer:'12345678901234567890'},workEarned:'12345678901234567905',
  legacy:[{lifeId:'old-life',catalogVersion:'test_v2',ownedItemIds:['villa'],qualifications:['computing_degree']}],ownedItemIds:[],qualifications:[]};
 await commit(ctx,state,{days:0});
 const profile=await user(alice,()=>rpc('select update_game_showcase($1::jsonb) as result',[JSON.stringify(settings({titleId:'senior_engineer',itemIds:['villa'],qualificationId:'computing_degree'}))]));
 assert.equal(profile.title,'Senior engineer');assert.equal(profile.jobId,'begging');assert.equal(profile.items[0].source,'past_life');assert.equal(profile.qualification.source,'past_life');
 assert.equal(profile.totalEarnings,'12345678901234567905');assert.equal(profile.seed,undefined);assert.equal(profile.money,undefined);
 await init(bob);assert.deepEqual(await user(bob,()=>rpc('select get_public_game_profile($1::uuid) as result',[profile.playerId])),profile);
 await user(alice,()=>rpc('select update_game_showcase($1::jsonb) as result',[JSON.stringify(settings({visible:false}))]));
 assert.equal(await user(bob,()=>rpc('select get_public_game_profile($1::uuid) as result',[profile.playerId])),null);
});
test('leaderboard honors visibility, exact job earnings and ties; bounded inputs',async()=>{
 await user(alice,()=>rpc('select update_game_showcase($1::jsonb) as result',[JSON.stringify(settings())]));
 const ctx=await context(bob);await commit(ctx,{...ctx.state,jobEarnings:{begging:'15'},workEarned:'15',money:'15'},{owner:bob,days:0});
 await user(bob,()=>rpc('select update_game_showcase($1::jsonb) as result',[JSON.stringify(settings({name:'Blake'}))]));
 const board=await user(alice,()=>rpc('select get_job_leaderboard($1,50) as result',['begging']));
 assert.equal(board.rows.length,2);assert.equal(board.rows[0].rank,1);assert.equal(board.rows[1].rank,1);assert.equal(board.myEntry.jobEarnings,'15');
 await user(alice,()=>assert.rejects(rpc('select get_job_leaderboard($1,51) as result',['begging']),/invalid_leaderboard/));
});
test('compacted request identities never become executable again',async()=>{
 const ctx=await context(),requestId=randomUUID(),payload={sessionId:ctx.sessionId,actions:[]};await commit(ctx,ctx.state,{requestId,payload,days:0,nextSeq:ctx.seq});
 await db.query('update game_private.receipts_v2 set response=null where user_id=$1 and request_id=$2',[alice,requestId]);
 await assert.rejects(commit(ctx,ctx.state,{requestId,payload,days:0,nextSeq:ctx.seq}),/receipt_expired/);
});

test('untouched legacy identity defaults to best earned career after rebirth and honors explicit Hide',async()=>{
 const carol='00000000-0000-4000-8000-000000000014';await db.query('insert into auth.users(id) values($1)',[carol]);
 let ctx=await init(carol);
 const state={...ctx.state,jobId:'begging',rebirthCount:1,jobEarnings:{begging:'15',master_tradesperson:'1050'},workEarned:'1065',
  legacy:[{lifeId:'previous-life',catalogVersion:'test_v2',jobEarnings:{master_tradesperson:'1050'},ownedItemIds:[],qualifications:[]}]};
 await commit(ctx,state,{owner:carol,days:0});
 let prefs=await user(carol,()=>rpc('select get_my_game_showcase() as result'));assert.equal(prefs.titleId,'master_tradesperson');
 let profile=await rpc('select game_private.v2_showcase($1::uuid) as result',[carol]);
 assert.equal(profile.titleId,'master_tradesperson');assert.equal(profile.title,'Master tradesperson');assert.equal(profile.jobId,'begging');
 // Saving an explicit null is a deliberate Hide, not a request to recompute the default.
 await user(carol,()=>rpc('select update_game_showcase($1::jsonb) as result',[JSON.stringify(settings({visible:false,titleId:null}))]));
 ctx=await context(carol);await commit(ctx,{...ctx.state,rebirthCount:2},{owner:carol,days:0});
 prefs=await user(carol,()=>rpc('select get_my_game_showcase() as result'));assert.equal(prefs.titleId,null);
 profile=await rpc('select game_private.v2_showcase($1::uuid) as result',[carol]);assert.equal(profile.titleId,null);assert.equal(profile.title,null);
});

test('automatic title retains an earned retired career from its historical catalog',async()=>{
 const dana='00000000-0000-4000-8000-000000000015';await db.query('insert into auth.users(id) values($1)',[dana]);
 const retired={...catalog,manifest:{...catalog.manifest,version:'retired_era'},jobs:[...catalog.jobs,{...catalog.jobs[0],id:'retired_master',name:'Retired master',baseEarnings:'9000',maxEarnings:'9000'}]};
 await service(()=>rpc('select publish_game_catalog($1::jsonb,$2,false) as result',[JSON.stringify(retired),'c'.repeat(64)]));
 const ctx=await init(dana);await commit(ctx,{...ctx.state,jobEarnings:{retired_master:'9000'},workEarned:'9000',
  legacy:[{lifeId:'retired-life',catalogVersion:'retired_era',jobEarnings:{retired_master:'9000'},ownedItemIds:[],qualifications:[]}]},{owner:dana,days:0});
 const profile=await rpc('select game_private.v2_showcase($1::uuid) as result',[dana]);assert.equal(profile.titleId,'retired_master');assert.equal(profile.title,'Retired master');
 await user(dana,()=>assert.rejects(db.query('select game_private.v2_auto_title($1::uuid)',[alice]),/permission denied/));
});
