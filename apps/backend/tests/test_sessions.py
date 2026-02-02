"""
Unit tests for session endpoints and business logic.
"""
import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient


class TestCreateSession:
    """Tests for creating DJ sessions."""

    def test_create_session_success(self, client, mock_supabase, sample_session):
        """Test successful session creation."""
        insert_chain = mock_supabase._create_chainable([sample_session])
        mock_supabase.table = MagicMock(return_value=insert_chain)

        with patch("routes.sessions.get_supabase", return_value=mock_supabase):
            response = client.post(
                "/api/sessions/",
                json={
                    "venue_id": "venue-123",
                    "dj_id": "dj-123"
                }
            )

        assert response.status_code == 200
        data = response.json()
        assert data["venue_id"] == "venue-123"
        assert data["dj_id"] == "dj-123"

    def test_create_session_missing_venue_id(self, client):
        """Test session creation without venue_id."""
        response = client.post(
            "/api/sessions/",
            json={"dj_id": "dj-123"}
        )
        assert response.status_code == 422

    def test_create_session_missing_dj_id(self, client):
        """Test session creation without dj_id."""
        response = client.post(
            "/api/sessions/",
            json={"venue_id": "venue-123"}
        )
        assert response.status_code == 422


class TestGetSession:
    """Tests for retrieving sessions."""

    def test_get_session_success(self, client, mock_supabase, sample_session):
        """Test successful session retrieval."""
        select_chain = mock_supabase._create_chainable(sample_session)
        mock_supabase.table = MagicMock(return_value=select_chain)

        with patch("routes.sessions.get_supabase", return_value=mock_supabase):
            response = client.get(f"/api/sessions/{sample_session['id']}")

        assert response.status_code == 200
        data = response.json()
        assert data["id"] == sample_session["id"]
        assert data["status"] == "active"

    def test_get_session_not_found(self, client, mock_supabase):
        """Test retrieving non-existent session."""
        select_chain = mock_supabase._create_chainable(None)
        select_chain.execute = MagicMock(side_effect=Exception("Not found"))
        mock_supabase.table = MagicMock(return_value=select_chain)

        with patch("routes.sessions.get_supabase", return_value=mock_supabase):
            response = client.get("/api/sessions/non-existent-id")

        assert response.status_code == 404


class TestUpdateSession:
    """Tests for updating session status."""

    def test_update_session_pause(self, client, mock_supabase, sample_session):
        """Test pausing a session."""
        paused_session = {**sample_session, "status": "paused"}
        update_chain = mock_supabase._create_chainable([paused_session])
        mock_supabase.table = MagicMock(return_value=update_chain)

        with patch("routes.sessions.get_supabase", return_value=mock_supabase):
            response = client.patch(
                f"/api/sessions/{sample_session['id']}",
                json={"status": "paused"}
            )

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "paused"

    def test_update_session_resume(self, client, mock_supabase, sample_session):
        """Test resuming a paused session."""
        sample_session["status"] = "paused"
        active_session = {**sample_session, "status": "active"}
        update_chain = mock_supabase._create_chainable([active_session])
        mock_supabase.table = MagicMock(return_value=update_chain)

        with patch("routes.sessions.get_supabase", return_value=mock_supabase):
            response = client.patch(
                f"/api/sessions/{sample_session['id']}",
                json={"status": "active"}
            )

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "active"

    def test_update_session_end(self, client, mock_supabase, sample_session):
        """Test ending a session sets ended_at."""
        ended_session = {
            **sample_session,
            "status": "ended",
            "ended_at": "2024-01-01T12:00:00Z"
        }
        update_chain = mock_supabase._create_chainable([ended_session])
        mock_supabase.table = MagicMock(return_value=update_chain)

        with patch("routes.sessions.get_supabase", return_value=mock_supabase):
            response = client.patch(
                f"/api/sessions/{sample_session['id']}",
                json={"status": "ended"}
            )

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ended"
        assert data["ended_at"] is not None

    def test_update_session_not_found(self, client, mock_supabase):
        """Test updating non-existent session."""
        update_chain = mock_supabase._create_chainable([])
        mock_supabase.table = MagicMock(return_value=update_chain)

        with patch("routes.sessions.get_supabase", return_value=mock_supabase):
            response = client.patch(
                "/api/sessions/non-existent",
                json={"status": "paused"}
            )

        assert response.status_code == 404

    def test_update_session_invalid_status(self, client):
        """Test updating session with invalid status."""
        response = client.patch(
            "/api/sessions/session-123",
            json={"status": "invalid_status"}
        )
        assert response.status_code == 422


class TestSessionStatus:
    """Tests for session status enum validation."""

    def test_valid_statuses(self, client, mock_supabase, sample_session):
        """Test all valid session statuses."""
        valid_statuses = ["active", "paused", "ended"]

        for status in valid_statuses:
            updated = {**sample_session, "status": status}
            update_chain = mock_supabase._create_chainable([updated])
            mock_supabase.table = MagicMock(return_value=update_chain)

            with patch("routes.sessions.get_supabase", return_value=mock_supabase):
                response = client.patch(
                    f"/api/sessions/{sample_session['id']}",
                    json={"status": status}
                )

            assert response.status_code == 200, f"Status '{status}' should be valid"
