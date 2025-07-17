from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
import time

from .database import engine
from .models import Base
from .users import router as users_router
from .templates import router as templates_router
from .sandboxes import router as sandboxes_router
from .api_keys import router as api_keys_router
from .notifications import router as notifications_router
from .projects import router as projects_router

# Create tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="ScaleBox API",
    description="API for ScaleBox platform",
    version="1.0.0"
)

# Add middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(GZipMiddleware, minimum_size=1000)

@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    response.headers["X-Process-Time"] = str(process_time)
    return response

# Include routers
app.include_router(users_router, prefix="/api/users")
app.include_router(templates_router, prefix="/api/templates")
app.include_router(sandboxes_router, prefix="/api/sandboxes")
app.include_router(api_keys_router, prefix="/api/api-keys")
app.include_router(notifications_router, prefix="/api/notifications")
app.include_router(projects_router, prefix="/api/projects")

@app.get("/")
async def root():
    return {"message": "ScaleBox API is running"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}
