-- Security Enhancements Migration
-- Adds additional constraints and indexes for security

-- =====================================================
-- Add length constraints to text fields
-- =====================================================

-- Venues: constrain name and slug length
ALTER TABLE venues
    ADD CONSTRAINT venues_name_length CHECK (length(name) <= 100),
    ADD CONSTRAINT venues_slug_length CHECK (length(slug) <= 50);

-- DJs: constrain name and email length
ALTER TABLE djs
    ADD CONSTRAINT djs_name_length CHECK (length(name) <= 100),
    ADD CONSTRAINT djs_email_length CHECK (length(email) <= 255);

-- Requests: constrain text field lengths
ALTER TABLE requests
    ADD CONSTRAINT requests_song_title_length CHECK (length(song_title) <= 200),
    ADD CONSTRAINT requests_song_artist_length CHECK (song_artist IS NULL OR length(song_artist) <= 200),
    ADD CONSTRAINT requests_message_length CHECK (message IS NULL OR length(message) <= 500),
    ADD CONSTRAINT requests_spotify_track_id_length CHECK (spotify_track_id IS NULL OR length(spotify_track_id) <= 50);

-- =====================================================
-- Add amount constraints
-- =====================================================

-- Requests: valid amount range (min 50 cents, max 1000 EUR)
ALTER TABLE requests
    ADD CONSTRAINT requests_amount_range CHECK (amount >= 50 AND amount <= 100000);

-- =====================================================
-- Additional indexes for security queries
-- =====================================================

-- Index for rate limiting queries (requests by customer_id)
CREATE INDEX IF NOT EXISTS idx_requests_customer_created
    ON requests(customer_id, created_at DESC);

-- Index for DJ lookups by email (login endpoint)
CREATE INDEX IF NOT EXISTS idx_djs_email
    ON djs(email);

-- =====================================================
-- Update timestamp trigger
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to tables with updated_at
DROP TRIGGER IF EXISTS update_venues_updated_at ON venues;
CREATE TRIGGER update_venues_updated_at
    BEFORE UPDATE ON venues
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_djs_updated_at ON djs;
CREATE TRIGGER update_djs_updated_at
    BEFORE UPDATE ON djs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_requests_updated_at ON requests;
CREATE TRIGGER update_requests_updated_at
    BEFORE UPDATE ON requests
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
