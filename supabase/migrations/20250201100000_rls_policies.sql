-- RLS Policies Enhancement
-- This migration adds comprehensive Row Level Security policies

-- =====================================================
-- DROP existing policies (if any) to replace them
-- =====================================================

DROP POLICY IF EXISTS "Venues are viewable by everyone" ON venues;
DROP POLICY IF EXISTS "Active sessions are viewable" ON sessions;
DROP POLICY IF EXISTS "Requests are viewable by session" ON requests;
DROP POLICY IF EXISTS "Anyone can create requests" ON requests;

-- =====================================================
-- VENUES POLICIES
-- Public read, DJ can manage their own
-- =====================================================

-- Anyone can view venues (for customers joining)
CREATE POLICY "venues_select_public"
    ON venues FOR SELECT
    USING (true);

-- Authenticated DJs can create venues
CREATE POLICY "venues_insert_authenticated"
    ON venues FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

-- Only venue owner/DJ can update (future: add owner_id column)
-- For now, allow authenticated users
CREATE POLICY "venues_update_authenticated"
    ON venues FOR UPDATE
    USING (auth.role() = 'authenticated');

-- =====================================================
-- DJS POLICIES
-- DJs can manage their own profile
-- =====================================================

-- DJs can view their own profile
CREATE POLICY "djs_select_own"
    ON djs FOR SELECT
    USING (
        auth.uid() = user_id
        OR auth.role() = 'service_role'
    );

-- DJs can update their own profile
CREATE POLICY "djs_update_own"
    ON djs FOR UPDATE
    USING (auth.uid() = user_id);

-- Service role can insert DJs (for email-based login)
CREATE POLICY "djs_insert_service"
    ON djs FOR INSERT
    WITH CHECK (auth.role() = 'service_role');

-- =====================================================
-- SESSIONS POLICIES
-- Customers can view active sessions, DJs can manage
-- =====================================================

-- Anyone can view active/paused sessions (for customers)
CREATE POLICY "sessions_select_active"
    ON sessions FOR SELECT
    USING (
        status IN ('active', 'paused')
        OR auth.role() = 'service_role'
    );

-- DJs can create sessions (via service role for now)
CREATE POLICY "sessions_insert_service"
    ON sessions FOR INSERT
    WITH CHECK (auth.role() = 'service_role');

-- DJs can update their own sessions (via service role)
CREATE POLICY "sessions_update_service"
    ON sessions FOR UPDATE
    USING (auth.role() = 'service_role');

-- =====================================================
-- REQUESTS POLICIES
-- Customers can view session requests, create requests
-- DJs can update status
-- =====================================================

-- Anyone can view requests for a session (queue visibility)
CREATE POLICY "requests_select_session"
    ON requests FOR SELECT
    USING (true);

-- Anyone can create requests (customers submit via backend)
CREATE POLICY "requests_insert_public"
    ON requests FOR INSERT
    WITH CHECK (auth.role() = 'service_role');

-- Only service role can update requests (DJ actions via backend)
CREATE POLICY "requests_update_service"
    ON requests FOR UPDATE
    USING (auth.role() = 'service_role');

-- =====================================================
-- PAYMENTS POLICIES
-- Highly restricted - only service role
-- =====================================================

-- Only service role can view payments
CREATE POLICY "payments_select_service"
    ON payments FOR SELECT
    USING (auth.role() = 'service_role');

-- Only service role can insert payments
CREATE POLICY "payments_insert_service"
    ON payments FOR INSERT
    WITH CHECK (auth.role() = 'service_role');

-- Only service role can update payments
CREATE POLICY "payments_update_service"
    ON payments FOR UPDATE
    USING (auth.role() = 'service_role');

-- =====================================================
-- Enable realtime for requests table (for DJ dashboard)
-- =====================================================
ALTER PUBLICATION supabase_realtime ADD TABLE requests;
