"""
FastAPI application entry point.
"""

import logging
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.database import create_all_tables
from app.routers import transactions, accounts, cases, dashboard

logging.basicConfig(
    level=logging.DEBUG if settings.DEBUG else logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Creating database tables...")
    create_all_tables()
    logger.info("Tables ready.")

    # Auto-seed database if empty (ensures cloud deployments like Render are pre-populated)
    from app.database import SessionLocal
    from app.models.account import Account
    db = SessionLocal()
    try:
        if db.query(Account).count() == 0:
            logger.info("Database is empty. Auto-seeding hackathon demo dataset...")
            from app.seed.seed_data import seed
            seed(db)
            logger.info("Database seeded successfully.")
    except Exception as e:
        logger.error(f"Auto-seeding failed: {e}")
    finally:
        db.close()

    # Pre-warm the ML model
    logger.info("Loading ML model...")
    try:
        from app.services.inference import get_inference_service
        svc = get_inference_service()
        # Quick smoke test
        result = svc.predict(1, 1000.0, "TRANSFER", 50000.0, 49000.0, 5000.0, 6000.0)
        logger.info(f"Model loaded and tested. Smoke test probability: {result['probability']:.4f}")
    except Exception as e:
        logger.error(f"Model loading failed: {e}")

    yield

    # Shutdown
    logger.info("Shutting down ScamDetect API.")



app = FastAPI(
    title="ScamDetect AI Risk Manager",
    description=(
        "AI-Powered Scam Detection & Investigation Platform — Razorpay Hackathon 2026\n\n"
        "DETECT → EXPLAIN → INVESTIGATE → TRACE"
    ),
    version="1.0.0",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Hackathon: allow all
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled error on {request.url}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": str(exc), "type": type(exc).__name__},
    )

# Routers
app.include_router(transactions.router, prefix="/api/v1")
app.include_router(accounts.router, prefix="/api/v1")
app.include_router(cases.router, prefix="/api/v1")
app.include_router(dashboard.router, prefix="/api/v1")


@app.get("/health")
def health():
    return {"status": "ok", "service": "ScamDetect AI Risk Manager", "version": "1.0.0"}


@app.get("/")
def root():
    return {
        "service": "ScamDetect AI Risk Manager",
        "hackathon": "Razorpay Hackathon 2026",
        "docs": "/docs",
        "health": "/health",
    }
