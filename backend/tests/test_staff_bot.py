"""Тесты бота смен: логика на фейковом Telegram Bot API."""

import asyncio
import json

import httpx
import pytest

from app.config import settings
from app.db import create_tables
from app.services.staff_bot import StaffShiftBot


def _update_start(user_id: int, name: str) -> dict:
    return {
        "message": {
            "chat": {"id": user_id, "type": "private"},
            "from": {"id": user_id, "first_name": name},
            "text": "/start",
        }
    }


def _callback(user_id: int, name: str, data: str) -> dict:
    return {
        "callback_query": {
            "id": f"cb-{user_id}-{data}",
            "from": {"id": user_id, "first_name": name},
            "data": data,
        }
    }


@pytest.fixture
def bot():
    calls: list[tuple[str, dict]] = []

    def handler(request: httpx.Request) -> httpx.Response:
        method = request.url.path.rsplit("/", 1)[-1]
        payload = json.loads(request.content) if request.content else {}
        calls.append((method, payload))
        result: object = {}
        if method == "createChatInviteLink":
            result = {"invite_link": "https://t.me/+one-time-link"}
        return httpx.Response(200, json={"ok": True, "result": result})

    original = (settings.telegram_bot_token, settings.telegram_staff_chat_id)
    settings.telegram_bot_token = "test-token"
    settings.telegram_staff_chat_id = "-100500"
    asyncio.run(create_tables())
    yield StaffShiftBot(transport=httpx.MockTransport(handler)), calls
    settings.telegram_bot_token, settings.telegram_staff_chat_id = original


def _sent_texts(calls: list[tuple[str, dict]]) -> list[str]:
    return [payload.get("text", "") for method, payload in calls if method == "sendMessage"]


def test_start_shows_menu(bot):
    instance, calls = bot
    asyncio.run(instance.handle_update(_update_start(101, "Аня")))
    method, payload = calls[-1]
    assert method == "sendMessage"
    assert "reply_markup" in payload


def test_shift_on_sends_personal_invite_link(bot):
    instance, calls = bot
    asyncio.run(instance.handle_update(_callback(102, "Борис", "shift_on")))

    link_calls = [p for m, p in calls if m == "createChatInviteLink"]
    assert link_calls and link_calls[0]["member_limit"] == 1
    assert link_calls[0]["chat_id"] == "-100500"
    assert any("t.me/+one-time-link" in text for text in _sent_texts(calls))

    listing = asyncio.run(instance.shift_list_text())
    assert "Борис" in listing


def test_shift_off_kicks_softly(bot):
    instance, calls = bot
    asyncio.run(instance.handle_update(_callback(103, "Вера", "shift_on")))
    asyncio.run(instance.handle_update(_callback(103, "Вера", "shift_off")))

    methods = [m for m, _ in calls]
    assert "banChatMember" in methods
    assert "unbanChatMember" in methods  # мягкий кик: сразу разбанен
    listing = asyncio.run(instance.shift_list_text())
    assert "Вера" not in listing


def test_cleanup_spares_permanent_members(bot):
    instance, calls = bot
    asyncio.run(instance.handle_update(_callback(104, "Гоша", "shift_on")))
    asyncio.run(instance.handle_update(_callback(105, "Дарья Управляющая", "shift_permanent")))
    calls.clear()

    asyncio.run(instance.end_of_day_cleanup())

    kicked = [p["user_id"] for m, p in calls if m == "banChatMember"]
    assert 104 in kicked
    assert 105 not in kicked  # «постоянно на смене» чистка не трогает

    listing = asyncio.run(instance.shift_list_text())
    assert "Гоша" not in listing
    assert "Дарья Управляющая" in listing  # осталась в списке как постоянная
