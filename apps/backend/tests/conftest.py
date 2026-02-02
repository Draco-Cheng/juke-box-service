"""
Pytest configuration and shared fixtures for backend tests.
"""
import pytest
from fastapi.testclient import TestClient
from unittest.mock import MagicMock, patch, AsyncMock
from datetime import datetime
import os


# Set test environment variables before importing app
os.environ.setdefault("SUPABASE_URL", "https://test.supabase.co")
os.environ.setdefault("SUPABASE_SERVICE_ROLE_KEY", "test-service-role-key")
os.environ.setdefault("STRIPE_SECRET_KEY", "sk_test_xxx")
os.environ.setdefault("STRIPE_PUBLISHABLE_KEY", "pk_test_xxx")
os.environ.setdefault("SPOTIFY_CLIENT_ID", "test-spotify-id")
os.environ.setdefault("SPOTIFY_CLIENT_SECRET", "test-spotify-secret")


@pytest.fixture
def client():
    """Create a test client for the FastAPI app."""
    from main import app
    return TestClient(app)


@pytest.fixture
def mock_supabase():
    """Mock Supabase client for database operations."""
    mock = MagicMock()

    # Create a chainable mock for query building
    def create_chainable_mock(return_data=None):
        chain = MagicMock()
        chain.select = MagicMock(return_value=chain)
        chain.insert = MagicMock(return_value=chain)
        chain.update = MagicMock(return_value=chain)
        chain.delete = MagicMock(return_value=chain)
        chain.eq = MagicMock(return_value=chain)
        chain.neq = MagicMock(return_value=chain)
        chain.order = MagicMock(return_value=chain)
        chain.limit = MagicMock(return_value=chain)
        chain.single = MagicMock(return_value=chain)

        # Execute returns response with data
        execute_result = MagicMock()
        execute_result.data = return_data or []
        chain.execute = MagicMock(return_value=execute_result)

        return chain

    mock.table = MagicMock(side_effect=lambda name: create_chainable_mock())
    mock._create_chainable = create_chainable_mock

    return mock


@pytest.fixture
def sample_venue():
    """Sample venue data for testing."""
    return {
        "id": "venue-123",
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
        },
        "created_at": datetime.utcnow().isoformat(),
        "updated_at": datetime.utcnow().isoformat()
    }


@pytest.fixture
def sample_dj():
    """Sample DJ data for testing."""
    return {
        "id": "dj-123",
        "user_id": "user-123",
        "name": "DJ Test",
        "email": "dj@test.com",
        "stripe_account_id": "acct_test123",
        "created_at": datetime.utcnow().isoformat(),
        "updated_at": datetime.utcnow().isoformat()
    }


@pytest.fixture
def sample_session(sample_venue, sample_dj):
    """Sample session data for testing."""
    return {
        "id": "session-123",
        "venue_id": sample_venue["id"],
        "dj_id": sample_dj["id"],
        "status": "active",
        "started_at": datetime.utcnow().isoformat(),
        "ended_at": None,
        "venues": sample_venue,
        "djs": sample_dj
    }


@pytest.fixture
def sample_request(sample_session):
    """Sample request data for testing."""
    return {
        "id": "request-123",
        "session_id": sample_session["id"],
        "song_title": "Test Song",
        "song_artist": "Test Artist",
        "spotify_track_id": "spotify123",
        "tier": "normal",
        "message": "Play this please!",
        "amount": 200,
        "status": "pending",
        "customer_id": None,
        "stripe_payment_id": "pi_test123",
        "created_at": datetime.utcnow().isoformat(),
        "updated_at": datetime.utcnow().isoformat()
    }


@pytest.fixture
def mock_spotify_service():
    """Mock Spotify service for track lookups."""
    with patch("services.spotify.spotify_service") as mock:
        mock.is_configured = True
        mock.search_tracks = AsyncMock(return_value=[
            {
                "id": "spotify123",
                "name": "Test Song",
                "artists": [{"name": "Test Artist"}],
                "album": {"name": "Test Album", "images": []},
                "explicit": False
            }
        ])
        mock.get_track = AsyncMock(return_value=MagicMock(
            id="spotify123",
            name="Test Song",
            explicit=False
        ))
        yield mock
