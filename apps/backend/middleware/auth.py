"""
JWT Authentication middleware for Supabase Auth
"""
import logging
import os
from typing import Optional

from fastapi import HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt
from jwt.exceptions import InvalidTokenError

security = HTTPBearer(auto_error=False)

logger = logging.getLogger(__name__)


def get_jwt_secret():
    """Get JWT secret - uses Supabase's JWT secret"""
    secret = os.getenv("SUPABASE_JWT_SECRET")
    if not secret:
        secret = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
    return secret


def _get_jwks_client():
    """Get JWKS client for RS256 verification (Supabase cloud)"""
    supabase_url = os.getenv("SUPABASE_URL", "")
    if not supabase_url:
        return None
    jwks_url = f"{supabase_url}/auth/v1/.well-known/jwks.json"
    return jwt.PyJWKClient(jwks_url, cache_keys=True)


class AuthenticatedUser:
    """Represents an authenticated Supabase user"""
    def __init__(self, user_id: str, email: str, role: str = "authenticated"):
        self.user_id = user_id
        self.email = email
        self.role = role


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
) -> Optional[AuthenticatedUser]:
    """
    Extract and validate JWT token from Authorization header.
    Returns None if no token provided (for optional auth).
    Raises HTTPException if token is invalid.
    """
    if not credentials:
        return None

    token = credentials.credentials
    try:
        # Detect algorithm from token header
        header = jwt.get_unverified_header(token)
        alg = header.get("alg", "HS256")

        if alg in ("RS256", "ES256"):
            # Supabase cloud uses asymmetric algorithms (RS256/ES256) with JWKS
            jwks_client = _get_jwks_client()
            if not jwks_client:
                raise InvalidTokenError(f"{alg} token but SUPABASE_URL not configured")
            signing_key = jwks_client.get_signing_key_from_jwt(token)
            payload = jwt.decode(
                token,
                signing_key.key,
                algorithms=[alg],
                audience="authenticated",
                options={"verify_aud": True}
            )
        else:
            # Supabase self-hosted / local uses HS256
            jwt_secret = get_jwt_secret()
            payload = jwt.decode(
                token,
                jwt_secret,
                algorithms=["HS256"],
                audience="authenticated",
                options={"verify_aud": True}
            )

        user_id = payload.get("sub")
        email = payload.get("email")
        role = payload.get("role", "authenticated")

        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token: missing user ID")

        return AuthenticatedUser(user_id=user_id, email=email, role=role)

    except InvalidTokenError as e:
        logger.error(f"JWT validation failed: {str(e)}")
        raise HTTPException(status_code=401, detail=f"Invalid token: {str(e)}")


async def require_auth(
    user: Optional[AuthenticatedUser] = Depends(get_current_user)
) -> AuthenticatedUser:
    """
    Dependency that requires authentication.
    Use this for protected endpoints.
    """
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    return user


async def optional_auth(
    user: Optional[AuthenticatedUser] = Depends(get_current_user)
) -> Optional[AuthenticatedUser]:
    """
    Dependency for optional authentication.
    Returns user if authenticated, None otherwise.
    """
    return user
