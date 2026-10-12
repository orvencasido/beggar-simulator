/// <reference types="node" />
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { after, before, test } from 'node:test';
import type { CommandResult, GameAction } from '../src/features/game/types';

// Disposable PostgreSQL engine. Auth is deliberately stubbed; production Auth,
// PostgREST, and multi-connection locking still require Supabase staging tests.
let db: PGlite;
const alice = '00000000-0000-4000-8000-000000000001';
const bob = '00000000-0000-4000-8000-000000000002';

before(async () => {
  db = new PGlite();
  await db.exec(`
    create role anon nologin;
    create role authenticated nologin;
    create role service_role nologin bypassrls;
    create schema auth;
    create table auth.users (id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
    $$;
    grant usage on schema auth, public to anon, authenticated;
    grant execute on function auth.uid() to anon, authenticated;
    insert into auth.users values ('${alice}'), ('${bob}');
  `);
  const dir = resolve('supabase/migrations');
  for (const file of (await readdir(dir)).filter((f) => f.endsWith('.sql')).sort()) {
    await db.exec(await readFile(resolve(dir, file), 'utf8'));
  }
});
after(async () => { await db?.close(); });

async function asUser<T>(user: string, operation: () => Promise<T>): Promise<T> {
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [user]);
  await db.exec('set role authenticated');
  try { return await operation(); }
  finally { await db.exec('reset role'); }
}

async function rpc<T>(sql: string, params: unknown[] = []): Promise<T> {
  const result = await db.query<{ result: T }>(sql, params);
  return result.rows[0].result;
}

const start = (user: string, requestId: string = randomUUID()) => asUser(user, () =>
  rpc<CommandResult>('select public.start_run($1::uuid) as result', [requestId]));

const actions = (user: string, runId: string, revision: number,
  intents: GameAction[], requestId: string = randomUUID()) => asUser(user, () =>
  rpc<CommandResult>(`select public.submit_actions($1::uuid, $2::uuid,
    $3::integer, $4::jsonb) as result`, [runId, requestId, revision, JSON.stringify(intents)]));

test('migration initializes an authenticated run and records start replay', async () => {
  const id = randomUUID();
  const first = await start(alice, id);
  assert.equal(first.snapshot.run?.money, '0');
  assert.equal(first.snapshot.run?.hunger, 100);
  assert.equal(first.snapshot.run?.sanity, 100);
  assert.deepEqual(await start(alice, id), first);
  const second = await start(alice);
  assert.equal(second.snapshot.run?.id, first.snapshot.run?.id);
  assert.equal((await db.query('select id from game_private.runs where user_id = $1 and status = \'active\'', [alice])).rows.length, 1);
});

test('unauthenticated RPC access and private table access are denied', async () => {
  await db.exec('set role anon');
  try {
    await assert.rejects(db.query('select public.get_game_snapshot()'), /permission denied/);
    await assert.rejects(db.query('select public.start_run($1::uuid)', [randomUUID()]), /permission denied/);
  } finally { await db.exec('reset role'); }
  await asUser(alice, async () => {
    await assert.rejects(db.query('select * from game_private.runs'), /permission denied/);
    await assert.rejects(db.query('update game_private.runs set money = 999999'), /permission denied/);
    await assert.rejects(db.query('select * from game_private.receipts'), /permission denied/);
    await assert.rejects(db.query('update game_private.catalogs set version = 42'), /permission denied/);
  });
});

test('one owner cannot submit actions to another owner run', async () => {
  const a = await start(alice);
  const b = await start(bob);
  assert.notEqual(a.snapshot.run?.id, b.snapshot.run?.id);
  const run = a.snapshot.run!;
  await assert.rejects(actions(bob, run.id, run.revision, [{ type: 'work' }]), /run_not_found/);
  assert.deepEqual((await start(alice)).snapshot.run, run);
});

test('retry keeps random reward, revision and summary exactly once', async () => {
  const current = (await start(alice)).snapshot.run!;
  const id = randomUUID();
  const first = await actions(alice, current.id, current.revision, [{ type: 'work' }], id);
  assert.equal(first.processed, 1);
  assert.equal(first.snapshot.run!.revision, current.revision + 1);
  const reward = BigInt(first.snapshot.run!.money) - BigInt(current.money);
  assert.ok(reward >= 1n && reward <= 2n);
  assert.deepEqual(await actions(alice, current.id, current.revision, [{ type: 'work' }], id), first);
  assert.equal(first.snapshot.summary.lifetimeEarned, first.snapshot.run!.earned);
  await assert.rejects(actions(alice, current.id, current.revision, [{ type: 'rest' }], id), /request_id_reused/);
  await assert.rejects(start(alice, id), /request_id_reused/);
});

