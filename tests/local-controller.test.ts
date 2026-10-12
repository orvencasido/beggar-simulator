import assert from 'node:assert/strict';
import { test } from 'node:test';
import { LocalController, type FrozenBatch, type SaveRecord } from '../src/features/game/local-controller';

type State = {money:number}; type Action = {type:'work'}; type Catalog = {version:string};
function harness() {
  let now = 1_000; let ids = 0; let server = {state:{money:0},catalog:{version:'v2'},revision:0,sequence:0};
  const storage = new Map<string,string>(); const envelopes: FrozenBatch<Action>[] = [];
  const receipts = new Map<string,{state:State;revision:number;sequence:number;processed:number;requestId:string}>();
  let loseResponse = false; let pending: (()=>void) | null = null;
  const build = () => new LocalController<State,Catalog,Action>({
    mode:'cloud',key:'save',store:{get:async key=>storage.get(key)??null,set:async(key,value)=>{storage.set(key,value);}},
    now:()=>now,uuid:()=>`request-${++ids}`,onChange:()=>{},catalogVersion:c=>c.version,
    validate:(value):value is SaveRecord<State,Catalog,Action> => (value as {version:number}).version===2,
    bootstrap:async()=>server,
    reduce:(state)=>({state:{money:state.money+1},accepted:true,dayCost:1}),
    submit:async batch=>{
      envelopes.push(structuredClone(batch));
      if (pending) await new Promise<void>(resolve=>{pending=resolve;});
      let receipt=receipts.get(batch.requestId);
      if(!receipt){server={...server,state:{money:server.state.money+batch.actions.length},revision:server.revision+1,sequence:server.sequence+batch.actions.length};receipt={...server,processed:batch.actions.length,requestId:batch.requestId};receipts.set(batch.requestId,receipt);}
      if(loseResponse){loseResponse=false;throw new Error('response lost');}
      return receipt;
    },
  });
  return {build,storage,envelopes,advance:(ms:number)=>{now+=ms;},lose:()=>{loseResponse=true;},hold:()=>{pending=()=>{};},release:()=>{pending?.();pending=null;},server:()=>server};
}

