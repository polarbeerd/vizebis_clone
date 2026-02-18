-- Smart field templates: pre-coded complex field components
CREATE TABLE portal_smart_field_templates (
  id          SERIAL PRIMARY KEY,
  template_key TEXT NOT NULL UNIQUE,
  label       TEXT NOT NULL,
  description TEXT DEFAULT '',
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- Smart field assignments: enable/disable templates per country+visa
CREATE TABLE portal_smart_field_assignments (
  id            SERIAL PRIMARY KEY,
  template_key  TEXT NOT NULL REFERENCES portal_smart_field_templates(template_key) ON DELETE CASCADE,
  country       TEXT NOT NULL,
  visa_type     TEXT NOT NULL,
  is_required   BOOLEAN DEFAULT false,
  sort_order    INTEGER DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE(template_key, country, visa_type)
);

-- RLS policies (matching existing pattern)
ALTER TABLE portal_smart_field_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE portal_smart_field_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth users manage smart field templates"
  ON portal_smart_field_templates FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Auth users manage smart field assignments"
  ON portal_smart_field_assignments FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Seed the Schengen visa history smart field template
INSERT INTO portal_smart_field_templates (template_key, label, description)
VALUES (
  'previous_schengen_visas',
  'Previous Schengen Visas & Fingerprint',
  'Collects up to 3 previous Schengen visa details (country code + visa number) and last fingerprint collection date'
);