test('stale revisions and structurally invalid actions cannot mutate state', async () => {
  const current = (await start(alice)).snapshot.run!;
  const conflict = await actions(alice, current.id, current.revision - 1, [{ type: 'work' }]);
  assert.equal(conflict.processed, 0);
  assert.equal(conflict.stopReason, 'revision_conflict');
  assert.deepEqual(conflict.snapshot.run, current);
  const malformed = [{ type: 'work' }, { type: 'set_money', money: '999' }] as unknown as GameAction[];
  await assert.rejects(actions(alice, current.id, current.revision, malformed));
  const forged = [{ type: 'work', reward: '999999' }] as unknown as GameAction[];
  await assert.rejects(actions(alice, current.id, current.revision, forged), /invalid_action/);
  assert.deepEqual((await start(alice)).snapshot.run, current);
});

test('every private game table uses RLS and RPCs pin their search path', async () => {
  const tables = await db.query<{ relname: string; relrowsecurity: boolean }>(`
    select relname, relrowsecurity from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'game_private' and c.relkind = 'r'`);
  assert.ok(tables.rows.length >= 5);
  for (const table of tables.rows) assert.equal(table.relrowsecurity, true, table.relname);
  const funcs = await db.query<{ proname: string; prosecdef: boolean; proconfig: string[] }>(`
    select proname, prosecdef, proconfig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and proname in ('start_run','submit_actions','get_game_snapshot')`);
  assert.equal(funcs.rows.length, 3);
  for (const fn of funcs.rows) {
    assert.equal(fn.prosecdef, true, fn.proname);
    assert.ok(fn.proconfig.some((config) => /^search_path=(""|)$/.test(config)), fn.proname);
  }
});

async function fixtureRun(runId: string, updates: Record<string, unknown>) {
  const entries = Object.entries(updates);
  // Test-owned column allowlist prevents accidental identifier interpolation.
  const allowed = new Set(['hunger', 'sanity', 'money', 'skill_level', 'job_id']);
  for (const [column] of entries) assert.ok(allowed.has(column));
  await db.query(`update game_private.runs set ${entries.map(([column], i) =>
    `${column} = $${i + 2}`).join(', ')} where id = $1::uuid`,
  [runId, ...entries.map(([, value]) => value)]);
}

test('hunger zero ends the run, skips later food, and replay survives restart', async () => {
  const current = (await start(bob)).snapshot.run!;
  await fixtureRun(current.id, { hunger: 1, money: '100' });
  const id = randomUUID();
  const intents: GameAction[] = [{ type: 'work' }, { type: 'eat', item_id: 'meal' }];
  const fatal = await actions(bob, current.id, current.revision, intents, id);
  assert.equal(fatal.processed, 1);
  assert.equal(fatal.snapshot.run!.hunger, 0);
  assert.equal(fatal.snapshot.run!.status, 'dead');
  assert.ok(BigInt(fatal.snapshot.run!.money) >= 101n);
  assert.equal(fatal.snapshot.summary.completedRuns, 1);
  const restarted = await start(bob);
  assert.notEqual(restarted.snapshot.run!.id, current.id);
  assert.equal(restarted.snapshot.run!.money, '0');
  assert.deepEqual(await actions(bob, current.id, current.revision, intents, id), fatal);
  await assert.rejects(actions(bob, restarted.snapshot.run!.id, 0, [{ type: 'work' }], id), /request_id_reused/);
});

test('sanity zero is nonfatal and low sanity still rewards work', async () => {
  const current = (await start(bob)).snapshot.run!;
  await fixtureRun(current.id, { sanity: 0 });
  const result = await actions(bob, current.id, current.revision, [{ type: 'work' }]);
  assert.equal(result.processed, 1);
  assert.equal(result.snapshot.run!.status, 'active');
  assert.equal(result.snapshot.run!.sanity, 0);
  assert.equal(result.snapshot.run!.money, '1');
});

test('food/rest cap needs and full needs reject without charging', async () => {
  const current = (await start(bob)).snapshot.run!;
  await fixtureRun(current.id, { hunger: 90, sanity: 90, money: '100' });
  const fed = await actions(bob, current.id, current.revision, [{ type: 'eat', item_id: 'meal' }]);
  assert.equal(fed.snapshot.run!.hunger, 100);
  assert.equal(fed.snapshot.run!.money, '85');
  const refused = await actions(bob, current.id, fed.snapshot.run!.revision, [{ type: 'eat', item_id: 'bread' }]);
  assert.equal(refused.processed, 0);
  assert.equal(refused.snapshot.run!.money, '85');
  const rested = await actions(bob, current.id, refused.snapshot.run!.revision, [{ type: 'rest' }]);
  assert.equal(rested.snapshot.run!.sanity, 100);
  assert.equal(rested.snapshot.run!.hunger, 98);
  const restingFull = await actions(bob, current.id, rested.snapshot.run!.revision, [{ type: 'rest' }]);
  assert.equal(restingFull.processed, 0);
  assert.equal(restingFull.snapshot.run!.hunger, 98);
});

