from fastapi import APIRouter, HTTPException, Query
from services.spotify import spotify_service, SpotifyTrack

router = APIRouter(prefix="/spotify", tags=["spotify"])


@router.get("/search", response_model=list[SpotifyTrack])
async def search_tracks(
    q: str = Query(..., min_length=1, description="Search query"),
    limit: int = Query(10, ge=1, le=50, description="Number of results"),
):
    """Search for tracks on Spotify"""
    if not spotify_service.is_configured:
        raise HTTPException(
            status_code=503,
            detail="Spotify API not configured. Set SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET.",
        )

    try:
        tracks = await spotify_service.search_tracks(q, limit)
        return tracks
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Spotify API error: {str(e)}")


@router.get("/track/{track_id}", response_model=SpotifyTrack)
async def get_track(track_id: str):
    """Get a single track by Spotify ID"""
    if not spotify_service.is_configured:
        raise HTTPException(
            status_code=503,
            detail="Spotify API not configured. Set SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET.",
        )

    try:
        track = await spotify_service.get_track(track_id)
        if not track:
            raise HTTPException(status_code=404, detail="Track not found")
        return track
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Spotify API error: {str(e)}")
