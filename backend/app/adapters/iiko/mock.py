"""Мок-клиент iiko: фикстурные данные для разработки и демо.

Позволяет разрабатывать и показывать все флоу (меню, стоп-листы, заказы,
ETA, зоны, бронь) до получения apiLogin. Структура данных повторяет то,
что отдаёт внешнее меню iiko и reserve/available_restaurant_sections.
"""

import itertools
from datetime import UTC, datetime

from app import schemas


def _menu() -> schemas.Menu:
    return schemas.Menu(
        updated_at=datetime.now(UTC),
        categories=[
            schemas.MenuCategory(
                id="cat-smoker",
                name="Из смокера",
                items=[
                    schemas.MenuItem(
                        id="dish-brisket",
                        name="Брискет",
                        description="Говяжья грудинка, 12 часов на дубе и яблоне. Тает во рту.",
                        price=690,
                        allergens=[],
                        tags=["хит"],
                        pairing="к тёмному лагеру",
                        nutrition=schemas.Nutrition(kcal=540, proteins=42, fats=38, carbs=6),
                    ),
                    schemas.MenuItem(
                        id="dish-ribs",
                        name="Рёбра BBQ",
                        description="Свиные рёбра в фирменной глазури, с дымком и корочкой.",
                        price=620,
                        allergens=[],
                        tags=[],
                        pairing="к пшеничному",
                        nutrition=schemas.Nutrition(kcal=610, proteins=36, fats=44, carbs=14),
                    ),
                    schemas.MenuItem(
                        id="dish-pork",
                        name="Пулд-порк",
                        description="Томлёная свиная лопатка, воздушная булка бриошь, соус BBQ.",
                        price=480,
                        allergens=["глютен"],
                        tags=[],
                        pairing="к светлому элю",
                        nutrition=schemas.Nutrition(kcal=520, proteins=30, fats=26, carbs=42),
                    ),
                ],
            ),
            schemas.MenuCategory(
                id="cat-burgers",
                name="Бургеры",
                items=[
                    schemas.MenuItem(
                        id="dish-yard",
                        name="Бургер «Ярд»",
                        description="Двойная говядина из смокера, чеддер, бекон, соус шефа.",
                        price=590,
                        allergens=["глютен", "молоко"],
                        tags=["хит"],
                        pairing="к IPA",
                        nutrition=schemas.Nutrition(kcal=780, proteins=44, fats=48, carbs=40),
                    ),
                    schemas.MenuItem(
                        id="dish-cheese",
                        name="Чизбургер",
                        description="Сочная говядина, двойной чеддер, хрустящие соленья.",
                        price=490,
                        allergens=["глютен", "молоко"],
                        tags=[],
                        pairing="к лагеру",
                        nutrition=schemas.Nutrition(kcal=690, proteins=38, fats=40, carbs=38),
                    ),
                ],
            ),
            schemas.MenuCategory(
                id="cat-snacks",
                name="К пиву",
                items=[
                    schemas.MenuItem(
                        id="dish-wings",
                        name="Крылья BBQ",
                        description="Копчёные куриные крылья в остро-сладкой глазури.",
                        price=340,
                        allergens=[],
                        tags=["острое"],
                        pairing="к пейл-элю",
                        nutrition=schemas.Nutrition(kcal=430, proteins=28, fats=30, carbs=10),
                    ),
                    schemas.MenuItem(
                        id="dish-fries",
                        name="Фри с копчёной солью",
                        description="Золотистый картофель, копчёная соль, соус ранч.",
                        price=220,
                        allergens=[],
                        tags=["веган"],
                        pairing="к любому крафту",
                        nutrition=schemas.Nutrition(kcal=360, proteins=5, fats=18, carbs=44),
                    ),
                    schemas.MenuItem(
                        id="dish-pretzel",
                        name="Брецель с сыром",
                        description="Тёплый крендель с плавленым чеддером. Идеально к пиву.",
                        price=260,
                        allergens=["глютен", "молоко"],
                        tags=[],
                        pairing="к пшеничному",
                        nutrition=schemas.Nutrition(kcal=410, proteins=12, fats=16, carbs=54),
                    ),
                ],
            ),
            schemas.MenuCategory(
                id="cat-drinks",
                name="Пиво и напитки",
                items=[
                    schemas.MenuItem(
                        id="dish-lager",
                        name="Лагер светлый",
                        description="Чистый освежающий вкус, лёгкая хмелевая горчинка. 0,5 л.",
                        price=320,
                        allergens=["глютен"],
                        tags=["хит"],
                    ),
                    schemas.MenuItem(
                        id="dish-wheat",
                        name="Пшеничное",
                        description="Мягкое, с нотами банана и гвоздики. 0,5 л.",
                        price=340,
                        allergens=["глютен"],
                        tags=[],
                    ),
                    schemas.MenuItem(
                        id="dish-ipa",
                        name="IPA",
                        description="Насыщенный хмель, цитрус и хвоя. 0,5 л.",
                        price=360,
                        allergens=["глютен"],
                        tags=[],
                    ),
                    schemas.MenuItem(
                        id="dish-lemonade",
                        name="Домашний лимонад",
                        description="Лимон, мята, содовая. Без алкоголя. 0,4 л.",
                        price=250,
                        allergens=[],
                        tags=["веган"],
                        nutrition=schemas.Nutrition(kcal=120, proteins=0, fats=0, carbs=30),
                    ),
                ],
            ),
        ],
    )


