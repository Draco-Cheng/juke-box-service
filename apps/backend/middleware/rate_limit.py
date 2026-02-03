from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from fastapi import Request
from fastapi.responses import JSONResponse

# Create limiter instance using client IP for identification
limiter = Limiter(key_func=get_remote_address)


async def rate_limit_exceeded_handler(request: Request, exc: RateLimitExceeded):
    """Custom handler for rate limit exceeded errors"""
    return JSONResponse(
        status_code=429,
        content={
            "detail": "Too many requests. Please wait a moment and try again.",
            "retry_after": exc.detail
        }
    )


# Rate limit constants for different endpoint types
class RateLimits:
    # General API calls
    DEFAULT = "60/minute"

    # Payment endpoints - more restrictive to prevent abuse
    PAYMENT = "10/minute"

    # Search endpoints - moderate limits
    SEARCH = "30/minute"

    # Authentication/DJ login
    AUTH = "20/minute"

    # Write operations (create request, update session)
    WRITE = "30/minute"
