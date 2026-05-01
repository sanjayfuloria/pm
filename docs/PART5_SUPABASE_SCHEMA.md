# Part 5: Supabase schema proposal

## Scope and assumptions

- Supabase hosted Postgres free tier only.
- MVP login remains hardcoded in app layer: user/password.
- Data model must support one board per signed-in user today and many users later.
- Backend will use service role access in MVP (no Supabase Auth integration yet).

## Why this schema

The current frontend board shape is a single JSON object:

- columns: ordered list with title and cardIds.
- cards: map keyed by card id.

Using JSONB for board state keeps backend updates simple and minimizes over-engineering for MVP, while keeping users and boards relational for future growth.

## Relational schema

### app_users

- id: uuid primary key.
- username: unique text.
- created_at: timestamp.

Purpose: stable user identity and future expansion beyond hardcoded auth.

### boards

- id: uuid primary key.
- user_id: foreign key to app_users, unique (enforces one board per user for MVP).
- title: board title.
- state: JSONB representation of board data.
- state_version: bigint for optimistic update/versioning later.
- created_at, updated_at timestamps.

Constraints:

- unique user_id means one board per user.
- state must be a JSON object.

### board_snapshots

- id: identity primary key.
- board_id: foreign key to boards.
- state_version: version copied from boards.
- state: JSONB snapshot.
- created_at timestamp.

Purpose: lightweight history/audit for rollbacks and AI-related change tracking in later phases.

Constraints:

- unique (board_id, state_version) to avoid duplicate versions.
- state must be a JSON object.

## JSONB usage decision

JSONB is used only for board state and snapshots.

Reason:

- Board payload already exists in this shape in frontend.
- Single document write is simpler and less error-prone for MVP drag/reorder operations.
- Relational anchors (app_users, boards) still support indexing, ownership, and future normalization.

## Indexes and keys

- app_users.username unique index.
- boards.user_id unique index.
- boards.updated_at index for recency queries.
- board_snapshots(board_id, created_at desc) index for latest history reads.

## Migration files and order

Location: backend/migrations

1. 0001_extensions.sql
- Enables pgcrypto extension for UUID generation.

2. 0002_kanban_schema.sql
- Creates app_users, boards, board_snapshots.
- Creates indexes, trigger function, and updated_at trigger.

3. 0003_seed_demo_user.sql
- Seeds user and one initial board matching the current frontend data.
- Idempotent inserts using on conflict.

## CRUD query patterns for backend routes

### Read board for signed-in user

- Input: username from app session (currently hardcoded user).
- Query shape:
  - join boards to app_users on user id
  - filter by username
  - return board id, state, state_version, updated_at

Pseudo-SQL:

select b.id, b.state, b.state_version, b.updated_at
from boards b
join app_users u on u.id = b.user_id
where u.username = $1;

### Update board state

- Input: full board JSON state.
- Pattern:
  - update boards.state
  - increment state_version
  - insert snapshot row with new version
  - execute in a single transaction

Pseudo-SQL:

begin;

update boards b
set state = $2,
    state_version = b.state_version + 1
from app_users u
where b.user_id = u.id
  and u.username = $1
returning b.id, b.state_version, b.state into v_board_id, v_version, v_state;

insert into board_snapshots (board_id, state_version, state)
values (v_board_id, v_version, v_state);

commit;

### Create board for user (future-safe)

- Use insert with on conflict (user_id) do update as needed.

## Supabase free-tier considerations

- Keep connection usage low: use short-lived pooled connections via Supabase client.
- Avoid frequent snapshot writes for no-op updates.
- Keep payload size reasonable by storing only current board state and compact snapshots.
- Do not assume advanced backup/recovery features in free tier; maintain export scripts in later phases if needed.
- Keep migration count small and idempotent for simple resets.

## Test plan for Part 5 sign-off

1. Migration apply test on clean database
- Run migrations in order on empty Supabase database.
- Verify all tables, indexes, and trigger exist.

2. Idempotency test
- Re-run migrations and seed script.
- Verify no duplicate users/boards and no migration errors.

3. CRUD smoke test
- Read seeded board for username user.
- Update state once and verify state_version increments and one snapshot row is created.

## Open decisions for your approval

1. Snapshot policy: create a snapshot on every board update, or only for AI-originated updates later?
2. Board title: keep editable in schema now, or lock to default until UI exposes title editing?
3. Do you want row-level security enabled now, or postpone until Supabase Auth is introduced?
