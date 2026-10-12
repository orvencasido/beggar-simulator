/// <reference types="node" />
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { DemoEngine, emptySnapshot } from '../src/features/game/demo-engine';
import { formatMoney } from '../src/features/game/catalog';
import type { GameAction, GameSnapshot } from '../src/features/game/types';

function engineWith(patch: Partial<NonNullable<GameSnapshot['run']>> = {}) {
  const engine = new DemoEngine(emptySnapshot(), () => 0);
  const result = engine.execute({ operation: 'start', requestId: randomUUID() });
  result.snapshot.run = { ...result.snapshot.run!, ...patch };
  return new DemoEngine(result.snapshot, () => 0);
}
function submit(engine: DemoEngine, actions: GameAction[], requestId = randomUUID()) {
  const run = engine.snapshot().run!;
  return engine.execute({ operation: 'actions', requestId, runId: run.id, expectedRevision: run.revision, actions });
}
test('fatal work earns its last reward and stops before the following food', () => {
  const result = submit(engineWith({ hunger: 1, money: '10' }), [{ type: 'work' }, { type: 'eat', item_id: 'bread' }]);
  assert.equal(result.processed, 1);
  assert.equal(result.snapshot.run?.status, 'dead');
  assert.equal(result.snapshot.run?.money, '11');
  assert.equal(result.snapshot.summary.completedRuns, 1);
});
test('sanity zero reduces earnings and remains nonfatal', () => {
  const result = submit(engineWith({ sanity: 0, jobId: 'newspaper', equipment: ['bike'] }), [{ type: 'work' }]);
  assert.equal(result.snapshot.run?.money, '12');
  assert.equal(result.snapshot.run?.status, 'active');
});
test('an idempotent retry returns the same payout even after state changes', () => {
  const engine = engineWith(); const run = engine.snapshot().run!;
  const request = { operation: 'actions' as const, requestId: randomUUID(), runId: run.id, expectedRevision: run.revision, actions: [{ type: 'work' as const }] };
  const first = engine.execute(request); submit(engine, [{ type: 'work' }]);
  assert.deepEqual(engine.execute(request), first);
  assert.equal(engine.snapshot().run?.money, '2');
  assert.throws(() => engine.execute({ ...request, actions: [{ type: 'rest' }] }), /already been used/);
});
test('equipment unlocks work without selecting it, and cannot be bought twice', () => {
  const engine = engineWith({ money: '100' });
  const purchase = submit(engine, [{ type: 'buy_equipment', item_id: 'bike' }]);
  assert.equal(purchase.snapshot.run?.jobId, 'begging'); assert.equal(purchase.snapshot.run?.money, '0');
  assert.equal(submit(engine, [{ type: 'buy_equipment', item_id: 'bike' }]).stopReason, 'already_owned');
  assert.equal(submit(engine, [{ type: 'choose_job', job_id: 'newspaper' }]).snapshot.run?.jobId, 'newspaper');
});
test('maxed needs, insufficient funds and stale revisions do not mutate state', () => {
  const engine = engineWith({ money: '4' }); const before = engine.snapshot();
  assert.equal(submit(engine, [{ type: 'eat', item_id: 'bread' }]).stopReason, 'need_full');
  assert.equal(submit(engine, [{ type: 'rest' }]).stopReason, 'need_full');
  assert.equal(submit(engine, [{ type: 'buy_equipment', item_id: 'bike' }]).stopReason, 'insufficient_money');
  assert.deepEqual(engine.snapshot(), before);
  assert.equal(engine.execute({ operation: 'actions', requestId: randomUUID(), runId: before.run!.id, expectedRevision: 99, actions: [{ type: 'work' }] }).stopReason, 'revision_conflict');
});
test('restart resets run resources and preserves lifetime totals', () => {
  const engine = engineWith({ hunger: 1 }); submit(engine, [{ type: 'work' }]);
  const result = engine.execute({ operation: 'start', requestId: randomUUID() });
  assert.equal(result.snapshot.run?.money, '0'); assert.equal(result.snapshot.run?.hunger, 100);
  assert.equal(result.snapshot.summary.lifetimeEarned, '1'); assert.equal(result.snapshot.summary.completedRuns, 1);
});
test('worst-case begging pays for care and the first bike without starvation', () => {
  const engine = engineWith(); let work = 0;
  while (BigInt(engine.snapshot().run!.money) < 100n && work < 200) {
    const run = engine.snapshot().run!;
    if (run.hunger <= 25 && BigInt(run.money) >= 5n) submit(engine, [{ type: 'eat', item_id: 'bread' }]);
    else if (run.sanity < 50 && run.hunger > 2) submit(engine, [{ type: 'rest' }]);
    else { submit(engine, [{ type: 'work' }]); work += 1; }
    assert.equal(engine.snapshot().run?.status, 'active');
  }
  assert.ok(work < 160, `First bike required ${work} work actions`);
  assert.equal(submit(engine, [{ type: 'buy_equipment', item_id: 'bike' }]).processed, 1);
});
test('large money display never rounds through a floating point balance', () => {
  assert.equal(formatMoney('9007199254740993'), '9.0Q');
  const result = submit(engineWith({ money: '9007199254740993' }), [{ type: 'work' }]);
  assert.equal(result.snapshot.run?.money, '9007199254740994');
});
