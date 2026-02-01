-- Add stripe_payment_id to requests table for webhook idempotency
ALTER TABLE requests ADD COLUMN IF NOT EXISTS stripe_payment_id TEXT;
CREATE INDEX IF NOT EXISTS idx_requests_stripe_payment_id ON requests(stripe_payment_id);
