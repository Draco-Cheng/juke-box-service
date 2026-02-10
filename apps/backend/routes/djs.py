from fastapi import APIRouter, HTTPException, Request, Depends
from typing import List
from models import DJ, DJCreate, DJProfileUpdate, Venue, VenueCreate
from database import get_supabase
from middleware import limiter, RateLimits, require_auth, AuthenticatedUser

router = APIRouter(prefix="/djs", tags=["djs"])


@router.post("/", response_model=DJ)
@limiter.limit(RateLimits.AUTH)
async def create_dj(request: Request, dj: DJCreate):
    """Create a new DJ profile"""
    try:
        supabase = get_supabase()
        result = supabase.table("djs").insert(dj.model_dump()).execute()
        return result.data[0]
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/by-email/{email}", response_model=DJ)
@limiter.limit(RateLimits.AUTH)
async def get_dj_by_email(request: Request, email: str):
    """Get DJ by email (for authenticated user lookup)"""
    try:
        supabase = get_supabase()
        result = (
            supabase.table("djs")
            .select("*")
            .eq("email", email)
            .single()
            .execute()
        )
        return result.data
    except Exception:
        raise HTTPException(status_code=404, detail="DJ not found")


@router.get("/live")
async def get_live_djs():
    """Get all DJs currently live with their active sessions"""
    try:
        supabase = get_supabase()

        # Get all active sessions with DJ and venue info
        sessions = (
            supabase.table("sessions")
            .select("*, djs(*), venues(*)")
            .eq("status", "active")
            .execute()
        )

        live_djs = []
        for session in sessions.data:
            dj = session.get("djs")
            venue = session.get("venues")
            if not dj or not venue:
                continue

            # Count requests for this session as listener proxy
            requests = (
                supabase.table("requests")
                .select("id", count="exact")
                .eq("session_id", session["id"])
                .execute()
            )

            pricing = venue.get("settings", {}).get("pricing", {})

            live_djs.append({
                "dj": dj,
                "venue": venue,
                "session_id": session["id"],
                "listener_count": requests.count or 0,
                "base_price": pricing.get("normal", 200),
            })

        return live_djs
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/me", response_model=DJ)
async def get_current_dj(user: AuthenticatedUser = Depends(require_auth)):
    """Get the authenticated DJ's profile"""
    try:
        supabase = get_supabase()
        result = (
            supabase.table("djs")
            .select("*")
            .eq("email", user.email)
            .single()
            .execute()
        )
        return result.data
    except Exception:
        raise HTTPException(status_code=404, detail="DJ profile not found")


@router.get("/{dj_id}", response_model=DJ)
async def get_dj(dj_id: str, user: AuthenticatedUser = Depends(require_auth)):
    """Get DJ by ID (requires authentication)"""
    try:
        supabase = get_supabase()
        result = (
            supabase.table("djs")
            .select("*")
            .eq("id", dj_id)
            .single()
            .execute()
        )

        # Only allow DJs to view their own profile
        if result.data and result.data.get("email") != user.email:
            raise HTTPException(status_code=403, detail="Access denied")

        return result.data
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=404, detail="DJ not found")


@router.get("/{dj_id}/venues", response_model=List[dict])
async def get_dj_venues(dj_id: str, user: AuthenticatedUser = Depends(require_auth)):
    """Get venues associated with a DJ (requires authentication)"""
    try:
        supabase = get_supabase()

        # Verify the DJ belongs to this user
        dj_check = (
            supabase.table("djs")
            .select("email")
            .eq("id", dj_id)
            .single()
            .execute()
        )
        if not dj_check.data or dj_check.data.get("email") != user.email:
            raise HTTPException(status_code=403, detail="Access denied")

        # Get unique venue IDs from sessions this DJ has run
        result = (
            supabase.table("sessions")
            .select("venue_id, venues(*)")
            .eq("dj_id", dj_id)
            .execute()
        )

        # Extract unique venues
        seen = set()
        venues = []
        for row in result.data:
            venue = row.get("venues")
            if venue and venue["id"] not in seen:
                seen.add(venue["id"])
                venues.append(venue)

        return venues
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{dj_id}/active-session")
async def get_dj_active_session(
    dj_id: str, user: AuthenticatedUser = Depends(require_auth)
):
    """Get DJ's current active session (requires authentication)"""
    try:
        supabase = get_supabase()

        # Verify the DJ belongs to this user
        dj_check = (
            supabase.table("djs")
            .select("email")
            .eq("id", dj_id)
            .single()
            .execute()
        )
        if not dj_check.data or dj_check.data.get("email") != user.email:
            raise HTTPException(status_code=403, detail="Access denied")

        result = (
            supabase.table("sessions")
            .select("*, venues(*)")
            .eq("dj_id", dj_id)
            .eq("status", "active")
            .order("started_at", desc=True)
            .limit(1)
            .execute()
        )

        if result.data:
            return result.data[0]
        return None
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{dj_id}/venues", response_model=Venue)
@limiter.limit(RateLimits.WRITE)
async def create_dj_venue(
    request: Request,
    dj_id: str,
    venue: VenueCreate,
    user: AuthenticatedUser = Depends(require_auth),
):
    """Create a new venue for a DJ (requires authentication)"""
    try:
        supabase = get_supabase()

        # Verify the DJ belongs to this user
        dj_result = (
            supabase.table("djs")
            .select("id, email")
            .eq("id", dj_id)
            .single()
            .execute()
        )
        if not dj_result.data:
            raise HTTPException(status_code=404, detail="DJ not found")
        if dj_result.data.get("email") != user.email:
            raise HTTPException(status_code=403, detail="Access denied")

        # Check if slug is already taken
        slug_check = supabase.table("venues").select("id").eq("slug", venue.slug).execute()
        if slug_check.data:
            raise HTTPException(status_code=400, detail="Venue slug already exists")

        # Create venue with default settings
        venue_data = venue.model_dump()

        result = supabase.table("venues").insert(venue_data).execute()
        new_venue = result.data[0]

        # Create an initial session to associate DJ with venue
        # This ensures the venue shows up in the DJ's venue list
        supabase.table("sessions").insert({
            "venue_id": new_venue["id"],
            "dj_id": dj_id,
            "status": "ended"  # Create as ended so it doesn't interfere
        }).execute()

        return new_venue
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.patch("/{dj_id}/profile", response_model=DJ)
async def update_dj_profile(
    dj_id: str,
    profile: DJProfileUpdate,
    user: AuthenticatedUser = Depends(require_auth),
):
    """Update DJ profile (genres, profile_image)"""
    try:
        supabase = get_supabase()

        # Verify the DJ belongs to this user
        dj_check = (
            supabase.table("djs")
            .select("email")
            .eq("id", dj_id)
            .single()
            .execute()
        )
        if not dj_check.data or dj_check.data.get("email") != user.email:
            raise HTTPException(status_code=403, detail="Access denied")

        update_data = {}
        if profile.genres is not None:
            update_data["genres"] = profile.genres
        if profile.profile_image is not None:
            update_data["profile_image"] = profile.profile_image

        if not update_data:
            raise HTTPException(status_code=400, detail="No fields to update")

        result = (
            supabase.table("djs")
            .update(update_data)
            .eq("id", dj_id)
            .execute()
        )

        if not result.data:
            raise HTTPException(status_code=404, detail="DJ not found")

        return result.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
