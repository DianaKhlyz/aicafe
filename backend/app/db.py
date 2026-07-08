"""SQLite (WAL) через SQLAlchemy 2 async.

БД хранит только то, чего нет в iiko: связку «заказ ↔ платёж», позже —
пользователей и настройки витрины. На этапе каркаса схема создаётся
через create_all; Alembic подключим при стабилизации моделей.
"""

from sqlalchemy import event
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.config import settings


class Base(DeclarativeBase):
    pass


engine = create_async_engine(f"sqlite+aiosqlite:///{settings.database_path}")


@event.listens_for(engine.sync_engine, "connect")
def _set_sqlite_pragma(dbapi_connection, _connection_record) -> None:
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA journal_mode=WAL")
    cursor.execute("PRAGMA busy_timeout=5000")
    cursor.close()


session_factory = async_sessionmaker(engine, expire_on_commit=False)


async def create_tables() -> None:
    from app import models  # noqa: F401  (регистрация моделей в metadata)

    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)
