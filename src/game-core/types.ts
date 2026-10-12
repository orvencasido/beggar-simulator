export interface Manifest { version: string; schemaVersion: 2; engineVersion: 2; releaseNotes: string }
export interface NamedRecord { id: string; name: string; available: boolean; icon: string }
export interface Requirements { itemIds: string[]; qualificationIds: string[]; familyExperienceDays: number }
export interface Job extends NamedRecord { careerId: string; baseEarnings: string; maxEarnings: string; hungerStrain: number; sanityCost: number; requirements: Requirements }
export interface Item extends NamedRecord { price: string; category: string; effect: 'food'|'unlock'|'cosmetic'|'travel'; hungerRestore?: number; requirements: {itemIds:string[]} }
export interface Qualification extends NamedRecord { tuition: string; studyDays: number; collegeIds: string[] }
export interface College extends NamedRecord { qualificationIds: string[] }
export interface Goal extends NamedRecord { kind: 'own_item'|'qualification'|'earnings'|'savings'; targetId: string; targetAmount: string }
export interface Ambition extends NamedRecord { kind: 'career'|'homeowner'|'garage'|'age_limit'; targetId: string }
export interface Opportunity extends NamedRecord { kind: 'work_contract'; firstDay: number; intervalDays: number; requiredWorkDays: number; durationDays: number; bonusDivisor: number; lifeBonusCap: string }
export interface Economy { startAge:number; endAge:number; daysPerYear:number; startingHunger:number; startingSanity:number; startingHealth:number; starterJobId:string; ageBands:{startAge:number;basalHunger:number;healthLoss:number}[]; restSanity:number; restHealth:number; checkupHealth:number; checkupPrice:string; studyStrain:number; studySanity:number; bankUnlockEarned:string; bankMinimumDeposit:string; bankTier:string; bankNumeratorBase:number; bankNumeratorExcess:number; bankAnnualNumeratorCap:string; bankDenominator:number; workWeekUnlockDays:number; maximumWeekDays:number; dailyRate:number; dailyBurst:number; maximumOfflineDays:number }
export interface Catalog { manifest: Manifest; careers: NamedRecord[]; jobs: Job[]; colleges: College[]; qualifications: Qualification[]; items: Item[]; goals: Goal[]; ambitions: Ambition[]; opportunities: Opportunity[]; economy: Economy }
export interface Bank { balance:string; remainder:number; interestEarned:string; opened:boolean; autoSave:boolean; autoWithdraw:boolean; reserve:string }
export interface Contract { id:string;jobId:string;acceptedDay:number;deadlineDay:number;completedDays:number;payoutSum:string }
export interface Offer { id:string;jobId:string;expiresDay:number }
export interface LegacyChapter { lifeId:string;lifeNumber:number;catalogVersion:string;status:'hunger'|'age_limit';elapsedDays:number;age:number;workEarned:string;jobEarnings:Record<string,string>;interestEarned:string;opportunityIncome:string;ownedItemIds:string[];qualifications:string[];qualificationColleges:Record<string,string>;equipped:GameState['equipped'];ambitionId:string|null;badges:string[];actionCounts:Record<string,number>;peakWealth:string;finance:GameState['finance'] }
export interface GameState {
 protocolVersion:2; engineVersion:2;catalogVersion:string;seed:number;randomCounter:number;lifeId:string;lifeNumber:number;
 status:'active'|'hunger'|'age_limit';elapsedDays:number;money:string;bank:Bank;hunger:number;sanity:number;health:number;jobId:string;
 ownedItemIds:string[];equipped:{residence?:string;vehicle?:string;outfit?:string};qualifications:string[];qualificationColleges:Record<string,string>;education:{qualificationId:string;collegeId:string;studyDays:number}|null;
 careerExperience:Record<string,number>;jobEarnings:Record<string,string>;lifeJobEarnings:Record<string,string>;workDays:number;actionCounts:Record<string,number>;
 workEarned:string;lifeWorkEarned:string;opportunityIncome:string;contract:Contract|null;offer:Offer|null;lastOfferSlot:number;
 selectedAmbitionId:string|null;selectedGoalId:string|null;badges:string[];legacy:LegacyChapter[];rebirthCount:number;completedLifetimes:number;accountLevel:number;peakWealth:string;
 travelCompletedIds:string[];scholarshipIds:string[];savingsGoals:Record<string,string>;finance:{food:string;tuition:string;items:string;treatment:string};
}
export type GameAction = {type:'work'|'rest'|'checkup'|'study'|'rebirth'|'abandon_contract'}
 |{type:'eat'|'buy_item'|'equip'|'travel';item_id:string}
 |{type:'choose_job';job_id:string}
 |{type:'enroll';qualification_id:string;college_id:string}
 |{type:'deposit'|'withdraw';amount:string}
 |{type:'bank_settings';auto_save:boolean;auto_withdraw:boolean;reserve:string}
 |{type:'accept_contract'|'decline_contract';offer_id:string}
 |{type:'select_ambition';ambition_id:string|null}
 |{type:'select_goal';goal_id:string|null}
 |{type:'set_savings_goal';goal_id:string;amount:string}
 |{type:'scholarship';qualification_id:string};
export interface ActionResult {state:GameState;accepted:boolean;dayCost:number;reason:string|null}
export interface ReplayResult {state:GameState;processed:number;dayCost:number;stopReason:string|null}
