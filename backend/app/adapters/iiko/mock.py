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
                id="cat-breakfast",
                name="Завтраки",
                items=[
                    schemas.MenuItem(
                        id="dish-syrniki",
                        name="Сырники со сметаной",
                        description="Творожные сырники, домашняя сметана, ягодный соус",
                        price=320,
                        allergens=["молоко", "глютен", "яйцо"],
                        tags=["хит"],
                        nutrition=schemas.Nutrition(kcal=420, proteins=18, fats=22, carbs=38),
                    ),
                    schemas.MenuItem(
                        id="dish-avocado-toast",
                        name="Тост с авокадо",
                        description="Зерновой хлеб, авокадо, яйцо пашот, микрозелень",
                        price=390,
                        allergens=["глютен", "яйцо"],
                        tags=["веган-опция"],
                        nutrition=schemas.Nutrition(kcal=350, proteins=12, fats=20, carbs=30),
                    ),
                ],
            ),
            schemas.MenuCategory(
                id="cat-soups",
                name="Супы",
                items=[
                    schemas.MenuItem(
                        id="dish-tomyum",
                        name="Том-ям с креветками",
                        description="Острый тайский суп, кокосовое молоко, рис",
                        price=590,
                        allergens=["морепродукты"],
                        tags=["острое", "хит"],
                        nutrition=schemas.Nutrition(kcal=480, proteins=24, fats=28, carbs=32),
                    ),
                    schemas.MenuItem(
                        id="dish-pumpkin-soup",
                        name="Тыквенный крем-суп",
                        description="Тыква, сливки, тыквенные семечки",
                        price=380,
                        allergens=["молоко"],
                        tags=["веган-опция"],
                        nutrition=schemas.Nutrition(kcal=290, proteins=6, fats=14, carbs=34),
                    ),
                ],
            ),
            schemas.MenuCategory(
                id="cat-mains",
                name="Горячее",
                items=[
                    schemas.MenuItem(
                        id="dish-pasta",
                        name="Паста с грибами",
                        description="Тальятелле, белые грибы, пармезан",
                        price=540,
                        allergens=["глютен", "молоко"],
                        tags=[],
                        nutrition=schemas.Nutrition(kcal=620, proteins=20, fats=26, carbs=72),
                    ),
                    schemas.MenuItem(
                        id="dish-salmon",
                        name="Стейк из лосося",
                        description="Лосось, овощи гриль, соус берблан",
                        price=890,
                        allergens=["рыба", "молоко"],
                        tags=["без глютена"],
                        nutrition=schemas.Nutrition(kcal=520, proteins=42, fats=34, carbs=8),
                    ),
                ],
            ),
            schemas.MenuCategory(
                id="cat-drinks",
                name="Напитки",
                items=[
                    schemas.MenuItem(
                        id="dish-raf",
                        name="Раф лавандовый",
                        description="Эспрессо, сливки, лавандовый сироп",
                        price=290,
                        allergens=["молоко"],
                        tags=["хит"],
                        nutrition=schemas.Nutrition(kcal=210, proteins=4, fats=12, carbs=20),
                    ),
                    schemas.MenuItem(
                        id="dish-lemonade",
                        name="Домашний лимонад",
                        description="Лимон, мята, содовая",
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
        # «Том-ям» в стоп-листе — чтобы флоу стоп-листов был виден сразу
        self.stop_list: set[str] = {"dish-tomyum"}
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
