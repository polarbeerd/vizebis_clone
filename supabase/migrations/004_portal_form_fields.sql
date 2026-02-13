-- ============================================================
-- Migration 004: Portal Form Fields
-- Dynamic per-country per-visa-type form fields for portal wizard
-- ============================================================

-- 1. Create portal_form_fields table
CREATE TABLE IF NOT EXISTS portal_form_fields (
  id          SERIAL PRIMARY KEY,
  country     TEXT NOT NULL,
  visa_type   visa_type NOT NULL,
  field_key   TEXT NOT NULL,
  field_label TEXT NOT NULL,
  field_type  TEXT NOT NULL CHECK (field_type IN ('text', 'email', 'date', 'tel', 'number', 'select', 'textarea')),
  placeholder TEXT DEFAULT '',
  options     TEXT DEFAULT '',
  is_required BOOLEAN DEFAULT true,
  is_standard BOOLEAN DEFAULT false,
  sort_order  INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE(country, visa_type, field_key)
);

-- 2. Add custom_fields JSONB column to applications
ALTER TABLE applications ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '{}';

-- 3. RLS
ALTER TABLE portal_form_fields ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth users manage form fields"
  ON portal_form_fields FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');
