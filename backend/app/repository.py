from dataclasses import dataclass
from pathlib import Path

import psycopg
from psycopg.rows import dict_row
from psycopg.types.json import Jsonb

from app.errors import NotFoundError, PersistenceError


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
