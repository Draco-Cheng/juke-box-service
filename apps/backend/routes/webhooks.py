from fastapi import APIRouter, Request, HTTPException
from database import get_supabase
from config import STRIPE_WEBHOOK_SECRET
import stripe

router = APIRouter(prefix="/webhooks", tags=["webhooks"])


@router.post("/stripe")
async def stripe_webhook(request: Request):
    """Handle Stripe webhook events"""
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")

    if not sig_header:
        raise HTTPException(status_code=400, detail="Missing Stripe signature")

    if not STRIPE_WEBHOOK_SECRET:
        raise HTTPException(status_code=500, detail="Webhook secret not configured")

    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, STRIPE_WEBHOOK_SECRET
        )
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid payload")
    except stripe.error.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Invalid signature")

    # Handle the event
    event_type = event["type"]

    if event_type == "payment_intent.succeeded":
        await handle_payment_succeeded(event["data"]["object"])
    elif event_type == "payment_intent.payment_failed":
        await handle_payment_failed(event["data"]["object"])

    return {"status": "ok"}


async def handle_payment_succeeded(payment_intent: dict):
    """Handle successful payment - create request and payment record"""
    supabase = get_supabase()
    stripe_payment_id = payment_intent["id"]
    metadata = payment_intent.get("metadata", {})

    # Idempotency check - skip if already processed
    existing = (
        supabase.table("requests")
        .select("id")
        .eq("stripe_payment_id", stripe_payment_id)
        .execute()
    )
    if existing.data:
        return  # Already processed

    # Create the request
    request_data = {
        "session_id": metadata.get("session_id"),
        "song_title": metadata.get("song_title"),
        "song_artist": metadata.get("song_artist") or None,
        "spotify_track_id": metadata.get("spotify_track_id") or None,
        "message": metadata.get("message") or None,
        "tier": metadata.get("tier", "normal"),
        "amount": payment_intent["amount"],
        "status": "pending",
        "stripe_payment_id": stripe_payment_id,
    }

    result = supabase.table("requests").insert(request_data).execute()

    if result.data:
        request_id = result.data[0]["id"]

        # Calculate platform fee (15%)
        amount = payment_intent["amount"]
        platform_fee = int(amount * 0.15)
        dj_payout = amount - platform_fee

        # Create payment record
        payment_data = {
            "request_id": request_id,
            "stripe_payment_id": stripe_payment_id,
            "amount": amount,
            "platform_fee": platform_fee,
            "dj_payout": dj_payout,
            "status": "succeeded",
        }
        supabase.table("payments").insert(payment_data).execute()


async def handle_payment_failed(payment_intent: dict):
    """Handle failed payment - log for debugging"""
    # For now, just log the failure
    # In production, you might want to notify the user or retry
    stripe_payment_id = payment_intent["id"]
    metadata = payment_intent.get("metadata", {})

    print(f"Payment failed: {stripe_payment_id}")
    print(f"Session: {metadata.get('session_id')}")
    print(f"Song: {metadata.get('song_title')}")
