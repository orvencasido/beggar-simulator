-- Additive lifetime protocol. Player input never reaches trusted commit RPCs.
create table game_private.catalogs_v2 (
 version text primary key check(length(version) between 1 and 80),
 digest text not null check(digest ~ '^[a-f0-9]{64}$'),
 config jsonb not null check(jsonb_typeof(config)='object'),
 published_at timestamptz not null default clock_timestamp()
);
create trigger catalogs_v2_immutable before update or delete on game_private.catalogs_v2
 for each row execute function game_private.immutable_catalog();
create table game_private.catalog_default_v2 (
 singleton boolean primary key default true check(singleton),
 version text not null references game_private.catalogs_v2(version)
);
create table game_private.players_v2 (
 user_id uuid primary key references auth.users(id) on delete cascade,
 public_id uuid unique not null default gen_random_uuid(),
 catalog_version text not null references game_private.catalogs_v2(version),
 seed integer not null check(seed between 1 and 2147483646),
 session_id uuid not null default gen_random_uuid(),
 device_id text not null check(length(device_id) between 1 and 128),
 state jsonb check(state is null or (jsonb_typeof(state)='object' and state->>'protocolVersion'='2')),
 revision integer not null default 0 check(revision>=0),
 sequence bigint not null default 0 check(sequence>=0 and sequence<=9007199254740991),
 day_tokens numeric not null default 8 check(day_tokens between 0 and 1200),
 checkpoint_at timestamptz not null default clock_timestamp(),
 settings jsonb not null default '{"name":"Player","avatar":"person","visible":false,"showJob":true,"showTotal":true,"titleId":null,"qualificationId":null,"itemIds":[]}',
 created_at timestamptz not null default clock_timestamp()
);
create table game_private.receipts_v2 (
 user_id uuid not null references game_private.players_v2(user_id) on delete cascade,
 request_id uuid not null,
 payload jsonb not null,
 response jsonb,
 created_at timestamptz not null default clock_timestamp(),
 primary key(user_id,request_id)
);
create table game_private.job_scores_v2 (
 user_id uuid not null references game_private.players_v2(user_id) on delete cascade,
 job_id text not null check(length(job_id) between 1 and 100),
 earnings numeric(60,0) not null check(earnings>=0 and earnings<>'NaN'::numeric),
 primary key(user_id,job_id)
);
create index job_scores_v2_board on game_private.job_scores_v2(job_id,earnings desc,user_id);
create table game_private.life_history_v2 (
 user_id uuid not null references game_private.players_v2(user_id) on delete cascade,
 life_id text not null,
 chapter jsonb not null check(jsonb_typeof(chapter)='object'),
 recorded_at timestamptz not null default clock_timestamp(),
 primary key(user_id,life_id)
);
alter table game_private.catalogs_v2 enable row level security;
alter table game_private.catalog_default_v2 enable row level security;
alter table game_private.players_v2 enable row level security;
alter table game_private.receipts_v2 enable row level security;
alter table game_private.job_scores_v2 enable row level security;
alter table game_private.life_history_v2 enable row level security;
revoke all on game_private.catalogs_v2,game_private.catalog_default_v2,game_private.players_v2,
 game_private.receipts_v2,game_private.job_scores_v2,game_private.life_history_v2 from public,anon,authenticated;

create function public.publish_game_catalog(catalog jsonb,catalog_digest text,activate boolean default false)
 returns jsonb language plpgsql security definer set search_path='' as $$
