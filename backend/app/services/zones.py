"""Проверка попадания адреса в зону доставки.

Координаты адреса приходят из DaData-подсказок на фронте, попадание
в полигон считаем сами (ноль внешних запросов). При создании заказа
iiko дополнительно проверяет адрес на своей стороне — двойной контроль.
"""

from app import schemas
from app.adapters.iiko import get_iiko_client

Point = tuple[float, float]


def point_in_polygon(point: Point, polygon: list[list[float]]) -> bool:
    """Ray casting: чётность пересечений луча из точки с рёбрами полигона."""
    x, y = point
    inside = False
    n = len(polygon)
    for i in range(n):
        x1, y1 = polygon[i]
        x2, y2 = polygon[(i + 1) % n]
        if (y1 > y) != (y2 > y):
            x_cross = (x2 - x1) * (y - y1) / (y2 - y1) + x1
            if x < x_cross:
                inside = not inside
    return inside


async def check_address(lat: float, lon: float) -> schemas.AddressCheckResult:
    """Возвращает первую (самую выгодную для гостя) зону, содержащую точку.

    Зоны в iiko упорядочены от узкой к широкой: узкая — дешевле доставка.
    """
    zones = await get_iiko_client().get_delivery_zones()
    for zone in zones:
        if point_in_polygon((lat, lon), zone.polygon):
            return schemas.AddressCheckResult(in_zone=True, zone=zone)
    return schemas.AddressCheckResult(in_zone=False)
