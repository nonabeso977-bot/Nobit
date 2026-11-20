-- NOBIT Training Studio: secure team access and curated dialogue knowledge
-- Run once in Supabase SQL Editor on the NOBIT project.
create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

create table if not exists public.nobit_training_members (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text,
  role text not null check (role in ('owner','trainer')),
  status text not null default 'active' check (status in ('active','suspended')),
  created_at timestamptz not null default now()
);

create table if not exists public.nobit_training_invites (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique,
  created_by uuid not null references auth.users(id),
  expires_at timestamptz not null,
  used_at timestamptz,
  used_by uuid references auth.users(id),
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.nobit_training_entries (
  id uuid primary key default gen_random_uuid(),
  phrase text not null check (char_length(phrase) between 1 and 240),
  reply text not null check (char_length(reply) between 1 and 1200),
  category text not null default 'general' check (char_length(category) <= 60),
  status text not null default 'draft' check (status in ('draft','approved','rejected')),
  created_by uuid not null references auth.users(id),
  reviewed_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists nobit_training_entries_status_idx
  on public.nobit_training_entries(status, created_at desc);
create index if not exists nobit_training_invites_expiry_idx
  on public.nobit_training_invites(expires_at);

create or replace function public.is_nobit_training_owner()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.nobit_training_members m
    where m.user_id = auth.uid()
      and m.role = 'owner'
      and m.status = 'active'
  );
$$;

create or replace function public.redeem_nobit_training_invite(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_user uuid := auth.uid();
  v_invite public.nobit_training_invites%rowtype;
  v_email text;
begin
  if v_user is null then
    raise exception 'يجب تسجيل الدخول أولاً';
  end if;

  select email into v_email from auth.users where id = v_user;

  if exists (
    select 1 from public.nobit_training_members
    where user_id = v_user and status = 'active'
  ) then
    return jsonb_build_object('ok', true, 'message', 'العضوية مفعلة مسبقاً');
  end if;

  select * into v_invite
  from public.nobit_training_invites
  where token_hash = encode(digest(lower(trim(coalesce(p_token,''))), 'sha256'), 'hex')
    and used_at is null
    and revoked_at is null
    and expires_at > now()
  for update;

  if not found then
    raise exception 'رمز الدعوة غير صالح أو منتهي أو مستخدم';
  end if;

  insert into public.nobit_training_members(user_id,email,role,status)
  values (v_user,v_email,'trainer','active')
  on conflict (user_id) do update
    set email = excluded.email, role = 'trainer', status = 'active';

  update public.nobit_training_invites
  set used_at = now(), used_by = v_user
  where id = v_invite.id;

  return jsonb_build_object('ok', true, 'role', 'trainer');
end;
$$;

create or replace function public.create_nobit_training_invite(p_token text, p_expires_at timestamptz)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_id uuid;
begin
  if not public.is_nobit_training_owner() then
    raise exception 'غير مصرح بإنشاء الدعوات';
  end if;
  if length(trim(coalesce(p_token,''))) < 32 then
    raise exception 'رمز الدعوة يجب أن يكون طويلاً وعشوائياً';
  end if;
  if p_expires_at <= now() or p_expires_at > now() + interval '30 days' then
    raise exception 'مدة الدعوة يجب أن تكون خلال 30 يوماً';
  end if;

  insert into public.nobit_training_invites(token_hash,created_by,expires_at)
  values (
    encode(digest(lower(trim(p_token)), 'sha256'), 'hex'),
    auth.uid(),
    p_expires_at
  )
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.approve_nobit_training_entry(p_entry_id uuid, p_approved boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_nobit_training_owner() then
    raise exception 'الاعتماد متاح لمديرة التدريب فقط';
  end if;
  update public.nobit_training_entries
  set status = case when p_approved then 'approved' else 'rejected' end,
      reviewed_by = auth.uid(),
      updated_at = now()
  where id = p_entry_id;
  if not found then
    raise exception 'الاقتراح غير موجود';
  end if;
end;
$$;

alter table public.nobit_training_members enable row level security;
alter table public.nobit_training_invites enable row level security;
alter table public.nobit_training_entries enable row level security;

drop policy if exists nobit_members_read_self_or_owner on public.nobit_training_members;
create policy nobit_members_read_self_or_owner on public.nobit_training_members
for select to authenticated
using (user_id = auth.uid() or public.is_nobit_training_owner());

drop policy if exists nobit_members_update_owner on public.nobit_training_members;
create policy nobit_members_update_owner on public.nobit_training_members
for update to authenticated
using (public.is_nobit_training_owner())
with check (public.is_nobit_training_owner());

drop policy if exists nobit_invites_owner_read on public.nobit_training_invites;
create policy nobit_invites_owner_read on public.nobit_training_invites
for select to authenticated
using (public.is_nobit_training_owner());

drop policy if exists nobit_entries_team_read on public.nobit_training_entries;
create policy nobit_entries_team_read on public.nobit_training_entries
for select to authenticated
using (
  exists (
    select 1 from public.nobit_training_members m
    where m.user_id = auth.uid() and m.status = 'active'
  )
  and (
    status = 'approved'
    or created_by = auth.uid()
    or public.is_nobit_training_owner()
  )
);

drop policy if exists nobit_entries_trainer_insert on public.nobit_training_entries;
create policy nobit_entries_trainer_insert on public.nobit_training_entries
for insert to authenticated
with check (
  created_by = auth.uid()
  and status = 'draft'
  and exists (
    select 1 from public.nobit_training_members m
    where m.user_id = auth.uid() and m.status = 'active'
  )
);

drop policy if exists nobit_entries_owner_update on public.nobit_training_entries;
create policy nobit_entries_owner_update on public.nobit_training_entries
for update to authenticated
using (public.is_nobit_training_owner())
with check (public.is_nobit_training_owner());

drop policy if exists nobit_entries_author_update_draft on public.nobit_training_entries;
create policy nobit_entries_author_update_draft on public.nobit_training_entries
for update to authenticated
using (
  created_by = auth.uid()
  and status = 'draft'
  and exists (
    select 1 from public.nobit_training_members m
    where m.user_id = auth.uid() and m.status = 'active'
  )
)
with check (
  created_by = auth.uid()
  and status = 'draft'
  and exists (
    select 1 from public.nobit_training_members m
    where m.user_id = auth.uid() and m.status = 'active'
  )
);

revoke all on public.nobit_training_members from anon, public;
revoke all on public.nobit_training_invites from anon, public;
revoke all on public.nobit_training_entries from anon, public;
grant select, update on public.nobit_training_members to authenticated;
grant select on public.nobit_training_invites to authenticated;
grant select, insert, update on public.nobit_training_entries to authenticated;
revoke all on function public.redeem_nobit_training_invite(text) from public, anon;
revoke all on function public.create_nobit_training_invite(text,timestamptz) from public, anon;
revoke all on function public.approve_nobit_training_entry(uuid,boolean) from public, anon;
grant execute on function public.redeem_nobit_training_invite(text) to authenticated;
grant execute on function public.create_nobit_training_invite(text,timestamptz) to authenticated;
grant execute on function public.approve_nobit_training_entry(uuid,boolean) to authenticated;

-- BOOTSTRAP THE OWNER AFTER CREATING YOUR OWN AUTH ACCOUNT:
-- Replace the email below, then run this statement once:
-- insert into public.nobit_training_members(user_id,email,role,status)
-- select id,email,'owner','active' from auth.users
-- where lower(email) = lower('YOUR-EMAIL@example.com')
-- on conflict (user_id) do update set role='owner', status='active', email=excluded.email;