declare version_id text:=catalog->'manifest'->>'version'; existing game_private.catalogs_v2; group_id text; entry jsonb;
begin
 -- Service-only entry point. The trusted publisher must validate the shared engine schema.
 if version_id is null or length(version_id) not between 1 and 80 or jsonb_typeof(catalog)<>'object'
  or catalog->'manifest'->>'schemaVersion'<>'2' or catalog->'manifest'->>'engineVersion'<>'2'
  or catalog_digest is null or catalog_digest!~'^[a-f0-9]{64}$' then raise exception 'invalid_catalog'; end if;
 if not(catalog ?& ARRAY['manifest','jobs','items','careers','colleges','qualifications','goals','ambitions','opportunities','economy']) then raise exception 'invalid_catalog'; end if;
 foreach group_id in array ARRAY['jobs','items','careers','colleges','qualifications','goals','ambitions','opportunities'] loop
  if jsonb_typeof(catalog->group_id)<>'array' or jsonb_array_length(catalog->group_id)>10000 then raise exception 'invalid_catalog'; end if;
  if (select count(*) from jsonb_array_elements(catalog->group_id))<>(select count(distinct x->>'id') from jsonb_array_elements(catalog->group_id) x) then raise exception 'duplicate_catalog_id'; end if;
  for entry in select value from jsonb_array_elements(catalog->group_id) loop
   if entry->>'id' is null or entry->>'id'!~'^[a-z][a-z0-9_]{0,63}$' or jsonb_typeof(entry->'name')<>'string' then raise exception 'invalid_catalog_record'; end if;
   if group_id='jobs' and (entry->>'baseEarnings' is null or entry->>'baseEarnings'!~'^(0|[1-9][0-9]{0,59})$' or entry->>'maxEarnings'!~'^(0|[1-9][0-9]{0,59})$') then raise exception 'invalid_catalog_money'; end if;
   if group_id='items' and (entry->>'price' is null or entry->>'price'!~'^(0|[1-9][0-9]{0,59})$') then raise exception 'invalid_catalog_money'; end if;
   if group_id='qualifications' and (entry->>'tuition' is null or entry->>'tuition'!~'^(0|[1-9][0-9]{0,59})$') then raise exception 'invalid_catalog_money'; end if;
  end loop;
 end loop;
 if not exists(select 1 from jsonb_array_elements(catalog->'jobs') j where j->>'id'=catalog->'economy'->>'starterJobId') then raise exception 'starter_job_missing'; end if;
 perform pg_advisory_xact_lock(20261011,2);
 select * into existing from game_private.catalogs_v2 c where c.version=version_id;
 if found then
  if existing.digest<>catalog_digest or existing.config<>catalog then raise exception 'catalog_version_immutable'; end if;
 else insert into game_private.catalogs_v2(version,digest,config) values(version_id,catalog_digest,catalog); end if;
 if activate then insert into game_private.catalog_default_v2(singleton,version) values(true,version_id)
  on conflict(singleton) do update set version=excluded.version; end if;
 return jsonb_build_object('version',version_id,'digest',catalog_digest,'active',activate);
end $$;

create function game_private.v2_context(owner_id uuid) returns jsonb language sql set search_path='' as $$
 select jsonb_build_object('state',p.state,'catalog',c.config,'revision',p.revision,'seq',p.sequence,
  'sequence',p.sequence,'nextCatalog',(select n.config from game_private.catalog_default_v2 d join game_private.catalogs_v2 n on n.version=d.version),'seed',p.seed,'sessionId',p.session_id,
  'dayAllowance',floor(least(1200,p.day_tokens+greatest(0,extract(epoch from(clock_timestamp()-p.checkpoint_at)))*4)),
  'serverTime',clock_timestamp(),'leaseUntil',p.checkpoint_at+interval '5 minutes',
  'writerDeviceId',p.device_id,'legacyV1',game_private.snapshot(owner_id))
 from game_private.players_v2 p join game_private.catalogs_v2 c on c.version=p.catalog_version where p.user_id=owner_id;
$$;
create function public.get_game_v2_context(owner_id uuid,device_id text,request_id uuid,payload jsonb)
 returns jsonb language plpgsql security definer set search_path='' as $$
