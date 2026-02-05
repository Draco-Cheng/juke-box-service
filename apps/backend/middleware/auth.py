"""
JWT Authentication middleware for Supabase Auth
"""
from typing import Optional
from fastapi import HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt
from jwt.exceptions import InvalidTokenError

# Supabase JWT settings
SUPABASE_JWT_SECRET = None  # Will be loaded from config

security = HTTPBearer(auto_error=False)


def get_jwt_secret():
    """Get JWT secret - uses Supabase's JWT secret"""
    import os
    secret = os.getenv("SUPABASE_JWT_SECRET")
    if not secret:
        # For development, you can use the default Supabase local secret
        # In production, this should be set via environment variable
        secret = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
    return secret


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
        # Supabase uses HS256 algorithm
        # The JWT secret can be found in Supabase dashboard > Settings > API > JWT Secret
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
