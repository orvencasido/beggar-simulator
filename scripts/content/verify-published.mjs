// Privileged developer smoke: captures credentials in memory and publishes only the unchanged artifact.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const projectRef=process.env.SUPABASE_PROJECT_REF??'tjegdubzwwgfkcdaufle';
const url=process.env.SUPABASE_URL??`https://${projectRef}.supabase.co`;
let parsed;
try {const raw=execFileSync('npx',['supabase','projects','api-keys','--project-ref',projectRef,'--reveal','--output','json'],{encoding:'utf8',stdio:['ignore','pipe','pipe']});parsed=JSON.parse(raw);} catch {throw new Error('Credential retrieval failed; credential output suppressed.');}
const keys=Array.isArray(parsed)?parsed:parsed.api_keys??parsed.keys??[];
const privileged=process.env.SUPABASE_SERVICE_ROLE_KEY??keys.find(k=>k.type==='secret'&&k.name==='default')?.api_key;
const publicKey=keys.find(k=>k.type==='publishable')?.api_key??keys.find(k=>k.name==='anon')?.api_key;
assert.ok(privileged&&publicKey,'Required configured project credentials unavailable');
const canonical=(await readFile('game-content/build/catalog.json','utf8')).trim();
const catalog=JSON.parse(canonical),digest=createHash('sha256').update(canonical).digest('hex');
assert.equal(digest,(await readFile('game-content/build/digest.txt','utf8')).trim());
async function request(key,body){return fetch(url+'/functions/v1/game-content-publish',{method:'POST',headers:{apikey:key,authorization:'Bearer '+key,'content-type':'application/json'},body:JSON.stringify(body)});}
const publicDenied=await request(publicKey,{catalog,digest,activate:false});assert.equal(publicDenied.status,401,'Publicapikeymustbeexplicitlydenied');
const wrongDigest=await request(privileged,{catalog,digest:'0'.repeat(64),activate:false});assert.equal(wrongDigest.status,400,'Trustedpublishermuststillvalidateartifactdigest');
const verified=await request(privileged,{catalog,digest,activate:false});const response=await verified.json();assert.equal(verified.status,200,`Privileged publication failed: ${response.error??'unknown'}`);assert.equal(response.version,catalog.manifest.version);assert.equal(response.digest,digest);
console.log(`Hosted publisher verified: unchanged ${response.version} sha256:${digest}; public key denied, bad digest denied, privileged idempotent publication accepted. Activation unchanged; credentials never printed.`);
