import psycopg
from psycopg.rows import dict_row

from app.errors import NotFoundError, PersistenceError


class AuthRepository:
    def __init__(self, db_url: str) -> None:
        self._db_url = db_url

    def get_user_by_username(self, username: str) -> dict | None:
        try:
            with psycopg.connect(self._db_url, row_factory=dict_row) as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        "select id, username, password_hash, role from app_users where username = %s",
                        (username,),
                    )
                    return cur.fetchone()
        except psycopg.Error as exc:
            raise PersistenceError(f"Failed to look up user: {exc}") from exc

    def create_user(self, username: str, password_hash: str, role: str = "student") -> dict:
        try:
            with psycopg.connect(self._db_url, autocommit=False, row_factory=dict_row) as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        """
                        insert into app_users (username, password_hash, role)
                        values (%s, %s, %s)
                        returning id, username, role, created_at
                        """,
                        (username, password_hash, role),
                    )
                    row = cur.fetchone()
                conn.commit()
            return row
        except psycopg.errors.UniqueViolation as exc:
            raise PersistenceError(f"Username '{username}' already exists") from exc
        except psycopg.Error as exc:
            raise PersistenceError(f"Failed to create user: {exc}") from exc

    def list_students(self) -> list[dict]:
        try:
            with psycopg.connect(self._db_url, row_factory=dict_row) as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        "select id, username, created_at from app_users where role = 'student' order by username"
                    )
                    return cur.fetchall()
        except psycopg.Error as exc:
            raise PersistenceError(f"Failed to list students: {exc}") from exc

    def update_password(self, user_id: str, new_password_hash: str) -> None:
        try:
            with psycopg.connect(self._db_url, autocommit=True) as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        "update app_users set password_hash = %s where id = %s",
                        (new_password_hash, user_id),
                    )
        except psycopg.Error as exc:
            raise PersistenceError(f"Failed to update password: {exc}") from exc

    def update_role(self, user_id: str, role: str) -> None:
        try:
            with psycopg.connect(self._db_url, autocommit=True) as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        "update app_users set role = %s where id = %s",
                        (role, user_id),
                    )
        except psycopg.Error as exc:
            raise PersistenceError(f"Failed to update role: {exc}") from exc

    def delete_user(self, username: str) -> None:
        try:
            with psycopg.connect(self._db_url, autocommit=True) as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        "delete from app_users where username = %s and role = 'student'",
                        (username,),
                    )
                    if cur.rowcount == 0:
                        raise NotFoundError(f"Student '{username}' not found")
        except (NotFoundError, PersistenceError):
            raise
        except psycopg.Error as exc:
            raise PersistenceError(f"Failed to delete user: {exc}") from exc
