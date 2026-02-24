-- 018: Consolidate field assignments to global (country=NULL, visa_type=NULL)
-- Every country+visa combo uses the same form fields, so we simplify to a single global config.

-- ═══════════════════════════════════════════════════════════════
-- portal_field_assignments
-- ═══════════════════════════════════════════════════════════════

-- Allow NULLs for country and visa_type
ALTER TABLE portal_field_assignments ALTER COLUMN country DROP NOT NULL;
ALTER TABLE portal_field_assignments ALTER COLUMN visa_type DROP NOT NULL;

-- Drop existing unique constraint (country+visa+definition)
ALTER TABLE portal_field_assignments
  DROP CONSTRAINT IF EXISTS portal_field_assignments_definition_id_country_visa_type_key;

-- Keep only one set of assignments (lowest id per definition_id), delete duplicates
WITH keep AS (
  SELECT DISTINCT ON (definition_id) id
  FROM portal_field_assignments
  ORDER BY definition_id, id
)
DELETE FROM portal_field_assignments WHERE id NOT IN (SELECT id FROM keep);

-- Make surviving rows global
UPDATE portal_field_assignments SET country = NULL, visa_type = NULL;

-- Add unique constraint: one assignment per definition (global)
ALTER TABLE portal_field_assignments
  ADD CONSTRAINT portal_field_assignments_definition_id_global_key UNIQUE (definition_id);

-- ═══════════════════════════════════════════════════════════════
-- portal_smart_field_assignments
-- ═══════════════════════════════════════════════════════════════

-- Allow NULLs for country and visa_type
ALTER TABLE portal_smart_field_assignments ALTER COLUMN country DROP NOT NULL;
ALTER TABLE portal_smart_field_assignments ALTER COLUMN visa_type DROP NOT NULL;

-- Drop existing unique constraint
ALTER TABLE portal_smart_field_assignments
  DROP CONSTRAINT IF EXISTS portal_smart_field_assignments_template_key_country_visa_type_key;

-- Keep only one set of assignments (lowest id per template_key), delete duplicates
WITH keep AS (
  SELECT DISTINCT ON (template_key) id
  FROM portal_smart_field_assignments
  ORDER BY template_key, id
)
DELETE FROM portal_smart_field_assignments WHERE id NOT IN (SELECT id FROM keep);

-- Make surviving rows global
UPDATE portal_smart_field_assignments SET country = NULL, visa_type = NULL;
