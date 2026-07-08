"""Доменные модели API.

Единый модуль на этапе каркаса; при росте разделим по областям.
Эти Pydantic-модели — источник OpenAPI-схемы, из которой генерируются
TS-типы фронтенда (`make types`).
"""

from datetime import datetime
from enum import StrEnum

from pydantic import BaseModel, Field

# --- Меню -----------------------------------------------------------------


class Nutrition(BaseModel):
    """КБЖУ на порцию (данные из внешнего меню iiko)."""

    kcal: float
    proteins: float
    fats: float
    carbs: float


class MenuItem(BaseModel):
    id: str
    name: str
    description: str = ""
    price: float
    image_url: str | None = None
    allergens: list[str] = []
    tags: list[str] = []  # «острое», «веган», «хит» и т.п.
    nutrition: Nutrition | None = None
    in_stop_list: bool = False


class MenuCategory(BaseModel):
    id: str
    name: str
    items: list[MenuItem]


class Menu(BaseModel):
    categories: list[MenuCategory]
    updated_at: datetime


# --- Корзина и заказ --------------------------------------------------------


class OrderMode(StrEnum):
    DELIVERY = "delivery"
    PICKUP = "pickup"
    TABLE = "table"


class CartItem(BaseModel):
    item_id: str
    quantity: int = 1


class CheckoutRequest(BaseModel):
    mode: OrderMode
    items: list[CartItem]
    phone: str | None = None
    # доставка
    address: str | None = None
    # самовывоз: None = «к ближайшему времени» (рассчитывается ETA)
    desired_time: datetime | None = None
    # за столом
    table_code: str | None = None
    comment: str = ""


class OrderStatus(StrEnum):
    NEW = "new"
    COOKING = "cooking"
    READY = "ready"
    ON_THE_WAY = "on_the_way"
    CLOSED = "closed"
    CANCELLED = "cancelled"


class EtaView(BaseModel):
    """Предпросмотр времени готовности самовывоза (до оформления заказа)."""

    eta_minutes: int


class OrderView(BaseModel):
    id: str
    mode: OrderMode
    status: OrderStatus
    payment_status: str
    payment_url: str | None = None
    eta_minutes: int | None = None
    created_at: datetime


# --- Общая корзина стола ------------------------------------------------------


class TableCartLine(BaseModel):
    item_id: str
    name: str
    price: float
    quantity: int
    guest: str  # кто из гостей добавил


class TableCart(BaseModel):
    table_code: str
    lines: list[TableCartLine]
    total: float
    updated_at: datetime


class TableCartUpdate(BaseModel):
    item_id: str
    quantity: int = Field(ge=0)  # 0 = убрать позицию гостя
    guest: str = Field(default="Гость", max_length=40)


# --- Зоны доставки -----------------------------------------------------------


class DeliveryZone(BaseModel):
    name: str
    # Полигон [[lat, lon], ...]; проверка точки — на нашей стороне (point-in-polygon)
    polygon: list[list[float]]
    min_order: float = 0
    delivery_price: float = 0


class AddressSuggestion(BaseModel):
    """Подсказка адреса (DaData или заглушка) с координатами для проверки зоны."""

    value: str
    lat: float
    lon: float


class AddressCheckRequest(BaseModel):
    lat: float
    lon: float


class AddressCheckResult(BaseModel):
    in_zone: bool
    zone: DeliveryZone | None = None


# --- Бронь столов -------------------------------------------------------------


class Table(BaseModel):
    id: str
    code: str  # код для QR-ссылки /t/{code}
    number: int
    seats: int
    # координаты на схеме зала (из iiko reserve/available_restaurant_sections)
    x: float
    y: float
    occupied: bool = False


class Section(BaseModel):
    id: str
    name: str
    tables: list[Table]


class ReserveRequest(BaseModel):
    table_id: str
    phone: str = Field(min_length=10)
    guests: int = Field(ge=1)
    time: datetime


class ReserveView(BaseModel):
    id: str
    table_id: str
    time: datetime
    status: str
