from fastapi import APIRouter, HTTPException
from typing import List, Optional
from models import DJ, DJCreate
from database import get_supabase

router = APIRouter(prefix="/djs", tags=["djs"])


@router.post("/", response_model=DJ)
async def create_dj(dj: DJCreate):
    """Create a new DJ profile"""
    try:
        supabase = get_supabase()
        result = supabase.table("djs").insert(dj.model_dump()).execute()
        return result.data[0]
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/by-email/{email}", response_model=DJ)
async def get_dj_by_email(email: str):
    """Get DJ by email (for login)"""
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


@router.get("/{dj_id}", response_model=DJ)
async def get_dj(dj_id: str):
    """Get DJ by ID"""
    try:
        supabase = get_supabase()
        result = (
            supabase.table("djs")
            .select("*")
            .eq("id", dj_id)
            .single()
            .execute()
        )
        return result.data
    except Exception:
        raise HTTPException(status_code=404, detail="DJ not found")


@router.get("/{dj_id}/venues", response_model=List[dict])
async def get_dj_venues(dj_id: str):
    """Get venues associated with a DJ"""
    try:
        supabase = get_supabase()
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
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{dj_id}/active-session")
async def get_dj_active_session(dj_id: str):
    """Get DJ's current active session"""
    try:
        supabase = get_supabase()
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
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
