from fastapi import APIRouter, HTTPException
from typing import Optional
from models import Venue, VenueCreate, VenueUpdate, Session
from database import get_supabase

router = APIRouter(prefix="/venues", tags=["venues"])


@router.get("/{slug}", response_model=Venue)
async def get_venue_by_slug(slug: str):
    """Get venue by slug (used for QR code join)"""
    try:
        supabase = get_supabase()
        result = supabase.table("venues").select("*").eq("slug", slug).single().execute()
        return result.data
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"Venue not found: {slug}")


@router.get("/{slug}/active-session", response_model=Optional[Session])
async def get_active_session(slug: str):
    """Get current active session for a venue"""
    try:
        supabase = get_supabase()

        # First get venue
        venue_result = supabase.table("venues").select("id").eq("slug", slug).single().execute()
        venue_id = venue_result.data["id"]

        # Then get active session
        session_result = (
            supabase.table("sessions")
            .select("*")
            .eq("venue_id", venue_id)
            .eq("status", "active")
            .order("started_at", desc=True)
            .limit(1)
            .execute()
        )

        if session_result.data:
            return session_result.data[0]
        return None
    except Exception:
        return None


@router.post("/", response_model=Venue)
async def create_venue(venue: VenueCreate):
    """Create a new venue"""
    try:
        supabase = get_supabase()
        # Convert nested pydantic models to dict
        venue_data = venue.model_dump()
        venue_data["settings"] = venue_data["settings"]
        result = supabase.table("venues").insert(venue_data).execute()
        return result.data[0]
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/{venue_id}", response_model=Venue)
async def update_venue(venue_id: str, venue_update: VenueUpdate):
    """Update a venue's name and/or settings"""
    try:
        supabase = get_supabase()

        # Build update data (only include non-None fields)
        update_data = {}
        if venue_update.name is not None:
            update_data["name"] = venue_update.name
        if venue_update.settings is not None:
            update_data["settings"] = venue_update.settings.model_dump()

        if not update_data:
            raise HTTPException(status_code=400, detail="No fields to update")

        result = (
            supabase.table("venues")
            .update(update_data)
            .eq("id", venue_id)
            .execute()
        )

        if not result.data:
            raise HTTPException(status_code=404, detail="Venue not found")

        return result.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
