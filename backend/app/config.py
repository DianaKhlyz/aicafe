from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Настройки приложения. Источник — переменные окружения / .env (префикс AICAFE_)."""

    # iiko: пока нет apiLogin (доступ ~через месяц) — работаем на мок-данных
    iiko_mock: bool = True
    iiko_api_login: str = ""
    # Список организаций: сейчас одна точка, при расширении до сети код не меняется
    iiko_organization_ids: list[str] = []

    database_path: str = "aicafe.db"
    cors_origins: list[str] = ["http://localhost:5173"]

    model_config = SettingsConfigDict(env_file=".env", env_prefix="AICAFE_")


settings = Settings()
