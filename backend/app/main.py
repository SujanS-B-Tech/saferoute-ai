from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import auth, emergency, facilities, journeys, reports, routes, safety, admin
from app.core.config import DEMO_BANNER, get_settings
from app.core.database import Base, engine
from app.core.security import rate_limit_middleware


@asynccontextmanager
async def lifespan(app: FastAPI):
    if str(engine.url).startswith("sqlite"):  # dev convenience; use Alembic migrations elsewhere
        import app.models  # noqa: F401
        Base.metadata.create_all(engine)
    yield


def create_app() -> FastAPI:
    s = get_settings()
    app = FastAPI(title="SafeRoute AI API", version="0.1.0", lifespan=lifespan,
                  description="Safety-aware navigation for Tamil Nadu. Assessments are based on available "
                              "data and never guarantee personal safety.")
    app.add_middleware(CORSMiddleware, allow_origins=s.cors_origin_list, allow_credentials=False,
                       allow_methods=["GET", "POST", "PATCH", "DELETE"], allow_headers=["Authorization", "Content-Type"])
    app.middleware("http")(rate_limit_middleware)
    for r in (auth.auth_router, auth.users_router, routes.router, facilities.router, safety.router, journeys.router, emergency.router, reports.router, admin.router):
        app.include_router(r)

    @app.get("/health", tags=["system"])
    def health():
        return {"status": "ok", "demo_mode": s.demo_mode, "demo_banner": DEMO_BANNER if s.demo_mode else None}

    return app


app = create_app()
