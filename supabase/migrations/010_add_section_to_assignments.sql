-- Add section column to both assignment tables
ALTER TABLE portal_field_assignments ADD COLUMN section TEXT DEFAULT 'other';
ALTER TABLE portal_smart_field_assignments ADD COLUMN section TEXT DEFAULT 'other';

-- Seed regular field sections based on field_key
UPDATE portal_field_assignments SET section = 'personal_details'
FROM portal_field_definitions d
WHERE portal_field_assignments.definition_id = d.id
  AND d.field_key IN ('name', 'surname', 'gender', 'email', 'phone');

UPDATE portal_field_assignments SET section = 'birth_info'
FROM portal_field_definitions d
WHERE portal_field_assignments.definition_id = d.id
  AND d.field_key IN ('birth_city', 'date_of_birth');

UPDATE portal_field_assignments SET section = 'nationality_civil'
FROM portal_field_definitions d
WHERE portal_field_assignments.definition_id = d.id
  AND d.field_key IN ('civil_status');

UPDATE portal_field_assignments SET section = 'passport'
FROM portal_field_definitions d
WHERE portal_field_assignments.definition_id = d.id
  AND d.field_key IN ('id_number', 'passport_no', 'date_issue', 'date_expiry');

UPDATE portal_field_assignments SET section = 'employment'
FROM portal_field_definitions d
WHERE portal_field_assignments.definition_id = d.id
  AND d.field_key IN ('daily_life', 'off_day', 'hobbies', 'travel_info');

-- Seed smart field sections based on template_key
UPDATE portal_smart_field_assignments SET section = 'birth_info'
WHERE template_key = 'birth_place';

UPDATE portal_smart_field_assignments SET section = 'nationality_civil'
WHERE template_key = 'nationality';

UPDATE portal_smart_field_assignments SET section = 'address'
WHERE template_key = 'address_info';

UPDATE portal_smart_field_assignments SET section = 'passport'
WHERE template_key = 'passport_country';

UPDATE portal_smart_field_assignments SET section = 'fingerprint'
WHERE template_key = 'fingerprint_visa';

UPDATE portal_smart_field_assignments SET section = 'travel'
WHERE template_key = 'travel_dates';

UPDATE portal_smart_field_assignments SET section = 'employment'
WHERE template_key = 'employment_status';
