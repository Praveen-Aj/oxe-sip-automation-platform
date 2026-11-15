from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(extra="ignore")

    APP_NAME: str = "OXE SIP Automation Platform"
    API_V1_STR: str = "/api/v1"
    VERSION: str = "1.0.0"
    DEBUG_MODE: bool = True
    ENVIRONMENT: str = "LOCAL_WINDOWS"
    DATABASE_URL: str = "sqlite:///./database/oxe_sip.db"
    CORS_ORIGINS: list[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:6006",
        "http://127.0.0.1:6006",
    ]

settings = Settings()
