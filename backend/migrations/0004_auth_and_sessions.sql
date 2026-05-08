-- Add authentication fields to app_users
alter table app_users
  add column if not exists password_hash text not null default '',
  add column if not exists role text not null default 'student';

-- Constrain role values
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'app_users_role_check'
  ) then
    alter table app_users add constraint app_users_role_check check (role in ('teacher', 'student'));
  end if;
end $$;

-- Sessions table for database-backed auth
create table if not exists sessions (
  token text primary key,
  user_id uuid not null references app_users(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create index if not exists idx_sessions_expires_at on sessions(expires_at);
create index if not exists idx_sessions_user_id on sessions(user_id);
