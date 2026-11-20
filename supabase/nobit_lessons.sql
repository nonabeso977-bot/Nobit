-- NOBIT learning knowledge: per-account storage with optional shared public lessons.
-- Run this in the Supabase SQL Editor for the NOBIT project.
create table if not exists public.nobit_lessons (
  id text not null,
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 180),
  content text not null check (char_length(content) between 1 and 12000),
  category text not null default 'custom' check (category in ('language','culture','geography','history','custom')),
  source text not null default '',
  confidence text not null default 'taught' check (confidence in ('taught','verified')),
  visibility text not null default 'private' check (visibility in ('private','shared')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (owner_id, id)
);
alter table public.nobit_lessons enable row level security;
drop policy if exists "read own and shared lessons" on public.nobit_lessons;
create policy "read own and shared lessons" on public.nobit_lessons
for select to authenticated
using (owner_id = auth.uid() or visibility = 'shared');
drop policy if exists "insert own private lessons" on public.nobit_lessons;
create policy "insert own private lessons" on public.nobit_lessons
for insert to authenticated
with check (owner_id = auth.uid() and visibility = 'private');
drop policy if exists "update own private lessons" on public.nobit_lessons;
create policy "update own private lessons" on public.nobit_lessons
for update to authenticated
using (owner_id = auth.uid() and visibility = 'private')
with check (owner_id = auth.uid() and visibility = 'private');
drop policy if exists "delete own lessons" on public.nobit_lessons;
create policy "delete own lessons" on public.nobit_lessons
for delete to authenticated
using (owner_id = auth.uid());
create index if not exists nobit_lessons_visibility_idx on public.nobit_lessons (visibility);
create index if not exists nobit_lessons_owner_updated_idx on public.nobit_lessons (owner_id, updated_at desc);
