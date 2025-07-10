from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
import time
from .users import router as users_router
from .api_keys import router as api_keys_router
from .sandboxes import router as sandboxes_router

app = FastAPI(
    title="ScaleBox API",
    description="ScaleBox User Management and API Key System",
    version="1.0.0"
)

# Performance middleware
@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    response.headers["X-Process-Time"] = str(process_time)
    return response

app.add_middleware(GZipMiddleware, minimum_size=1000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Change to your frontend URL for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(users_router)
app.include_router(api_keys_router)
app.include_router(sandboxes_router)

@app.get("/health")
def health():
    return {"status": "ok", "timestamp": time.time()}

@app.get("/metrics")
def metrics():
    # Basic metrics endpoint for monitoring
    return {
        "status": "healthy",
        "uptime": time.time(),
        "database": "connected"
    }
