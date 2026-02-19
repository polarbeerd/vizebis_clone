-- ============================================================
-- 013_booking_and_letter_of_intent.sql
-- Adds booking hotels, letter of intent examples, and
-- generated documents tables + storage buckets for the
-- booking PDF and letter of intent generation features.
-- ============================================================

-- =========================
-- 1. STORAGE BUCKETS
-- =========================

-- booking-templates bucket (public read)
INSERT INTO storage.buckets (id, name, public)
  VALUES ('booking-templates', 'booking-templates', true)
  ON CONFLICT (id) DO NOTHING;

-- letter-intent-examples bucket (public read)
INSERT INTO storage.buckets (id, name, public)
  VALUES ('letter-intent-examples', 'letter-intent-examples', true)
  ON CONFLICT (id) DO NOTHING;

-- generated-docs bucket (public read)
INSERT INTO storage.buckets (id, name, public)
  VALUES ('generated-docs', 'generated-docs', true)
  ON CONFLICT (id) DO NOTHING;

-- =========================
-- 2. STORAGE POLICIES
-- =========================

-- booking-templates: SELECT
CREATE POLICY "Allow public read booking-templates"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'booking-templates');

-- booking-templates: INSERT
CREATE POLICY "Allow authenticated insert booking-templates"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'booking-templates' AND auth.role() = 'authenticated');

-- booking-templates: UPDATE
CREATE POLICY "Allow authenticated update booking-templates"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'booking-templates' AND auth.role() = 'authenticated')
  WITH CHECK (bucket_id = 'booking-templates' AND auth.role() = 'authenticated');

-- booking-templates: DELETE
CREATE POLICY "Allow authenticated delete booking-templates"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'booking-templates' AND auth.role() = 'authenticated');

-- letter-intent-examples: SELECT
CREATE POLICY "Allow public read letter-intent-examples"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'letter-intent-examples');

-- letter-intent-examples: INSERT
CREATE POLICY "Allow authenticated insert letter-intent-examples"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'letter-intent-examples' AND auth.role() = 'authenticated');

-- letter-intent-examples: UPDATE
CREATE POLICY "Allow authenticated update letter-intent-examples"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'letter-intent-examples' AND auth.role() = 'authenticated')
  WITH CHECK (bucket_id = 'letter-intent-examples' AND auth.role() = 'authenticated');

-- letter-intent-examples: DELETE
CREATE POLICY "Allow authenticated delete letter-intent-examples"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'letter-intent-examples' AND auth.role() = 'authenticated');

-- generated-docs: SELECT
CREATE POLICY "Allow public read generated-docs"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'generated-docs');

-- generated-docs: INSERT
CREATE POLICY "Allow authenticated insert generated-docs"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'generated-docs' AND auth.role() = 'authenticated');

-- generated-docs: UPDATE
CREATE POLICY "Allow authenticated update generated-docs"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'generated-docs' AND auth.role() = 'authenticated')
  WITH CHECK (bucket_id = 'generated-docs' AND auth.role() = 'authenticated');

-- generated-docs: DELETE
CREATE POLICY "Allow authenticated delete generated-docs"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'generated-docs' AND auth.role() = 'authenticated');

-- =========================
-- 3. TABLES
-- =========================

-- ---------------------------------------------------------
-- 3.1  booking_hotels — Hotel templates for booking PDFs
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS booking_hotels (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  address       TEXT NOT NULL,
  email         TEXT NOT NULL,
  phone         TEXT NOT NULL,
  website       TEXT,
  template_path TEXT NOT NULL,
  edit_config   JSONB NOT NULL DEFAULT '{}',
  type          TEXT NOT NULL CHECK (type IN ('individual', 'group')),
  is_active     BOOLEAN NOT NULL DEFAULT true,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------
-- 3.2  letter_intent_examples — Example letters of intent
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS letter_intent_examples (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  country         TEXT,
  visa_type       TEXT,
  file_path       TEXT NOT NULL,
  extracted_text  TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------
-- 3.3  generated_documents — Generated booking PDFs & letters
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS generated_documents (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id  INTEGER NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  type            TEXT NOT NULL CHECK (type IN ('booking_pdf', 'letter_of_intent')),
  hotel_id        UUID REFERENCES booking_hotels(id) ON DELETE SET NULL,
  file_path       TEXT,
  content         TEXT,
  status          TEXT NOT NULL DEFAULT 'generating' CHECK (status IN ('generating', 'ready', 'error')),
  error_message   TEXT,
  generated_by    TEXT NOT NULL DEFAULT 'auto',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =========================
-- 4. INDEXES
-- =========================

CREATE INDEX IF NOT EXISTS idx_generated_documents_application_id
  ON generated_documents (application_id);

CREATE INDEX IF NOT EXISTS idx_generated_documents_type
  ON generated_documents (type);

-- =========================
-- 5. ROW LEVEL SECURITY
-- =========================

-- booking_hotels
ALTER TABLE booking_hotels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated access" ON booking_hotels
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- letter_intent_examples
ALTER TABLE letter_intent_examples ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated access" ON letter_intent_examples
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- generated_documents
ALTER TABLE generated_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated access" ON generated_documents
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Service role access" ON generated_documents
  FOR ALL USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
