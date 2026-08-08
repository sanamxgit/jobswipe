-- Optional cloud table if you later sync Saved jobs from localStorage.
-- The app works fully with localStorage; run this only when adding Supabase sync.

create table if not exists public.saved_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  job_id text not null,
  job_data jsonb not null,
  interest text not null default 'saved' check (interest in ('saved', 'super')),
  cover_letter text default '',
  created_at timestamptz not null default now(),
  unique (user_id, job_id)
);

create index if not exists saved_jobs_user_id_idx on public.saved_jobs (user_id);

alter table public.saved_jobs enable row level security;

drop policy if exists "Users manage own saved jobs" on public.saved_jobs;
create policy "Users manage own saved jobs"
  on public.saved_jobs for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
