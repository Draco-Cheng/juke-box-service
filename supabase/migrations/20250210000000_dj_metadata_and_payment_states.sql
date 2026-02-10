-- DJ metadata for discovery page
ALTER TABLE djs ADD COLUMN IF NOT EXISTS genres TEXT[] DEFAULT '{}';
ALTER TABLE djs ADD COLUMN IF NOT EXISTS rating NUMERIC DEFAULT 0;
ALTER TABLE djs ADD COLUMN IF NOT EXISTS profile_image TEXT;

-- Update request status to include expired (for authorization expiry)
ALTER TABLE requests DROP CONSTRAINT IF EXISTS requests_status_check;
ALTER TABLE requests ADD CONSTRAINT requests_status_check
  CHECK (status IN ('pending', 'accepted', 'rejected', 'played', 'expired'));

-- Update payment status to support authorization flow
ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_status_check;
ALTER TABLE payments ADD CONSTRAINT payments_status_check
  CHECK (status IN ('pending', 'authorized', 'captured', 'canceled', 'failed', 'refunded'));
