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
