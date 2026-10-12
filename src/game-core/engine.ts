import { isMoney, MONEY_LIMIT } from './catalog.ts';
import type { Catalog, GameAction, GameState, ActionResult, ReplayResult, Job } from './types.ts';
const clone = <T>(value:T):T=>JSON.parse(JSON.stringify(value));
const amount = (value:string)=>BigInt(value);
const clamp = (n:number,max:number)=>Math.max(0,Math.min(max,n));
const add = (left:string,right:bigint)=>{const n=amount(left)+right;if(n<0n||n>=MONEY_LIMIT)throw new Error('numeric_limit');return n.toString();};
export function createGame(seed:number,catalog:Catalog,lifeId='practice'):GameState {
 if(!Number.isInteger(seed)||seed<0||seed>4294967295)throw new Error('invalid_seed');
 return {protocolVersion:2,engineVersion:2,catalogVersion:catalog.manifest.version,seed,randomCounter:0,lifeId,lifeNumber:1,status:'active',elapsedDays:0,money:'0',bank:{balance:'0',remainder:0,interestEarned:'0',opened:false,autoSave:false,autoWithdraw:false,reserve:'200'},hunger:100,sanity:100,health:10000,jobId:catalog.economy.starterJobId,ownedItemIds:[],equipped:{},qualifications:[],qualificationColleges:{},education:null,careerExperience:{},jobEarnings:{},lifeJobEarnings:{},workDays:0,actionCounts:{},workEarned:'0',lifeWorkEarned:'0',opportunityIncome:'0',contract:null,offer:null,lastOfferSlot:-1,selectedAmbitionId:null,selectedGoalId:catalog.goals[0]?.id??null,badges:[],legacy:[],rebirthCount:0,completedLifetimes:0,accountLevel:1,peakWealth:'0',travelCompletedIds:[],scholarshipIds:[],savingsGoals:{},finance:{food:'0',tuition:'0',items:'0',treatment:'0'}};
}
export function getAge(state:GameState,catalog?:Catalog):number {return (catalog?.economy.startAge??18)+Math.floor(state.elapsedDays/(catalog?.economy.daysPerYear??365));}
export function getAgeBand(state:GameState,catalog:Catalog){const age=getAge(state,catalog);return [...catalog.economy.ageBands].reverse().find(b=>age>=b.startAge)!;}
export function jobUnlocked(state:GameState,job:Job):boolean {return job.available&&job.requirements.itemIds.every(i=>state.ownedItemIds.includes(i))&&job.requirements.qualificationIds.every(q=>state.qualifications.includes(q))&&(state.careerExperience[job.careerId]??0)>=job.requirements.familyExperienceDays;}
function sample(state:GameState,range:number):number {
 const cutoff=4294967296-4294967296%range;let value:number;
 do {if(state.randomCounter>=Number.MAX_SAFE_INTEGER)throw new Error('numeric_limit');let x=(state.seed+Math.imul(++state.randomCounter,0x9e3779b9))>>>0;x=Math.imul(x^(x>>>16),0x85ebca6b)>>>0;x=Math.imul(x^(x>>>13),0xc2b2ae35)>>>0;value=(x^(x>>>16))>>>0;}while(value>=cutoff);
 return value%range;
}
export function getJobReward(state:GameState,catalog:Catalog,base?:bigint):string {
 const job=catalog.jobs.find(j=>j.id===state.jobId);if(!job)throw new Error('unknown_job');
 const sanity=state.sanity>=50?100n:state.sanity>=20?80n:60n;
 const health=state.health>=4000?100n:state.health>=2000?85n:70n;
 return ((base??amount(job.baseEarnings))*sanity*health/10000n||1n).toString();
}
export function workHungerCost(state:GameState,catalog:Catalog):number {const j=catalog.jobs.find(j=>j.id===state.jobId);if(!j)throw new Error('unknown_job');return getAgeBand(state,catalog).basalHunger+j.hungerStrain+(state.health<4000?1:0);}
function badge(state:GameState,id:string){if(!state.badges.includes(id))state.badges.push(id);}
function achievements(state:GameState,catalog:Catalog){
 if(state.workDays>0)badge(state,'first_work');if(state.qualifications.length)badge(state,'graduate');if(state.bank.opened)badge(state,'first_saver');
 if(amount(state.bank.balance)>=100000n)badge(state,'saved_100k');if(amount(state.bank.balance)>=1000000n)badge(state,'saved_million');
 for(const j of catalog.jobs)if((state.lifeJobEarnings[j.id]??'0')!=='0')badge(state,'career_'+j.id);
 for(const [id,score] of Object.entries(state.jobEarnings))if(amount(score)>=100000n)badge(state,'earned_100k_'+id);
 for(const ambition of catalog.ambitions){let complete=false;
  if(ambition.kind==='career')complete=(state.lifeJobEarnings[ambition.targetId]??'0')!=='0';
  if(ambition.kind==='homeowner'){const target=catalog.items.find(i=>i.id===ambition.targetId);complete=state.ownedItemIds.some(id=>{const i=catalog.items.find(x=>x.id===id);return i?.category==='housing'&&target&&amount(i.price)>=amount(target.price);});}
  if(ambition.kind==='garage')complete=state.ownedItemIds.filter(id=>{const i=catalog.items.find(x=>x.id===id);return i?.category===ambition.targetId&&!['bike','scooter'].includes(id);}).length>=3;
  if(ambition.kind==='age_limit')complete=state.status==='age_limit';
  if(complete)badge(state,'ambition_'+ambition.id);
 }
 const wealth=amount(state.money)+amount(state.bank.balance);if(wealth>amount(state.peakWealth))state.peakWealth=wealth.toString();
}
function endLife(state:GameState,catalog:Catalog){
 if(state.status==='active')return;
 if(state.status==='age_limit'){state.completedLifetimes++;state.accountLevel=1+state.completedLifetimes;badge(state,'lived_to_100');}
 achievements(state,catalog);
 state.legacy.push({lifeId:state.lifeId,lifeNumber:state.lifeNumber,catalogVersion:state.catalogVersion,status:state.status,elapsedDays:state.elapsedDays,age:getAge(state,catalog),workEarned:state.lifeWorkEarned,jobEarnings:clone(state.lifeJobEarnings),interestEarned:state.bank.interestEarned,opportunityIncome:state.opportunityIncome,ownedItemIds:[...state.ownedItemIds],qualifications:[...state.qualifications],qualificationColleges:clone(state.qualificationColleges),equipped:clone(state.equipped),ambitionId:state.selectedAmbitionId,badges:[...state.badges],actionCounts:clone(state.actionCounts),peakWealth:state.peakWealth,finance:clone(state.finance)});
 state.contract=null;state.offer=null;
}
function refreshOffer(state:GameState,catalog:Catalog){
 const template=catalog.opportunities.find(o=>o.available);if(!template)return;
 if(state.contract&&state.elapsedDays>state.contract.deadlineDay)state.contract=null;
 if(state.offer&&state.elapsedDays>state.offer.expiresDay)state.offer=null;
 if(state.elapsedDays<template.firstDay)return;
 const slot=Math.floor((state.elapsedDays-template.firstDay)/template.intervalDays);
 if(slot<=state.lastOfferSlot)return;
 if(state.contract){state.lastOfferSlot=slot;return;}
 if(amount(state.opportunityIncome)>=amount(template.lifeBonusCap))return;
 const jobs=catalog.jobs.filter(j=>j.id!==catalog.economy.starterJobId&&jobUnlocked(state,j));if(!jobs.length)return;
 state.lastOfferSlot=slot;
 const job=jobs.find(j=>j.id===state.jobId)??jobs[(state.seed+slot)%jobs.length];
 state.offer={id:`${state.lifeId}:contract:${slot}`,jobId:job.id,expiresDay:state.elapsedDays+template.durationDays};
}
const fieldMap:Record<string,string[]>={work:[],rest:[],checkup:[],study:[],rebirth:[],abandon_contract:[],eat:['item_id'],buy_item:['item_id'],equip:['item_id'],travel:['item_id'],choose_job:['job_id'],enroll:['qualification_id','college_id'],deposit:['amount'],withdraw:['amount'],bank_settings:['auto_save','auto_withdraw','reserve'],accept_contract:['offer_id'],decline_contract:['offer_id'],select_ambition:['ambition_id'],select_goal:['goal_id'],set_savings_goal:['goal_id','amount'],scholarship:['qualification_id']};
export function validateAction(value:unknown):value is GameAction {
 if(!value||typeof value!=='object'||Array.isArray(value))return false;
 const v=value as Record<string,unknown>;if(typeof v.type!=='string'||!Object.prototype.hasOwnProperty.call(fieldMap,v.type))return false;
 const fields=fieldMap[v.type];if(Object.keys(v).length!==fields.length+1||!fields.every(k=>k in v))return false;
 for(const k of fields){if(k==='auto_save'||k==='auto_withdraw'){if(typeof v[k]!=='boolean')return false;}else if(k==='amount'||k==='reserve'){if(!isMoney(v[k]))return false;}else if((k==='goal_id'&&v.type==='select_goal'||k==='ambition_id')&&v[k]===null)continue;else if(typeof v[k]!=='string'||!(v[k] as string).length||(v[k] as string).length>200)return false;}
 return true;
}
export function applyAction(original:GameState,action:GameAction,catalog:Catalog,nextCatalog:Catalog=catalog):ActionResult {
 const reject=(reason:string):ActionResult=>({state:original,accepted:false,dayCost:0,reason});
 if(!validateAction(action))return reject('invalid_action');
 if(original.catalogVersion!==catalog.manifest.version||original.engineVersion!==2)return reject('catalog_mismatch');
 if(action.type==='rebirth'){
  if(original.status==='active')return reject('life_active');
  const rootId=original.lifeId.split(':life:')[0];const n=original.lifeNumber+1;
  const fresh=createGame(original.seed,nextCatalog,`${rootId}:life:${n}`);
  Object.assign(fresh,{lifeNumber:n,randomCounter:original.randomCounter,jobEarnings:clone(original.jobEarnings),workEarned:original.workEarned,badges:[...original.badges],legacy:clone(original.legacy),rebirthCount:original.rebirthCount+1,completedLifetimes:original.completedLifetimes,accountLevel:original.accountLevel});
  return {state:fresh,accepted:true,dayCost:0,reason:null};
 }
 if(original.status!=='active')return reject('life_ended');
 const state=clone(original);let dayCost=0;let openingBank=amount(state.bank.balance);
 const band=getAgeBand(state,catalog),unwell=state.health<4000?1:0,e=catalog.economy;
 const charge=(price:bigint,category?:keyof GameState['finance']):boolean=>{
  if(amount(state.money)<price&&state.bank.autoWithdraw){const shortfall=price-amount(state.money);if(amount(state.bank.balance)>=shortfall){state.bank.balance=add(state.bank.balance,-shortfall);state.money=add(state.money,shortfall);}}
  if(amount(state.money)<price)return false;
  state.money=add(state.money,-price);openingBank=amount(state.bank.balance);
  if(category)state.finance[category]=add(state.finance[category],price);return true;
 };
 try {
 switch(action.type){
 case 'work':{
  const job=catalog.jobs.find(j=>j.id===state.jobId);if(!job||!jobUnlocked(state,job))return reject('job_locked');
  const base=amount(job.baseEarnings)+BigInt(sample(state,Number(amount(job.maxEarnings)-amount(job.baseEarnings))+1));
  const payout=amount(getJobReward(state,catalog,base));state.money=add(state.money,payout);state.lifeWorkEarned=add(state.lifeWorkEarned,payout);state.workEarned=add(state.workEarned,payout);
  state.jobEarnings[job.id]=add(state.jobEarnings[job.id]??'0',payout);state.lifeJobEarnings[job.id]=add(state.lifeJobEarnings[job.id]??'0',payout);
  if(job.requirements.qualificationIds.length&&job.requirements.qualificationIds.every(q=>state.qualifications.includes(q)))state.careerExperience[job.careerId]=(state.careerExperience[job.careerId]??0)+1;
  state.workDays++;state.hunger=clamp(state.hunger-band.basalHunger-job.hungerStrain-unwell,100);state.sanity=clamp(state.sanity-job.sanityCost,100);dayCost=1;
  const contract=state.contract,template=catalog.opportunities.find(o=>o.available);
  if(contract&&template&&contract.jobId===job.id&&state.elapsedDays<contract.deadlineDay){contract.completedDays++;contract.payoutSum=add(contract.payoutSum,payout);if(contract.completedDays>=template.requiredWorkDays){const remaining=amount(template.lifeBonusCap)-amount(state.opportunityIncome);const planned=amount(contract.payoutSum)/BigInt(template.bonusDivisor);const bonus=planned<remaining?planned:remaining;state.money=add(state.money,bonus);state.opportunityIncome=add(state.opportunityIncome,bonus);state.contract=null;badge(state,'contract_completed');}}
  break;
 }
 case 'eat':{
  const item=catalog.items.find(i=>i.id===action.item_id);if(!item?.available||item.effect!=='food')return reject('unknown_food');if(!item.requirements.itemIds.every(i=>state.ownedItemIds.includes(i)))return reject('item_locked');if(state.hunger===100)return reject('need_full');if(!charge(amount(item.price),'food'))return reject('insufficient_money');state.hunger=clamp(state.hunger-band.basalHunger+item.hungerRestore!,100);dayCost=1;break;
 }
 case 'rest':if(state.sanity===100&&state.health===10000)return reject('need_full');state.hunger=clamp(state.hunger-Math.ceil(band.basalHunger/2)-unwell,100);state.sanity=clamp(state.sanity+e.restSanity,100);state.health=clamp(state.health+e.restHealth,10000);dayCost=1;break;
 case 'checkup':if(state.health===10000)return reject('need_full');if(!charge(amount(e.checkupPrice),'treatment'))return reject('insufficient_money');state.health=clamp(state.health+e.checkupHealth,10000);state.hunger=clamp(state.hunger-band.basalHunger,100);dayCost=1;break;
 case 'study':{
  if(!state.education)return reject('not_enrolled');const q=catalog.qualifications.find(q=>q.id===state.education!.qualificationId);if(!q)return reject('unknown_qualification');state.education.studyDays++;state.hunger=clamp(state.hunger-band.basalHunger-e.studyStrain-unwell,100);state.sanity=clamp(state.sanity-e.studySanity,100);dayCost=1;
  if(state.education.studyDays>=q.studyDays){state.qualifications.push(q.id);state.qualificationColleges[q.id]=state.education.collegeId;state.education=null;badge(state,'graduate_'+q.id);}break;
 }
 case 'buy_item':{
  const item=catalog.items.find(i=>i.id===action.item_id);if(!item?.available||item.effect==='food')return reject('unknown_item');if(state.ownedItemIds.includes(item.id))return reject('already_owned');if(!item.requirements.itemIds.every(i=>state.ownedItemIds.includes(i)))return reject('item_locked');if(!charge(amount(item.price),'items'))return reject('insufficient_money');state.ownedItemIds.push(item.id);break;
 }
 case 'choose_job':{const job=catalog.jobs.find(j=>j.id===action.job_id);if(!job||!jobUnlocked(state,job))return reject('job_locked');if(job.id===state.jobId)return reject('already_selected');state.jobId=job.id;break;}
 case 'enroll':{
  const q=catalog.qualifications.find(q=>q.id===action.qualification_id),c=catalog.colleges.find(c=>c.id===action.college_id);if(!q?.available||!c?.available||!q.collegeIds.includes(c.id)||!c.qualificationIds.includes(q.id))return reject('invalid_course');if(state.education)return reject('already_enrolled');if(state.qualifications.includes(q.id))return reject('already_qualified');let tuition=amount(q.tuition);if(state.scholarshipIds.includes(q.id))tuition=tuition*9n/10n;if(!charge(tuition,'tuition'))return reject('insufficient_money');state.education={qualificationId:q.id,collegeId:c.id,studyDays:0};break;
 }
 case 'scholarship':{const q=catalog.qualifications.find(q=>q.id===action.qualification_id);if(!q?.available||state.elapsedDays<180)return reject('scholarship_unavailable');if(state.qualifications.includes(q.id)||state.education?.qualificationId===q.id||state.scholarshipIds.includes(q.id))return reject('already_claimed');state.scholarshipIds.push(q.id);break;}
 case 'equip':{const item=catalog.items.find(i=>i.id===action.item_id);if(!item||!state.ownedItemIds.includes(item.id))return reject('not_owned');const key=item.category==='housing'?'residence':item.category==='vehicles'||item.category==='motorcycles'?'vehicle':item.category==='fashion'?'outfit':null;if(!key)return reject('not_equippable');if(state.equipped[key]===item.id)return reject('already_equipped');state.equipped[key]=item.id;break;}
 case 'travel':{const item=catalog.items.find(i=>i.id===action.item_id);if(item?.effect!=='travel'||!state.ownedItemIds.includes(item.id))return reject('not_owned');if(state.travelCompletedIds.includes(item.id))return reject('already_completed');state.travelCompletedIds.push(item.id);badge(state,'travel_'+item.id);state.hunger=clamp(state.hunger-band.basalHunger,100);dayCost=1;break;}
 case 'deposit':{
  if(amount(state.lifeWorkEarned)<amount(e.bankUnlockEarned))return reject('bank_locked');const n=amount(action.amount);if(n<amount(e.bankMinimumDeposit))return reject('minimum_deposit');if(amount(state.money)<n)return reject('insufficient_money');state.money=add(state.money,-n);state.bank.balance=add(state.bank.balance,n);state.bank.opened=true;break;
 }
 case 'withdraw':{const n=amount(action.amount);if(!state.bank.opened)return reject('bank_locked');if(n===0n)return reject('invalid_amount');if(amount(state.bank.balance)<n)return reject('insufficient_savings');state.bank.balance=add(state.bank.balance,-n);state.money=add(state.money,n);break;}
 case 'bank_settings':if(amount(state.lifeWorkEarned)<amount(e.bankUnlockEarned))return reject('bank_locked');state.bank.opened=true;state.bank.autoSave=action.auto_save;state.bank.autoWithdraw=action.auto_withdraw;state.bank.reserve=action.reserve;break;
 case 'accept_contract':{if(!state.offer||state.offer.id!==action.offer_id||state.elapsedDays>state.offer.expiresDay)return reject('offer_unavailable');if(state.contract)return reject('already_contracted');const t=catalog.opportunities.find(o=>o.available)!;state.contract={id:state.offer.id,jobId:state.offer.jobId,acceptedDay:state.elapsedDays,deadlineDay:state.elapsedDays+t.durationDays,completedDays:0,payoutSum:'0'};state.offer=null;break;}
 case 'decline_contract':if(state.offer?.id!==action.offer_id)return reject('offer_unavailable');state.offer=null;break;
 case 'abandon_contract':if(!state.contract)return reject('no_contract');state.contract=null;break;
 case 'select_ambition':if(action.ambition_id!==null&&!catalog.ambitions.some(a=>a.id===action.ambition_id&&a.available))return reject('unknown_ambition');state.selectedAmbitionId=action.ambition_id;break;
 case 'select_goal':if(action.goal_id!==null&&!catalog.goals.some(g=>g.id===action.goal_id&&g.available)&&!Object.hasOwn(state.savingsGoals,action.goal_id)&&!(action.goal_id.startsWith('item:')&&catalog.items.some(i=>i.id===action.goal_id!.slice(5)&&i.available&&i.effect!=='food')))return reject('unknown_goal');state.selectedGoalId=action.goal_id;break;
 case 'set_savings_goal':if(!/^[a-z][a-z0-9_]{0,63}$/.test(action.goal_id)||['constructor','prototype','toString','hasOwnProperty'].includes(action.goal_id)||amount(action.amount)===0n||Object.keys(state.savingsGoals).length>=512)return reject('invalid_goal');state.savingsGoals[action.goal_id]=action.amount;break;
 }
 if(dayCost){
  const tier=amount(e.bankTier),low=openingBank<tier?openingBank:tier,high=openingBank>tier?openingBank-tier:0n;
  let numerator=low*BigInt(e.bankNumeratorBase)+high*BigInt(e.bankNumeratorExcess);const cap=amount(e.bankAnnualNumeratorCap);if(numerator>cap)numerator=cap;
  const combined=BigInt(state.bank.remainder)+numerator,interest=combined/BigInt(e.bankDenominator);state.bank.remainder=Number(combined%BigInt(e.bankDenominator));state.bank.balance=add(state.bank.balance,interest);state.bank.interestEarned=add(state.bank.interestEarned,interest);
  state.health=clamp(state.health-band.healthLoss,10000);state.elapsedDays++;state.actionCounts[action.type]=(state.actionCounts[action.type]??0)+1;
  if(state.hunger===0)state.status='hunger';else if(state.elapsedDays>=(e.endAge-e.startAge)*e.daysPerYear)state.status='age_limit';
 }
 if(state.bank.opened&&state.bank.autoSave&&amount(state.money)>amount(state.bank.reserve)){const excess=amount(state.money)-amount(state.bank.reserve);state.money=state.bank.reserve;state.bank.balance=add(state.bank.balance,excess);}
 achievements(state,catalog);
 if(state.status!=='active')endLife(state,catalog);else refreshOffer(state,catalog);
 return {state,accepted:true,dayCost,reason:null};
 }catch(error){return reject(error instanceof Error?error.message:'invalid_action');}
}
export function replayActions(state:GameState,actions:GameAction[],catalog:Catalog,nextCatalog:Catalog=catalog):ReplayResult {
 if(actions.length>512||actions.some(a=>!validateAction(a)))return {state,processed:0,dayCost:0,stopReason:'invalid_batch'};
 let current=state,processed=0,dayCost=0;
 for(const action of actions){const active=current.catalogVersion===catalog.manifest.version?catalog:nextCatalog;const result=applyAction(current,action,active,nextCatalog);if(!result.accepted)return {state:current,processed,dayCost,stopReason:result.reason};current=result.state;processed++;dayCost+=result.dayCost;}
 return {state:current,processed,dayCost,stopReason:null};
}
export function previewWorkWeek(state:GameState,catalog:Catalog,days=7){
 let current=state;const actions:GameAction[]=[];let reason:string|null=null;
 if(!Number.isInteger(days)||days<1||days>catalog.economy.maximumWeekDays)return {state,actions,days:0,reason:'invalid_days'};
 if(state.workDays<catalog.economy.workWeekUnlockDays)return {state,actions,days:0,reason:'week_locked'};
 for(let i=0;i<days;i++){if(current.status!=='active'){reason='life_ended';break;}if(current.hunger<=workHungerCost(current,catalog)){reason='care_needed';break;}const action:GameAction={type:'work'};const result=applyAction(current,action,catalog);if(!result.accepted){reason=result.reason;break;}current=result.state;actions.push(action);if(current.status!=='active'){reason='life_complete';break;}}
 return {state:current,actions,days:actions.length,reason};
}
export function getGoalProgress(state:GameState,catalog:Catalog){
 const id=state.selectedGoalId;if(!id)return null;
 if(id.startsWith('item:')){const item=catalog.items.find(i=>i.id===id.slice(5));if(!item)return null;return {id,name:'Save for '+item.name,current:state.money,target:item.price,complete:state.ownedItemIds.includes(item.id),usesBank:false,kind:'own_item' as const};}
 if(Object.hasOwn(state.savingsGoals,id)){const target=state.savingsGoals[id],current=add(state.money,amount(state.bank.balance));return {id,name:id.replaceAll('_',' '),current,target,complete:amount(current)>=amount(target),usesBank:true,kind:'savings' as const};}
 const goal=catalog.goals.find(g=>g.id===id);if(!goal)return null;
 if(goal.kind==='own_item'){const item=catalog.items.find(i=>i.id===goal.targetId)!;return {id,name:goal.name,current:state.money,target:item.price,complete:state.ownedItemIds.includes(item.id),usesBank:false,kind:'own_item' as const};}
 if(goal.kind==='qualification')return {id,name:goal.name,current:String(state.qualifications.includes(goal.targetId)?catalog.qualifications.find(q=>q.id===goal.targetId)?.studyDays??1:state.education?.qualificationId===goal.targetId?state.education.studyDays:0),target:String(catalog.qualifications.find(q=>q.id===goal.targetId)?.studyDays??1),complete:state.qualifications.includes(goal.targetId),usesBank:false,kind:'qualification' as const};
 const current=goal.kind==='earnings'?state.workEarned:add(state.money,amount(state.bank.balance));return {id,name:goal.name,current,target:goal.targetAmount,complete:amount(current)>=amount(goal.targetAmount),usesBank:goal.kind==='savings',kind:goal.kind};
}
export function validateGameState(value:unknown,catalog?:Catalog):value is GameState {
 if(!value||typeof value!=='object')return false;const s=value as GameState;
 if(s.protocolVersion!==2||s.engineVersion!==2||typeof s.lifeId!=='string'||!s.lifeId||!['active','hunger','age_limit'].includes(s.status))return false;
 if(!Number.isInteger(s.seed)||s.seed<0||s.seed>4294967295)return false;
 for(const k of ['elapsedDays','randomCounter','lifeNumber','rebirthCount','completedLifetimes','accountLevel','workDays'] as const)if(!Number.isSafeInteger(s[k])||s[k]<0)return false;
 if(s.elapsedDays>29930||s.lifeNumber<1||s.accountLevel!==s.completedLifetimes+1)return false;
 for(const [v,max] of [[s.hunger,100],[s.sanity,100],[s.health,10000]] as const)if(!Number.isInteger(v)||v<0||v>max)return false;
 for(const v of [s.money,s.workEarned,s.lifeWorkEarned,s.opportunityIncome,s.peakWealth])if(!isMoney(v))return false;
 if(!s.bank||![s.bank.balance,s.bank.interestEarned,s.bank.reserve].every(isMoney)||!Number.isInteger(s.bank.remainder)||s.bank.remainder<0||s.bank.remainder>=(catalog?.economy.bankDenominator??146000))return false;
 if(![s.bank.opened,s.bank.autoSave,s.bank.autoWithdraw].every(v=>typeof v==='boolean'))return false;
 for(const a of [s.ownedItemIds,s.qualifications,s.badges,s.travelCompletedIds,s.scholarshipIds])if(!Array.isArray(a)||a.length>4096||a.some(x=>typeof x!=='string')||new Set(a).size!==a.length)return false;
 for(const m of [s.jobEarnings,s.lifeJobEarnings,s.savingsGoals,s.finance])if(!m||typeof m!=='object'||Object.values(m).some(v=>!isMoney(v)))return false;
 for(const m of [s.careerExperience,s.actionCounts])if(!m||typeof m!=='object'||Object.values(m).some(v=>!Number.isSafeInteger(v)||v<0||v>29930))return false;
 if(!Array.isArray(s.legacy)||s.legacy.length>10000||!s.equipped||typeof s.catalogVersion!=='string'||typeof s.jobId!=='string')return false;
 if(s.status==='active'&&(s.hunger===0||s.elapsedDays>=29930)||s.status==='hunger'&&s.hunger!==0||s.status==='age_limit'&&(s.elapsedDays!==29930||s.hunger===0))return false;
 if(catalog&&(s.catalogVersion!==catalog.manifest.version||!catalog.jobs.some(j=>j.id===s.jobId)||s.ownedItemIds.some(id=>!catalog.items.some(i=>i.id===id))||s.qualifications.some(id=>!catalog.qualifications.some(q=>q.id===id))))return false;
 return true;
}
