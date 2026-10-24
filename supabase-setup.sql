-- Hand Cricket online rooms. Run this entire script in Supabase SQL Editor.
-- Enable Anonymous Sign-Ins in Authentication -> Sign In / Providers.
create extension if not exists pgcrypto;

create table if not exists public.hc_rooms (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[A-Z0-9]{6}$'),
  host_id uuid not null,
  status text not null default 'lobby' check (status in ('lobby','playing','finished')),
  max_players int not null default 4 check (max_players between 2 and 12),
  team_count int not null default 2 check (team_count between 2 and 4),
  state jsonb not null default '{"round":0,"scores":{},"picks":{},"phase":"lobby"}'::jsonb,
  created_at timestamptz not null default now()
);
create table if not exists public.hc_room_players (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.hc_rooms(id) on delete cascade,
  user_id uuid not null,
  display_name text not null check (char_length(display_name) between 1 and 20),
  team_no int not null default 1 check (team_no between 1 and 4),
  joined_at timestamptz not null default now(),
  unique(room_id,user_id)
);
create index if not exists hc_room_players_room_idx on public.hc_room_players(room_id);

alter table public.hc_rooms enable row level security;
alter table public.hc_room_players enable row level security;

-- SECURITY DEFINER avoids recursive RLS checks when policies need to test room membership.
create or replace function public.hc_is_room_member(p_room_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.hc_room_players p
    where p.room_id = p_room_id
      and p.user_id = auth.uid()
  );
$$;

revoke all on function public.hc_is_room_member(uuid) from public;
grant execute on function public.hc_is_room_member(uuid) to authenticated;

drop policy if exists hc_rooms_member_read on public.hc_rooms;
create policy hc_rooms_member_read on public.hc_rooms
  for select to authenticated
  using (public.hc_is_room_member(id));

drop policy if exists hc_rooms_host_update on public.hc_rooms;
create policy hc_rooms_host_update on public.hc_rooms
  for update to authenticated
  using (host_id = auth.uid())
  with check (host_id = auth.uid());

drop policy if exists hc_players_room_read on public.hc_room_players;
create policy hc_players_room_read on public.hc_room_players
  for select to authenticated
  using (public.hc_is_room_member(room_id));

drop policy if exists hc_players_self_update on public.hc_room_players;
create policy hc_players_self_update on public.hc_room_players
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create or replace function public.hc_create_room(p_name text,p_max int,p_teams int)
returns public.hc_rooms language plpgsql security definer set search_path=public as $$
declare v_room public.hc_rooms; v_code text; v_uid uuid:=auth.uid();
begin
 if v_uid is null then raise exception 'Sign in required'; end if;
 if p_max not between 2 and 12 or p_teams not between 2 and 4 or p_teams>p_max then raise exception 'Invalid room settings'; end if;
 if char_length(trim(p_name)) not between 1 and 20 then raise exception 'Name must be 1-20 characters'; end if;
 loop
   v_code:=upper(substr(replace(gen_random_uuid()::text,'-',''),1,6));
   exit when not exists(select 1 from hc_rooms where code=v_code);
 end loop;
 insert into hc_rooms(code,host_id,max_players,team_count) values(v_code,v_uid,p_max,p_teams) returning * into v_room;
 insert into hc_room_players(room_id,user_id,display_name,team_no) values(v_room.id,v_uid,trim(p_name),1);
 return v_room;
end; $$;

create or replace function public.hc_join_room(p_code text,p_name text)
returns public.hc_rooms language plpgsql security definer set search_path=public as $$
declare v_room public.hc_rooms; v_count int; v_team int; v_uid uuid:=auth.uid();
begin
 if v_uid is null then raise exception 'Sign in required'; end if;
 if char_length(trim(p_name)) not between 1 and 20 then raise exception 'Name must be 1-20 characters'; end if;
 select * into v_room from hc_rooms where code=upper(trim(p_code)) for update;
 if not found then raise exception 'Room code not found'; end if;
 if v_room.status <> 'lobby' then raise exception 'This match has already started'; end if;
 if exists(select 1 from hc_room_players where room_id=v_room.id and user_id=v_uid) then return v_room; end if;
 select count(*) into v_count from hc_room_players where room_id=v_room.id;
 if v_count>=v_room.max_players then raise exception 'Room is full'; end if;
 v_team := (v_count % v_room.team_count)+1;
 insert into hc_room_players(room_id,user_id,display_name,team_no) values(v_room.id,v_uid,trim(p_name),v_team);
 return v_room;
