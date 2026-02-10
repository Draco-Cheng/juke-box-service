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

    if event_type == "payment_intent.amount_capturable_updated":
        # Authorization successful - create request with pending status
        await handle_payment_authorized(event["data"]["object"])
    elif event_type == "payment_intent.succeeded":
        # Payment captured - update payment record to captured
        await handle_payment_captured(event["data"]["object"])
    elif event_type == "payment_intent.canceled":
        # Authorization canceled - update payment record
        await handle_payment_canceled(event["data"]["object"])
    elif event_type == "payment_intent.payment_failed":
        await handle_payment_failed(event["data"]["object"])
    elif event_type == "charge.refunded":
        await handle_charge_refunded(event["data"]["object"])

    return {"status": "ok"}


async def handle_payment_authorized(payment_intent: dict):
    """Handle authorized payment - create request and payment record (not yet captured)"""
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

        # Create payment record with authorized status
        payment_data = {
            "request_id": request_id,
            "stripe_payment_id": stripe_payment_id,
            "amount": amount,
            "platform_fee": platform_fee,
            "dj_payout": dj_payout,
            "status": "authorized",
        }
        supabase.table("payments").insert(payment_data).execute()


async def handle_payment_captured(payment_intent: dict):
    """Handle captured payment - update payment record to captured"""
    supabase = get_supabase()
    stripe_payment_id = payment_intent["id"]

    # Update payment record status to captured
    supabase.table("payments").update({
        "status": "captured"
    }).eq("stripe_payment_id", stripe_payment_id).execute()


async def handle_payment_canceled(payment_intent: dict):
    """Handle canceled authorization - update payment record"""
    supabase = get_supabase()
    stripe_payment_id = payment_intent["id"]

    # Update payment record status to canceled
    supabase.table("payments").update({
        "status": "canceled"
    }).eq("stripe_payment_id", stripe_payment_id).execute()


async def handle_payment_failed(payment_intent: dict):
    """Handle failed payment - log for debugging"""
    stripe_payment_id = payment_intent["id"]
    metadata = payment_intent.get("metadata", {})

    print(f"Payment failed: {stripe_payment_id}")
    print(f"Session: {metadata.get('session_id')}")
    print(f"Song: {metadata.get('song_title')}")


async def handle_charge_refunded(charge: dict):
    """Handle refunded charge - update payment record"""
    supabase = get_supabase()
    payment_intent_id = charge.get("payment_intent")

    if not payment_intent_id:
        return

    # Update payment record status to refunded
    supabase.table("payments").update({
        "status": "refunded"
    }).eq("stripe_payment_id", payment_intent_id).execute()
