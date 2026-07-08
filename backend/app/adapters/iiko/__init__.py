from functools import lru_cache

from app.adapters.iiko.base import IikoClient
from app.adapters.iiko.cloud import CloudIikoClient
from app.adapters.iiko.mock import MockIikoClient
from app.config import settings


@lru_cache(maxsize=1)
def get_iiko_client() -> IikoClient:
    if settings.iiko_mock:
        return MockIikoClient()
    return CloudIikoClient()
