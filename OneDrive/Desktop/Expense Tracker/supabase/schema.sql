-- Run this once in the Supabase SQL Editor (free project).
-- Creates the expenses table and locks rows to each signed-in user.

create extension if not exists "pgcrypto";

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  amount numeric(12, 2) not null check (amount > 0),
  category text not null,
  note text,
  spent_at date not null default (timezone('utc', now()))::date,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists expenses_user_id_spent_at_idx
  on public.expenses (user_id, spent_at desc);

alter table public.expenses enable row level security;

drop policy if exists "Users can select own expenses" on public.expenses;
create policy "Users can select own expenses"
  on public.expenses
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own expenses" on public.expenses;
create policy "Users can insert own expenses"
  on public.expenses
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own expenses" on public.expenses;
create policy "Users can update own expenses"
  on public.expenses
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own expenses" on public.expenses;
create policy "Users can delete own expenses"
  on public.expenses
  for delete
  using (auth.uid() = user_id);
