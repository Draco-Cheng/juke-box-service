"""
Unit tests for venue endpoints and business logic.
"""
from unittest.mock import patch, MagicMock


class TestGetVenueBySlug:
    """Tests for retrieving venues by slug."""

    def test_get_venue_success(self, client, mock_supabase, sample_venue):
        """Test successful venue retrieval by slug."""
        select_chain = mock_supabase._create_chainable(sample_venue)
        mock_supabase.table = MagicMock(return_value=select_chain)

        with patch("routes.venues.get_supabase", return_value=mock_supabase):
            response = client.get(f"/api/venues/{sample_venue['slug']}")

        assert response.status_code == 200
        data = response.json()
        assert data["slug"] == sample_venue["slug"]
        assert data["name"] == sample_venue["name"]

    def test_get_venue_not_found(self, client, mock_supabase):
        """Test retrieving non-existent venue."""
        select_chain = mock_supabase._create_chainable(None)
        select_chain.execute = MagicMock(side_effect=Exception("Not found"))
        mock_supabase.table = MagicMock(return_value=select_chain)

        with patch("routes.venues.get_supabase", return_value=mock_supabase):
            response = client.get("/api/venues/non-existent-venue")

        assert response.status_code == 404


class TestGetActiveSession:
    """Tests for retrieving active session for a venue."""

    def test_get_active_session_success(
        self, client, mock_supabase, sample_venue, sample_session
    ):
        """Test successful active session retrieval."""
        # First call: get venue
        venue_chain = mock_supabase._create_chainable(sample_venue)
        # Second call: get session
        session_chain = mock_supabase._create_chainable([sample_session])

        call_count = [0]

        def table_side_effect(name):
            call_count[0] += 1
            if call_count[0] == 1:
                return venue_chain
            return session_chain

        mock_supabase.table = MagicMock(side_effect=table_side_effect)

        with patch("routes.venues.get_supabase", return_value=mock_supabase):
            response = client.get(f"/api/venues/{sample_venue['slug']}/active-session")

        assert response.status_code == 200
        data = response.json()
        assert data["id"] == sample_session["id"]
        assert data["status"] == "active"

    def test_get_active_session_none(self, client, mock_supabase, sample_venue):
        """Test when venue has no active session."""
        venue_chain = mock_supabase._create_chainable(sample_venue)
        session_chain = mock_supabase._create_chainable([])

        call_count = [0]

        def table_side_effect(name):
            call_count[0] += 1
            if call_count[0] == 1:
                return venue_chain
            return session_chain

        mock_supabase.table = MagicMock(side_effect=table_side_effect)

        with patch("routes.venues.get_supabase", return_value=mock_supabase):
            response = client.get(f"/api/venues/{sample_venue['slug']}/active-session")

        assert response.status_code == 200
        assert response.json() is None


class TestCreateVenue:
    """Tests for creating venues."""

    def test_create_venue_success(self, client, mock_supabase, sample_venue):
        """Test successful venue creation."""
        insert_chain = mock_supabase._create_chainable([sample_venue])
        mock_supabase.table = MagicMock(return_value=insert_chain)

        with patch("routes.venues.get_supabase", return_value=mock_supabase):
            response = client.post(
                "/api/venues/",
                json={
                    "name": "Test Club",
                    "slug": "test-club",
                    "settings": {
                        "pricing": {
                            "normal": 200,
                            "priority": 500,
                            "asap": 1000,
                            "currency": "EUR"
                        },
                        "content_filters": {
                            "enabled": False,
                            "block_explicit": False,
                            "blocked_artists": []
                        }
                    }
                }
            )

        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Test Club"
        assert data["slug"] == "test-club"

    def test_create_venue_with_default_settings(self, client, mock_supabase, sample_venue):
        """Test venue creation with default settings."""
        insert_chain = mock_supabase._create_chainable([sample_venue])
        mock_supabase.table = MagicMock(return_value=insert_chain)

        with patch("routes.venues.get_supabase", return_value=mock_supabase):
            response = client.post(
                "/api/venues/",
                json={
                    "name": "Test Club",
                    "slug": "test-club"
                }
            )

        assert response.status_code == 200

    def test_create_venue_invalid_slug(self, client):
        """Test venue creation with invalid slug format."""
        response = client.post(
            "/api/venues/",
            json={
                "name": "Test Club",
                "slug": "Invalid Slug!"  # Contains spaces and special chars
            }
        )
        assert response.status_code == 422

    def test_create_venue_empty_name(self, client):
        """Test venue creation with empty name."""
        response = client.post(
            "/api/venues/",
            json={
                "name": "",
                "slug": "test-club"
            }
        )
        assert response.status_code == 422

    def test_create_venue_name_too_long(self, client):
        """Test venue creation with name exceeding max length."""
        response = client.post(
            "/api/venues/",
            json={
                "name": "x" * 101,  # Exceeds 100 char limit
                "slug": "test-club"
            }
        )
        assert response.status_code == 422


