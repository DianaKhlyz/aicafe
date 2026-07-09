from fastapi import APIRouter, HTTPException, Request, Response
from sqlalchemy import select

from app import schemas
from app.adapters.auth_codes import get_code_provider
from app.db import session_factory
from app.models import User
from app.services.sessions import COOKIE_MAX_AGE, COOKIE_NAME, current_user, make_token

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/request-code")
async def request_code(body: schemas.AuthPhone) -> dict[str, str]:
    """Отправить код подтверждения (заглушка: подходит 0000)."""
    await get_code_provider().send_code(body.phone)
    return {"status": "sent"}


@router.post("/verify")
async def verify(body: schemas.AuthVerify, response: Response) -> schemas.AuthMe:
    if not await get_code_provider().verify_code(body.phone, body.code):
        raise HTTPException(status_code=401, detail="Неверный код")
    async with session_factory() as session:
        user = (
            await session.execute(select(User).where(User.phone == body.phone))
        ).scalar_one_or_none()
        if user is None:
            user = User(phone=body.phone)
            session.add(user)
            await session.commit()
    response.set_cookie(
        COOKIE_NAME,
        make_token(user.id),
        max_age=COOKIE_MAX_AGE,
        httponly=True,
        samesite="lax",
    )
    return schemas.AuthMe(phone=user.phone)


@router.get("/me")
async def me(request: Request) -> schemas.AuthMe:
    user = await current_user(request)
    if user is None:
        raise HTTPException(status_code=401)
    return schemas.AuthMe(phone=user.phone)


@router.post("/logout")
async def logout(response: Response) -> dict[str, str]:
    response.delete_cookie(COOKIE_NAME)
    return {"status": "ok"}
