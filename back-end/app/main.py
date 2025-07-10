from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .users import router as users_router

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Change to your frontend URL for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(users_router)

@app.get("/health")
def health():
    return {"status": "ok"}
