from pydantic import BaseModel
from datetime import datetime
from enum import Enum
from typing import Optional


class RequestTier(str, Enum):
    NORMAL = "normal"
    PRIORITY = "priority"
    ASAP = "asap"


class RequestStatus(str, Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    REJECTED = "rejected"
    PLAYED = "played"


class SessionStatus(str, Enum):
    ACTIVE = "active"
    PAUSED = "paused"
    ENDED = "ended"


# Venue
class VenueBase(BaseModel):
    name: str
    slug: str
    settings: dict = {}


class VenueCreate(VenueBase):
    pass


class Venue(VenueBase):
    id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# DJ
class DJBase(BaseModel):
    name: str
    email: str


class DJCreate(DJBase):
    user_id: Optional[str] = None


class DJ(DJBase):
    id: str
    user_id: Optional[str]
    stripe_account_id: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# Session
class SessionBase(BaseModel):
    venue_id: str
    dj_id: str


class SessionCreate(SessionBase):
    pass


class SessionUpdate(BaseModel):
    status: SessionStatus


class Session(SessionBase):
    id: str
    status: SessionStatus
    started_at: datetime
    ended_at: Optional[datetime]

    class Config:
        from_attributes = True


# Request
class RequestBase(BaseModel):
    song_title: str
    song_artist: Optional[str] = None
    spotify_track_id: Optional[str] = None
    tier: RequestTier = RequestTier.NORMAL
    message: Optional[str] = None
    amount: int  # in cents


class RequestCreate(RequestBase):
    session_id: str
    customer_id: Optional[str] = None


class RequestUpdate(BaseModel):
    status: RequestStatus


class Request(RequestBase):
    id: str
    session_id: str
    status: RequestStatus
    customer_id: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
