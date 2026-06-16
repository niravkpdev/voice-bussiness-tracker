-- HRMS Phase E: Leave Policy Configuration and Attendance Reports
-- Safe standalone migration.

create table if not exists public.leave_policies (
  id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

alter table public.leave_policies enable row level security;

-- Simple RLS matching the user's existing schema
create policy "Users manage own leave policies" on public.leave_policies
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
