from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from database import get_supabase
import stripe
import os

stripe.api_key = os.getenv("STRIPE_SECRET_KEY")

router = APIRouter(prefix="/connect", tags=["connect"])


class OnboardRequest(BaseModel):
    return_url: str
    refresh_url: str


class OnboardResponse(BaseModel):
    onboarding_url: str
    account_id: str


class ConnectStatusResponse(BaseModel):
    connected: bool
    details_submitted: bool = False
    charges_enabled: bool = False
    payouts_enabled: bool = False
    account_id: str | None = None


class DashboardResponse(BaseModel):
    dashboard_url: str


@router.post("/{dj_id}/onboard", response_model=OnboardResponse)
async def create_onboard_link(dj_id: str, request: OnboardRequest):
    """Create or retrieve Stripe Connect account and return onboarding URL"""
    try:
        supabase = get_supabase()

        # Get DJ
        dj_result = supabase.table("djs").select("*").eq("id", dj_id).single().execute()
        if not dj_result.data:
            raise HTTPException(status_code=404, detail="DJ not found")

        dj = dj_result.data
        stripe_account_id = dj.get("stripe_account_id")

        # Create Stripe Express account if DJ doesn't have one
        if not stripe_account_id:
            account = stripe.Account.create(
                type="express",
                country="NL",  # Default to Netherlands, can be changed
                email=dj.get("email"),
                capabilities={
                    "card_payments": {"requested": True},
                    "transfers": {"requested": True},
                },
                business_type="individual",
                metadata={
                    "dj_id": dj_id,
                },
            )
            stripe_account_id = account.id

            # Save account ID to DJ record
            supabase.table("djs").update({
                "stripe_account_id": stripe_account_id
            }).eq("id", dj_id).execute()

        # Create Account Link for onboarding
        account_link = stripe.AccountLink.create(
            account=stripe_account_id,
            refresh_url=request.refresh_url,
            return_url=request.return_url,
            type="account_onboarding",
        )

        return OnboardResponse(
            onboarding_url=account_link.url,
            account_id=stripe_account_id
        )

    except stripe.error.StripeError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{dj_id}/status", response_model=ConnectStatusResponse)
async def get_connect_status(dj_id: str):
    """Get Stripe Connect account status for a DJ"""
    try:
        supabase = get_supabase()

        # Get DJ
        dj_result = supabase.table("djs").select("*").eq("id", dj_id).single().execute()
        if not dj_result.data:
            raise HTTPException(status_code=404, detail="DJ not found")

        dj = dj_result.data
        stripe_account_id = dj.get("stripe_account_id")

        # Not connected if no account ID
        if not stripe_account_id:
            return ConnectStatusResponse(connected=False)

        # Retrieve account from Stripe
        account = stripe.Account.retrieve(stripe_account_id)

        return ConnectStatusResponse(
            connected=True,
            details_submitted=account.details_submitted,
            charges_enabled=account.charges_enabled,
            payouts_enabled=account.payouts_enabled,
            account_id=stripe_account_id
        )

    except stripe.error.StripeError as e:
        # If account doesn't exist in Stripe, clear it from DB
        if "No such account" in str(e):
            supabase = get_supabase()
            supabase.table("djs").update({
                "stripe_account_id": None
            }).eq("id", dj_id).execute()
            return ConnectStatusResponse(connected=False)
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{dj_id}/dashboard", response_model=DashboardResponse)
async def get_dashboard_link(dj_id: str):
    """Get Stripe Express dashboard login link for a DJ"""
    try:
        supabase = get_supabase()

        # Get DJ
        dj_result = supabase.table("djs").select("*").eq("id", dj_id).single().execute()
        if not dj_result.data:
            raise HTTPException(status_code=404, detail="DJ not found")

        dj = dj_result.data
        stripe_account_id = dj.get("stripe_account_id")

        if not stripe_account_id:
            raise HTTPException(status_code=400, detail="DJ has no connected Stripe account")

        # Create login link
        login_link = stripe.Account.create_login_link(stripe_account_id)

        return DashboardResponse(dashboard_url=login_link.url)

    except stripe.error.StripeError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
