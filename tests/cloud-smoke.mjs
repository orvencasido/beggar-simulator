import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

// Opt-in live integration: creates isolated guest saves, never touches existing users.
const config = {};
for (const line of (await readFile('.env.local', 'utf8')).split('\n')) {
  const match = line.match(/^(EXPO_PUBLIC_SUPABASE_(?:URL|PUBLISHABLE_KEY))=(.*)$/);
  if (match) config[match[1]] = match[2].trim().replace(/^['"]|['"]$/g, '');
}
const url = config.EXPO_PUBLIC_SUPABASE_URL;
const key = config.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
assert.equal(url, 'https://tjegdubzwwgfkcdaufle.supabase.co', 'Live smoke target must be explicit');
assert.ok(key);
function client() { return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } }); }
const owner = client(); const other = client();
for (const auth of [owner, other]) {
  const { error } = await auth.auth.signInAnonymously();
  assert.equal(error, null, error?.message);
}
async function rpc(name, args) {
  const { data, error } = await owner.rpc(name, args);
  assert.equal(error, null, error?.message);
  return data;
}
const startId = randomUUID();
const start = await rpc('start_run', { request_id: startId });
assert.deepEqual(await rpc('start_run', { request_id: startId }), start);
const run = start.snapshot.run;
const request = { run_id: run.id, request_id: randomUUID(), expected_revision: run.revision, actions: [{ type: 'work' }] };
const [first, competitor] = await Promise.all([
  rpc('submit_actions', request), rpc('submit_actions', { ...request, request_id: randomUUID() }),
]);
assert.deepEqual([first.processed, competitor.processed].sort(), [0, 1]);
const accepted = first.processed === 1 ? first : competitor;
assert.equal(accepted.snapshot.run.hunger, 99);
const retry = await rpc('submit_actions', request);
assert.deepEqual(retry, first, 'Lost-response retry returns exact original receipt');
const crossOwner = await other.rpc('submit_actions', { ...request, request_id: randomUUID() });
assert.ok(crossOwner.error, 'Another owner cannot use the run');
const snapshot = await rpc('get_game_snapshot');
assert.equal(snapshot.run.revision, 1);
assert.equal(snapshot.run.money, accepted.snapshot.run.money);
assert.equal(snapshot.summary.lifetimeEarned, accepted.snapshot.run.money);
const anon = client();
assert.ok((await anon.rpc('get_game_snapshot')).error, 'Unauthenticated RPC denied');

// Reach the first unlock using actual server costs/rate budget, with no fixture writes.
let state = snapshot;
let work = 1;
async function action(actions) {
  const response = await rpc('submit_actions', { run_id: state.run.id, request_id: randomUUID(), expected_revision: state.run.revision, actions });
  state = response.snapshot;
  assert.equal(state.run.status, 'active');
  return response;
}
while (BigInt(state.run.money) < 100n && work < 200) {
  if (state.run.hunger <= 25 && BigInt(state.run.money) >= 5n) await action([{ type: 'eat', item_id: 'bread' }]);
  else if (state.run.sanity < 50 && state.run.hunger > 2) await action([{ type: 'rest' }]);
  else {
    const result = await action(Array.from({ length: Math.min(4, state.run.hunger - 1) }, () => ({ type: 'work' })));
    work += result.processed;
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}
assert.ok(work < 200);
assert.equal((await action([{ type: 'buy_equipment', item_id: 'bike' }])).processed, 1);
assert.ok(state.run.equipment.includes('bike'));
assert.equal(state.run.jobId, 'begging');
assert.equal((await action([{ type: 'choose_job', job_id: 'newspaper' }])).processed, 1);
const money = BigInt(state.run.money);
await new Promise(resolve => setTimeout(resolve, 300));
assert.equal((await action([{ type: 'work' }])).processed, 1);
assert.equal(BigInt(state.run.money) - money, 20n);
console.log(`PASS: hosted guest Auth, RPCs, two simultaneous connections, exact retry, owner isolation, first-bike progression (${work} work actions), job switch and 20-money delivery.`);
await Promise.all([owner.auth.signOut(), other.auth.signOut()]);
