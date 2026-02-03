"""
Unit tests for request endpoints and business logic.
"""
import pytest
from unittest.mock import patch, MagicMock


class TestCreateRequest:
    """Tests for creating song requests."""

    def test_create_request_success(self, client, mock_supabase, sample_request):
        """Test successful request creation."""
        insert_chain = mock_supabase._create_chainable([sample_request])
        mock_supabase.table = MagicMock(return_value=insert_chain)

        with patch("routes.requests.get_supabase", return_value=mock_supabase):
            response = client.post(
                "/api/requests/",
                json={
                    "session_id": "session-123",
                    "song_title": "Test Song",
                    "song_artist": "Test Artist",
                    "tier": "normal",
                    "amount": 200
                }
            )

        assert response.status_code == 200
        data = response.json()
        assert data["song_title"] == "Test Song"


class TestGetRequest:
    """Tests for retrieving requests."""

    def test_get_request_success(self, client, mock_supabase, sample_request):
        """Test successful request retrieval."""
        select_chain = mock_supabase._create_chainable(sample_request)
        mock_supabase.table = MagicMock(return_value=select_chain)

        with patch("routes.requests.get_supabase", return_value=mock_supabase):
            response = client.get(f"/api/requests/{sample_request['id']}")

        assert response.status_code == 200
        data = response.json()
        assert data["id"] == sample_request["id"]

    def test_get_request_not_found(self, client, mock_supabase):
        """Test retrieving non-existent request."""
        # Make the chain raise an exception (simulating not found)
        select_chain = mock_supabase._create_chainable(None)
        select_chain.execute = MagicMock(side_effect=Exception("Not found"))
        mock_supabase.table = MagicMock(return_value=select_chain)

        with patch("routes.requests.get_supabase", return_value=mock_supabase):
            response = client.get("/api/requests/non-existent-id")

        assert response.status_code == 404


class TestUpdateRequest:
    """Tests for updating request status."""

    def test_update_request_accept(self, client, mock_supabase, sample_request):
        """Test accepting a request."""
        # First call: get current request
        current_chain = mock_supabase._create_chainable(sample_request)
        # Second call: update
        updated_request = {**sample_request, "status": "accepted"}
        update_chain = mock_supabase._create_chainable([updated_request])

        call_count = [0]

        def table_side_effect(name):
            call_count[0] += 1
            if call_count[0] == 1:
                return current_chain
            return update_chain

        mock_supabase.table = MagicMock(side_effect=table_side_effect)

        with patch("routes.requests.get_supabase", return_value=mock_supabase):
            response = client.patch(
                f"/api/requests/{sample_request['id']}",
                json={"status": "accepted"}
            )

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "accepted"

    def test_update_request_play(self, client, mock_supabase, sample_request):
        """Test marking a request as played."""
        sample_request["status"] = "accepted"
        current_chain = mock_supabase._create_chainable(sample_request)

        played_request = {**sample_request, "status": "played"}
        update_chain = mock_supabase._create_chainable([played_request])

        call_count = [0]

        def table_side_effect(name):
            call_count[0] += 1
            if call_count[0] == 1:
                return current_chain
            return update_chain

        mock_supabase.table = MagicMock(side_effect=table_side_effect)

        with patch("routes.requests.get_supabase", return_value=mock_supabase):
            response = client.patch(
                f"/api/requests/{sample_request['id']}",
                json={"status": "played"}
            )

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "played"

    def test_update_request_reject_triggers_refund(
        self, client, mock_supabase, sample_request
    ):
        """Test rejecting a request triggers a refund."""
        current_chain = mock_supabase._create_chainable(sample_request)

        rejected_request = {**sample_request, "status": "rejected"}
        update_chain = mock_supabase._create_chainable([rejected_request])

        call_count = [0]

        def table_side_effect(name):
            call_count[0] += 1
            if call_count[0] == 1:
                return current_chain
            return update_chain

        mock_supabase.table = MagicMock(side_effect=table_side_effect)

        with patch("routes.requests.get_supabase", return_value=mock_supabase), \
             patch("routes.requests.stripe") as stripe_mock:
            stripe_mock.Refund.create.return_value = MagicMock(id="re_test")

            response = client.patch(
                f"/api/requests/{sample_request['id']}",
                json={"status": "rejected"}
            )

            # Verify refund was attempted
            stripe_mock.Refund.create.assert_called_once_with(
                payment_intent=sample_request["stripe_payment_id"],
                reason="requested_by_customer"
            )

        assert response.status_code == 200
        assert response.json()["status"] == "rejected"

    def test_update_request_reject_without_payment_id(
        self, client, mock_supabase, sample_request
    ):
        """Test rejecting a request without stripe_payment_id doesn't attempt refund."""
        # Remove payment ID
        sample_request["stripe_payment_id"] = None
        current_chain = mock_supabase._create_chainable(sample_request)

        rejected_request = {**sample_request, "status": "rejected"}
        update_chain = mock_supabase._create_chainable([rejected_request])

        call_count = [0]

        def table_side_effect(name):
            call_count[0] += 1
            if call_count[0] == 1:
                return current_chain
            return update_chain

        mock_supabase.table = MagicMock(side_effect=table_side_effect)

        with patch("routes.requests.get_supabase", return_value=mock_supabase), \
             patch("routes.requests.stripe") as stripe_mock:
            response = client.patch(
                f"/api/requests/{sample_request['id']}",
                json={"status": "rejected"}
            )

            # Verify refund was NOT attempted
            stripe_mock.Refund.create.assert_not_called()

        assert response.status_code == 200

    def test_update_request_not_found(self, client, mock_supabase):
        """Test updating non-existent request."""
        current_chain = mock_supabase._create_chainable(None)
        mock_supabase.table = MagicMock(return_value=current_chain)

        with patch("routes.requests.get_supabase", return_value=mock_supabase):
            response = client.patch(
                "/api/requests/non-existent",
                json={"status": "accepted"}
            )

        assert response.status_code == 404

    def test_update_request_invalid_status(self, client):
        """Test updating request with invalid status."""
        response = client.patch(
            "/api/requests/request-123",
            json={"status": "invalid_status"}
        )
        assert response.status_code == 422


