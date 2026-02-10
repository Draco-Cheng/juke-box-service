from pydantic import BaseModel, Field, field_validator
from datetime import datetime
from enum import Enum
from typing import Optional
import re
import html


class RequestTier(str, Enum):
    NORMAL = "normal"
    PRIORITY = "priority"
    ASAP = "asap"


class RequestStatus(str, Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    REJECTED = "rejected"
    PLAYED = "played"
    EXPIRED = "expired"


class SessionStatus(str, Enum):
    ACTIVE = "active"
    PAUSED = "paused"
    ENDED = "ended"


# Venue Settings
class VenuePricing(BaseModel):
    normal: int = Field(default=200, description="Price in cents for normal tier")
    priority: int = Field(default=500, description="Price in cents for priority tier")
    asap: int = Field(default=1000, description="Price in cents for ASAP tier")
    currency: str = Field(default="EUR", description="Currency code")


class ContentFilters(BaseModel):
    enabled: bool = Field(default=False, description="Whether content filters are active")
    block_explicit: bool = Field(default=False, description="Block songs marked as explicit")
    blocked_artists: list[str] = Field(default_factory=list, description="List of blocked artist names")


class VenueSettings(BaseModel):
    pricing: VenuePricing = Field(default_factory=VenuePricing)
    content_filters: ContentFilters = Field(default_factory=ContentFilters)


# Venue
class VenueBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    slug: str = Field(..., min_length=1, max_length=50, pattern=r'^[a-z0-9-]+$')
    settings: VenueSettings = Field(default_factory=VenueSettings)

    @field_validator('name')
    @classmethod
    def sanitize_name(cls, v: str) -> str:
        v = v.strip()
        v = re.sub(r'[\x00-\x1f\x7f]', '', v)
        return html.escape(v)


class VenueCreate(VenueBase):
    pass


class VenueUpdate(BaseModel):
    name: Optional[str] = None
    settings: Optional[VenueSettings] = None


class Venue(VenueBase):
    id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# DJ
class DJBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    email: str = Field(..., max_length=255)

    @field_validator('name')
    @classmethod
    def sanitize_name(cls, v: str) -> str:
        v = v.strip()
        v = re.sub(r'[\x00-\x1f\x7f]', '', v)
        return html.escape(v)

    @field_validator('email')
    @classmethod
    def validate_email(cls, v: str) -> str:
        v = v.strip().lower()
        if not re.match(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$', v):
            raise ValueError('Invalid email format')
        return v


class DJCreate(DJBase):
    user_id: Optional[str] = None


class DJProfileUpdate(BaseModel):
    genres: Optional[list[str]] = None
    profile_image: Optional[str] = Field(None, max_length=500)


class DJ(DJBase):
    id: str
    user_id: Optional[str]
    stripe_account_id: Optional[str]
    genres: list[str] = Field(default_factory=list)
    rating: float = 0
    profile_image: Optional[str] = None
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
    song_title: str = Field(..., min_length=1, max_length=200)
    song_artist: Optional[str] = Field(None, max_length=200)
    spotify_track_id: Optional[str] = Field(None, max_length=50, pattern=r'^[a-zA-Z0-9]+$')
    tier: RequestTier = RequestTier.NORMAL
    message: Optional[str] = Field(None, max_length=500)
    amount: int = Field(..., ge=0, le=100000)  # in cents, max 1000 EUR

    @field_validator('song_title', 'song_artist')
    @classmethod
    def sanitize_song_field(cls, v: str | None) -> str | None:
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
        # Keep newlines but remove other control chars
        v = re.sub(r'[\x00-\x09\x0b\x0c\x0e-\x1f\x7f]', '', v)
        return html.escape(v)


class RequestCreate(RequestBase):
    session_id: str = Field(..., min_length=1)
    customer_id: Optional[str] = None


class RequestUpdate(BaseModel):
    status: RequestStatus


class Request(RequestBase):
    id: str
    session_id: str
    status: RequestStatus
    customer_id: Optional[str]
    stripe_payment_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
