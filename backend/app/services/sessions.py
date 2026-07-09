"""Сессии ЛК: HMAC-подписанная cookie без хранения на сервере.

Значение cookie — «user_id.подпись»; подделка невозможна без
session_secret. Достаточно для ЛК гостя (история, повтор заказа);
никаких прав доступа за сессией не стоит.
"""

import hashlib
import hmac

from fastapi import Request

from app.config import settings
from app.db import session_factory
from app.models import User

COOKIE_NAME = "aicafe_session"
COOKIE_MAX_AGE = 60 * 60 * 24 * 180  # полгода


def _sign(user_id: str) -> str:
    return hmac.new(
        settings.session_secret.encode(), user_id.encode(), hashlib.sha256
    ).hexdigest()[:32]


def make_token(user_id: str) -> str:
    return f"{user_id}.{_sign(user_id)}"


def parse_token(token: str | None) -> str | None:
    if not token or "." not in token:
        return None
    user_id, signature = token.rsplit(".", 1)
    if not hmac.compare_digest(signature, _sign(user_id)):
        return None
    return user_id


async def current_user(request: Request) -> User | None:
    user_id = parse_token(request.cookies.get(COOKIE_NAME))
    if user_id is None:
        return None
    async with session_factory() as session:
        return await session.get(User, user_id)