test('actions update locally and persist without a network request',async()=>{
  const h=harness();const c=h.build();await c.initialize();
  await c.act({type:'work'});await c.act({type:'work'});
  assert.equal(c.state?.money,2);assert.equal(h.envelopes.length,0);
  const saved=JSON.parse(h.storage.get('save')!);assert.equal(saved.journal.length,2);assert.equal(saved.checkpoint.state.money,0);
  await c.sync();assert.equal(h.server().state.money,2);assert.equal(c.pendingCount,0);
});
test('lost response and cold reload retry an identical frozen envelope once',async()=>{
  const h=harness();const c=h.build();await c.initialize();await c.act({type:'work'});h.lose();await c.sync();
  assert.equal(c.pendingCount,1);assert.equal(h.server().state.money,1);
  const restored=h.build();await restored.initialize();
  assert.deepEqual(h.envelopes[0],h.envelopes[1]);assert.equal(h.server().state.money,1);assert.equal(restored.state?.money,1);assert.equal(restored.pendingCount,0);
});
test('actions arriving during a sync survive acknowledgement and replay',async()=>{
  const h=harness();const c=h.build();await c.initialize();await c.act({type:'work'});h.hold();const sync=c.sync();
  while(!h.envelopes.length) await new Promise(resolve=>setTimeout(resolve,0));
  await c.act({type:'work'});h.release();await sync;
  assert.equal(c.state?.money,2);assert.equal(c.pendingCount,1);assert.equal(h.server().state.money,1);
  await c.sync();assert.equal(h.server().state.money,2);
});
test('ranked lease expiry pauses without consuming a day or discarding progress',async()=>{
  const h=harness();const c=h.build();await c.initialize();await c.act({type:'work'});h.advance(300_001);
  assert.equal(await c.act({type:'work'}),false);assert.equal(c.state?.money,1);assert.equal(c.pendingCount,1);
  await c.sync();assert.equal(await c.act({type:'work'}),true);
});
test('a failed local write pauses mutations until the same pending state is saved',async()=>{
 let fail=false;const h=harness();const c=h.build();await c.initialize();
 const options=(c as unknown as {options:{store:{set(key:string,value:string):Promise<void>}}}).options;
 const set=options.store.set;options.store.set=async(key,value)=>{if(fail)throw new Error('disk full');await set(key,value);};
 fail=true;assert.equal(await c.act({type:'work'}),false);assert.equal(c.state?.money,1);assert.equal(c.paused,true);
 assert.equal(await c.act({type:'work'}),false);assert.equal(h.envelopes.length,0);
 fail=false;await c.retryStorage();assert.equal(c.paused,false);await c.sync();assert.equal(h.server().state.money,1);
});
test('first bootstrap failure retains the same durable device for explicit migration acknowledgement',async()=>{
 const h=harness();const c=h.build();const options=(c as unknown as {options:{bootstrap(device:string):Promise<any>}}).options;
 const bootstrap=options.bootstrap;const devices:string[]=[];let first=true;
 options.bootstrap=async device=>{devices.push(device);if(first){first=false;throw new Error('initialize_required');}return bootstrap(device);};
 await c.initialize();assert.equal(c.state,null);await c.initialize();assert.equal(devices.length,2);assert.equal(devices[0],devices[1]);
});
test('expired server lease is not renewed merely because a stale checkpoint was read',async()=>{
 const h=harness();const c=h.build();const options=(c as unknown as {options:{bootstrap(device:string):Promise<any>}}).options;
 const bootstrap=options.bootstrap;options.bootstrap=async device=>({...await bootstrap(device),serverTime:'2026-01-01T12:00:00Z',leaseUntil:'2026-01-01T11:59:00Z'});
 await c.initialize();assert.equal(c.paused,true);assert.equal(await c.act({type:'work'}),false);
});
test('owner namespaces preserve original pending save without exposing it to another account',async()=>{
 const h=harness();const c=h.build();let owner='alice';
 const options=(c as unknown as {options:{ownerId?:()=>Promise<string>;currentOwnerId?:()=>string}}).options;
 options.ownerId=async()=>owner;options.currentOwnerId=()=>owner;
 await c.initialize();await c.act({type:'work'});assert.equal(c.storageKey,'save:owner:alice');
 owner='bob';assert.equal(await c.act({type:'work'}),false);assert.equal(c.state,null);
 await c.changeAccount();assert.equal(c.storageKey,'save:owner:bob');assert.equal((c.state as State | null)?.money,0);
 const aliceSave=JSON.parse(h.storage.get('save:owner:alice')!);assert.equal(aliceSave.journal.length,1);assert.equal(aliceSave.ownerId,'alice');
});
test('takeover waits for an old acknowledgement before installing its fresh checkpoint',async()=>{
 const h=harness();const c=h.build();await c.initialize();await c.act({type:'work'});h.hold();const sync=c.sync();
 while(!h.envelopes.length)await new Promise(resolve=>setTimeout(resolve,0));
 const options=(c as unknown as {options:{bootstrap(device:string,takeover?:boolean):Promise<any>}}).options;
 const bootstrap=options.bootstrap;options.bootstrap=async(device,takeover)=>({...await bootstrap(device,takeover),state:takeover?{money:999}:h.server().state,revision:takeover?10:h.server().revision});
 const takeover=c.takeOver();h.release();await Promise.all([sync,takeover]);
 assert.equal(c.state?.money,999);assert.equal(c.record?.checkpoint.revision,10);assert.equal(c.pendingCount,0);
});
test('a new device retains a read-only checkpoint and can explicitly take over',async()=>{
 const h=harness();const c=h.build();const options=(c as unknown as {options:{bootstrap(device:string,takeover?:boolean):Promise<any>}}).options;
 const bootstrap=options.bootstrap;options.bootstrap=async(device,takeover)=>({...await bootstrap(device),sessionId:takeover?'new-session':'other-session',conflict:takeover?false:'writer_conflict'});
 await c.initialize();assert.ok(c.record);assert.equal(c.paused,true);assert.equal(await c.act({type:'work'}),false);
 const stableDevice=c.record!.deviceId;await c.takeOver();assert.equal(c.record!.deviceId,stableDevice);
 assert.equal(c.record!.checkpoint.sessionId,'new-session');assert.equal(c.paused,false);assert.equal(await c.act({type:'work'}),true);
});
