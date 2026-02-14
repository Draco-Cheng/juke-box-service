import httpx
import base64
import time
from typing import Optional
from pydantic import BaseModel
from config import SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET


class SpotifyTrack(BaseModel):
    id: str
    name: str
    artists: list[str]
    album: str
    image_url: Optional[str] = None
    duration_ms: int
    explicit: bool = False


class SpotifyService:
    """Spotify API client with token caching"""

    TOKEN_URL = "https://accounts.spotify.com/api/token"
    API_BASE = "https://api.spotify.com/v1"

    def __init__(self):
        self._access_token: Optional[str] = None
        self._token_expires_at: float = 0

    @property
    def is_configured(self) -> bool:
        return bool(SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET)

    async def _get_access_token(self) -> str:
        """Get access token using Client Credentials flow"""
        # Return cached token if still valid
        if self._access_token and time.time() < self._token_expires_at - 60:
            return self._access_token

        # Request new token
        credentials = f"{SPOTIFY_CLIENT_ID}:{SPOTIFY_CLIENT_SECRET}"
        encoded = base64.b64encode(credentials.encode()).decode()

        async with httpx.AsyncClient() as client:
            response = await client.post(
                self.TOKEN_URL,
                headers={
                    "Authorization": f"Basic {encoded}",
                    "Content-Type": "application/x-www-form-urlencoded",
                },
                data={"grant_type": "client_credentials"},
            )
            response.raise_for_status()
            data = response.json()

        self._access_token = data["access_token"]
        self._token_expires_at = time.time() + data["expires_in"]

        return self._access_token

    def _invalidate_token(self):
        """Clear cached token to force refresh on next request"""
        self._access_token = None
        self._token_expires_at = 0

    async def search_tracks(self, query: str, limit: int = 10) -> list[SpotifyTrack]:
        """Search for tracks on Spotify"""
        if not self.is_configured:
            return []

        token = await self._get_access_token()

        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.API_BASE}/search",
                headers={"Authorization": f"Bearer {token}"},
                params={
                    "q": query,
                    "type": "track",
                    "limit": min(limit, 50),
                },
            )
            # If 401/403, token may be expired/revoked — retry once with fresh token
            if response.status_code in (401, 403):
                self._invalidate_token()
                token = await self._get_access_token()
                response = await client.get(
                    f"{self.API_BASE}/search",
                    headers={"Authorization": f"Bearer {token}"},
                    params={
                        "q": query,
                        "type": "track",
                        "limit": min(limit, 50),
                    },
                )
            response.raise_for_status()
            data = response.json()

        tracks = []
        for item in data.get("tracks", {}).get("items", []):
            # Get smallest album image (64x64) or medium (300x300)
            images = item.get("album", {}).get("images", [])
            image_url = images[-1]["url"] if images else None

            tracks.append(SpotifyTrack(
                id=item["id"],
                name=item["name"],
                artists=[artist["name"] for artist in item.get("artists", [])],
                album=item.get("album", {}).get("name", ""),
                image_url=image_url,
                duration_ms=item.get("duration_ms", 0),
                explicit=item.get("explicit", False),
            ))

        return tracks

    async def get_track(self, track_id: str) -> Optional[SpotifyTrack]:
        """Get a single track by ID"""
        if not self.is_configured:
            return None

        token = await self._get_access_token()

        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.API_BASE}/tracks/{track_id}",
                headers={"Authorization": f"Bearer {token}"},
            )
            if response.status_code == 404:
                return None
            # If 401/403, retry once with fresh token
            if response.status_code in (401, 403):
                self._invalidate_token()
                token = await self._get_access_token()
                response = await client.get(
                    f"{self.API_BASE}/tracks/{track_id}",
                    headers={"Authorization": f"Bearer {token}"},
                )
                if response.status_code == 404:
                    return None
            response.raise_for_status()
            item = response.json()

        images = item.get("album", {}).get("images", [])
        image_url = images[-1]["url"] if images else None

        return SpotifyTrack(
            id=item["id"],
            name=item["name"],
            artists=[artist["name"] for artist in item.get("artists", [])],
            album=item.get("album", {}).get("name", ""),
            image_url=image_url,
            duration_ms=item.get("duration_ms", 0),
            explicit=item.get("explicit", False),
        )


# Singleton instance
spotify_service = SpotifyService()
