from functools import lru_cache

from app.adapters.address.base import AddressProvider
from app.adapters.address.dadata import DadataAddressProvider
from app.adapters.address.stub import StubAddressProvider
from app.config import settings


@lru_cache(maxsize=1)
def get_address_provider() -> AddressProvider:
    if settings.dadata_api_key:
        return DadataAddressProvider()
    return StubAddressProvider()