declare previous game_private.receipts_v2; result jsonb;
begin
 if owner_id is null or device_id is null or length(device_id) not between 1 and 128 or request_id is null
  or payload is null or jsonb_typeof(payload)<>'object' or octet_length(payload::text)>65536 then raise exception 'invalid_request'; end if;
 insert into game_private.players_v2(user_id,catalog_version,seed,device_id)
 select owner_id,d.version,(floor(random()*2147483645)+1)::integer,device_id
 from game_private.catalog_default_v2 d on conflict(user_id) do nothing;
 perform 1 from game_private.players_v2 p where p.user_id=owner_id for update;
 if not found then raise exception 'catalog_unavailable'; end if;
 select * into previous from game_private.receipts_v2 r where r.user_id=owner_id and r.request_id=get_game_v2_context.request_id;
 if found then
  if previous.payload<>payload then raise exception 'request_id_reused'; end if;
  if previous.response is null then raise exception 'receipt_expired'; end if;
  return game_private.v2_context(owner_id)||jsonb_build_object('receipt',previous.response);
 end if;
 -- A deliberate idle bootstrap renews the same writer's bounded allowance.
 -- Pending journals use sync and never renew before replay, so expiry cannot mint days.
 if payload->>'operation'='bootstrap' then
  update game_private.players_v2 p set day_tokens=least(1200,p.day_tokens+greatest(0,extract(epoch from(clock_timestamp()-p.checkpoint_at)))*4),
   checkpoint_at=clock_timestamp()
   where p.user_id=owner_id and p.device_id=get_game_v2_context.device_id and p.state is not null;
 end if;
 result:=game_private.v2_context(owner_id);
 if result->>'writerDeviceId'<>device_id or (payload ? 'sessionId' and payload->>'sessionId'<>result->>'sessionId') then result:=result||jsonb_build_object('conflict','writer_conflict'); end if;
 return result;
end $$;
create function public.initialize_game_v2(owner_id uuid,device_id text,state jsonb,catalog_version text,seed integer)
 returns jsonb language plpgsql security definer set search_path='' as $$
declare p game_private.players_v2;
begin
 insert into game_private.profiles(user_id) values(owner_id) on conflict do nothing;
 perform 1 from game_private.profiles x where x.user_id=owner_id for update;
 select * into p from game_private.players_v2 x where x.user_id=owner_id for update;
 if not found then raise exception 'bootstrap_required'; end if;
 if p.device_id<>device_id then raise exception 'writer_conflict'; end if;
 if p.state is not null then return game_private.v2_context(owner_id); end if;
 if p.catalog_version<>catalog_version or p.seed<>seed or state->>'catalogVersion'<>catalog_version
  or (state->>'seed')::integer<>seed or state->>'protocolVersion'<>'2'
  or state->>'lifeId'<>p.session_id::text then raise exception 'invalid_initial_state'; end if;
 update game_private.players_v2 x set state=initialize_game_v2.state where x.user_id=owner_id;
 return game_private.v2_context(owner_id);
end $$;

create function public.commit_game_v2(owner_id uuid,device_id text,request_id uuid,payload jsonb,
 expected_revision integer,expected_seq bigint,next_seq bigint,days_used integer,state jsonb,response jsonb)
 returns jsonb language plpgsql security definer set search_path='' as $$
declare p game_private.players_v2; previous game_private.receipts_v2; allowance numeric; now_at timestamptz:=clock_timestamp();
 pair record; old_total numeric; result jsonb; chapter jsonb;
