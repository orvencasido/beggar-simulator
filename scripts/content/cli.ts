import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { canonicalJson, validateCatalog, createGame, applyAction, getAge, jobUnlocked } from '../../src/game-core/index.ts';
import type { Catalog, GameAction } from '../../src/game-core/index.ts';
const sections=['manifest','careers','jobs','colleges','qualifications','items','goals','ambitions','opportunities','economy'];
export async function loadContent(directory='game-content'):Promise<Catalog>{const entries=await Promise.all(sections.map(async s=>[s,JSON.parse(await readFile(resolve(directory,s+'.json'),'utf8'))]));return validateCatalog(Object.fromEntries(entries));}
export function compileContent(catalog:Catalog){validateCatalog(catalog);const json=canonicalJson(catalog);return {catalog,digest:createHash('sha256').update(json).digest('hex'),json};}
export function simulateCatalog(catalog:Catalog,careerId='technology',seed=12345){
 let state=createGame(seed,catalog),steps=0;const e=catalog.economy;
 const targetJobs=catalog.jobs.filter(j=>j.careerId===careerId&&j.available).sort((a,b)=>Number(BigInt(a.baseEarnings)-BigInt(b.baseEarnings)));
 const targetQualification=targetJobs[0]?.requirements.qualificationIds[0];
 const q=catalog.qualifications.find(q=>q.id===targetQualification);
 while(state.status==='active'&&steps++<100000){
  const actions:GameAction[]=[];
  if(state.lifeWorkEarned!=='0'&&BigInt(state.lifeWorkEarned)>=BigInt(e.bankUnlockEarned)&&!state.bank.opened)actions.push({type:'bank_settings',auto_save:true,auto_withdraw:true,reserve:'200'});
  const ready=targetJobs.filter(j=>jobUnlocked(state,j));const best=ready.at(-1);
  if(best&&best.id!==state.jobId)actions.push({type:'choose_job',job_id:best.id});
  {for(const id of (careerId==='survival'?[]:['bike','delivery_kit',...new Set(targetJobs.flatMap(j=>j.requirements.itemIds))])){const item=catalog.items.find(i=>i.id===id);if(item&&!state.ownedItemIds.includes(id)&&BigInt(state.money)+BigInt(state.bank.balance)>=BigInt(item.price)+200n)actions.push({type:'buy_item',item_id:id});}
   const stepping=catalog.jobs.filter(j=>['survival','delivery','freelance'].includes(j.careerId)&&jobUnlocked(state,j)).sort((a,b)=>Number(BigInt(a.baseEarnings)-BigInt(b.baseEarnings))).at(-1);if(!best&&stepping&&stepping.id!==state.jobId)actions.push({type:'choose_job',job_id:stepping.id});
  }
  if(q&&!state.qualifications.includes(q.id)&&!state.education&&BigInt(state.money)+BigInt(state.bank.balance)>=BigInt(q.tuition)+200n)actions.push({type:'enroll',qualification_id:q.id,college_id:q.collegeIds[0]});
  for(const a of actions){const r=applyAction(state,a,catalog);if(r.accepted)state=r.state;}
  if(state.offer){const r=applyAction(state,{type:state.offer.jobId===state.jobId?'accept_contract':'decline_contract',offer_id:state.offer.id},catalog);if(r.accepted)state=r.state;}
  let action:GameAction;
  const basal=[...e.ageBands].reverse().find(b=>getAge(state,catalog)>=b.startAge)!.basalHunger;
  if(state.hunger<basal+12){const food=catalog.items.find(i=>i.id==='meal'&&i.effect==='food')??catalog.items.find(i=>i.effect==='food')!;action={type:'eat',item_id:food.id};}
  else if(state.sanity<55||state.health<5500)action={type:'rest'};
  else if(state.education&&state.elapsedDays%2===0)action={type:'study'};
  else action={type:'work'};
  let result=applyAction(state,action,catalog);
  if(!result.accepted&&action.type==='eat'){const cheap=catalog.items.filter(i=>i.effect==='food').sort((a,b)=>Number(BigInt(a.price)-BigInt(b.price)))[0];result=applyAction(state,{type:'eat',item_id:cheap.id},catalog);}
  if(!result.accepted)throw new Error(`Simulation ${careerId} rejected ${action.type}: ${result.reason}`);state=result.state;
 }
 if(state.status!=='age_limit')throw new Error(`Simulation ${careerId} failed survival at ${getAge(state)} (hunger ${state.hunger})`);
 const spent=Object.values(state.finance).reduce((a,b)=>a+BigInt(b),0n);if(BigInt(state.lifeWorkEarned)+BigInt(state.bank.interestEarned)+BigInt(state.opportunityIncome)-spent!==BigInt(state.money)+BigInt(state.bank.balance))throw new Error('Simulation conservation failure');
 return {careerId,seed,status:state.status,days:state.elapsedDays,age:getAge(state),workEarned:state.lifeWorkEarned,wallet:state.money,savings:state.bank.balance,interest:state.bank.interestEarned,opportunityIncome:state.opportunityIncome,qualifications:state.qualifications,jobId:state.jobId,workDays:state.workDays,finance:state.finance};
}
export function diffCatalog(before:Catalog,after:Catalog){const changes:unknown[]=[];for(const section of ['jobs','items','qualifications','colleges','careers','goals','ambitions','opportunities'] as const){const old=new Map(before[section].map(x=>[x.id,x]));for(const row of after[section]){const previous=old.get(row.id);if(!previous)changes.push({section,id:row.id,change:'added'});else if(canonicalJson(previous)!==canonicalJson(row))changes.push({section,id:row.id,change:'changed',before:previous,after:row});old.delete(row.id);}for(const id of old.keys())changes.push({section,id,change:'removed',warning:'Retire IDs rather than remove published historical records.'});}if(canonicalJson(before.economy)!==canonicalJson(after.economy))changes.push({section:'economy',change:'changed',before:before.economy,after:after.economy});return changes;}
async function main(){
 const command=process.argv[2]??'validate';const catalog=await loadContent(process.env.GAME_CONTENT_DIR??'game-content');const compiled=compileContent(catalog);
 if(command==='validate'){console.log(`Valid ${catalog.manifest.version}: ${catalog.jobs.length} jobs, ${catalog.qualifications.length} qualifications, ${catalog.items.length} items.`);return;}
 if(command==='compile'){await mkdir('game-content/build',{recursive:true});await writeFile('game-content/build/catalog.json',compiled.json+'\n');await writeFile('game-content/build/digest.txt',compiled.digest+'\n');await writeFile('src/game-core/catalog.generated.ts',"import type { Catalog } from './types.ts';\nexport const defaultCatalog: Catalog = "+JSON.stringify(catalog,null,2)+';\n');console.log(`Compiled ${catalog.manifest.version} sha256:${compiled.digest}`);return;}
 if(command==='simulate'){const simulations=['survival','delivery','technology','trades','business','healthcare','engineering','creative'].map(path=>simulateCatalog(catalog,path));await mkdir('game-content/build',{recursive:true});await writeFile('game-content/build/simulation.json',JSON.stringify({version:catalog.manifest.version,digest:compiled.digest,simulations},null,2)+'\n');console.log(JSON.stringify(simulations,null,2));return;}
 if(command==='diff'){const filename=process.argv[3];if(!filename)throw new Error('Pass the previous compiled catalog path.');const previous=validateCatalog(JSON.parse(await readFile(filename,'utf8')));console.log(JSON.stringify(diffCatalog(previous,catalog),null,2));return;}
 if(command==='publish'){
  const url=process.env.SUPABASE_URL,secret=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!url||!secret)throw new Error('Set trusted SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the developer environment. Never use EXPO_PUBLIC credentials for publication.');
  if(!process.argv.includes('--reviewed'))throw new Error('Publishing requires --reviewed after inspecting compilation, simulations and diff.');
  const response=await fetch(`${url}/functions/v1/game-content-publish`,{method:'POST',headers:{'content-type':'application/json','authorization':`Bearer ${secret}`,apikey:secret},body:JSON.stringify({catalog:compiled.catalog,digest:compiled.digest,activate:process.argv.includes('--activate')})});
  if(!response.ok)throw new Error(`Publication failed HTTP ${response.status}: ${await response.text()}`);console.log(await response.text());return;
 }
 throw new Error('Commands: validate | compile | simulate | diff <previous.json> | publish --reviewed [--activate]');
}
if(process.argv[1]?.endsWith('/cli.ts'))main().catch(error=>{console.error(error instanceof Error?error.message:'Content command failed');process.exitCode=1;});
