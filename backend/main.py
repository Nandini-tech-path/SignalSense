import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from backend.database.database import engine, Base, SessionLocal
from backend.models.models import AppSettings
from backend.api.routes_wifi import router as wifi_router
from backend.api.routes_surveys import router as surveys_router
from backend.api.routes_measurements import router as measurements_router
from backend.api.routes_analysis import router as analysis_router
from backend.api.routes_settings import router as settings_router
from backend.api.routes_demo import router as demo_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create all database tables cleanly
    Base.metadata.create_all(bind=engine)
    # Ensure default settings record exists
    db = SessionLocal()
    try:
        settings = db.query(AppSettings).first()
        if not settings:
            default_settings = AppSettings(
                id=1,
                excellent_threshold=-50,
                good_threshold=-60,
                fair_threshold=-70,
                weak_threshold=-80,
                dead_threshold=-80,
                scan_interval_seconds=2,
                positioning_mode_default="auto"
            )
            db.add(default_settings)
            db.commit()
    finally:
        db.close()
    yield


app = FastAPI(
    title="SignalSense API",
    description="Real-world Wi-Fi Dead Zone Detection, Mapping & Propagation Analysis Platform",
    version="1.0.0",
    lifespan=lifespan
)

# Enable CORS for frontend Vite dev server and local clients
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(wifi_router)
app.include_router(surveys_router)
app.include_router(measurements_router)
app.include_router(analysis_router)
app.include_router(settings_router)
app.include_router(demo_router)


@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "service": "SignalSense",
        "database": "sqlite_ready",
        "version": "1.0.0"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="127.0.0.1", port=8000, reload=True)
