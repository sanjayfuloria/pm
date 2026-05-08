import secrets
from datetime import datetime, timezone

import bcrypt
import psycopg
from psycopg.rows import dict_row

from app.errors import PersistenceError

SESSION_TTL_HOURS = 24


def hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode(), bcrypt.gensalt()).decode()


def verify_password(plain: str, hashed: str) -> bool:
    if not hashed:
        return False
    return bcrypt.checkpw(plain.encode(), hashed.encode())


def create_session(db_url: str, user_id: str, ttl_hours: int = SESSION_TTL_HOURS) -> str:
    token = secrets.token_urlsafe(32)
    try:
        with psycopg.connect(db_url, autocommit=True) as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    insert into sessions (token, user_id, expires_at)
                    values (%s, %s, now() + make_interval(hours => %s))
                    """,
                    (token, user_id, ttl_hours),
                )
    except psycopg.Error as exc:
        raise PersistenceError(f"Failed to create session: {exc}") from exc
    return token


def validate_session(db_url: str, token: str) -> dict | None:
    try:
        with psycopg.connect(db_url, row_factory=dict_row) as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    select u.id as user_id, u.username, u.role
                    from sessions s
                    join app_users u on u.id = s.user_id
                    where s.token = %s and s.expires_at > now()
                    """,
                    (token,),
                )
                return cur.fetchone()
    except psycopg.Error:
        return None


def delete_session(db_url: str, token: str) -> None:
    try:
        with psycopg.connect(db_url, autocommit=True) as conn:
            with conn.cursor() as cur:
                cur.execute("delete from sessions where token = %s", (token,))
    except psycopg.Error:
        pass


def cleanup_expired_sessions(db_url: str) -> None:
    try:
        with psycopg.connect(db_url, autocommit=True) as conn:
            with conn.cursor() as cur:
                cur.execute("delete from sessions where expires_at < now()")
    except psycopg.Error:
        pass
