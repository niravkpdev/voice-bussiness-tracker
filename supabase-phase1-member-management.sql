-- Phase 1 remaining feature: Owner invite/member management UI support.
-- Safe to run more than once. If the earlier role-aware RLS migration was not
-- applied, this file creates the company_members dependency needed by the UI.

create table if not exists public.company_members (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  business_id text not null default 'default',
  user_id uuid references auth.users(id) on delete cascade,
  role text not null default 'staff',
  status text not null default 'active',
  invited_at timestamptz not null default now(),
  joined_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  invited_email text,
  display_name text,
  constraint company_members_role_check check (role in ('owner', 'manager', 'accountant', 'staff')),
  constraint company_members_status_check check (status in ('active', 'invited', 'disabled')),
  constraint company_members_business_id_not_blank check (length(trim(business_id)) > 0)
);

alter table public.company_members enable row level security;

alter table public.company_members
  alter column user_id drop not null;

alter table public.company_members
  add column if not exists invited_email text,
  add column if not exists display_name text;

create index if not exists company_members_invited_email_idx
  on public.company_members (owner_user_id, business_id, lower(invited_email));

create unique index if not exists company_members_pending_email_unique_idx
  on public.company_members (owner_user_id, business_id, lower(invited_email))
  where user_id is null and invited_email is not null;

create unique index if not exists company_members_user_unique_idx
  on public.company_members (owner_user_id, business_id, user_id)
  where user_id is not null;

create or replace function public.current_user_role(p_owner_user_id uuid, p_business_id text default 'default')
returns text
language sql
stable
security definer
set search_path = public
as $$
  select case
    when auth.uid() is null then null
    when auth.uid() = p_owner_user_id then 'owner'
    else (
      select lower(cm.role)
      from public.company_members cm
      where cm.owner_user_id = p_owner_user_id
        and cm.business_id = coalesce(nullif(trim(p_business_id), ''), 'default')
        and cm.user_id = auth.uid()
        and cm.status = 'active'
      limit 1
    )
  end
$$;

create or replace function public.has_company_role(
  p_owner_user_id uuid,
  p_business_id text,
  p_allowed_roles text[]
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_user_role(p_owner_user_id, p_business_id) = any(p_allowed_roles), false)
$$;

drop policy if exists "Members read own memberships" on public.company_members;
drop policy if exists "Owners manage company memberships" on public.company_members;

create policy "Members read own memberships" on public.company_members
for select
using (
  auth.uid() = user_id
  or public.has_company_role(owner_user_id, business_id, array['owner'])
);

create policy "Owners manage company memberships" on public.company_members
for all
using (public.has_company_role(owner_user_id, business_id, array['owner']))
with check (public.has_company_role(owner_user_id, business_id, array['owner']));

create or replace function public.normalize_member_role(p_role text)
returns text
language sql
immutable
as $$
  select case lower(coalesce(nullif(trim(p_role), ''), 'staff'))
    when 'owner' then 'owner'
    when 'manager' then 'manager'
    when 'accountant' then 'accountant'
    else 'staff'
  end
$$;

create or replace function public.normalize_member_status(p_status text)
returns text
language sql
immutable
as $$
  select case lower(coalesce(nullif(trim(p_status), ''), 'invited'))
    when 'active' then 'active'
    when 'disabled' then 'disabled'
    else 'invited'
  end
$$;

