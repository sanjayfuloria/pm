create table if not exists app_users (
  id uuid primary key default gen_random_uuid(),
  username text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists boards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references app_users(id) on delete cascade,
  title text not null default 'My Board',
  state jsonb not null,
  state_version bigint not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint boards_state_is_object check (jsonb_typeof(state) = 'object')
);

create table if not exists board_snapshots (
  id bigint generated always as identity primary key,
  board_id uuid not null references boards(id) on delete cascade,
  state_version bigint not null,
  state jsonb not null,
  created_at timestamptz not null default now(),
  constraint board_snapshots_state_is_object check (jsonb_typeof(state) = 'object'),
  constraint board_snapshots_version_unique unique (board_id, state_version)
);

create index if not exists idx_boards_user_id on boards(user_id);
create index if not exists idx_boards_updated_at on boards(updated_at desc);
create index if not exists idx_board_snapshots_board_id_created_at on board_snapshots(board_id, created_at desc);

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_boards_updated_at on boards;
create trigger trg_boards_updated_at
before update on boards
for each row
execute function set_updated_at();
