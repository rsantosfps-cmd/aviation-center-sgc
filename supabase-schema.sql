-- Aviation Center Calibrações — backend Supabase
-- Execute este arquivo no SQL Editor do seu projeto Supabase.
-- O aplicativo usa somente a chave pública ANON. Nunca use service_role no frontend.

create table if not exists public.app_state (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  payload jsonb not null default '{"sessions":[],"trash":[]}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.app_state enable row level security;

-- Remove policies antigas com os mesmos nomes, se houver.
drop policy if exists "app_state_select_own" on public.app_state;
drop policy if exists "app_state_insert_own" on public.app_state;
drop policy if exists "app_state_update_own" on public.app_state;

create policy "app_state_select_own"
on public.app_state for select
to authenticated
using (owner_id = auth.uid());

create policy "app_state_insert_own"
on public.app_state for insert
to authenticated
with check (owner_id = auth.uid());

create policy "app_state_update_own"
on public.app_state for update
to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

create index if not exists app_state_updated_at_idx on public.app_state(updated_at);
