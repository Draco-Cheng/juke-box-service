from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from database import get_supabase
import stripe
import os

stripe.api_key = os.getenv("STRIPE_SECRET_KEY")

router = APIRouter(prefix="/payments", tags=["payments"])

# Platform fee percentage (15%)
PLATFORM_FEE_PERCENT = 15


class CreatePaymentIntentRequest(BaseModel):
    session_id: str
    song_title: str
    song_artist: str | None = None
    spotify_track_id: str | None = None
    message: str | None = None
    tier: str = "normal"
    amount: int  # in cents


class PaymentIntentResponse(BaseModel):
    client_secret: str
    payment_intent_id: str


@router.post("/create-payment-intent", response_model=PaymentIntentResponse)
async def create_payment_intent(request: CreatePaymentIntentRequest):
    """Create a Stripe PaymentIntent for a song request"""
    try:
        supabase = get_supabase()

        # Get session to find the DJ
        session_result = (
            supabase.table("sessions")
            .select("*, djs(*)")
            .eq("id", request.session_id)
            .single()
            .execute()
        )

        if not session_result.data:
            raise HTTPException(status_code=404, detail="Session not found")

        session = session_result.data
        dj = session.get("djs")

        # Check if DJ has Stripe account connected
        stripe_account_id = dj.get("stripe_account_id") if dj else None

        # Calculate platform fee
        platform_fee = int(request.amount * PLATFORM_FEE_PERCENT / 100)

        # Create PaymentIntent
        payment_intent_params = {
            "amount": request.amount,
            "currency": "eur",
            "metadata": {
                "session_id": request.session_id,
                "song_title": request.song_title,
                "song_artist": request.song_artist or "",
                "spotify_track_id": request.spotify_track_id or "",
                "message": request.message or "",
                "tier": request.tier,
            },
        }

        # If DJ has Stripe Connect, use destination charge
        if stripe_account_id:
            payment_intent_params["transfer_data"] = {
                "destination": stripe_account_id,
            }
            payment_intent_params["application_fee_amount"] = platform_fee

        payment_intent = stripe.PaymentIntent.create(**payment_intent_params)

        return PaymentIntentResponse(
            client_secret=payment_intent.client_secret,
            payment_intent_id=payment_intent.id
        )

    except stripe.error.StripeError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/confirm-payment/{payment_intent_id}")
async def confirm_payment(payment_intent_id: str):
    """Confirm payment and create the song request"""
    try:
        # Retrieve PaymentIntent to verify it's paid
        payment_intent = stripe.PaymentIntent.retrieve(payment_intent_id)

        if payment_intent.status != "succeeded":
            raise HTTPException(status_code=400, detail="Payment not completed")

        metadata = payment_intent.metadata
        supabase = get_supabase()

        # Create the request in database
        # Note: payment_intent_id removed temporarily until Supabase schema is updated
        request_data = {
            "session_id": metadata.get("session_id"),
            "song_title": metadata.get("song_title"),
            "song_artist": metadata.get("song_artist") or None,
            "spotify_track_id": metadata.get("spotify_track_id") or None,
            "message": metadata.get("message") or None,
            "tier": metadata.get("tier", "normal"),
            "amount": payment_intent.amount,
            "status": "pending",
        }

        result = supabase.table("requests").insert(request_data).execute()

        return {"success": True, "request": result.data[0]}

    except stripe.error.StripeError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/config")
async def get_stripe_config():
    """Get Stripe publishable key for frontend"""
    return {
        "publishable_key": os.getenv("STRIPE_PUBLISHABLE_KEY")
    }
