from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from assignments import router as assignments_router
from auth import router as auth_router
from certificates import router as certificates_router
from events import router as events_router
from forms import router as forms_router
from payments import router as payments_router
from registrations import router as registrations_router
from users import router as users_router


app = FastAPI(title="SeMS API")

origins = [
    "https://ais-dev-6vwfj5vktuwcrlsigz6d2a-703931185299.asia-northeast1.run.app",
    "https://ais-pre-6vwfj5vktuwcrlsigz6d2a-703931185299.asia-northeast1.run.app",
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=r"^http://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("X-Frame-Options", "DENY")
    response.headers.setdefault("Referrer-Policy", "same-origin")
    return response


app.include_router(auth_router)
app.include_router(events_router)
app.include_router(forms_router)
app.include_router(payments_router)
app.include_router(registrations_router)
app.include_router(assignments_router)
app.include_router(certificates_router)
app.include_router(users_router)


@app.get("/")
def read_root():
    return {"status": "SeMS API is running"}


@app.get("/health")
def health_check():
    return {"status": "ok"}
