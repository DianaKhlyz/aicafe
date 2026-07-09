from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Настройки приложения. Источник — переменные окружения / .env (префикс AICAFE_)."""

    # iiko: пока нет apiLogin (доступ ~через месяц) — работаем на мок-данных
    iiko_mock: bool = True
    iiko_api_login: str = ""
    # Список организаций: сейчас одна точка, при расширении до сети код не меняется
    iiko_organization_ids: list[str] = []
    # Пусто = определяются автоматически первым запросом (кэшируются)
    iiko_terminal_group_id: str = ""
    iiko_external_menu_id: str = ""
    # iiko передаёт время терминала без таймзоны — нужен его часовой пояс
    iiko_terminal_timezone: str = "Europe/Moscow"
    # Публичный URL https://домен/api/webhooks/iiko; пусто = вебхуки не настраивать
    iiko_webhook_url: str = ""
    iiko_webhook_auth_token: str = ""

    # DaData: пустой ключ = мок-подсказки; ключ регистрируется на аккаунт
    # заказчика (бесплатный тариф, 10 000 запросов/день)
    dadata_api_key: str = ""

    database_path: str = "aicafe.db"
    cors_origins: list[str] = ["http://localhost:5173"]

    model_config = SettingsConfigDict(env_file=".env", env_prefix="AICAFE_")


settings = Settings()