create or replace function public.invite_company_member(
  p_owner_user_id uuid,
  p_business_id text,
  p_email text,
  p_name text default '',
  p_role text default 'staff'
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_actor uuid := auth.uid();
  v_business_id text := coalesce(nullif(trim(p_business_id), ''), 'default');
  v_email text := lower(trim(p_email));
  v_role text := public.normalize_member_role(p_role);
  v_name text := nullif(trim(coalesce(p_name, '')), '');
  v_target_user_id uuid;
  v_member public.company_members%rowtype;
  v_existing_pending_id uuid;
  v_existing_user_id uuid;
begin
  if v_actor is null then
    raise exception 'Authentication required.' using errcode = '28000';
  end if;

  if v_actor <> p_owner_user_id or not public.has_company_role(p_owner_user_id, v_business_id, array['owner']) then
    raise exception 'Only the company owner can invite members.' using errcode = '42501';
  end if;

  if v_email !~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$' then
    raise exception 'Enter a valid member email.' using errcode = '22023';
  end if;

  if v_role = 'owner' then
    raise exception 'Owner role cannot be assigned from invite flow.' using errcode = '42501';
  end if;

  select u.id
    into v_target_user_id
  from auth.users u
  where lower(u.email) = v_email
  limit 1;

  if v_target_user_id = v_actor then
    raise exception 'You cannot invite or change your own membership.' using errcode = '42501';
  end if;

  if v_target_user_id is null then
    select id
      into v_existing_pending_id
    from public.company_members
    where owner_user_id = p_owner_user_id
      and business_id = v_business_id
      and user_id is null
      and lower(invited_email) = v_email
    limit 1
    for update;

    if v_existing_pending_id is not null then
      update public.company_members
         set role = v_role,
             status = 'invited',
             display_name = coalesce(v_name, display_name),
             invited_at = now(),
             updated_at = now()
       where id = v_existing_pending_id
       returning * into v_member;

      return jsonb_build_object('member', to_jsonb(v_member));
    end if;
  else
    select id
      into v_existing_user_id
    from public.company_members
    where owner_user_id = p_owner_user_id
      and business_id = v_business_id
      and user_id = v_target_user_id
    limit 1
    for update;

    if v_existing_user_id is not null then
      update public.company_members
         set role = v_role,
             status = 'invited',
             invited_email = v_email,
             display_name = coalesce(v_name, display_name),
             invited_at = now(),
             joined_at = coalesce(joined_at, now()),
             updated_at = now()
       where id = v_existing_user_id
       returning * into v_member;

      return jsonb_build_object('member', to_jsonb(v_member));
    end if;
  end if;

  insert into public.company_members (
    owner_user_id,
    business_id,
    user_id,
    role,
    status,
    invited_email,
    display_name,
    invited_at,
    joined_at
  )
  values (
    p_owner_user_id,
    v_business_id,
    v_target_user_id,
    v_role,
    'invited',
    v_email,
    v_name,
    now(),
    case when v_target_user_id is not null then now() else null end
  )
  returning * into v_member;

  return jsonb_build_object('member', to_jsonb(v_member));
end;
$$;

create or replace function public.update_company_member(
  p_member_id uuid,
  p_role text default null,
  p_status text default null,
  p_name text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_existing public.company_members%rowtype;
  v_member public.company_members%rowtype;
  v_role text;
  v_status text;
begin
  if v_actor is null then
    raise exception 'Authentication required.' using errcode = '28000';
  end if;

  select * into v_existing
  from public.company_members
  where id = p_member_id
  for update;

  if v_existing.id is null then
    raise exception 'Member not found.' using errcode = '02000';
  end if;

  if not public.has_company_role(v_existing.owner_user_id, v_existing.business_id, array['owner']) then
    raise exception 'Only the company owner can update members.' using errcode = '42501';
  end if;

  if v_existing.user_id = v_actor then
    raise exception 'You cannot change your own role or status.' using errcode = '42501';
  end if;

  v_role := case when p_role is null then v_existing.role else public.normalize_member_role(p_role) end;
  v_status := case when p_status is null then v_existing.status else public.normalize_member_status(p_status) end;

  if v_role = 'owner' then
    raise exception 'Owner role cannot be assigned from member management.' using errcode = '42501';
  end if;

  update public.company_members
     set role = v_role,
         status = v_status,
         display_name = coalesce(nullif(trim(p_name), ''), display_name),
         joined_at = case when v_status = 'active' and joined_at is null then now() else joined_at end,
         updated_at = now()
   where id = p_member_id
   returning * into v_member;

  return jsonb_build_object('member', to_jsonb(v_member));
end;
$$;

create or replace function public.remove_company_member(p_member_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_existing public.company_members%rowtype;
begin
  if v_actor is null then
    raise exception 'Authentication required.' using errcode = '28000';
  end if;

  select * into v_existing
  from public.company_members
  where id = p_member_id
  for update;

  if v_existing.id is null then
    raise exception 'Member not found.' using errcode = '02000';
  end if;

  if not public.has_company_role(v_existing.owner_user_id, v_existing.business_id, array['owner']) then
    raise exception 'Only the company owner can remove members.' using errcode = '42501';
  end if;

  if v_existing.user_id = v_actor then
    raise exception 'You cannot remove your own membership.' using errcode = '42501';
  end if;

  delete from public.company_members
  where id = p_member_id;

  return jsonb_build_object('removed', true, 'memberId', p_member_id);
end;
$$;
