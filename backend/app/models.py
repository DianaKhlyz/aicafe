from datetime import UTC, datetime
from uuid import uuid4

from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class OrderLink(Base):
    """Связка нашего заказа с заказом iiko и платежом.

    Источник правды по составу и статусу заказа — iiko; здесь — только
    то, что нужно сайту: маршрутизация вебхуков и трекер для гостя.
    """

    __tablename__ = "order_links"

    id: Mapped[str] = mapped_column(primary_key=True, default=lambda: str(uuid4()))
    iiko_order_id: Mapped[str] = mapped_column(index=True)
    mode: Mapped[str]  # delivery | pickup | table
    status: Mapped[str] = mapped_column(default="new")
    payment_id: Mapped[str | None] = mapped_column(default=None)
    payment_status: Mapped[str] = mapped_column(default="pending")
    eta_minutes: Mapped[int | None] = mapped_column(default=None)
    created_at: Mapped[datetime] = mapped_column(default=lambda: datetime.now(UTC))
