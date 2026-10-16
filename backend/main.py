from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from assignments import router as assignments_router
from auth import router as auth_router
from events import router as events_router
from payments import router as payments_router
from registrations import router as registrations_router


app = FastAPI(title="SeMS API")

origins = [
    "http://localhost:3000",
    "http://localhost:5173",
    "https://ais-dev-6vwfj5vktuwcrlsigz6d2a-703931185299.asia-northeast1.run.app",
    "https://ais-pre-6vwfj5vktuwcrlsigz6d2a-703931185299.asia-northeast1.run.app",
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(events_router)
app.include_router(payments_router)
app.include_router(registrations_router)
app.include_router(assignments_router)


@app.get("/")
def read_root():
    return {"status": "SeMS API is running"}


@app.get("/health")
def health_check():
    return {"status": "ok"}
