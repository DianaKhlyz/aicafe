"""Расчёт времени готовности самовывоза от загрузки кухни.

iiko не отдаёт готовую метрику загруженности — считаем сами:
активные заказы (включая заказы агрегаторов, они тоже в iiko) добавляют
надбавку к базовому времени. Константы — стартовые, откалибруем на
реальных данных кухни; какие поля по заказам доступны в тарифе Pro —
проверяем на песочнице (docs/open-questions.md, раздел 3, п. 2).
"""

from app.adapters.iiko import get_iiko_client

BASE_MINUTES = 20  # нормативное время приготовления среднего заказа
QUEUE_MINUTES_PER_ORDER = 4  # надбавка за каждый активный заказ в очереди
MAX_ETA_MINUTES = 90


async def pickup_eta_minutes() -> int:
    active = await get_iiko_client().get_active_order_count()
    return min(BASE_MINUTES + active * QUEUE_MINUTES_PER_ORDER, MAX_ETA_MINUTES)
