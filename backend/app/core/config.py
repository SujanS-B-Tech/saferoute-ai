from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict

INSECURE_DEFAULT_SECRET = "dev-only-change-me"
DEMO_BANNER = "DEMO MODE — DATA IS SIMULATED"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_env: str = "development"
    database_url: str = "sqlite:///./saferoute.db"
    jwt_secret: str = INSECURE_DEFAULT_SECRET
    jwt_expire_minutes: int = 60
    cors_origins: str = "http://localhost:5173"
    demo_mode: bool = True
    rate_limit_per_minute: int = 120
    auth_rate_limit_per_minute: int = 10
    routing_provider: str = "demo"  # demo | osrm
    osrm_base_url: str = ""  # set explicitly; respect the provider's usage policy

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    s = Settings()
    if s.app_env == "production" and s.jwt_secret == INSECURE_DEFAULT_SECRET:
        raise RuntimeError("JWT_SECRET must be set in production")
    return s
