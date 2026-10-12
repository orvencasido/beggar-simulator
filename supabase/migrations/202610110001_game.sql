-- Additive, server-authoritative MVP. No public economic tables.
create schema game_private;
revoke all on schema game_private from public, anon, authenticated;

create table game_private.profiles (
 user_id uuid primary key references auth.users(id) on delete cascade,
 lifetime_earned numeric(60,0) not null default 0 check(lifetime_earned >= 0 and lifetime_earned <> 'NaN'::numeric),
 best_run_earned numeric(60,0) not null default 0 check(best_run_earned >= 0 and best_run_earned <> 'NaN'::numeric),
 completed_runs integer not null default 0 check(completed_runs >= 0)
);
create table game_private.catalogs(version integer primary key, config jsonb not null);
insert into game_private.catalogs values(1, '{"jobs":{"begging":{"reward":1,"hunger":1,"sanity":1,"requires":[]},"newspaper":{"reward":20,"hunger":2,"sanity":1,"requires":["bike"]},"courier":{"reward":50,"hunger":3,"sanity":2,"requires":["bike","delivery_kit"]},"freelancer":{"reward":100,"hunger":4,"sanity":2,"requires":["delivery_kit","laptop"]}},"equipment":{"bike":100,"delivery_kit":500,"laptop":2500},"food":{"bread":{"price":5,"hunger":25},"meal":{"price":15,"hunger":80}},"rest":{"sanity":25,"hunger":2},"workRate":4,"workBurst":8,"skillPrice":200,"skillReward":10}');
create table game_private.runs (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references game_private.profiles(user_id) on delete cascade,
 version integer not null references game_private.catalogs(version), status text not null default 'active' check(status in ('active','dead')),
 money numeric(60,0) not null default 0 check(money >= 0 and money <> 'NaN'::numeric), earned numeric(60,0) not null default 0 check(earned >= 0 and earned <> 'NaN'::numeric),
 hunger integer not null default 100 check(hunger between 0 and 100), sanity integer not null default 100 check(sanity between 0 and 100),
 job_id text not null default 'begging' check(job_id in ('begging','newspaper','courier','freelancer')),
 skill_level integer not null default 0 check(skill_level between 0 and 1000000),
 equipment jsonb not null default '[]' check(jsonb_typeof(equipment)='array'),
 revision integer not null default 0 check(revision>=0), actions integer not null default 0 check(actions>=0),
 created_at timestamptz not null default clock_timestamp(), ended_at timestamptz,
 check((status='active' and hunger>0 and ended_at is null) or (status='dead' and hunger=0 and ended_at is not null))
);
create unique index one_active_run on game_private.runs(user_id) where status='active';
create index runs_owner_created on game_private.runs(user_id,created_at desc,id);
create table game_private.receipts (
 user_id uuid not null references game_private.profiles(user_id) on delete cascade,
 request_id uuid not null, payload jsonb not null, response jsonb,
 created_at timestamptz not null default clock_timestamp(), primary key(user_id,request_id)
);
create table game_private.rate_state (
 user_id uuid primary key references game_private.profiles(user_id) on delete cascade,
 tokens numeric not null default 8 check(tokens>=0 and tokens<=8), updated_at timestamptz not null default clock_timestamp()
);
alter table game_private.profiles enable row level security;
alter table game_private.catalogs enable row level security;
alter table game_private.runs enable row level security;
alter table game_private.receipts enable row level security;
alter table game_private.rate_state enable row level security;
revoke all on all tables in schema game_private from public, anon, authenticated;

create function game_private.immutable_catalog() returns trigger language plpgsql set search_path='' as $$
begin raise exception 'catalog_immutable'; end $$;
create trigger catalog_immutable before update or delete on game_private.catalogs for each row execute function game_private.immutable_catalog();

create function game_private.snapshot(owner_id uuid) returns jsonb language sql set search_path='' as $$
 select jsonb_build_object('version',coalesce(r.version,1),'run',case when r.id is null then null else
 jsonb_build_object('id',r.id,'status',r.status,'money',r.money::text,'earned',r.earned::text,'hunger',r.hunger,'sanity',r.sanity,'jobId',r.job_id,'skillLevel',r.skill_level,'equipment',r.equipment,'revision',r.revision,'actions',r.actions) end,
 'summary',jsonb_build_object('lifetimeEarned',coalesce(p.lifetime_earned,0)::text,'bestRunEarned',coalesce(p.best_run_earned,0)::text,'completedRuns',coalesce(p.completed_runs,0)))
 from (select owner_id as user_id) o left join game_private.profiles p using(user_id)
 left join lateral(select * from game_private.runs x where x.user_id=o.user_id order by x.created_at desc,x.id desc limit 1) r on true;
$$;
create function public.get_game_snapshot() returns jsonb language plpgsql security definer set search_path='' as $$
declare owner_id uuid := auth.uid();
begin if owner_id is null then raise exception 'authentication_required' using errcode='28000'; end if;
 return game_private.snapshot(owner_id); end $$;

