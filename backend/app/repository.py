from dataclasses import dataclass
from pathlib import Path

import psycopg
from psycopg.rows import dict_row
from psycopg.types.json import Jsonb

from app.errors import NotFoundError, PersistenceError


DEFAULT_BOARD_TITLE = "Kanban Studio"
DEFAULT_BOARD_STATE = {
    "columns": [
        {"id": "col-backlog", "title": "Backlog", "cardIds": ["card-1", "card-2"]},
        {"id": "col-discovery", "title": "Discovery", "cardIds": ["card-3"]},
        {"id": "col-progress", "title": "In Progress", "cardIds": ["card-4", "card-5"]},
        {"id": "col-review", "title": "Review", "cardIds": ["card-6"]},
        {"id": "col-done", "title": "Done", "cardIds": ["card-7", "card-8"]},
    ],
    "cards": {
        "card-1": {
            "id": "card-1",
            "title": "Align roadmap themes",
            "details": "Draft quarterly themes with impact statements and metrics.",
        },
        "card-2": {
            "id": "card-2",
            "title": "Gather customer signals",
            "details": "Review support tags, sales notes, and churn feedback.",
        },
        "card-3": {
            "id": "card-3",
            "title": "Prototype analytics view",
            "details": "Sketch initial dashboard layout and key drill-downs.",
        },
        "card-4": {
            "id": "card-4",
            "title": "Refine status language",
            "details": "Standardize column labels and tone across the board.",
        },
        "card-5": {
            "id": "card-5",
            "title": "Design card layout",
            "details": "Add hierarchy and spacing for scanning dense lists.",
        },
        "card-6": {
            "id": "card-6",
            "title": "QA micro-interactions",
            "details": "Verify hover, focus, and loading states.",
        },
        "card-7": {
            "id": "card-7",
            "title": "Ship marketing page",
            "details": "Final copy approved and asset pack delivered.",
        },
        "card-8": {
            "id": "card-8",
            "title": "Close onboarding sprint",
            "details": "Document release notes and share internally.",
        },
    },
}


@dataclass
class BoardRecord:
    id: str
    username: str
    title: str
    state: dict
    state_version: int
    updated_at: object


class BoardRepository:
    def __init__(self, db_url: str) -> None:
        self._db_url = db_url

    def apply_migrations(self, migrations_dir: Path) -> None:
        migration_files = sorted(migrations_dir.glob("*.sql"))
        if not migration_files:
            return

        try:
            with psycopg.connect(self._db_url, autocommit=False) as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        """
                        create table if not exists schema_migrations (
                          filename text primary key,
                          applied_at timestamptz not null default now()
                        )
                        """
                    )

                    for migration_file in migration_files:
                        cur.execute(
                            "select 1 from schema_migrations where filename = %s",
                            (migration_file.name,),
                        )
                        if cur.fetchone():
                            continue

                        cur.execute(migration_file.read_text())
                        cur.execute(
                            "insert into schema_migrations (filename) values (%s)",
                            (migration_file.name,),
                        )

                conn.commit()
        except psycopg.Error as exc:
            raise PersistenceError("Failed to apply migrations") from exc

    def _create_board_if_missing(self, username: str) -> None:
        try:
            with psycopg.connect(self._db_url, autocommit=False) as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        """
                        insert into app_users (username)
                        values (%s)
                        on conflict (username) do nothing
                        """,
                        (username,),
                    )
                    cur.execute(
                        """
                        insert into boards (user_id, title, state)
                        select u.id, %s, %s
                        from app_users u
                        where u.username = %s
                        on conflict (user_id) do nothing
                        """,
                        (DEFAULT_BOARD_TITLE, Jsonb(DEFAULT_BOARD_STATE), username),
                    )

                conn.commit()
        except psycopg.Error as exc:
            raise PersistenceError("Failed to create default board") from exc

    def get_board(self, username: str) -> BoardRecord:
        query = """
            select b.id, u.username, b.title, b.state, b.state_version, b.updated_at
            from boards b
            join app_users u on u.id = b.user_id
            where u.username = %s
        """
        try:
            with psycopg.connect(self._db_url, row_factory=dict_row) as conn:
                with conn.cursor() as cur:
                    cur.execute(query, (username,))
                    row = cur.fetchone()
        except psycopg.Error as exc:
            raise PersistenceError("Failed to read board") from exc

        if not row:
            self._create_board_if_missing(username)
            try:
                with psycopg.connect(self._db_url, row_factory=dict_row) as conn:
                    with conn.cursor() as cur:
                        cur.execute(query, (username,))
                        row = cur.fetchone()
            except psycopg.Error as exc:
                raise PersistenceError("Failed to read board") from exc

        if not row:
            raise NotFoundError(f"No board found for username '{username}'")

        return BoardRecord(**row)

    def update_board(self, username: str, state: dict, snapshot_on_update: bool = True) -> BoardRecord:
        update_query = """
            update boards b
            set state = %s,
                state_version = b.state_version + 1
            from app_users u
            where b.user_id = u.id
              and u.username = %s
            returning b.id, u.username, b.title, b.state, b.state_version, b.updated_at
        """

        self._create_board_if_missing(username)

        try:
            with psycopg.connect(self._db_url, autocommit=False, row_factory=dict_row) as conn:
                with conn.cursor() as cur:
                    cur.execute(update_query, (Jsonb(state), username))
                    row = cur.fetchone()
                    if not row:
                        raise NotFoundError(f"No board found for username '{username}'")

                    if snapshot_on_update:
                        cur.execute(
                            """
                            insert into board_snapshots (board_id, state_version, state)
                            values (%s, %s, %s)
                            """,
                            (row["id"], row["state_version"], Jsonb(row["state"])),
                        )

                conn.commit()
        except NotFoundError:
            raise
        except psycopg.Error as exc:
            raise PersistenceError("Failed to update board") from exc

        return BoardRecord(**row)
