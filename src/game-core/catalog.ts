import type { Catalog } from './types.ts';
export { defaultCatalog } from './catalog.generated.ts';
export const MONEY_LIMIT = 10n ** 60n;
export const isMoney = (value: unknown): value is string => typeof value === 'string' && /^(0|[1-9]\d{0,59})$/.test(value);
const icons = new Set(['briefcase','school','home','car','bag','flag','heart','watch','shirt','music','plane','bank']);
const categories = new Set(['food','housing','vehicles','motorcycles','equipment','technology','jewelry','fashion','furnishings','hobbies','travel','collections','luxury']);
function fail(path:string, message:string):never { throw new Error(`${path}: ${message}`); }
function object(value:unknown,path:string):Record<string,unknown> {if(!value||typeof value!=='object'||Array.isArray(value))fail(path,'expected object');return value as Record<string,unknown>;}
function keys(value:unknown,path:string,required:string[],optional:string[]=[]):Record<string,unknown> {const o=object(value,path);for(const k of required)if(!(k in o))fail(`${path}.${k}`,'required');for(const k of Object.keys(o))if(!required.includes(k)&&!optional.includes(k))fail(`${path}.${k}`,'unknown field');return o;}
function text(v:unknown,p:string,max=120){if(typeof v!=='string'||v.length>max||!v.trim())fail(p,'expected nonempty bounded text');}
function id(v:unknown,p:string){if(typeof v!=='string'||(!/^[a-z][a-z0-9_]{0,63}$/.test(v)||['constructor','prototype','toString','hasOwnProperty'].includes(v)))fail(p,'expected stable lowercase ID');}
function integer(v:unknown,p:string,min=0,max=100000){if(typeof v!=='number'||!Number.isSafeInteger(v)||v<min||v>max)fail(p,`expected integer ${min}..${max}`);}
function money(v:unknown,p:string){if(!isMoney(v))fail(p,'expected nonnegative whole-unit decimal string (max60 digits)');}
function array(v:unknown,p:string):unknown[]{if(!Array.isArray(v)||v.length>512)fail(p,'expected bounded array');return v;}
function refs(v:unknown,p:string,set:Set<string>){const a=array(v,p);const seen=new Set();for(const x of a){id(x,p);if(!set.has(x as string))fail(p,`missing reference ${x}`);if(seen.has(x))fail(p,'duplicate reference');seen.add(x);}}
function named(v:unknown,p:string,extra:string[],optional:string[]=[]){const o=keys(v,p,['id','name','available','icon',...extra],optional);id(o.id,`${p}.id`);text(o.name,`${p}.name`);if(typeof o.available!=='boolean')fail(p,'available must be boolean');if(!icons.has(o.icon as string))fail(p,'unsupported asset/icon');return o;}
export function validateCatalog(value:unknown):Catalog {
 const root=keys(value,'catalog',['manifest','careers','jobs','colleges','qualifications','items','goals','ambitions','opportunities','economy']);
 const m=keys(root.manifest,'manifest',['version','schemaVersion','engineVersion','releaseNotes']);id(m.version,'manifest.version');if(m.schemaVersion!==2||m.engineVersion!==2)fail('manifest','unsupported schema/engine version');text(m.releaseNotes,'manifest.releaseNotes',4000);
 const collections=['careers','jobs','colleges','qualifications','items','goals','ambitions','opportunities'];
 const sets:Record<string,Set<string>>={};
 for(const name of collections){const s=new Set<string>();for(const [i,x] of array(root[name],name).entries()){const o=object(x,`${name}[${i}]`);id(o.id,`${name}[${i}].id`);if(s.has(o.id as string))fail(name,`duplicate ID ${o.id}`);s.add(o.id as string);}sets[name]=s;}
 for(const [i,x] of (root.careers as unknown[]).entries())named(x,`careers[${i}]`,[]);
 for(const [i,x] of (root.jobs as unknown[]).entries()){
  const p=`jobs[${i}]`,o=named(x,p,['careerId','baseEarnings','maxEarnings','hungerStrain','sanityCost','requirements']);
  refs([o.careerId],p+'.careerId',sets.careers);money(o.baseEarnings,p+'.baseEarnings');money(o.maxEarnings,p+'.maxEarnings');if(BigInt(o.baseEarnings as string)<1n||BigInt(o.maxEarnings as string)<BigInt(o.baseEarnings as string)||BigInt(o.maxEarnings as string)-BigInt(o.baseEarnings as string)>1000000n)fail(p,'invalid payout range');integer(o.hungerStrain,p+'.hungerStrain',0,100);integer(o.sanityCost,p+'.sanityCost',0,100);
  const r=keys(o.requirements,p+'.requirements',['itemIds','qualificationIds','familyExperienceDays']);refs(r.itemIds,p+'.requirements.itemIds',sets.items);refs(r.qualificationIds,p+'.requirements.qualificationIds',sets.qualifications);integer(r.familyExperienceDays,p+'.requirements.familyExperienceDays',0,29930);
 }
 for(const [i,x] of (root.colleges as unknown[]).entries()){const p=`colleges[${i}]`,o=named(x,p,['qualificationIds']);refs(o.qualificationIds,p+'.qualificationIds',sets.qualifications);}
 for(const [i,x] of (root.qualifications as unknown[]).entries()){const p=`qualifications[${i}]`,o=named(x,p,['tuition','studyDays','collegeIds']);money(o.tuition,p+'.tuition');integer(o.studyDays,p+'.studyDays',1,29930);refs(o.collegeIds,p+'.collegeIds',sets.colleges);if(!(o.collegeIds as unknown[]).length)fail(p,'qualification needs a college');}
 for(const [i,x] of (root.items as unknown[]).entries()){
  const p=`items[${i}]`,o=named(x,p,['price','category','effect','requirements'],['hungerRestore']);money(o.price,p+'.price');if(!categories.has(o.category as string))fail(p,'unsupported category');if(!['food','unlock','cosmetic','travel'].includes(o.effect as string))fail(p,'unsupported effect');if(o.effect==='food'){integer(o.hungerRestore,p+'.hungerRestore',1,100);if(BigInt(o.price as string)<1n)fail(p,'food must have a positive price');}else if('hungerRestore' in o)fail(p,'hungerRestore supported only for food');const r=keys(o.requirements,p+'.requirements',['itemIds']);refs(r.itemIds,p+'.requirements.itemIds',sets.items);
 }
 const catalog=value as Catalog;
 for(const q of catalog.qualifications)for(const cid of q.collegeIds)if(!catalog.colleges.find(c=>c.id===cid)?.qualificationIds.includes(q.id))fail('qualifications',`college ${cid} does not offer ${q.id}`);
 for(const c of catalog.colleges)for(const qid of c.qualificationIds)if(!catalog.qualifications.find(q=>q.id===qid)?.collegeIds.includes(c.id))fail('colleges',`qualification ${qid} does not include ${c.id}`);
 const visiting=new Set<string>(),done=new Set<string>();function visit(itemId:string){if(visiting.has(itemId))fail('items','circular unlock '+itemId);if(done.has(itemId))return;visiting.add(itemId);for(const dep of catalog.items.find(i=>i.id===itemId)!.requirements.itemIds)visit(dep);visiting.delete(itemId);done.add(itemId);}for(const i of catalog.items)visit(i.id);
 for(const [i,x] of (root.goals as unknown[]).entries()){const p=`goals[${i}]`,o=named(x,p,['kind','targetId','targetAmount']);money(o.targetAmount,p+'.targetAmount');if(!['own_item','qualification','earnings','savings'].includes(o.kind as string))fail(p,'unsupported goal');if(o.kind==='own_item')refs([o.targetId],p+'.targetId',sets.items);else if(o.kind==='qualification')refs([o.targetId],p+'.targetId',sets.qualifications);else if(typeof o.targetId!=='string')fail(p,'targetId must be string');}
 for(const [i,x] of (root.ambitions as unknown[]).entries()){const p=`ambitions[${i}]`,o=named(x,p,['kind','targetId']);if(!['career','homeowner','garage','age_limit'].includes(o.kind as string))fail(p,'unsupported ambition');if(o.kind==='career')refs([o.targetId],p+'.targetId',sets.jobs);else if(o.kind==='homeowner')refs([o.targetId],p+'.targetId',sets.items);else if(o.kind==='garage'&&!categories.has(o.targetId as string))fail(p,'unsupported garage category');else if(typeof o.targetId!=='string')fail(p,'targetId must be string');}
 for(const [i,x] of (root.opportunities as unknown[]).entries()){const p=`opportunities[${i}]`,o=named(x,p,['kind','firstDay','intervalDays','requiredWorkDays','durationDays','bonusDivisor','lifeBonusCap']);if(o.kind!=='work_contract')fail(p,'unsupported opportunity');for(const k of ['firstDay','intervalDays','requiredWorkDays','durationDays','bonusDivisor'])integer(o[k],p+'.'+k,k==='firstDay'?0:1,29930);money(o.lifeBonusCap,p+'.lifeBonusCap');if((o.requiredWorkDays as number)>(o.durationDays as number))fail(p,'contract cannot finish within deadline');}
 const fields=['startAge','endAge','daysPerYear','startingHunger','startingSanity','startingHealth','starterJobId','ageBands','restSanity','restHealth','checkupHealth','checkupPrice','studyStrain','studySanity','bankUnlockEarned','bankMinimumDeposit','bankTier','bankNumeratorBase','bankNumeratorExcess','bankAnnualNumeratorCap','bankDenominator','workWeekUnlockDays','maximumWeekDays','dailyRate','dailyBurst','maximumOfflineDays'];
 const e=keys(root.economy,'economy',fields);
 for(const k of fields.filter(k=>!['starterJobId','ageBands','checkupPrice','bankUnlockEarned','bankMinimumDeposit','bankTier','bankAnnualNumeratorCap'].includes(k)))integer(e[k],'economy.'+k,0,10000000);
 for(const k of ['checkupPrice','bankUnlockEarned','bankMinimumDeposit','bankTier','bankAnnualNumeratorCap'])money(e[k],'economy.'+k);
 if(e.startAge!==18||e.endAge!==100||e.daysPerYear!==365||e.dailyRate!==4||e.dailyBurst!==8||e.maximumOfflineDays!==1200)fail('economy','unsupported calendar/rate behavior');
 if((e.bankDenominator as number)<1||e.maximumWeekDays!==7||e.startingHunger!==100||e.startingSanity!==100||e.startingHealth!==10000)fail('economy','unsupported starting/range values');
 let last=-1;for(const [i,x] of array(e.ageBands,'economy.ageBands').entries()){const p=`economy.ageBands[${i}]`,b=keys(x,p,['startAge','basalHunger','healthLoss']);integer(b.startAge,p+'.startAge',18,99);integer(b.basalHunger,p+'.basalHunger',1,100);integer(b.healthLoss,p+'.healthLoss',0,10000);if((b.startAge as number)<=last)fail(p,'age bands must strictly increase');last=b.startAge as number;}
 if(catalog.economy.ageBands[0]?.startAge!==18)fail('economy.ageBands','must cover starting age');
 const starter=catalog.jobs.find(j=>j.id===e.starterJobId);if(!starter||!starter.available||starter.requirements.itemIds.length||starter.requirements.qualificationIds.length||starter.requirements.familyExperienceDays)fail('economy.starterJobId','starter must be accessible');
 if(!catalog.items.some(i=>i.available&&i.effect==='food'&&!i.requirements.itemIds.length&&i.hungerRestore!>catalog.economy.ageBands[0].basalHunger))fail('items','need accessible restorative food');
 for(const career of catalog.careers){const available=catalog.jobs.filter(j=>j.available&&j.careerId===career.id);if(career.available&&available.length&&!available.some(j=>j.requirements.familyExperienceDays===0))fail('jobs',`career ${career.id} has circular experience requirements`);}
 for(const k of ['restSanity','studySanity','studyStrain'])integer(e[k],'economy.'+k,0,100);
 for(const k of ['restHealth','checkupHealth'])integer(e[k],'economy.'+k,0,10000);
 return catalog;
}
export function canonicalJson(value:unknown):string {if(Array.isArray(value))return '['+value.map(canonicalJson).join(',')+']';if(value&&typeof value==='object')return '{'+Object.keys(value as object).sort().map(k=>JSON.stringify(k)+':'+canonicalJson((value as Record<string,unknown>)[k])).join(',')+'}';return JSON.stringify(value);}
