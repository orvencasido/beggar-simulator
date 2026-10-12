import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';

const browser = await chromium.launch({ executablePath: '/usr/bin/chromium', args: ['--no-sandbox'] });
const context = await browser.newContext({ viewport: { width: 393, height: 851 }, isMobile: true });
const page = await context.newPage();
const errors = [];
page.on('pageerror', error => errors.push(error.message));
const requests = [];
let loseNext = false;
let settled;
await page.route('**/rest/v1/rpc/submit_actions', async route => {
  requests.push(JSON.parse(route.request().postData()));
  if (loseNext) {
    loseNext = false;
    const response = await route.fetch();
    settled = await response.json();
    await route.abort('failed');
  } else await route.continue();
});
const snapshot = () => page.evaluate(() => JSON.parse(localStorage.getItem('rags:cloud:snapshot:v1')));
try {
  await page.goto('http://127.0.0.1:8081', { waitUntil: 'networkidle', timeout: 90000 });
  await page.getByTestId('start-run').click();
  await page.getByTestId('work').waitFor();
  assert.ok(!(await page.locator('body').innerText()).includes('Practice mode'));
  await page.getByTestId('work').click();
  await page.waitForFunction(() => JSON.parse(localStorage.getItem('rags:cloud:snapshot:v1'))?.run.hunger === 99);
  const first = await snapshot();
  assert.ok(BigInt(first.run.money) >= 1n);

  loseNext = true;
  await page.getByTestId('work').click();
  const retry = page.getByRole('button', { name: 'Reconnect / retry', exact: true });
  await retry.waitFor();
  assert.ok(await retry.isEnabled(), 'Recovery remains available while gameplay is blocked');
  const uncertain = await page.evaluate(() => JSON.parse(localStorage.getItem('rags:cloud:uncertain:v1')));
  assert.ok(uncertain.requestId);
  const requestsBefore = requests.length;
  await retry.click();
  await page.waitForFunction(() => !localStorage.getItem('rags:cloud:uncertain:v1'));
  assert.equal(requests[requestsBefore].request_id, uncertain.requestId, 'Same request ID reused after lost response');
  assert.deepEqual((await snapshot()).run, settled.snapshot.run, 'No duplicate reward after retry');

  loseNext = true;
  await page.getByTestId('work').click();
  await retry.waitFor();
  const beforeReload = await page.evaluate(() => JSON.parse(localStorage.getItem('rags:cloud:uncertain:v1')));
  const countBeforeReload = requests.length;
  await page.reload({ waitUntil: 'networkidle' });
  await page.getByTestId('work').waitFor();
  await page.waitForFunction(() => !localStorage.getItem('rags:cloud:uncertain:v1'));
  assert.equal(requests[countBeforeReload].request_id, beforeReload.requestId);
  assert.deepEqual((await snapshot()).run, settled.snapshot.run, 'Restart resolves old uncertainty before enabling play');
  await page.screenshot({ path: '/tmp/beggar-game-preview/play-cloud.png', fullPage: true });
  assert.deepEqual(errors, []);
  console.log('PASS: cloud browser guest session, work, lost-response retry with original ID, persistent recovery after reload and zero duplicate rewards.');
} finally { await browser.close(); }
