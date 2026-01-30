from fastapi import APIRouter, HTTPException
from models import Session, SessionCreate, SessionUpdate
from database import get_supabase

router = APIRouter(prefix="/sessions", tags=["sessions"])


@router.post("/", response_model=Session)
async def create_session(session: SessionCreate):
    """Create a new DJ session"""
    try:
        supabase = get_supabase()
        result = supabase.table("sessions").insert(session.model_dump()).execute()
        return result.data[0]
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{session_id}", response_model=Session)
async def get_session(session_id: str):
    """Get session by ID"""
    try:
        supabase = get_supabase()
        result = supabase.table("sessions").select("*").eq("id", session_id).single().execute()
        return result.data
    except Exception:
        raise HTTPException(status_code=404, detail="Session not found")


@router.patch("/{session_id}", response_model=Session)
async def update_session(session_id: str, update: SessionUpdate):
    """Update session status (pause, resume, end)"""
    try:
        supabase = get_supabase()

        update_data = {"status": update.status.value}

        # If ending session, set ended_at
        if update.status.value == "ended":
            from datetime import datetime
            update_data["ended_at"] = datetime.utcnow().isoformat()

        result = (
            supabase.table("sessions")
            .update(update_data)
            .eq("id", session_id)
            .execute()
        )

        if not result.data:
            raise HTTPException(status_code=404, detail="Session not found")

        return result.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