class TestUpdateVenue:
    """Tests for updating venues."""

    def test_update_venue_name(self, client, mock_supabase, sample_venue):
        """Test updating venue name."""
        updated_venue = {**sample_venue, "name": "New Name"}
        update_chain = mock_supabase._create_chainable([updated_venue])
        mock_supabase.table = MagicMock(return_value=update_chain)

        with patch("routes.venues.get_supabase", return_value=mock_supabase):
            response = client.put(
                f"/api/venues/{sample_venue['id']}",
                json={"name": "New Name"}
            )

        assert response.status_code == 200
        assert response.json()["name"] == "New Name"

    def test_update_venue_settings(self, client, mock_supabase, sample_venue):
        """Test updating venue settings."""
        new_settings = {
            "pricing": {
                "normal": 300,
                "priority": 600,
                "asap": 1200,
                "currency": "EUR"
            },
            "content_filters": {
                "enabled": True,
                "block_explicit": True,
                "blocked_artists": ["Bad Artist"]
            }
        }
        updated_venue = {**sample_venue, "settings": new_settings}
        update_chain = mock_supabase._create_chainable([updated_venue])
        mock_supabase.table = MagicMock(return_value=update_chain)

        with patch("routes.venues.get_supabase", return_value=mock_supabase):
            response = client.put(
                f"/api/venues/{sample_venue['id']}",
                json={"settings": new_settings}
            )

        assert response.status_code == 200
        data = response.json()
        assert data["settings"]["pricing"]["normal"] == 300

    def test_update_venue_no_fields(self, client):
        """Test updating venue with no fields."""
        response = client.put(
            "/api/venues/venue-123",
            json={}
        )
        assert response.status_code == 400

    def test_update_venue_not_found(self, client, mock_supabase):
        """Test updating non-existent venue."""
        update_chain = mock_supabase._create_chainable([])
        mock_supabase.table = MagicMock(return_value=update_chain)

        with patch("routes.venues.get_supabase", return_value=mock_supabase):
            response = client.put(
                "/api/venues/non-existent",
                json={"name": "New Name"}
            )

        assert response.status_code == 404

class TestVenueSlugValidation:
    """Tests for venue slug validation."""

    def test_valid_slugs(self, client, mock_supabase, sample_venue):
        """Test valid slug patterns."""
        valid_slugs = [
            "test-club",
            "club123",
            "the-best-venue",
            "a",
            "venue-with-numbers-123"
        ]

        for slug in valid_slugs:
            sample_venue["slug"] = slug
            insert_chain = mock_supabase._create_chainable([sample_venue])
            mock_supabase.table = MagicMock(return_value=insert_chain)

            with patch("routes.venues.get_supabase", return_value=mock_supabase):
                response = client.post(
                    "/api/venues/",
                    json={"name": "Test", "slug": slug}
                )

            assert response.status_code == 200, f"Slug '{slug}' should be valid"

    def test_invalid_slugs(self, client):
        """Test invalid slug patterns."""
        invalid_slugs = [
            "Test Club",      # spaces
            "UPPERCASE",      # uppercase
            "special!chars",  # special characters
            "underscore_bad", # underscores
            ""                # empty
        ]

        for slug in invalid_slugs:
            response = client.post(
                "/api/venues/",
                json={"name": "Test", "slug": slug}
            )

            assert response.status_code == 422, f"Slug '{slug}' should be invalid"