class TestGetSessionRequests:
    """Tests for retrieving session requests."""

    def test_get_session_requests_success(self, client, mock_supabase):
        """Test successful retrieval of session requests."""
        requests = [
            {
                "id": "req-1",
                "session_id": "session-123",
                "song_title": "Song 1",
                "song_artist": None,
                "spotify_track_id": None,
                "tier": "normal",
                "message": None,
                "amount": 200,
                "status": "pending",
                "customer_id": None,
                "created_at": "2024-01-01T10:00:00Z",
                "updated_at": "2024-01-01T10:00:00Z"
            },
            {
                "id": "req-2",
                "session_id": "session-123",
                "song_title": "Song 2",
                "song_artist": None,
                "spotify_track_id": None,
                "tier": "asap",
                "message": None,
                "amount": 1000,
                "status": "pending",
                "customer_id": None,
                "created_at": "2024-01-01T10:01:00Z",
                "updated_at": "2024-01-01T10:01:00Z"
            },
            {
                "id": "req-3",
                "session_id": "session-123",
                "song_title": "Song 3",
                "song_artist": None,
                "spotify_track_id": None,
                "tier": "priority",
                "message": None,
                "amount": 500,
                "status": "pending",
                "customer_id": None,
                "created_at": "2024-01-01T10:02:00Z",
                "updated_at": "2024-01-01T10:02:00Z"
            }
        ]

        select_chain = mock_supabase._create_chainable(requests)
        mock_supabase.table = MagicMock(return_value=select_chain)

        with patch("routes.requests.get_supabase", return_value=mock_supabase):
            response = client.get("/api/requests/session/session-123")

        assert response.status_code == 200
        data = response.json()
        assert len(data) == 3

        # Verify sorting: asap first, then priority, then normal
        assert data[0]["tier"] == "asap"
        assert data[1]["tier"] == "priority"
        assert data[2]["tier"] == "normal"

    def test_get_session_requests_empty(self, client, mock_supabase):
        """Test retrieving requests for session with no requests."""
        select_chain = mock_supabase._create_chainable([])
        mock_supabase.table = MagicMock(return_value=select_chain)

        with patch("routes.requests.get_supabase", return_value=mock_supabase):
            response = client.get("/api/requests/session/session-123")

        assert response.status_code == 200
        assert response.json() == []

    def test_get_session_requests_sorted_by_time_within_tier(
        self, client, mock_supabase
    ):
        """Test that requests are sorted by creation time within same tier."""
        requests = [
            {
                "id": "req-1",
                "session_id": "session-123",
                "song_title": "Song 1",
                "song_artist": None,
                "spotify_track_id": None,
                "tier": "normal",
                "message": None,
                "amount": 200,
                "status": "pending",
                "customer_id": None,
                "created_at": "2024-01-01T10:02:00Z",
                "updated_at": "2024-01-01T10:02:00Z"
            },
            {
                "id": "req-2",
                "session_id": "session-123",
                "song_title": "Song 2",
                "song_artist": None,
                "spotify_track_id": None,
                "tier": "normal",
                "message": None,
                "amount": 200,
                "status": "pending",
                "customer_id": None,
                "created_at": "2024-01-01T10:00:00Z",
                "updated_at": "2024-01-01T10:00:00Z"
            },
            {
                "id": "req-3",
                "session_id": "session-123",
                "song_title": "Song 3",
                "song_artist": None,
                "spotify_track_id": None,
                "tier": "normal",
                "message": None,
                "amount": 200,
                "status": "pending",
                "customer_id": None,
                "created_at": "2024-01-01T10:01:00Z",
                "updated_at": "2024-01-01T10:01:00Z"
            }
        ]

        select_chain = mock_supabase._create_chainable(requests)
        mock_supabase.table = MagicMock(return_value=select_chain)

        with patch("routes.requests.get_supabase", return_value=mock_supabase):
            response = client.get("/api/requests/session/session-123")

        assert response.status_code == 200
        data = response.json()

        # Verify sorted by time (earliest first)
        assert data[0]["id"] == "req-2"  # 10:00
        assert data[1]["id"] == "req-3"  # 10:01
        assert data[2]["id"] == "req-1"  # 10:02


class TestRefundLogic:
    """Tests for refund processing logic."""

    def test_process_refund_success(self):
        """Test successful refund processing."""
        from routes.requests import process_refund

        with patch("routes.requests.stripe") as stripe_mock:
            stripe_mock.Refund.create.return_value = MagicMock(
                id="re_test",
                status="succeeded"
            )

            import asyncio
            result = asyncio.get_event_loop().run_until_complete(
                process_refund("pi_test123")
            )

            stripe_mock.Refund.create.assert_called_once_with(
                payment_intent="pi_test123",
                reason="requested_by_customer"
            )
            assert result.id == "re_test"

    def test_process_refund_stripe_error(self):
        """Test refund processing with Stripe error."""
        from routes.requests import process_refund
        import stripe

        with patch("routes.requests.stripe") as stripe_mock:
            stripe_mock.Refund.create.side_effect = stripe.error.StripeError(
                "Refund failed"
            )
            stripe_mock.error = stripe.error

            import asyncio
            with pytest.raises(Exception, match="Stripe refund error"):
                asyncio.get_event_loop().run_until_complete(
                    process_refund("pi_test123")
                )
