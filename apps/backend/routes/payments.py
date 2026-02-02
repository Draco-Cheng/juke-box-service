from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field, field_validator
from database import get_supabase
from services.spotify import spotify_service
from middleware import limiter, RateLimits
import stripe
import os
import re
import html

stripe.api_key = os.getenv("STRIPE_SECRET_KEY")

router = APIRouter(prefix="/payments", tags=["payments"])

# Platform fee percentage (15%)
PLATFORM_FEE_PERCENT = 15


class CreatePaymentIntentRequest(BaseModel):
    session_id: str = Field(..., min_length=1)
    song_title: str = Field(..., min_length=1, max_length=200)
    song_artist: str | None = Field(None, max_length=200)
    spotify_track_id: str | None = Field(None, max_length=50, pattern=r'^[a-zA-Z0-9]+$')
    explicit: bool = False
    message: str | None = Field(None, max_length=500)
    tier: str = Field("normal", pattern=r'^(normal|priority|asap)$')
    amount: int = Field(..., ge=50, le=100000)  # min 50 cents, max 1000 EUR

    @field_validator('song_title', 'song_artist')
    @classmethod
    def sanitize_string(cls, v: str | None) -> str | None:
        if v is None:
            return None
        v = v.strip()
        if not v:
            return None
        v = re.sub(r'[\x00-\x1f\x7f]', '', v)
        return html.escape(v)

    @field_validator('message')
    @classmethod
    def sanitize_message(cls, v: str | None) -> str | None:
        if v is None:
            return None
        v = v.strip()
        if not v:
            return None
        v = re.sub(r'[\x00-\x09\x0b\x0c\x0e-\x1f\x7f]', '', v)
        return html.escape(v)


class PaymentIntentResponse(BaseModel):
    client_secret: str
    payment_intent_id: str


async def validate_content_filters(
    request: CreatePaymentIntentRequest,
    venue_settings: dict,
) -> tuple[bool, str | None]:
    """
    Validate song against venue content filters.
    Returns (is_valid, error_message).
    """
    content_filters = venue_settings.get("content_filters", {})

    if not content_filters.get("enabled", False):
        return True, None

    # Check explicit content
    if content_filters.get("block_explicit", False):
        # Use explicit flag from request (passed from frontend)
        is_explicit = request.explicit

        # Double-check with Spotify API if track ID is provided
        if request.spotify_track_id and spotify_service.is_configured:
            track = await spotify_service.get_track(request.spotify_track_id)
            if track:
                is_explicit = track.explicit

        if is_explicit:
            return False, "This song contains explicit content and is not allowed at this venue"

    # Check blocked artists
    blocked_artists = content_filters.get("blocked_artists", [])
    if blocked_artists and request.song_artist:
        artist_lower = request.song_artist.lower()
        for blocked in blocked_artists:
            if blocked.lower() in artist_lower:
                return False, f"Songs by this artist are not allowed at this venue"

    return True, None


@router.post("/create-payment-intent", response_model=PaymentIntentResponse)
@limiter.limit(RateLimits.PAYMENT)
async def create_payment_intent(request: Request, payment_request: CreatePaymentIntentRequest):
    """Create a Stripe PaymentIntent for a song request"""
    try:
        supabase = get_supabase()

        # Get session with venue info to check content filters
        session_result = (
            supabase.table("sessions")
            .select("*, djs(*), venues(*)")
            .eq("id", payment_request.session_id)
            .single()
            .execute()
        )

        if not session_result.data:
            raise HTTPException(status_code=404, detail="Session not found")

        session = session_result.data
        dj = session.get("djs")
        venue = session.get("venues")

        # Validate content filters
        if venue and venue.get("settings"):
            is_valid, error_message = await validate_content_filters(
                payment_request, venue["settings"]
            )
            if not is_valid:
                raise HTTPException(status_code=400, detail=error_message)

        # Check if DJ has Stripe account connected
        stripe_account_id = dj.get("stripe_account_id") if dj else None

        # Calculate platform fee
        platform_fee = int(payment_request.amount * PLATFORM_FEE_PERCENT / 100)

        # Create PaymentIntent
        payment_intent_params = {
            "amount": payment_request.amount,
            "currency": "eur",
            "metadata": {
                "session_id": payment_request.session_id,
                "song_title": payment_request.song_title,
                "song_artist": payment_request.song_artist or "",
                "spotify_track_id": payment_request.spotify_track_id or "",
                "message": payment_request.message or "",
                "tier": payment_request.tier,
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
@limiter.limit(RateLimits.PAYMENT)
async def confirm_payment(request: Request, payment_intent_id: str):
    """Confirm payment and create the song request"""
    try:
        # Retrieve PaymentIntent to verify it's paid
        payment_intent = stripe.PaymentIntent.retrieve(payment_intent_id)

        if payment_intent.status != "succeeded":
            raise HTTPException(status_code=400, detail="Payment not completed")

        metadata = payment_intent.metadata
        supabase = get_supabase()

        # Check if already processed by webhook (idempotency)
        existing = (
            supabase.table("requests")
            .select("id")
            .eq("stripe_payment_id", payment_intent.id)
            .execute()
        )
        if existing.data:
            # Already processed by webhook, return existing request
            return {"success": True, "request": existing.data[0]}

        # Create the request in database (fallback if webhook hasn't processed yet)
        request_data = {
            "session_id": metadata.get("session_id"),
            "song_title": metadata.get("song_title"),
            "song_artist": metadata.get("song_artist") or None,
            "spotify_track_id": metadata.get("spotify_track_id") or None,
            "message": metadata.get("message") or None,
            "tier": metadata.get("tier", "normal"),
            "amount": payment_intent.amount,
            "status": "pending",
            "stripe_payment_id": payment_intent.id,
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
