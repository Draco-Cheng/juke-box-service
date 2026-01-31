from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes import venues_router, sessions_router, requests_router, djs_router, payments_router, connect_router

app = FastAPI(
    title="DJ Request API",
    description="Paid song request platform for bars and clubs",
    version="0.1.0"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
@app.head("/")
def health_check():
    """Health check endpoint"""
    return {"status": "ok", "service": "dj-request"}


@app.get("/api/ping")
def ping():
    """Simple ping endpoint"""
    return {"result": "pong"}


# Include routers
app.include_router(venues_router, prefix="/api")
app.include_router(sessions_router, prefix="/api")
app.include_router(requests_router, prefix="/api")
app.include_router(djs_router, prefix="/api")
app.include_router(payments_router, prefix="/api")
app.include_router(connect_router, prefix="/api")
