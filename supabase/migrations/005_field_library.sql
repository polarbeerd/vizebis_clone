-- ============================================================
-- Migration 005: Field Library + Assignment Redesign
-- Replace portal_form_fields with reusable field definitions
-- ============================================================

-- 1. Create reusable field definitions (library)
CREATE TABLE portal_field_definitions (
  id          SERIAL PRIMARY KEY,
  field_key   TEXT NOT NULL UNIQUE,
  field_label TEXT NOT NULL,
  field_type  TEXT NOT NULL CHECK (field_type IN ('text','email','date','tel','number','select','textarea')),
  placeholder TEXT DEFAULT '',
  options     TEXT DEFAULT '',
  is_standard BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- 2. Create junction: assign fields to country+visa combos
CREATE TABLE portal_field_assignments (
  id             SERIAL PRIMARY KEY,
  definition_id  INTEGER NOT NULL REFERENCES portal_field_definitions(id) ON DELETE CASCADE,
  country        TEXT NOT NULL,
  visa_type      TEXT NOT NULL,
  is_required    BOOLEAN DEFAULT true,
  sort_order     INTEGER DEFAULT 0,
  created_at     TIMESTAMPTZ DEFAULT now(),
  UNIQUE(definition_id, country, visa_type)
);

-- 3. Drop old table (0 rows, no data to migrate)
DROP TABLE IF EXISTS portal_form_fields;

-- 4. RLS policies
ALTER TABLE portal_field_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE portal_field_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth users manage field definitions"
  ON portal_field_definitions FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Auth users manage field assignments"
  ON portal_field_assignments FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- 5. Seed the 7 standard fields
INSERT INTO portal_field_definitions (field_key, field_label, field_type, placeholder, is_standard) VALUES
  ('full_name',       'Full Name',       'text',  '', true),
  ('id_number',       'ID Number',       'text',  '', true),
  ('date_of_birth',   'Date of Birth',   'date',  '', true),
  ('phone',           'Phone',           'tel',   '', true),
  ('email',           'Email',           'email', '', true),
  ('passport_no',     'Passport No',     'text',  '', true),
  ('passport_expiry', 'Passport Expiry', 'date',  '', true);
