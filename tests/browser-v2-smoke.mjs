import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, stat, mkdir } from 'node:fs/promises';
import { resolve, extname, join } from 'node:path';
import { chromium } from '@playwright/test';

// Tests an already exported bundle. This starts no Expo process and closes all resources.
const root = resolve(process.env.TEST_STATIC_DIR ?? 'dist-v2-demo');
const output = '/tmp/beggar-v2-preview';
await mkdir(output, {recursive:true});
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.svg':'image/svg+xml','.woff2':'font/woff2'};
const server=createServer(async(req,res)=>{
 try {
  const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  let file=resolve(root,`.${pathname}`);
  if(file!==root&&!file.startsWith(root+'/')){res.writeHead(403).end();return;}
  try {if((await stat(file)).isDirectory())file=join(file,'index.html');}catch{file=join(root,pathname.replace(/^\//,'')+'.html');}
  try {await stat(file);}catch{file=join(root,'index.html');}
  const content=await readFile(file);res.writeHead(200,{'content-type':types[extname(file)]??'application/octet-stream'}).end(content);
 }catch{res.writeHead(404).end('Not found');}
});
await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
const base=`http://127.0.0.1:${server.address().port}`;
let browser;
const key='rags:demo:lifetime:v2';
try {
 browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
 for(const width of [393,320]){
  const context=await browser.newContext({viewport:{width,height:851},isMobile:true,reducedMotion:'reduce'});
  const page=await context.newPage();const errors=[];let cloudRequests=0;
  page.on('pageerror',e=>errors.push(e.message));page.on('request',req=>{if(req.url().includes('supabase.co'))cloudRequests++;});
  const saved=()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)),key);
  const fixture=async patch=>{
   await page.evaluate(({key,patch})=>{const record=JSON.parse(localStorage.getItem(key));record.checkpoint.state={...record.checkpoint.state,...patch};record.journal=[];record.frozen=null;localStorage.setItem(key,JSON.stringify(record));},{key,patch});
   await page.goto(base,{waitUntil:'networkidle'});await page.getByTestId('work').waitFor();
  };
  await page.goto(base,{waitUntil:'networkidle'});await page.getByTestId('work').waitFor();
  assert.match(await page.locator('body').innerText(),/Practice/,'Export the fixture with EXPO_PUBLIC_GAME_MODE=demo');
  assert.equal((await saved()).checkpoint.state.elapsedDays,0);
  await page.getByTestId('work').click();
  await page.waitForFunction(key=>JSON.parse(localStorage.getItem(key)).checkpoint.state.elapsedDays===1,key);
  assert.ok(BigInt((await saved()).checkpoint.state.money)>=12n);
  assert.equal(cloudRequests,0,'Ordinary local actions must send no Supabase requests');
  assert.ok(await page.getByRole('progressbar',{name:/Hunger/}).count());
  assert.ok(await page.getByRole('progressbar',{name:/Sanity/}).count());
  await page.screenshot({path:`${output}/home-${width}-light.png`,fullPage:true});
  await page.emulateMedia({colorScheme:'dark'});await page.screenshot({path:`${output}/home-${width}-dark.png`,fullPage:true});
  await page.emulateMedia({colorScheme:'light'});
  await fixture({money:'500000',hunger:50,sanity:55,lifeWorkEarned:'500000',workEarned:'500000',workDays:220,elapsedDays:220});
  await page.getByTestId('eat-quick').click();await page.waitForFunction(key=>JSON.parse(localStorage.getItem(key)).checkpoint.state.elapsedDays===221,key);
  await page.getByTestId('rest').click();await page.waitForFunction(key=>JSON.parse(localStorage.getItem(key)).checkpoint.state.elapsedDays===222,key);
  await page.goto(`${base}/career`,{waitUntil:'networkidle'});await page.getByTestId('career-education').click();
  await page.getByTestId('enroll-computing_degree').click();await page.getByTestId('study').waitFor();
  assert.equal((await saved()).checkpoint.state.education.qualificationId,'computing_degree');
  await page.getByTestId('study').click();await page.waitForFunction(key=>JSON.parse(localStorage.getItem(key)).checkpoint.state.education.studyDays===1,key);
  await page.goto(`${base}/life`,{waitUntil:'networkidle'});await page.getByTestId('life-bank').click();
  await page.getByTestId('bank-amount').fill('1000');await page.getByTestId('deposit').click();
  await page.getByTestId('confirm-transfer').click();await page.waitForFunction(key=>JSON.parse(localStorage.getItem(key)).checkpoint.state.bank.balance==='1000',key);
  const daysBefore=(await saved()).checkpoint.state.elapsedDays;
  await page.getByTestId('withdraw').click();await page.getByTestId('confirm-transfer').click();
  await page.waitForFunction(key=>JSON.parse(localStorage.getItem(key)).checkpoint.state.bank.balance==='0',key);
  assert.equal((await saved()).checkpoint.state.elapsedDays,daysBefore,'Bank transfers must not advance days');
  await page.getByTestId('life-wants').click();await page.getByTestId('item-bike').click();await page.getByTestId('buy-bike').click();
  await page.waitForFunction(key=>JSON.parse(localStorage.getItem(key)).checkpoint.state.ownedItemIds.includes('bike'),key);
  await page.goto(`${base}/journey`,{waitUntil:'networkidle'});assert.match(await page.locator('body').innerText(),/Ambition|ambition|Milestone|milestone/);
  await page.goto(`${base}/leaders`,{waitUntil:'networkidle'});assert.match(await page.locator('body').innerText(),/Practice|rank|Rank/);
  assert.equal(cloudRequests,0);assert.deepEqual(errors,[]);await context.close();
 }
 console.log(JSON.stringify({passed:true,widths:[393,320],screenshots:output,expoStarted:false}));
} finally {await browser?.close();await new Promise(resolve=>server.close(resolve));}