begin
 if request_id is null or payload is null or jsonb_typeof(payload)<>'object' or octet_length(payload::text)>65536
  or expected_revision is null or expected_seq is null or next_seq is null or days_used is null
  or next_seq-expected_seq not between 0 and 512 or days_used not between 0 and 512 then raise exception 'invalid_request'; end if;
 select * into p from game_private.players_v2 x where x.user_id=owner_id for update;
 if not found then raise exception 'bootstrap_required'; end if;
 select * into previous from game_private.receipts_v2 r where r.user_id=owner_id and r.request_id=commit_game_v2.request_id;
 if found then
  if previous.payload<>payload then raise exception 'request_id_reused'; end if;
  if previous.response is null then raise exception 'receipt_expired'; end if;
  return previous.response;
 end if;
 if p.device_id<>device_id or payload->>'sessionId' is distinct from p.session_id::text then raise exception 'writer_conflict'; end if;
 if p.state is null then raise exception 'initialize_required'; end if;
 if p.revision<>expected_revision or p.sequence<>expected_seq then raise exception 'revision_conflict'; end if;
 allowance:=least(1200,p.day_tokens+greatest(0,extract(epoch from(now_at-p.checkpoint_at)))*4);
 if days_used>floor(allowance) then raise exception 'rate_limited'; end if;
 if state is null or not(state ?& ARRAY['protocolVersion','catalogVersion','seed','jobEarnings','legacy','workEarned','money']) or jsonb_typeof(state)<>'object' or state->>'protocolVersion'<>'2'
  or not exists(select 1 from game_private.catalogs_v2 c where c.version=state->>'catalogVersion')
  or (state->>'catalogVersion'<>p.catalog_version and coalesce((state->>'rebirthCount')::integer,0)<=coalesce((p.state->>'rebirthCount')::integer,0))
  or (state->>'seed')::integer<>p.seed
  or jsonb_typeof(state->'jobEarnings')<>'object' or jsonb_typeof(state->'legacy')<>'array'
  or state->>'workEarned'!~'^[0-9]{1,60}$' or state->>'money'!~'^[0-9]{1,60}$'
  or (state->>'workEarned')::numeric<(p.state->>'workEarned')::numeric then raise exception 'invalid_verified_state'; end if;
 for pair in select key,value from jsonb_each_text(state->'jobEarnings') loop
  if pair.value!~'^[0-9]{1,60}$' then raise exception 'invalid_verified_score'; end if;
  select earnings into old_total from game_private.job_scores_v2 j where j.user_id=owner_id and j.job_id=pair.key;
  if found and old_total>pair.value::numeric then raise exception 'score_regression'; end if;
  insert into game_private.job_scores_v2(user_id,job_id,earnings) values(owner_id,pair.key,pair.value::numeric)
   on conflict(user_id,job_id) do update set earnings=excluded.earnings;
 end loop;
 if exists(select 1 from game_private.job_scores_v2 j where j.user_id=owner_id and not (state->'jobEarnings' ? j.job_id)) then raise exception 'score_regression'; end if;
 for chapter in select value from jsonb_array_elements(state->'legacy') loop
  if chapter->>'lifeId' is null then raise exception 'invalid_legacy'; end if;
  insert into game_private.life_history_v2(user_id,life_id,chapter) values(owner_id,chapter->>'lifeId',chapter)
   on conflict(user_id,life_id) do nothing;
 end loop;
 update game_private.players_v2 x set state=commit_game_v2.state,catalog_version=commit_game_v2.state->>'catalogVersion',sequence=next_seq,
  revision=p.revision+case when next_seq>expected_seq then 1 else 0 end,
  day_tokens=allowance-days_used,checkpoint_at=now_at where x.user_id=owner_id;
 result:=coalesce(response,'{}'::jsonb)||jsonb_build_object('state',state,
  'revision',p.revision+case when next_seq>expected_seq then 1 else 0 end,'sequence',next_seq,'seq',next_seq,
  'requestId',request_id,'serverTime',now_at,'leaseUntil',now_at+interval '5 minutes');
 insert into game_private.receipts_v2(user_id,request_id,payload,response) values(owner_id,request_id,payload,result);
 return result;
end $$;

create function public.get_game_v2_snapshot() returns jsonb language plpgsql security definer set search_path='' as $$
declare owner_id uuid:=auth.uid();
begin if owner_id is null then raise exception 'authentication_required'; end if;
 return game_private.v2_context(owner_id); end $$;
