from fastapi import APIRouter, HTTPException
from typing import List
from models import Request, RequestCreate, RequestUpdate
from database import get_supabase
import stripe
import os

stripe.api_key = os.getenv("STRIPE_SECRET_KEY")

router = APIRouter(prefix="/requests", tags=["requests"])


@router.post("/", response_model=Request)
async def create_request(request: RequestCreate):
    """Submit a new song request"""
    try:
        supabase = get_supabase()
        result = supabase.table("requests").insert(request.model_dump()).execute()
        return result.data[0]
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{request_id}", response_model=Request)
async def get_request(request_id: str):
    """Get request by ID"""
    try:
        supabase = get_supabase()
        result = supabase.table("requests").select("*").eq("id", request_id).single().execute()
        return result.data
    except Exception:
        raise HTTPException(status_code=404, detail="Request not found")


@router.patch("/{request_id}", response_model=Request)
async def update_request(request_id: str, update: RequestUpdate):
    """Update request status (accept, reject, mark as played)"""
    try:
        supabase = get_supabase()

        # Get current request to check for stripe_payment_id
        current = (
            supabase.table("requests")
            .select("*")
            .eq("id", request_id)
            .single()
            .execute()
        )

        if not current.data:
            raise HTTPException(status_code=404, detail="Request not found")

        current_request = current.data

        from datetime import datetime
        update_data = {
            "status": update.status.value,
            "updated_at": datetime.utcnow().isoformat()
        }

        # If rejecting, trigger refund
        if update.status.value == "rejected" and current_request.get("stripe_payment_id"):
            try:
                await process_refund(current_request["stripe_payment_id"])
            except Exception as refund_error:
                # Log but don't fail the rejection
                print(f"Refund failed for {request_id}: {refund_error}")

        result = (
            supabase.table("requests")
            .update(update_data)
            .eq("id", request_id)
            .execute()
        )

        if not result.data:
            raise HTTPException(status_code=404, detail="Request not found")

        return result.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


async def process_refund(stripe_payment_id: str):
    """Process a full refund for a payment"""
    try:
        # Create refund for the payment intent
        refund = stripe.Refund.create(
            payment_intent=stripe_payment_id,
            reason="requested_by_customer"  # DJ rejected = customer didn't get what they paid for
        )
        return refund
    except stripe.error.StripeError as e:
        raise Exception(f"Stripe refund error: {str(e)}")


@router.get("/session/{session_id}", response_model=List[Request])
async def get_session_requests(session_id: str):
    """Get all requests for a session, sorted by tier and time"""
    try:
        supabase = get_supabase()

        # Get requests, priority order: asap > priority > normal, then by created_at
        result = (
            supabase.table("requests")
            .select("*")
            .eq("session_id", session_id)
            .order("created_at", desc=False)
            .execute()
        )

        # Sort by tier priority
        tier_order = {"asap": 0, "priority": 1, "normal": 2}
        requests = sorted(
            result.data,
            key=lambda r: (tier_order.get(r["tier"], 2), r["created_at"])
        )

        return requests
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
