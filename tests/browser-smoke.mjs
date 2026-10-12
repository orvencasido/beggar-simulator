import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

const output = '/tmp/beggar-game-preview';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ executablePath: '/usr/bin/chromium', args: ['--no-sandbox'] });
const context = await browser.newContext({ viewport: { width: 393, height: 851 }, isMobile: true, reducedMotion: 'reduce' });
const page = await context.newPage();
const errors = [];
page.on('pageerror', error => errors.push(error.message));
const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:8081';
const saved = () => page.evaluate(() => JSON.parse(localStorage.getItem('rags:demo:v1')));
async function fixture(patch) {
  await page.evaluate(patch => {
    const state = JSON.parse(localStorage.getItem('rags:demo:v1'));
    state.run = { ...state.run, ...patch };
    localStorage.setItem('rags:demo:v1', JSON.stringify(state));
  }, patch);
  await page.goto(base, { waitUntil: 'networkidle' });
  await page.getByTestId('work').waitFor();
}
try {
  await page.goto(base, { waitUntil: 'networkidle', timeout: 90000 });
  assert.match(await page.locator('body').innerText(), /Practice mode/, 'Run this test against an EXPO_PUBLIC_GAME_MODE=demo preview');
  await page.getByTestId('start-run').click();
  await page.getByTestId('work').waitFor();
  assert.equal((await saved()).run.hunger, 100);
  await page.getByTestId('work').click({ clickCount: 3 });
  await page.waitForFunction(() => JSON.parse(localStorage.getItem('rags:demo:v1'))?.run.hunger === 97);
  assert.ok(BigInt((await saved()).run.money) >= 3n);
  await page.screenshot({ path: `${output}/play-light.png`, fullPage: true });

  await fixture({ money: '110', hunger: 60, sanity: 70 });
  await page.goto(`${base}/shop`, { waitUntil: 'networkidle' });
  await page.getByTestId('buy-bike').click();
  await page.waitForFunction(() => JSON.parse(localStorage.getItem('rags:demo:v1')).run.equipment.includes('bike'));
  assert.equal((await saved()).run.money, '10');
  assert.equal((await saved()).run.jobId, 'begging');
  await page.goto(`${base}/jobs`, { waitUntil: 'networkidle' });
  await page.getByTestId('choose-newspaper').click();
  await page.waitForFunction(() => JSON.parse(localStorage.getItem('rags:demo:v1')).run.jobId === 'newspaper');
  await page.goto(base, { waitUntil: 'networkidle' });
  await page.getByTestId('work').click();
  await page.waitForFunction(() => JSON.parse(localStorage.getItem('rags:demo:v1')).run.money === '30');
  assert.equal((await saved()).run.hunger, 58);
  await page.getByRole('button', { name: /^Rest\./ }).click();
  await page.waitForFunction(() => JSON.parse(localStorage.getItem('rags:demo:v1')).run.sanity === 94);
  assert.equal((await saved()).run.hunger, 56);
  await page.goto(`${base}/shop`, { waitUntil: 'networkidle' });
  await page.getByTestId('eat-bread').click();
  await page.waitForFunction(() => JSON.parse(localStorage.getItem('rags:demo:v1')).run.hunger === 81);
  assert.equal((await saved()).run.money, '25');
  await page.screenshot({ path: `${output}/shop-light.png`, fullPage: true });
  await page.goto(`${base}/jobs`, { waitUntil: 'networkidle' });
  await page.screenshot({ path: `${output}/jobs-light.png`, fullPage: true });
  await page.goto(base, { waitUntil: 'networkidle' });
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.screenshot({ path: `${output}/play-dark.png`, fullPage: true });
  await page.setViewportSize({ width: 320, height: 568 });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= 320), 'No horizontal overflow on compact phone');
  await page.getByTestId('work').scrollIntoViewIfNeeded();
  assert.ok(await page.getByTestId('work').isVisible());

  await fixture({ jobId: 'begging', hunger: 4, sanity: 50, money: '25' });
  await page.getByTestId('work').click({ clickCount: 3 });
  await page.getByRole('button', { name: /^Rest\./ }).click();
  await page.getByText('Your pending work used the remaining hunger. Eat first, or review the warning before resting again.').waitFor();
  assert.equal((await saved()).run.status, 'active', 'Queued work must not turn an unconfirmed rest into death');
  assert.equal((await saved()).run.hunger, 1);

  await fixture({ jobId: 'newspaper', hunger: 2, money: '25', sanity: 90 });
  await page.getByTestId('work').click();
  await page.getByRole('button', { name: 'Work anyway', exact: true }).waitFor();
  assert.equal((await saved()).run.status, 'active');
  await page.getByRole('button', { name: 'Work anyway', exact: true }).click();
  await page.getByTestId('restart-run').waitFor();
  const ended = await saved();
  assert.equal(ended.run.hunger, 0);
  assert.equal(ended.run.status, 'dead');
  await page.screenshot({ path: `${output}/game-over-dark.png`, fullPage: true });
  await page.getByTestId('restart-run').click();
  await page.getByTestId('work').waitFor();
  const restarted = await saved();
  assert.equal(restarted.run.money, '0');
  assert.equal(restarted.run.hunger, 100);
  assert.equal(restarted.summary.lifetimeEarned, ended.summary.lifetimeEarned);
  await page.reload({ waitUntil: 'networkidle' });
  await page.getByTestId('work').waitFor();
  assert.equal((await saved()).run.id, restarted.run.id);
  await page.goto(`${base}/settings`, { waitUntil: 'networkidle' });
  await page.getByText('Every step adds up.').waitFor();
  assert.deepEqual(errors, [], 'No browser runtime errors');
  console.log('PASS: mobile UI start, batched work, equipment/job unlock, care, death confirmation, restart, persistence, compact layout and light/dark screens.');
  console.log(`Screenshots: ${output}`);
} finally { await browser.close(); }
