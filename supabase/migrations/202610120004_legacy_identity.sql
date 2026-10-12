-- Preserve earned legacy identity by default, while respecting deliberate customization.
alter table game_private.players_v2 add column showcase_customized boolean not null default false;
update game_private.players_v2 set showcase_customized=true where settings<>
 '{"name":"Player","avatar":"person","visible":false,"showJob":true,"showTotal":true,"titleId":null,"qualificationId":null,"itemIds":[]}'::jsonb;

create function game_private.v2_auto_title(owner_id uuid) returns jsonb language sql stable set search_path='' as $$
 with player as (select state,catalog_version from game_private.players_v2 where user_id=owner_id),
 versions as (select catalog_version as version from player union select l->>'catalogVersion' from player cross join lateral jsonb_array_elements(state->'legacy') l),
 candidates as (
  select j, c.version from player p cross join versions v join game_private.catalogs_v2 c on c.version=v.version
  cross join lateral jsonb_array_elements(c.config->'jobs') j
  where coalesce((p.state->'jobEarnings'->>(j->>'id'))::numeric,0)>0
 )
 select j from candidates order by (j->>'baseEarnings')::numeric desc,
  coalesce((j->'requirements'->>'familyExperienceDays')::integer,0) desc,j->>'id',version limit 1;
$$;
revoke all on function game_private.v2_auto_title(uuid) from public,anon,authenticated;

create or replace function game_private.v2_showcase(owner_id uuid) returns jsonb language plpgsql set search_path='' as $$
declare p game_private.players_v2; cfg jsonb; settings jsonb; result jsonb; title jsonb; selected text; value jsonb;
 items jsonb:='[]'; qualification jsonb; current boolean; historical jsonb; college_id text; college jsonb;
begin
 select * into p from game_private.players_v2 x where x.user_id=owner_id;
 if not found or p.state is null then return null; end if;
 cfg:=(select config from game_private.catalogs_v2 where version=p.catalog_version); settings:=p.settings;
 selected:=case when p.showcase_customized then settings->>'titleId' else game_private.v2_auto_title(owner_id)->>'id' end;
 select j into title from jsonb_array_elements(cfg->'jobs') j where j->>'id'=selected;
 if title is null and selected is not null then select j into title from jsonb_array_elements(p.state->'legacy') l
  join game_private.catalogs_v2 c on c.version=l->>'catalogVersion'
  cross join lateral jsonb_array_elements(c.config->'jobs') j where j->>'id'=selected limit 1; end if;
 if not p.showcase_customized then title:=game_private.v2_auto_title(owner_id); end if;
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
create or replace function public.update_game_showcase(settings jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
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
 update game_private.players_v2 x set showcase_customized=true,settings=update_game_showcase.settings||jsonb_build_object('name',btrim(update_game_showcase.settings->>'name')) where x.user_id=owner_id;
 return game_private.v2_showcase(owner_id);
end $$;

create or replace function public.get_my_game_showcase() returns jsonb language sql security definer set search_path='' as $$
 select case when p.showcase_customized then p.settings else p.settings||jsonb_build_object('titleId',game_private.v2_auto_title(p.user_id)->>'id') end
 from game_private.players_v2 p where p.user_id=auth.uid();
$$;
-- CREATE OR REPLACE retains the existing narrow ACLs; state tables remain private.
