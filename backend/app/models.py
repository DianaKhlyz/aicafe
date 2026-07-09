from datetime import UTC, datetime
from uuid import uuid4

from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class OrderLink(Base):
    """Связка нашего заказа с заказом iiko и платежом.

    Источник правды по составу и статусу заказа — iiko; здесь — то, что
    нужно сайту: маршрутизация вебхуков, трекер для гостя, история
    и повтор заказа (снапшот состава и суммы).
    """

    __tablename__ = "order_links"

    id: Mapped[str] = mapped_column(primary_key=True, default=lambda: str(uuid4()))
    iiko_order_id: Mapped[str] = mapped_column(index=True)
    mode: Mapped[str]  # delivery | pickup | table
    status: Mapped[str] = mapped_column(default="new")
    payment_id: Mapped[str | None] = mapped_column(default=None)
    payment_status: Mapped[str] = mapped_column(default="pending")
    eta_minutes: Mapped[int | None] = mapped_column(default=None)
    phone: Mapped[str | None] = mapped_column(default=None, index=True)
    items_json: Mapped[str] = mapped_column(default="[]")  # [{item_id, quantity}]
    amount: Mapped[float] = mapped_column(default=0.0)
    created_at: Mapped[datetime] = mapped_column(default=lambda: datetime.now(UTC))


class User(Base):
    """Гость с сохранённой историей. Появляется после входа по телефону."""

    __tablename__ = "users"

    id: Mapped[str] = mapped_column(primary_key=True, default=lambda: str(uuid4()))
    phone: Mapped[str] = mapped_column(unique=True, index=True)
    created_at: Mapped[datetime] = mapped_column(default=lambda: datetime.now(UTC))


class StaffMember(Base):
    """Сотрудник, знакомый боту смен (написал ему в личку хоть раз)."""

    __tablename__ = "staff_members"

    tg_user_id: Mapped[int] = mapped_column(primary_key=True)
    display_name: Mapped[str]
    # «Постоянно на смене»: полуночная чистка не трогает
    permanent: Mapped[bool] = mapped_column(default=False)
    # Привязка к сотруднику iiko — фаза Б (авто-смены по вебхуку PersonalShift)
    iiko_employee_id: Mapped[str | None] = mapped_column(default=None, index=True)
    created_at: Mapped[datetime] = mapped_column(default=lambda: datetime.now(UTC))


class StaffShift(Base):
    """Смена: от «Я на смене» до выхода/полуночной чистки."""

    __tablename__ = "staff_shifts"

    id: Mapped[str] = mapped_column(primary_key=True, default=lambda: str(uuid4()))
    tg_user_id: Mapped[int] = mapped_column(index=True)
    day: Mapped[str] = mapped_column(index=True)  # YYYY-MM-DD локального времени кафе
    started_at: Mapped[datetime] = mapped_column(default=lambda: datetime.now(UTC))
    ended_at: Mapped[datetime | None] = mapped_column(default=None)
