"""FastAPI Entrypoint for KONE Elevator Digital Twin & PINN ML Platform."""

import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.endpoints import router as api_v1_router
from app.engine.physics_engine import kone_engine
from app.ml.inference import ml_manager

# Persistent background physics runner task
_physics_task = None


async def continuous_physics_loop():
    """Autonomous continuous physics loop running at 5 Hz (dt=0.2s).

    Continuously moves the elevator, advances kinematics, runs thermal ODEs,
    and updates sensor channels so the digital twin never freezes.
    """
    print("[Physics Engine] Starting autonomous continuous 5 Hz physical motion loop...")
    while True:
        try:
            kone_engine.step(dt=0.2)
            await asyncio.sleep(0.2)
        except asyncio.CancelledError:
            print("[Physics Engine] Background physics loop cancelled.")
            break
        except Exception as e:
            print(f"[Physics Engine Error] {e}")
            await asyncio.sleep(0.5)


@asynccontextmanager
async def lifespan(app: FastAPI):
    global _physics_task
    # Start continuous background simulation loop
    _physics_task = asyncio.create_task(continuous_physics_loop())
    # Load ML models into memory
    ml_manager.load_models()
    yield
    # Shutdown
    if _physics_task and not _physics_task.done():
        _physics_task.cancel()
        try:
            await _physics_task
        except asyncio.CancelledError:
            pass


app = FastAPI(
    title="KONE Elevate Intelligence — Digital Twin & PINN Platform",
    version="2.0.0",
    description="High-fidelity Physics-Informed Neural Network (PINN) and real-time telemetry backend for Elevator E-001.",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# Enable CORS for frontend web server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API v1 routes
app.include_router(api_v1_router, prefix="/api/v1")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8001, reload=False)
