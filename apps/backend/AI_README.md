# Backend - FastAPI Service

## Tech Stack
- Python 3.10+, FastAPI, Pydantic v2
- Supabase Python SDK, Stripe SDK, PyJWT, SlowAPI
- pytest + pytest-asyncio

## Patterns
- **Routing**: `APIRouter` with prefix, registered in `main.py` under `/api`
- **Models**: Pydantic schemas in `models/schemas.py` with field validators
- **Database**: `get_supabase()` from `database.py`, chain `.table().select/insert/update`
- **Auth**: `require_auth` or `optional_auth` dependency from `middleware/auth.py`
- **Errors**: Raise `HTTPException`, never return error dicts
- **Input**: HTML escape and strip control chars via Pydantic validators

## API Design
- RESTful: `GET /api/venues/{slug}`, `POST /api/sessions/`, `PATCH /api/requests/{id}`
- Enums: `RequestTier`, `RequestStatus`, `SessionStatus` from `models/schemas.py`
- Response models in route decorators (`response_model=`)

## Deployment
- Dockerfile for containerization
- Helm charts in `helm/` for Kubernetes

## Cross-directory Dependencies
- Frontend types in `apps/frontend/src/lib/api.ts` must match schemas here
- JWT tokens from Supabase Auth validated via `SUPABASE_JWT_SECRET`
