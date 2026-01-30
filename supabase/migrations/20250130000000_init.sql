-- DJ Request Initial Schema
-- Run: supabase db push

-- Venues table
CREATE TABLE venues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- DJs table
CREATE TABLE djs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    stripe_account_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sessions table
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    venue_id UUID REFERENCES venues(id) NOT NULL,
    dj_id UUID REFERENCES djs(id) NOT NULL,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'ended')),
    started_at TIMESTAMPTZ DEFAULT NOW(),
    ended_at TIMESTAMPTZ
);

-- Requests table
CREATE TABLE requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES sessions(id) NOT NULL,
    song_title TEXT NOT NULL,
    song_artist TEXT,
    spotify_track_id TEXT,
    tier TEXT DEFAULT 'normal' CHECK (tier IN ('normal', 'priority', 'asap')),
    message TEXT,
    amount INTEGER NOT NULL, -- in cents
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'played')),
    customer_id TEXT, -- anonymous identifier
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Payments table
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID REFERENCES requests(id) NOT NULL,
    stripe_payment_id TEXT,
    amount INTEGER NOT NULL,
    platform_fee INTEGER,
    dj_payout INTEGER,
    venue_payout INTEGER,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'succeeded', 'failed', 'refunded')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_sessions_venue ON sessions(venue_id);
CREATE INDEX idx_sessions_dj ON sessions(dj_id);
CREATE INDEX idx_sessions_status ON sessions(status);
CREATE INDEX idx_requests_session ON requests(session_id);
CREATE INDEX idx_requests_status ON requests(status);
CREATE INDEX idx_venues_slug ON venues(slug);

-- Enable Row Level Security
ALTER TABLE venues ENABLE ROW LEVEL SECURITY;
ALTER TABLE djs ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- RLS Policies (basic - to be refined)
-- Venues: public read
CREATE POLICY "Venues are viewable by everyone" ON venues
    FOR SELECT USING (true);

-- Sessions: public read for active sessions
CREATE POLICY "Active sessions are viewable" ON sessions
    FOR SELECT USING (status = 'active');

-- Requests: viewable by session participants
CREATE POLICY "Requests are viewable by session" ON requests
    FOR SELECT USING (true);

-- Requests: anyone can insert
CREATE POLICY "Anyone can create requests" ON requests
    FOR INSERT WITH CHECK (true);