test('equipment debit is idempotent, selection is separate, and upgrades continue', async () => {
  const current = (await start(bob)).snapshot.run!;
  await fixtureRun(current.id, { money: '10000' });
  const id = randomUUID();
  const purchase: GameAction[] = [{ type: 'buy_equipment', item_id: 'bike' }];
  const bought = await actions(bob, current.id, current.revision, purchase, id);
  assert.equal(bought.snapshot.run!.money, '9900');
  assert.equal(bought.snapshot.run!.jobId, 'begging');
  assert.deepEqual(bought.snapshot.run!.equipment, ['bike']);
  assert.deepEqual(await actions(bob, current.id, current.revision, purchase, id), bought);
  const advanced = await actions(bob, current.id, bought.snapshot.run!.revision, [
    { type: 'choose_job', job_id: 'newspaper' },
    { type: 'buy_equipment', item_id: 'delivery_kit' },
    { type: 'buy_equipment', item_id: 'laptop' },
    { type: 'choose_job', job_id: 'freelancer' },
    { type: 'buy_skill_level' },
  ]);
  assert.equal(advanced.processed, 5);
  assert.equal(advanced.snapshot.run!.skillLevel, 1);
  assert.equal(advanced.snapshot.run!.money, '6700');
  await fixtureRun(current.id, { sanity: 100 });
  const earned = await actions(bob, current.id, advanced.snapshot.run!.revision, [{ type: 'work' }]);
  assert.equal(earned.snapshot.run!.money, '6810');
});

test('gameplay failure commits accepted prefix and records zero-action failures', async () => {
  const current = (await start(alice)).snapshot.run!;
  await fixtureRun(current.id, { money: '5', hunger: 50 });
  const partial = await actions(alice, current.id, current.revision, [
    { type: 'eat', item_id: 'bread' }, { type: 'buy_equipment', item_id: 'bike' }, { type: 'rest' },
  ]);
  assert.equal(partial.processed, 1);
  assert.equal(partial.stopReason, 'insufficient_money');
  assert.equal(partial.snapshot.run!.money, '0');
  assert.equal(partial.snapshot.run!.hunger, 75);
  const id = randomUUID();
  const denied = await actions(alice, current.id, partial.snapshot.run!.revision,
    [{ type: 'buy_equipment', item_id: 'bike' }], id);
  await fixtureRun(current.id, { money: '100' });
  assert.deepEqual(await actions(alice, current.id, partial.snapshot.run!.revision,
    [{ type: 'buy_equipment', item_id: 'bike' }], id), denied);
});

test('compacted receipts remain tombstones across operation kinds', async () => {
  const current = (await start(alice)).snapshot.run!;
  const id = randomUUID();
  await actions(alice, current.id, current.revision, [{ type: 'work' }], id);
  await db.query('update game_private.receipts set response = null where user_id = $1 and request_id = $2', [alice, id]);
  await assert.rejects(actions(alice, current.id, current.revision, [{ type: 'work' }], id), /receipt_expired/);
  await assert.rejects(start(alice, id), /request_id_reused/);
});

test('owner rate budget stops work prefix without consuming remaining needs', async () => {
  const current = (await start(alice)).snapshot.run!;
  await fixtureRun(current.id, { hunger: 100, sanity: 100 });
  await db.query("update game_private.rate_state set tokens = 8, updated_at = clock_timestamp() where user_id = $1", [alice]);
  const intents = Array.from({ length: 20 }, (): GameAction => ({ type: 'work' }));
  const result = await actions(alice, current.id, current.revision, intents);
  assert.equal(result.processed, 8);
  assert.equal(result.stopReason, 'rate_limited');
  assert.equal(result.snapshot.run!.hunger, 92);
  const replay = await actions(alice, current.id, current.revision, intents, result.requestId);
  assert.deepEqual(replay, result);
});

test('finite and exact monetary storage rejects NaN and overflow safely', async () => {
  const current = (await start(alice)).snapshot.run!;
  await assert.rejects(fixtureRun(current.id, { money: 'NaN' }), /check constraint/);
  await assert.rejects(fixtureRun(current.id, { money: '-1' }), /check constraint/);
  await assert.rejects(db.query("update game_private.profiles set lifetime_earned = 'NaN' where user_id = $1", [alice]), /check constraint/);
  await assert.rejects(db.query("update game_private.profiles set best_run_earned = 'NaN' where user_id = $1", [alice]), /check constraint/);
  const large = '900719925474099312345';
  await fixtureRun(current.id, { money: large });
  const snapshot = await asUser(alice, () => rpc<{ run: { money: string } }>('select public.get_game_snapshot() as result'));
  assert.equal(snapshot.run.money, large);
  const limit = '9'.repeat(60);
  await fixtureRun(current.id, { money: limit });
  await db.query('update game_private.rate_state set tokens = 8, updated_at = clock_timestamp() where user_id = $1', [alice]);
  const result = await actions(alice, current.id, current.revision, [{ type: 'work' }]);
  assert.equal(result.processed, 0);
  assert.equal(result.stopReason, 'numeric_limit');
  assert.equal(result.snapshot.run!.money, limit);
  assert.equal(result.snapshot.run!.revision, current.revision);
  await assert.rejects(db.query('update game_private.catalogs set config = config'), /catalog_immutable/);
});
