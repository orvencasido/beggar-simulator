import type { EquipmentId, FoodId, GameRun, JobId } from './types';

export interface Job {
  id: JobId; name: string; actionLabel: string; description: string;
  reward: number; hungerCost: number; sanityCost: number; requires: EquipmentId[];
}
export const jobs: Job[] = [
  { id: 'begging', name: 'Begging', actionLabel: 'Ask for help', description: 'Every small kindness is a beginning.', reward: 1, hungerCost: 1, sanityCost: 1, requires: [] },
  { id: 'newspaper', name: 'Newspaper delivery', actionLabel: 'Deliver papers', description: 'A bike. A morning route. A fresh start.', reward: 20, hungerCost: 2, sanityCost: 1, requires: ['bike'] },
  { id: 'courier', name: 'Food courier', actionLabel: 'Make a delivery', description: 'Turn your city knowledge into opportunity.', reward: 50, hungerCost: 3, sanityCost: 2, requires: ['bike', 'delivery_kit'] },
  { id: 'freelancer', name: 'Freelancer', actionLabel: 'Finish a project', description: 'Build a living on your own terms.', reward: 100, hungerCost: 4, sanityCost: 2, requires: ['delivery_kit', 'laptop'] },
];
export const equipment: { id: EquipmentId; name: string; price: string; unlocks: JobId; description: string }[] = [
  { id: 'bike', name: 'A secondhand bike', price: '100', unlocks: 'newspaper', description: 'Your first way forward.' },
  { id: 'delivery_kit', name: 'Delivery kit', price: '500', unlocks: 'courier', description: 'A sturdy bag for bigger opportunities.' },
  { id: 'laptop', name: 'A reliable laptop', price: '2500', unlocks: 'freelancer', description: 'A little desk. A world of possibility.' },
];
export const foods: { id: FoodId; name: string; price: string; hunger: number }[] = [
  { id: 'bread', name: 'Bread', price: '5', hunger: 25 },
  { id: 'meal', name: 'Warm meal', price: '15', hunger: 80 },
];
export const catalog = { jobs, equipment, foods, version: 1 };
export function getJob(id: JobId): Job { return jobs.find(job => job.id === id) ?? jobs[0]; }
export function sanityMultiplier(sanity: number): number { return sanity >= 50 ? 100 : sanity >= 20 ? 80 : 60; }
export function workReward(run: GameRun): number {
  const base = run.jobId === 'freelancer' ? 100 + 10 * run.skillLevel : getJob(run.jobId).reward;
  return Math.max(1, Math.floor(base * sanityMultiplier(run.sanity) / 100));
}
export function skillPrice(level: number): string { return (200n * BigInt(level + 1) ** 2n).toString(); }
export function formatMoney(value: string): string {
  const amount = BigInt(value);
  const scales = [[10n ** 18n, 'Qi'], [10n ** 15n, 'Q'], [10n ** 12n, 'T'], [10n ** 9n, 'B'], [10n ** 6n, 'M']] as const;
  for (const [scale, suffix] of scales) {
    if (amount >= scale) return `${amount / scale}.${(amount % scale) * 10n / scale}${suffix}`;
  }
  return amount.toLocaleString('en-US');
}
