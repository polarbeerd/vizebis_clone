-- ============================================================
-- 003_portal_v2_schema.sql
-- Customer Portal V2: document checklists, application documents, portal content
-- ============================================================

-- =========================
-- 1. ENHANCE COUNTRIES TABLE
-- =========================

ALTER TABLE countries
  ADD COLUMN IF NOT EXISTS flag_emoji TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Seed countries with flag emojis (upsert on name)
INSERT INTO countries (name, flag_emoji, sort_order) VALUES
  ('Almanya', '🇩🇪', 1),
  ('Fransa', '🇫🇷', 2),
  ('İtalya', '🇮🇹', 3),
  ('İspanya', '🇪🇸', 4),
  ('Yunanistan', '🇬🇷', 5),
  ('Hollanda', '🇳🇱', 6),
  ('Belçika', '🇧🇪', 7),
  ('Portekiz', '🇵🇹', 8),
  ('Avusturya', '🇦🇹', 9),
  ('İsviçre', '🇨🇭', 10),
  ('Danimarka', '🇩🇰', 11),
  ('İsveç', '🇸🇪', 12),
  ('Norveç', '🇳🇴', 13),
  ('Finlandiya', '🇫🇮', 14),
  ('Polonya', '🇵🇱', 15),
  ('Çekya', '🇨🇿', 16),
  ('Macaristan', '🇭🇺', 17),
  ('Hırvatistan', '🇭🇷', 18),
  ('Romanya', '🇷🇴', 19),
  ('Bulgaristan', '🇧🇬', 20),
  ('İngiltere', '🇬🇧', 21),
  ('İrlanda', '🇮🇪', 22),
  ('ABD', '🇺🇸', 23),
  ('Kanada', '🇨🇦', 24),
  ('Avustralya', '🇦🇺', 25),
  ('Japonya', '🇯🇵', 26),
  ('Güney Kore', '🇰🇷', 27),
  ('Brezilya', '🇧🇷', 28),
  ('Rusya', '🇷🇺', 29)
ON CONFLICT (name) DO UPDATE SET
  flag_emoji = EXCLUDED.flag_emoji,
  sort_order = EXCLUDED.sort_order;

-- =========================
-- 2. DOCUMENT CHECKLISTS TABLE
-- =========================

CREATE TABLE IF NOT EXISTS document_checklists (
  id          SERIAL PRIMARY KEY,
  country     TEXT NOT NULL,
  visa_type   visa_type NOT NULL,
  name        TEXT NOT NULL,
  description TEXT DEFAULT '',
  is_required BOOLEAN DEFAULT true,
  sort_order  INTEGER DEFAULT 0,
  created_by  UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE(country, visa_type, name)
);

CREATE INDEX IF NOT EXISTS idx_document_checklists_country_visa
  ON document_checklists (country, visa_type);

-- =========================
-- 3. APPLICATION DOCUMENTS TABLE
-- =========================

CREATE TABLE IF NOT EXISTS application_documents (
  id                SERIAL PRIMARY KEY,
  application_id    INTEGER NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  checklist_item_id INTEGER REFERENCES document_checklists(id) ON DELETE SET NULL,
  custom_name       TEXT,
  custom_description TEXT,
  is_required       BOOLEAN DEFAULT true,
  file_path         TEXT,
  file_name         TEXT,
  file_size         INTEGER,
  mime_type         TEXT,
  status            TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'uploaded', 'approved', 'rejected')),
  admin_note        TEXT,
  uploaded_at       TIMESTAMPTZ,
  reviewed_at       TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_application_documents_app
  ON application_documents (application_id);

-- =========================
-- 4. PORTAL CONTENT TABLE
-- =========================

CREATE TABLE IF NOT EXISTS portal_content (
  id            SERIAL PRIMARY KEY,
  title         TEXT NOT NULL,
  content       TEXT NOT NULL DEFAULT '',
  content_type  TEXT NOT NULL CHECK (content_type IN ('country_guide', 'process_guide', 'faq', 'general')),
  country       TEXT,
  visa_type     visa_type,
  sort_order    INTEGER DEFAULT 0,
  is_published  BOOLEAN DEFAULT true,
  created_by    UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_portal_content_country_visa
  ON portal_content (country, visa_type);

-- =========================
-- 5. ADD SOURCE COLUMN TO APPLICATIONS
-- =========================

ALTER TABLE applications
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'admin' CHECK (source IN ('admin', 'portal'));

-- =========================
-- 6. RLS POLICIES
-- =========================

ALTER TABLE document_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE application_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE portal_content ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth users manage checklists"
  ON document_checklists FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Auth users manage app documents"
  ON application_documents FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Auth users manage portal content"
  ON portal_content FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');