end; $$;

create or replace function public.hc_start_room(p_room_id uuid)
returns public.hc_rooms language plpgsql security definer set search_path=public as $$
declare v_room public.hc_rooms; v_count int;
begin
 select * into v_room from hc_rooms where id=p_room_id for update;
 if not found or v_room.host_id<>auth.uid() then raise exception 'Only the host can start this room'; end if;
 select count(*) into v_count from hc_room_players where room_id=p_room_id;
 if v_count<2 then raise exception 'At least 2 players are required'; end if;
 update hc_rooms set status='playing',state=jsonb_build_object('round',1,'scores','{}'::jsonb,'picks','{}'::jsonb,'phase','picking') where id=p_room_id returning * into v_room;
 return v_room;
end; $$;

create or replace function public.hc_submit_pick(p_room_id uuid,p_value int)
returns public.hc_rooms language plpgsql security definer set search_path=public as $$
declare v_room public.hc_rooms; v_picks jsonb; v_scores jsonb; v_uid text:=auth.uid()::text; v_players int; v_submitted int; v_pick int; v_key text; v_round int;
begin
 if p_value not in (1,2,3,4,5,6,10,20) then raise exception 'Invalid hand value'; end if;
 select * into v_room from hc_rooms where id=p_room_id for update;
 if not found or v_room.status<>'playing' then raise exception 'Match is not active'; end if;
 if not exists(select 1 from hc_room_players where room_id=p_room_id and user_id=auth.uid()) then raise exception 'You are not in this room'; end if;
 v_picks:=coalesce(v_room.state->'picks','{}'::jsonb);
 if v_picks ? v_uid then raise exception 'You already picked this round'; end if;
 v_picks:=v_picks || jsonb_build_object(v_uid,p_value);
 select count(*) into v_players from hc_room_players where room_id=p_room_id;
 select count(*) into v_submitted from jsonb_object_keys(v_picks);
 v_scores:=coalesce(v_room.state->'scores','{}'::jsonb);
 if v_submitted>=v_players then
   -- Team cricket round: each team's distinct values score; matching values cancel out for that player.
   for v_key,v_pick in select key,value::text::int from jsonb_each_text(v_picks) loop
     if (select count(*) from jsonb_each_text(v_picks) x where x.value::int=v_pick)=1 then
       select team_no into v_round from hc_room_players where room_id=p_room_id and user_id=v_key::uuid;
       v_scores:=jsonb_set(v_scores,array[v_round::text],to_jsonb(coalesce((v_scores->>v_round::text)::int,0)+v_pick),true);
     end if;
   end loop;
   update hc_rooms set state=jsonb_build_object('round',coalesce((state->>'round')::int,1)+1,'scores',v_scores,'picks','{}'::jsonb,'phase','picking') where id=p_room_id returning * into v_room;
 else
   update hc_rooms set state=jsonb_set(state,'{picks}',v_picks,true) where id=p_room_id returning * into v_room;
 end if;
 return v_room;
end; $$;

grant execute on function public.hc_create_room(text,int,int) to authenticated;
grant execute on function public.hc_join_room(text,text) to authenticated;
grant execute on function public.hc_start_room(uuid) to authenticated;
grant execute on function public.hc_submit_pick(uuid,int) to authenticated;

do $$ begin
 alter publication supabase_realtime add table public.hc_rooms;
exception when duplicate_object then null; when undefined_object then null; end $$;
do $$ begin
 alter publication supabase_realtime add table public.hc_room_players;
exception when duplicate_object then null; when undefined_object then null; end $$;