# Полигон условной зоны доставки (центр условного города)
_ZONES = [
    schemas.DeliveryZone(
        name="Центр",
        polygon=[[55.75, 37.58], [55.78, 37.60], [55.77, 37.66], [55.73, 37.64]],
        min_order=800,
        delivery_price=0,
    ),
    schemas.DeliveryZone(
        name="Расширенная",
        polygon=[[55.71, 37.54], [55.80, 37.56], [55.79, 37.70], [55.70, 37.68]],
        min_order=1500,
        delivery_price=250,
    ),
]


class MockIikoClient:
    def __init__(self) -> None:
        self._order_seq = itertools.count(1)
        self._reserve_seq = itertools.count(1)
        # IPA в стоп-листе — чтобы флоу стоп-листов был виден сразу
        self.stop_list: set[str] = {"dish-ipa"}
        self.active_orders = 3  # имитация очереди на кухне
        # Столы, занятые бронями с сайта (в реале занятость придёт из резервов iiko)
        self._reserved_tables: set[str] = set()

    async def get_menu(self) -> schemas.Menu:
        return _menu()

    async def get_stop_list(self) -> set[str]:
        return set(self.stop_list)

    async def get_delivery_zones(self) -> list[schemas.DeliveryZone]:
        return list(_ZONES)

    async def create_delivery_order(self, request: schemas.CheckoutRequest) -> str:
        return f"mock-delivery-{next(self._order_seq)}"

    async def create_pickup_order(self, request: schemas.CheckoutRequest) -> str:
        return f"mock-pickup-{next(self._order_seq)}"

    async def create_table_order(self, request: schemas.CheckoutRequest) -> str:
        return f"mock-table-{next(self._order_seq)}"

    async def get_active_order_count(self) -> int:
        return self.active_orders

    async def get_sections(self) -> list[schemas.Section]:
        sections = [
            schemas.Section(
                id="hall-main",
                name="Основной зал",
                tables=[
                    schemas.Table(id="t1", code="A1", number=1, seats=2, x=0.2, y=0.2),
                    schemas.Table(id="t2", code="A2", number=2, seats=4, x=0.6, y=0.2),
                    schemas.Table(
                        id="t3", code="A3", number=3, seats=4, x=0.2, y=0.6, occupied=True
                    ),
                    schemas.Table(id="t4", code="A4", number=4, seats=6, x=0.6, y=0.6),
                ],
            ),
            schemas.Section(
                id="hall-terrace",
                name="Терраса",
                tables=[
                    schemas.Table(id="t5", code="B1", number=5, seats=2, x=0.3, y=0.4),
                    schemas.Table(id="t6", code="B2", number=6, seats=2, x=0.7, y=0.4),
                ],
            ),
        ]
        for section in sections:
            for table in section.tables:
                if table.id in self._reserved_tables:
                    table.occupied = True
        return sections

    async def create_reserve(self, request: schemas.ReserveRequest) -> schemas.ReserveView:
        self._reserved_tables.add(request.table_id)
        return schemas.ReserveView(
            id=f"mock-reserve-{next(self._reserve_seq)}",
            table_id=request.table_id,
            time=request.time,
            status="confirmed",
        )
