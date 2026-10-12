import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium} from '@playwright/test';
import {staticPreview} from './helpers/static-preview.mjs';

if(process.env.RUN_CLOUD_TESTS!=='1')throw new Error('Set RUN_CLOUD_TESTS=1 to authorize isolated guest saves in the configured Supabase project.');
const preview=await staticPreview(process.env.TEST_STATIC_DIR??'dist-v2-cloud');
let browser;
try{
 await mkdir('/tmp/beggar-v2-preview',{recursive:true});
 browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
 const context=await browser.newContext({viewport:{width:393,height:851},isMobile:true,reducedMotion:'reduce'});
 const page=await context.newPage();const errors=[];let syncCalls=0;let rpcHeaders;
 page.on('pageerror',e=>errors.push(e.message));page.on('request',req=>{if(req.url().includes('/functions/v1/game-sync')){syncCalls++;const headers=req.headers();rpcHeaders={apikey:headers.apikey,authorization:headers.authorization,'content-type':'application/json'};}});
 const saved=()=>page.evaluate(()=>{const key=Object.keys(localStorage).find(k=>/^rags:cloud:lifetime:v2:owner:[^:]+$/.test(k));return key?JSON.parse(localStorage.getItem(key)):null;});
 await page.goto(preview.url,{waitUntil:'networkidle'});
 const start=page.getByRole('button',{name:'Start your life',exact:true});
 const migration=page.getByTestId('acknowledge-migration');
 await start.or(migration).waitFor();
 if(await start.isVisible())await start.click();
 else {await migration.click();await migration.click();}
 await page.getByTestId('work').waitFor();assert.equal((await saved()).checkpoint.state.elapsedDays,0);
 const before=syncCalls;await page.getByTestId('work').click();
 await page.waitForFunction(()=>{const k=Object.keys(localStorage).find(k=>/^rags:cloud:lifetime:v2:owner:[^:]+$/.test(k));return k&&JSON.parse(localStorage.getItem(k)).journal.length===1;});
 assert.equal(syncCalls,before,'A tap must be local, with no per-tap game-sync request');
 let dropped=false;let dropCompleted=false;let firstEnvelope;
 await page.route('**/functions/v1/game-sync',async route=>{
  const body=route.request().postDataJSON();
  if(body.operation==='sync'&&!dropped){dropped=true;firstEnvelope=body;const response=await route.fetch();assert.ok(response.ok());dropCompleted=true;await route.abort('failed');return;}
  await route.continue();
 });
 await page.getByRole('button',{name:'Account and settings'}).click();await page.getByTestId('sync-now').click();
 await page.waitForFunction(()=>{const k=Object.keys(localStorage).find(k=>/^rags:cloud:lifetime:v2:owner:[^:]+$/.test(k));return k&&JSON.parse(localStorage.getItem(k)).frozen!==null;});
 // Wait until the dropped-response request has reached the real server and completed.
 for(let i=0;i<100&&!dropCompleted;i++)await page.waitForTimeout(100);
 assert.equal(dropCompleted,true);const frozen=(await saved()).frozen;assert.deepEqual(frozen,firstEnvelope);
 await page.unroute('**/functions/v1/game-sync');
 await page.goto(preview.url,{waitUntil:'networkidle'});await page.getByTestId('work').waitFor();
 await page.waitForFunction(()=>{const k=Object.keys(localStorage).find(k=>/^rags:cloud:lifetime:v2:owner:[^:]+$/.test(k));const r=k&&JSON.parse(localStorage.getItem(k));return r&&r.frozen===null&&r.journal.length===0;});
 const restored=await saved();assert.equal(restored.checkpoint.state.elapsedDays,1);assert.equal(restored.checkpoint.sequence,1);
 const rpc=async(name,body={})=>page.evaluate(async({name,body,headers})=>{
  const response=await fetch(`https://tjegdubzwwgfkcdaufle.supabase.co/rest/v1/rpc/${name}`,{method:'POST',headers,body:JSON.stringify(body)});
  const data=await response.json();if(!response.ok)throw new Error(data.message??'profile request failed');return data;
 },{name,body,headers:rpcHeaders});
 const own=await rpc('get_my_game_showcase');assert.equal(own.titleId,'begging');
 await rpc('update_game_showcase',{settings:{...own,titleId:null,visible:false}});
 assert.equal((await rpc('get_my_game_showcase')).titleId,null,'A deliberate Hide choice must override the automatic legacy title');
 await page.screenshot({path:'/tmp/beggar-v2-preview/cloud-recovered.png',fullPage:true});
 await page.goto(`${preview.url}/leaders`,{waitUntil:'networkidle'});assert.match(await page.locator('body').innerText(),/leader|rank|earning/i);
 assert.deepEqual(errors,[]);await context.close();
 console.log(JSON.stringify({passed:true,localTapNoRequest:true,lostResponseRecovery:true,legacyTitleDefaultAndHide:true,isolatedGuest:true,expoStarted:false}));
}finally{await browser?.close();await preview.close();}
