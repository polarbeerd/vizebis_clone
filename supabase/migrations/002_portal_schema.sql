-- ============================================================
-- 002_portal_schema.sql
-- Adds tracking code to applications + portal-uploads bucket
-- ============================================================

-- 1. Add tracking_code column (nullable first for backfill)
ALTER TABLE applications
  ADD COLUMN IF NOT EXISTS tracking_code TEXT UNIQUE;

-- 2. Add portal_last_accessed timestamp
ALTER TABLE applications
  ADD COLUMN IF NOT EXISTS portal_last_accessed TIMESTAMPTZ;

-- 3. Backfill existing rows with random UUIDs
UPDATE applications
  SET tracking_code = gen_random_uuid()::TEXT
  WHERE tracking_code IS NULL;

-- 4. Now set NOT NULL
ALTER TABLE applications
  ALTER COLUMN tracking_code SET NOT NULL;

-- 5. Set default for future rows
ALTER TABLE applications
  ALTER COLUMN tracking_code SET DEFAULT gen_random_uuid()::TEXT;

-- 6. Index for fast lookup
CREATE INDEX IF NOT EXISTS idx_applications_tracking_code
  ON applications (tracking_code);

-- 7. Create storage bucket for portal uploads
INSERT INTO storage.buckets (id, name, public)
  VALUES ('portal-uploads', 'portal-uploads', false)
  ON CONFLICT (id) DO NOTHING;

-- 8. Storage policy: service role can manage portal uploads
CREATE POLICY "Service role manages portal uploads"
  ON storage.objects
  FOR ALL
  USING (bucket_id = 'portal-uploads')
  WITH CHECK (bucket_id = 'portal-uploads');