create function public.takeover_game_v2(device_id text,acknowledge boolean) returns jsonb language plpgsql security definer set search_path='' as $$
declare owner_id uuid:=auth.uid();
begin
 if owner_id is null then raise exception 'authentication_required'; end if;
 if acknowledge is distinct from true or device_id is null or length(device_id) not between 1 and 128 then raise exception 'acknowledgement_required'; end if;
 update game_private.players_v2 p set device_id=takeover_game_v2.device_id,session_id=gen_random_uuid(),revision=revision+1,
  day_tokens=8,checkpoint_at=clock_timestamp() where p.user_id=owner_id;
 if not found then raise exception 'bootstrap_required'; end if;
 return game_private.v2_context(owner_id);
end $$;

-- Preserve legacy records; reject a second writer economy only after explicit v2 initialization.
create function game_private.guard_v1_writer() returns trigger language plpgsql set search_path='' as $$
begin
 if exists(select 1 from game_private.players_v2 p where p.user_id=new.user_id and p.state is not null)
  then raise exception 'legacy_read_only'; end if;
 return new;
end $$;
create trigger runs_v1_transition_guard before insert or update on game_private.runs
 for each row execute function game_private.guard_v1_writer();

revoke all on function public.publish_game_catalog(jsonb,text,boolean),
 public.get_game_v2_context(uuid,text,uuid,jsonb),public.initialize_game_v2(uuid,text,jsonb,text,integer),
 public.commit_game_v2(uuid,text,uuid,jsonb,integer,bigint,bigint,integer,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.publish_game_catalog(jsonb,text,boolean),
 public.get_game_v2_context(uuid,text,uuid,jsonb),public.initialize_game_v2(uuid,text,jsonb,text,integer),
 public.commit_game_v2(uuid,text,uuid,jsonb,integer,bigint,bigint,integer,jsonb,jsonb) to service_role;
revoke all on function public.get_game_v2_snapshot(),public.takeover_game_v2(text,boolean) from public,anon;
grant execute on function public.get_game_v2_snapshot(),public.takeover_game_v2(text,boolean) to authenticated;
revoke all on function game_private.v2_context(uuid),game_private.guard_v1_writer() from public,anon,authenticated;

-- Each selected credential is resolved from authoritative current/legacy state.
create function game_private.v2_showcase(owner_id uuid) returns jsonb language plpgsql set search_path='' as $$
declare p game_private.players_v2; cfg jsonb; settings jsonb; result jsonb; title jsonb; selected text; value jsonb;
 items jsonb:='[]'; qualification jsonb; current boolean; historical jsonb; college_id text; college jsonb;
begin
 select * into p from game_private.players_v2 x where x.user_id=owner_id;
 if not found or p.state is null then return null; end if;
 cfg:=(select config from game_private.catalogs_v2 where version=p.catalog_version); settings:=p.settings;
 selected:=settings->>'titleId';
 select j into title from jsonb_array_elements(cfg->'jobs') j where j->>'id'=selected;
 if title is null and selected is not null then select j into title from jsonb_array_elements(p.state->'legacy') l
  join game_private.catalogs_v2 c on c.version=l->>'catalogVersion'
  cross join lateral jsonb_array_elements(c.config->'jobs') j where j->>'id'=selected limit 1; end if;
 result:=jsonb_build_object('playerId',p.public_id,'name',settings->>'name','avatar',settings->>'avatar',
  'title',case when title is null then null else title->>'name' end,'titleId',selected,
  'accountLevel',p.state->'accountLevel','rebirthCount',p.state->'rebirthCount','completedLifetimes',p.state->'completedLifetimes');
 if coalesce((settings->>'showJob')::boolean,true) then result:=result||jsonb_build_object('jobId',p.state->>'jobId'); end if;
 if coalesce((settings->>'showTotal')::boolean,true) then result:=result||jsonb_build_object('totalEarnings',p.state->>'workEarned'); end if;
 for selected in select jsonb_array_elements_text(settings->'itemIds') loop
  current:=p.state->'ownedItemIds' ? selected;
  select i into value from jsonb_array_elements(cfg->'items') i where i->>'id'=selected;
  if value is null then
   select i into value from jsonb_array_elements(p.state->'legacy') l
    join game_private.catalogs_v2 c on c.version=l->>'catalogVersion'
    cross join lateral jsonb_array_elements(c.config->'items') i where i->>'id'=selected limit 1;
  end if;
  if value is not null and (current or exists(select 1 from jsonb_array_elements(p.state->'legacy') l where l->'ownedItemIds' ? selected)) then
   items:=items||jsonb_build_array(jsonb_build_object('id',selected,'name',value->>'name','icon',value->>'icon','source',case when current then 'current' else 'past_life' end));
  end if;
 end loop;
 selected:=settings->>'qualificationId';
 if selected is not null then
  current:=p.state->'qualifications' ? selected;
  select q into value from jsonb_array_elements(cfg->'qualifications') q where q->>'id'=selected;
  if value is null then select q into value from jsonb_array_elements(p.state->'legacy') l
   join game_private.catalogs_v2 c on c.version=l->>'catalogVersion'
   cross join lateral jsonb_array_elements(c.config->'qualifications') q where q->>'id'=selected limit 1; end if;
  if value is not null and (current or exists(select 1 from jsonb_array_elements(p.state->'legacy') l where l->'qualifications' ? selected)) then
   college_id:=p.state->'qualificationColleges'->>selected;
   if not current then select l->'qualificationColleges'->>selected into college_id from jsonb_array_elements(p.state->'legacy') l where l->'qualifications' ? selected limit 1; end if;
   select school into college from jsonb_array_elements(cfg->'colleges') school where school->>'id'=college_id;
   if college is null then select school into college from jsonb_array_elements(p.state->'legacy') l
    join game_private.catalogs_v2 c on c.version=l->>'catalogVersion'
    cross join lateral jsonb_array_elements(c.config->'colleges') school where school->>'id'=college_id limit 1; end if;
   qualification:=jsonb_build_object('id',selected,'name',value->>'name','collegeId',college_id,'collegeName',college->>'name','source',case when current then 'current' else 'past_life' end);
  end if;
 end if;
 return result||jsonb_build_object('items',items,'qualification',qualification);
end $$;
create function public.update_game_showcase(settings jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare owner_id uuid:=auth.uid(); p game_private.players_v2; selected text; item_count integer;
begin
 if owner_id is null then raise exception 'authentication_required'; end if;
 if settings is null or not(settings ?& ARRAY['name','avatar','visible','showJob','showTotal','titleId','qualificationId','itemIds']) or jsonb_typeof(settings)<>'object' or octet_length(settings::text)>4096
  or settings-ARRAY['name','avatar','visible','showJob','showTotal','titleId','qualificationId','itemIds']::text[]<>'{}'::jsonb
  or jsonb_typeof(settings->'name')<>'string' or length(btrim(settings->>'name')) not between 2 and 24
  or settings->>'name' ~ '[[:cntrl:]]' or coalesce(settings->>'avatar','person') not in('person','leaf','star','sun','moon')
  or jsonb_typeof(settings->'itemIds')<>'array' or jsonb_array_length(settings->'itemIds')>3
  or jsonb_typeof(settings->'visible')<>'boolean' or jsonb_typeof(settings->'showJob')<>'boolean'
  or jsonb_typeof(settings->'showTotal')<>'boolean' then raise exception 'invalid_showcase'; end if;
 select * into p from game_private.players_v2 x where x.user_id=owner_id for update;
 if not found or p.state is null then raise exception 'initialize_required'; end if;
 if (settings->>'visible')::boolean and not exists(select 1 from auth.users u where u.id=owner_id
  and coalesce((to_jsonb(u)->>'is_anonymous')::boolean,true)=false
  and (nullif(to_jsonb(u)->>'email','') is null or nullif(to_jsonb(u)->>'email_confirmed_at','') is not null)) then raise exception 'linked_account_required'; end if;
 selected:=settings->>'titleId';
 if selected is not null and (not(p.state->'jobEarnings' ? selected) or (p.state->'jobEarnings'->>selected)::numeric<=0) then raise exception 'unearned_title'; end if;
 selected:=settings->>'qualificationId';
 if selected is not null and not(p.state->'qualifications' ? selected) and not exists(select 1 from jsonb_array_elements(p.state->'legacy') l where l->'qualifications' ? selected) then raise exception 'unearned_qualification'; end if;
 for selected in select jsonb_array_elements_text(settings->'itemIds') loop
  if not(p.state->'ownedItemIds' ? selected) and not exists(select 1 from jsonb_array_elements(p.state->'legacy') l where l->'ownedItemIds' ? selected) then raise exception 'unowned_item'; end if;
 end loop;
 select count(distinct value) into item_count from jsonb_array_elements_text(settings->'itemIds');
 if item_count<>jsonb_array_length(settings->'itemIds') then raise exception 'duplicate_showcase_item'; end if;
 update game_private.players_v2 x set settings=update_game_showcase.settings||jsonb_build_object('name',btrim(update_game_showcase.settings->>'name')) where x.user_id=owner_id;
 return game_private.v2_showcase(owner_id);
end $$;
create function public.get_public_game_profile(player_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare owner_id uuid;
begin
 if auth.uid() is null then raise exception 'authentication_required'; end if;
 select user_id into owner_id from game_private.players_v2 p where p.public_id=player_id
  and ((p.settings->>'visible')::boolean or p.user_id=auth.uid());
 if not found then return null; end if;
 return game_private.v2_showcase(owner_id);
end $$;
create function public.get_job_leaderboard(job_id text,limit_count integer default 50)
 returns jsonb language plpgsql security definer set search_path='' as $$
declare owner_id uuid:=auth.uid(); rows jsonb; mine jsonb;
begin
 if owner_id is null then raise exception 'authentication_required'; end if;
 if job_id is null or length(job_id) not between 1 and 100 or limit_count is null or limit_count not between 1 and 50 then raise exception 'invalid_leaderboard'; end if;
 with leaders as (
  select j.user_id,j.earnings,rank() over(order by j.earnings desc) as rank,p.public_id
  from game_private.job_scores_v2 j join game_private.players_v2 p using(user_id)
  where j.job_id=get_job_leaderboard.job_id and j.earnings>0 and (p.settings->>'visible')::boolean
 ), top_rows as (select * from leaders order by earnings desc,public_id limit limit_count)
 select coalesce(jsonb_agg(game_private.v2_showcase(user_id)||jsonb_build_object('jobEarnings',earnings::text,'rank',rank,'boardJobId',get_job_leaderboard.job_id)
  order by earnings desc,public_id),'[]') into rows from top_rows;
 select game_private.v2_showcase(owner_id)||jsonb_build_object('jobEarnings',j.earnings::text,'boardJobId',get_job_leaderboard.job_id,
  'rank',case when (p.settings->>'visible')::boolean then 1+(select count(*) from game_private.job_scores_v2 x
   join game_private.players_v2 v using(user_id) where x.job_id=get_job_leaderboard.job_id and x.earnings>j.earnings and (v.settings->>'visible')::boolean) else null end)
 into mine from game_private.job_scores_v2 j join game_private.players_v2 p using(user_id) where j.user_id=owner_id and j.job_id=get_job_leaderboard.job_id;
 return jsonb_build_object('rows',rows,'myEntry',mine,'asOf',clock_timestamp());
end $$;
revoke all on function game_private.v2_showcase(uuid) from public,anon,authenticated;
revoke all on function public.update_game_showcase(jsonb),public.get_public_game_profile(uuid),public.get_job_leaderboard(text,integer) from public,anon;
grant execute on function public.update_game_showcase(jsonb),public.get_public_game_profile(uuid),public.get_job_leaderboard(text,integer) to authenticated;

-- Owner-only preference read keeps private drafts separate from the public projection.
create function public.get_my_game_showcase() returns jsonb language sql security definer set search_path='' as $$
 select p.settings from game_private.players_v2 p where p.user_id=auth.uid();
$$;
revoke all on function public.get_my_game_showcase() from public,anon;
grant execute on function public.get_my_game_showcase() to authenticated;
