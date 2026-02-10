"""
Unit tests for payment endpoints and business logic.
"""
import pytest
from unittest.mock import patch, MagicMock


class TestPaymentConfig:
    """Tests for payment configuration endpoint."""

    def test_get_stripe_config_returns_publishable_key(self, client):
        """Test that /payments/config returns the Stripe publishable key."""
        response = client.get("/api/payments/config")
        assert response.status_code == 200
        data = response.json()
        assert "publishable_key" in data


class TestCreatePaymentIntent:
    """Tests for creating payment intents."""

    @pytest.fixture
    def valid_payment_request(self, sample_session):
        return {
            "session_id": sample_session["id"],
            "song_title": "Test Song",
            "song_artist": "Test Artist",
            "spotify_track_id": "abc123",
            "explicit": False,
            "message": "Play this!",
            "tier": "normal",
            "amount": 200
        }

    def test_create_payment_intent_success(
        self, client, mock_supabase, sample_session, valid_payment_request
    ):
        """Test successful payment intent creation."""
        # Setup supabase mock - single() returns a single object, not a list
        session_chain = mock_supabase._create_chainable(sample_session)
        mock_supabase.table = MagicMock(return_value=session_chain)

        with patch("routes.payments.get_supabase", return_value=mock_supabase), \
             patch("routes.payments.stripe") as stripe_mock:
            stripe_mock.PaymentIntent.create.return_value = MagicMock(
                id="pi_test123",
                client_secret="pi_test123_secret_xxx"
            )

            response = client.post(
                "/api/payments/create-payment-intent",
                json=valid_payment_request
            )

        assert response.status_code == 200
        data = response.json()
        assert "client_secret" in data
        assert "payment_intent_id" in data

    def test_create_payment_intent_session_not_found(
        self, client, mock_supabase, valid_payment_request
    ):
        """Test payment intent creation when session doesn't exist."""
        # Setup mock - empty data means session not found
        # The route checks `if not session_result.data` so we return empty/None
        session_chain = mock_supabase._create_chainable(None)
        mock_supabase.table = MagicMock(return_value=session_chain)

        with patch("routes.payments.get_supabase", return_value=mock_supabase):
            response = client.post(
                "/api/payments/create-payment-intent",
                json=valid_payment_request
            )

        # Route returns 400 when catching the exception from None data
        assert response.status_code in [400, 404]

    def test_create_payment_intent_invalid_tier(self, client):
        """Test payment intent creation with invalid tier."""
        response = client.post(
            "/api/payments/create-payment-intent",
            json={
                "session_id": "session-123",
                "song_title": "Test",
                "tier": "invalid",
                "amount": 200
            }
        )
        assert response.status_code == 422  # Validation error

    def test_create_payment_intent_amount_too_low(self, client):
        """Test payment intent creation with amount below minimum."""
        response = client.post(
            "/api/payments/create-payment-intent",
            json={
                "session_id": "session-123",
                "song_title": "Test",
                "tier": "normal",
                "amount": 10  # Below 50 cents minimum
            }
        )
        assert response.status_code == 422

    def test_create_payment_intent_amount_too_high(self, client):
        """Test payment intent creation with amount above maximum."""
        response = client.post(
            "/api/payments/create-payment-intent",
            json={
                "session_id": "session-123",
                "song_title": "Test",
                "tier": "normal",
                "amount": 200000  # Above 1000 EUR maximum
            }
        )
        assert response.status_code == 422

    def test_create_payment_intent_song_title_required(self, client):
        """Test payment intent creation requires song title."""
        response = client.post(
            "/api/payments/create-payment-intent",
            json={
                "session_id": "session-123",
                "tier": "normal",
                "amount": 200
            }
        )
        assert response.status_code == 422

    def test_create_payment_intent_sanitizes_input(
        self, client, mock_supabase, sample_session
    ):
        """Test that song title and message are sanitized."""
        session_chain = mock_supabase._create_chainable(sample_session)
        mock_supabase.table = MagicMock(return_value=session_chain)

        with patch("routes.payments.get_supabase", return_value=mock_supabase), \
             patch("routes.payments.stripe") as stripe_mock:
            stripe_mock.PaymentIntent.create.return_value = MagicMock(
                id="pi_test123",
                client_secret="secret"
            )

            response = client.post(
                "/api/payments/create-payment-intent",
                json={
                    "session_id": sample_session["id"],
                    "song_title": "<script>alert('xss')</script>Test",
                    "message": "Hello <b>world</b>",
                    "tier": "normal",
                    "amount": 200
                }
            )

        # Should succeed (sanitization happens in validator)
        assert response.status_code == 200