create function public.start_run(request_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare owner_id uuid := auth.uid(); previous game_private.receipts; result jsonb; reason text; command jsonb:=jsonb_build_object('operation','start');
begin
 if owner_id is null then raise exception 'authentication_required' using errcode='28000'; end if;
 if request_id is null then raise exception 'invalid_request'; end if;
 insert into game_private.profiles(user_id) values(owner_id) on conflict do nothing;
 perform 1 from game_private.profiles p where p.user_id=owner_id for update;
 select * into previous from game_private.receipts c where c.user_id=owner_id and c.request_id=start_run.request_id;
 if found then
  if previous.payload<>command then raise exception 'request_id_reused'; end if;
  if previous.response is null then raise exception 'receipt_expired'; end if;
  return previous.response;
 end if;
 if exists(select 1 from game_private.runs r where r.user_id=owner_id and r.status='active') then reason:='already_active';
 else insert into game_private.runs(user_id,version) values(owner_id,1); end if;
 result:=jsonb_build_object('snapshot',game_private.snapshot(owner_id),'requestId',request_id,'processed',case when reason is null then 1 else 0 end,'stopReason',reason);
 insert into game_private.receipts values(owner_id,request_id,command,result,clock_timestamp()); return result;
end $$;

create function public.submit_actions(run_id uuid,request_id uuid,expected_revision integer,actions jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare owner_id uuid:=auth.uid(); previous game_private.receipts; r game_private.runs; budget game_private.rate_state;
 config jsonb; a jsonb; kind text; item text; job jsonb; price numeric; reward numeric; reason text; processed integer:=0;
 result jsonb; command jsonb; now_at timestamptz; before_money numeric; before_hunger integer; before_sanity integer; outcomes jsonb:='[]';
begin
 if owner_id is null then raise exception 'authentication_required' using errcode='28000'; end if;
 if run_id is null or request_id is null or expected_revision is null or expected_revision<0 or actions is null or jsonb_typeof(actions)<>'array' then raise exception 'invalid_request'; end if;
 if jsonb_array_length(actions) not between 1 and 20 then raise exception 'invalid_batch'; end if;
 -- Validate the WHOLE envelope before applying any prefix (unknown/forged fields never partly mutate).
 for a in select value from jsonb_array_elements(actions) loop
  if jsonb_typeof(a)<>'object' or not (a ? 'type') or jsonb_typeof(a->'type')<>'string' then raise exception 'invalid_action'; end if;
  kind:=a->>'type';
  if kind in ('work','rest','buy_skill_level') then
   if a<>jsonb_build_object('type',kind) then raise exception 'invalid_action'; end if;
  elsif kind in ('eat','buy_equipment') then
   if not(a ? 'item_id') or jsonb_typeof(a->'item_id')<>'string' or a<>jsonb_build_object('type',kind,'item_id',a->>'item_id') then raise exception 'invalid_action'; end if;
  elsif kind='choose_job' then
   if not(a ? 'job_id') or jsonb_typeof(a->'job_id')<>'string' or a<>jsonb_build_object('type',kind,'job_id',a->>'job_id') then raise exception 'invalid_action'; end if;
  else raise exception 'invalid_action'; end if;
 end loop;
 command:=jsonb_build_object('operation','actions','run_id',run_id,'expected_revision',expected_revision,'actions',actions);
 perform 1 from game_private.profiles p where p.user_id=owner_id for update;
 if not found then raise exception 'run_not_found'; end if;
 if not exists(select 1 from game_private.runs x where x.id=run_id and x.user_id=owner_id) then raise exception 'run_not_found'; end if;
 select * into previous from game_private.receipts c where c.user_id=owner_id and c.request_id=submit_actions.request_id;
 if found then
  if previous.payload<>command then raise exception 'request_id_reused'; end if;
  if previous.response is null then raise exception 'receipt_expired'; end if;
  return previous.response;
 end if;
 select * into r from game_private.runs x where x.id=run_id and x.user_id=owner_id for update;
 select c.config into config from game_private.catalogs c where c.version=r.version;
 if r.revision<>expected_revision then reason:='revision_conflict'; elsif r.status='dead' then reason:='run_ended';
 elsif r.revision=2147483647 or r.actions>2147483627 or (select p.completed_runs=2147483647 from game_private.profiles p where p.user_id=owner_id) then reason:='numeric_limit'; end if;
 insert into game_private.rate_state(user_id) values(owner_id) on conflict do nothing;
 select * into budget from game_private.rate_state b where b.user_id=owner_id for update;
 now_at:=clock_timestamp(); budget.tokens:=least(8,budget.tokens+greatest(0,extract(epoch from now_at-budget.updated_at))*4);
 if reason is null then
 for a in select value from jsonb_array_elements(actions) loop
  kind:=a->>'type'; item:=a->>'item_id'; price:=0; reward:=0;
  before_money:=r.money; before_hunger:=r.hunger; before_sanity:=r.sanity;
  if kind='work' then
   job:=config->'jobs'->r.job_id;
   if not (r.equipment @> (job->'requires')) then reason:='job_locked'; exit; end if;
   if budget.tokens<1 then reason:='rate_limited'; exit; end if;
   reward:=(job->>'reward')::numeric;
   if r.job_id='begging' and random()<0.1 then reward:=2; end if;
   if r.job_id='freelancer' then reward:=reward+(config->>'skillReward')::numeric*r.skill_level; end if;
   reward:=greatest(1,floor(reward*(case when r.sanity>=50 then 100 when r.sanity>=20 then 80 else 60 end)/100));
   if r.money+reward>=power(10::numeric,60) or r.earned+reward>=power(10::numeric,60) or (select p.lifetime_earned+reward>=power(10::numeric,60) from game_private.profiles p where p.user_id=owner_id) then reason:='numeric_limit'; exit; end if;
   budget.tokens:=budget.tokens-1; r.money:=r.money+reward; r.earned:=r.earned+reward;
   r.hunger:=greatest(0,r.hunger-(job->>'hunger')::integer); r.sanity:=greatest(0,r.sanity-(job->>'sanity')::integer);
   update game_private.profiles p set lifetime_earned=p.lifetime_earned+reward,best_run_earned=greatest(p.best_run_earned,r.earned) where p.user_id=owner_id;
  elsif kind='eat' then
   if not(config->'food' ? item) then reason:='unknown_item'; exit; end if;
   if r.hunger=100 then reason:='need_full'; exit; end if;
   price:=(config->'food'->item->>'price')::numeric;
   if r.money<price then reason:='insufficient_money'; exit; end if;
   r.money:=r.money-price; r.hunger:=least(100,r.hunger+(config->'food'->item->>'hunger')::integer);
  elsif kind='rest' then
   if r.sanity=100 then reason:='need_full'; exit; end if;
   r.sanity:=least(100,r.sanity+(config->'rest'->>'sanity')::integer); r.hunger:=greatest(0,r.hunger-(config->'rest'->>'hunger')::integer);
  elsif kind='buy_equipment' then
   if not(config->'equipment' ? item) then reason:='unknown_item'; exit; end if;
   if r.equipment ? item then reason:='already_owned'; exit; end if;
   if item='delivery_kit' and not(r.equipment ? 'bike') or item='laptop' and not(r.equipment ? 'delivery_kit') then reason:='equipment_locked'; exit; end if;
   price:=(config->'equipment'->>item)::numeric;
   if r.money<price then reason:='insufficient_money'; exit; end if;
   r.money:=r.money-price; r.equipment:=r.equipment||jsonb_build_array(item);
  elsif kind='choose_job' then
   item:=a->>'job_id'; job:=config->'jobs'->item;
   if job is null then reason:='unknown_job'; exit; end if;
   if not(r.equipment @> (job->'requires')) then reason:='job_locked'; exit; end if;
   if item=r.job_id then reason:='already_selected'; exit; end if;
   r.job_id:=item;
  elsif kind='buy_skill_level' then
   if not(r.equipment ? 'laptop') then reason:='job_locked'; exit; end if;
   if r.skill_level>=1000000 then reason:='numeric_limit'; exit; end if;
   price:=(config->>'skillPrice')::numeric*power(r.skill_level::numeric+1,2);
   if r.money<price then reason:='insufficient_money'; exit; end if;
   r.money:=r.money-price; r.skill_level:=r.skill_level+1;
  end if;
  processed:=processed+1; r.actions:=r.actions+1;
  outcomes:=outcomes||jsonb_build_array(jsonb_build_object('type',kind,'moneyDelta',(r.money-before_money)::text,'hungerDelta',r.hunger-before_hunger,'sanityDelta',r.sanity-before_sanity));
  if r.hunger=0 then
   r.status:='dead'; r.ended_at:=clock_timestamp(); reason:='run_ended';
   update game_private.profiles p set completed_runs=p.completed_runs+1 where p.user_id=owner_id; exit;
  end if;
 end loop;
 end if;
 if processed>0 then
  r.revision:=r.revision+1;
  update game_private.runs x set status=r.status,money=r.money,earned=r.earned,hunger=r.hunger,sanity=r.sanity,job_id=r.job_id,skill_level=r.skill_level,equipment=r.equipment,revision=r.revision,actions=r.actions,ended_at=r.ended_at where x.id=r.id;
 end if;
 update game_private.rate_state b set tokens=budget.tokens,updated_at=now_at where b.user_id=owner_id;
 result:=jsonb_build_object('snapshot',game_private.snapshot(owner_id),'requestId',request_id,'processed',processed,'stopReason',reason,'outcomes',outcomes);
 insert into game_private.receipts values(owner_id,request_id,command,result,clock_timestamp()); return result;
end $$;

revoke execute on all functions in schema game_private from public,anon,authenticated;
revoke execute on function public.get_game_snapshot(),public.start_run(uuid),public.submit_actions(uuid,uuid,integer,jsonb) from public,anon,authenticated;
grant execute on function public.get_game_snapshot(),public.start_run(uuid),public.submit_actions(uuid,uuid,integer,jsonb) to authenticated;
