from fastapi import APIRouter, HTTPException
from typing import List
from models import Request, RequestCreate, RequestUpdate
from database import get_supabase
from datetime import datetime, timedelta
import stripe
import os

stripe.api_key = os.getenv("STRIPE_SECRET_KEY")

router = APIRouter(prefix="/requests", tags=["requests"])

# Authorization hold expires after ~7 days; we expire at 6 days for safety
AUTHORIZATION_EXPIRY_DAYS = 6


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

        update_data = {
            "status": update.status.value,
            "updated_at": datetime.utcnow().isoformat()
        }

        stripe_payment_id = current_request.get("stripe_payment_id")

        # If marking as played, capture the authorized payment
        if update.status.value == "played" and stripe_payment_id:
            try:
                await capture_payment_intent(stripe_payment_id)
            except Exception as capture_error:
                # Log but don't fail the status update
                print(f"Capture failed for {request_id}: {capture_error}")

        # If rejecting, cancel the authorization (releases hold, no refund needed)
        if update.status.value == "rejected" and stripe_payment_id:
            try:
                await cancel_payment_intent(stripe_payment_id)
            except Exception as cancel_error:
                # Log but don't fail the rejection
                print(f"Cancel failed for {request_id}: {cancel_error}")

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


async def capture_payment_intent(stripe_payment_id: str):
    """Capture an authorized payment"""
    try:
        stripe.PaymentIntent.capture(stripe_payment_id)
        # Update payment record status
        supabase = get_supabase()
        supabase.table("payments").update(
            {"status": "captured"}
        ).eq("stripe_payment_id", stripe_payment_id).execute()
    except stripe.error.StripeError as e:
        raise Exception(f"Stripe capture error: {str(e)}")


async def cancel_payment_intent(stripe_payment_id: str):
    """Cancel an authorized payment (releases hold without refund)"""
    try:
        stripe.PaymentIntent.cancel(stripe_payment_id)
        # Update payment record status
        supabase = get_supabase()
        supabase.table("payments").update(
            {"status": "canceled"}
        ).eq("stripe_payment_id", stripe_payment_id).execute()
    except stripe.error.StripeError as e:
        raise Exception(f"Stripe cancel error: {str(e)}")


@router.post("/expire-stale")
async def expire_stale_requests():
    """Expire requests with authorization holds older than 6 days.
    Should be called by a cron job periodically."""
    try:
        supabase = get_supabase()
        cutoff = (datetime.utcnow() - timedelta(days=AUTHORIZATION_EXPIRY_DAYS)).isoformat()

        # Find pending/accepted requests older than cutoff with stripe payments
        stale = (
            supabase.table("requests")
            .select("*")
            .in_("status", ["pending", "accepted"])
            .not_.is_("stripe_payment_id", "null")
            .lt("created_at", cutoff)
            .execute()
        )

        expired_count = 0
        for req in stale.data:
            try:
                await cancel_payment_intent(req["stripe_payment_id"])
            except Exception as e:
                print(f"Failed to cancel expired authorization for {req['id']}: {e}")

            supabase.table("requests").update({
                "status": "expired",
                "updated_at": datetime.utcnow().isoformat()
            }).eq("id", req["id"]).execute()
            expired_count += 1

        return {"expired_count": expired_count}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


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