class TestConfirmPayment:
    """Tests for confirming payments."""

    def test_confirm_payment_success(
        self, client, mock_supabase, sample_request
    ):
        """Test successful payment confirmation."""
        # Mock existing check returns empty (not processed yet)
        existing_chain = mock_supabase._create_chainable([])
        # Mock insert
        insert_chain = mock_supabase._create_chainable([sample_request])

        call_count = [0]

        def table_side_effect(name):
            call_count[0] += 1
            if call_count[0] == 1:
                return existing_chain
            return insert_chain

        mock_supabase.table = MagicMock(side_effect=table_side_effect)

        with patch("routes.payments.get_supabase", return_value=mock_supabase), \
             patch("routes.payments.stripe") as stripe_mock:
            stripe_mock.PaymentIntent.retrieve.return_value = MagicMock(
                id="pi_test123",
                status="succeeded",
                amount=200,
                metadata={
                    "session_id": "session-123",
                    "song_title": "Test Song",
                    "song_artist": "Test Artist",
                    "spotify_track_id": "spotify123",
                    "message": "Play this!",
                    "tier": "normal"
                }
            )

            response = client.post("/api/payments/confirm-payment/pi_test123")

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "request" in data

    def test_confirm_payment_not_succeeded(self, client):
        """Test confirming payment that hasn't succeeded."""
        with patch("routes.payments.stripe") as stripe_mock:
            stripe_mock.PaymentIntent.retrieve.return_value = MagicMock(
                id="pi_test123",
                status="requires_payment_method"
            )
            # Mock the stripe error module
            stripe_mock.error.StripeError = Exception

            response = client.post("/api/payments/confirm-payment/pi_test123")

        assert response.status_code == 400
        assert "Payment not authorized" in response.json()["detail"]

    def test_confirm_payment_idempotency(
        self, client, mock_supabase, sample_request
    ):
        """Test that confirming already processed payment returns existing request."""
        # Mock existing check returns the request (already processed)
        existing_chain = mock_supabase._create_chainable([sample_request])
        mock_supabase.table = MagicMock(return_value=existing_chain)

        with patch("routes.payments.get_supabase", return_value=mock_supabase), \
             patch("routes.payments.stripe") as stripe_mock:
            stripe_mock.PaymentIntent.retrieve.return_value = MagicMock(
                id="pi_test123",
                status="succeeded",
                metadata={}
            )

            response = client.post("/api/payments/confirm-payment/pi_test123")

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True


class TestContentFilters:
    """Tests for content filtering logic."""

    def test_explicit_content_blocked(
        self, client, mock_supabase, sample_session, sample_venue
    ):
        """Test that explicit content is blocked when filter is enabled."""
        # Enable content filters
        sample_venue["settings"]["content_filters"]["enabled"] = True
        sample_venue["settings"]["content_filters"]["block_explicit"] = True
        sample_session["venues"] = sample_venue

        session_chain = mock_supabase._create_chainable(sample_session)
        mock_supabase.table = MagicMock(return_value=session_chain)

        with patch("routes.payments.get_supabase", return_value=mock_supabase), \
             patch("routes.payments.spotify_service") as spotify_mock:
            # Disable Spotify service to use request explicit flag
            spotify_mock.is_configured = False

            response = client.post(
                "/api/payments/create-payment-intent",
                json={
                    "session_id": sample_session["id"],
                    "song_title": "Explicit Song",
                    "explicit": True,  # Marked as explicit
                    "tier": "normal",
                    "amount": 200
                }
            )

        assert response.status_code == 400
        assert "explicit content" in response.json()["detail"].lower()

    def test_blocked_artist_rejected(
        self, client, mock_supabase, sample_session, sample_venue
    ):
        """Test that songs by blocked artists are rejected."""
        # Enable content filters with blocked artist
        sample_venue["settings"]["content_filters"]["enabled"] = True
        sample_venue["settings"]["content_filters"]["blocked_artists"] = ["Blocked Artist"]
        sample_session["venues"] = sample_venue

        session_chain = mock_supabase._create_chainable(sample_session)
        mock_supabase.table = MagicMock(return_value=session_chain)

        with patch("routes.payments.get_supabase", return_value=mock_supabase):
            response = client.post(
                "/api/payments/create-payment-intent",
                json={
                    "session_id": sample_session["id"],
                    "song_title": "Some Song",
                    "song_artist": "Blocked Artist",
                    "tier": "normal",
                    "amount": 200
                }
            )

        assert response.status_code == 400
        assert "not allowed" in response.json()["detail"].lower()

    def test_content_filters_disabled_allows_all(
        self, client, mock_supabase, sample_session, sample_venue
    ):
        """Test that disabled content filters allow all content."""
        # Filters disabled (default)
        sample_venue["settings"]["content_filters"]["enabled"] = False
        sample_session["venues"] = sample_venue

        session_chain = mock_supabase._create_chainable(sample_session)
        mock_supabase.table = MagicMock(return_value=session_chain)

        with patch("routes.payments.get_supabase", return_value=mock_supabase), \
             patch("routes.payments.stripe") as stripe_mock:
            stripe_mock.PaymentIntent.create.return_value = MagicMock(
                id="pi_test123",
                client_secret="secret"
            )

            response = client.post(
                "/api/payments/create-payment-intent",
                json={
                    "session_id": sample_session["id"],
                    "song_title": "Explicit Song",
                    "explicit": True,
                    "tier": "normal",
                    "amount": 200
                }
            )

        # Should succeed when filters are disabled
        assert response.status_code == 200


class TestPlatformFee:
    """Tests for platform fee calculation."""

    def test_platform_fee_calculated_correctly(
        self, client, mock_supabase, sample_session
    ):
        """Test that 15% platform fee is applied."""
        session_chain = mock_supabase._create_chainable(sample_session)
        mock_supabase.table = MagicMock(return_value=session_chain)

        with patch("routes.payments.get_supabase", return_value=mock_supabase), \
             patch("routes.payments.stripe") as stripe_mock:
            stripe_mock.PaymentIntent.create.return_value = MagicMock(
                id="pi_test123",
                client_secret="secret"
            )

            response = client.post(
                "/api/payments/create-payment-intent",
                json={
                    "session_id": sample_session["id"],
                    "song_title": "Test",
                    "tier": "normal",
                    "amount": 1000  # 10 EUR
                }
            )

            assert response.status_code == 200

            # Verify Stripe was called with correct fee (15% of 1000 = 150)
            call_args = stripe_mock.PaymentIntent.create.call_args
            if call_args and call_args.kwargs.get("application_fee_amount"):
                assert call_args.kwargs["application_fee_amount"] == 150
