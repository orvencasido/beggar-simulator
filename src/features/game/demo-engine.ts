import { equipment, foods, getJob, sanityMultiplier, skillPrice } from './catalog';
import type { CommandRequest, CommandResult, GameSnapshot } from './types';

export function emptySnapshot(): GameSnapshot {
  return { run: null, version: 1, summary: { lifetimeEarned: '0', bestRunEarned: '0', completedRuns: 0 } };
}
/** Explicit local demonstration; never used to settle cloud rewards. */
function clone<T>(value: T): T { return JSON.parse(JSON.stringify(value)) as T; }
export class DemoEngine {
  private state: GameSnapshot;
  private receipts = new Map<string, { payload: string; response: CommandResult }>();
  constructor(snapshot = emptySnapshot(), private random = Math.random) { this.state = clone(snapshot); }
  snapshot(): GameSnapshot { return clone(this.state); }
  execute(request: CommandRequest): CommandResult {
    const payload = JSON.stringify(request);
    const previous = this.receipts.get(request.requestId);
    if (previous) {
      if (previous.payload !== payload) throw new Error('This request ID has already been used.');
      return clone(previous.response);
    }
    let processed = 0;
    let stopReason: string | undefined;
    if (request.operation === 'start') {
      if (!this.state.run || this.state.run.status === 'dead') {
        this.state.run = { id: request.requestId, status: 'active', money: '0', earned: '0', hunger: 100,
          sanity: 100, jobId: 'begging', skillLevel: 0, equipment: [], revision: 0, actions: 0 };
      }
      processed = 1;
    } else {
      const run = this.state.run;
      if (!run || run.id !== request.runId) stopReason = 'run_not_found';
      else if (run.revision !== request.expectedRevision) stopReason = 'revision_conflict';
      else if (run.status === 'dead') stopReason = 'run_ended';
      else {
        for (const action of request.actions ?? []) {
          switch (action.type) {
            case 'work': {
              const job = getJob(run.jobId);
              const base = run.jobId === 'begging' ? (this.random() < 0.9 ? 1 : 2)
                : run.jobId === 'freelancer' ? 100 + 10 * run.skillLevel : job.reward;
              const reward = BigInt(Math.max(1, Math.floor(base * sanityMultiplier(run.sanity) / 100)));
              run.money = (BigInt(run.money) + reward).toString();
              run.earned = (BigInt(run.earned) + reward).toString();
              this.state.summary.lifetimeEarned = (BigInt(this.state.summary.lifetimeEarned) + reward).toString();
              run.hunger = Math.max(0, run.hunger - job.hungerCost);
              run.sanity = Math.max(0, run.sanity - job.sanityCost);
              break;
            }
            case 'eat': {
              const food = foods.find(item => item.id === action.item_id);
              if (!food) { stopReason = 'invalid_item'; break; }
              if (run.hunger === 100) { stopReason = 'need_full'; break; }
              if (BigInt(run.money) < BigInt(food.price)) { stopReason = 'insufficient_money'; break; }
              run.money = (BigInt(run.money) - BigInt(food.price)).toString();
              run.hunger = Math.min(100, run.hunger + food.hunger);
              break;
            }
            case 'rest':
              if (run.sanity === 100) { stopReason = 'need_full'; break; }
              run.sanity = Math.min(100, run.sanity + 25);
              run.hunger = Math.max(0, run.hunger - 2);
              break;
            case 'buy_equipment': {
              const item = equipment.find(item => item.id === action.item_id);
              if (!item) { stopReason = 'invalid_item'; break; }
              if (run.equipment.includes(item.id)) { stopReason = 'already_owned'; break; }
              const index = equipment.indexOf(item);
              if (index > 0 && !run.equipment.includes(equipment[index - 1].id)) { stopReason = 'prerequisite_missing'; break; }
              if (BigInt(run.money) < BigInt(item.price)) { stopReason = 'insufficient_money'; break; }
              run.money = (BigInt(run.money) - BigInt(item.price)).toString();
              run.equipment.push(item.id);
              break;
            }
            case 'choose_job': {
              const job = getJob(action.job_id);
              if (job.requires.some(id => !run.equipment.includes(id))) { stopReason = 'job_locked'; break; }
              if (run.jobId === job.id) { stopReason = 'already_selected'; break; }
              run.jobId = job.id;
              break;
            }
            case 'buy_skill_level': {
              if (!run.equipment.includes('laptop')) { stopReason = 'job_locked'; break; }
              if (run.skillLevel >= 1_000_000) { stopReason = 'numeric_limit'; break; }
              const price = BigInt(skillPrice(run.skillLevel));
              if (BigInt(run.money) < price) { stopReason = 'insufficient_money'; break; }
              run.money = (BigInt(run.money) - price).toString();
              run.skillLevel += 1;
              break;
            }
          }
          if (stopReason) break;
          processed += 1;
          run.actions += 1;
          if (BigInt(run.earned) > BigInt(this.state.summary.bestRunEarned)) this.state.summary.bestRunEarned = run.earned;
          if (run.hunger === 0) { run.status = 'dead'; this.state.summary.completedRuns += 1; break; }
        }
        if (processed > 0) run.revision += 1;
      }
    }
    const response: CommandResult = { snapshot: this.snapshot(), processed, stopReason: stopReason ?? null, requestId: request.requestId };
    this.receipts.set(request.requestId, { payload, response: clone(response) });
    return response;
  }
}
