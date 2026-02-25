-- 019: Replace redundant hobby/lifestyle fields with LOI-optimized fields
-- Old: daily_life, off_day, hobbies, travel_info (all produce same answers)
-- New: trip_plans, ties_to_home, previous_travels, personal_about

-- ═══════════════════════════════════════════════════════════════
-- 1. Delete old field definitions (cascades to portal_field_assignments)
-- ═══════════════════════════════════════════════════════════════
DELETE FROM portal_field_definitions
WHERE field_key IN ('daily_life', 'off_day', 'hobbies', 'travel_info');

-- ═══════════════════════════════════════════════════════════════
-- 2. Insert new field definitions
-- ═══════════════════════════════════════════════════════════════
INSERT INTO portal_field_definitions (field_key, field_label, field_label_tr, field_type, placeholder, placeholder_tr, max_chars)
VALUES
  ('trip_plans',        'Your Trip Plans',                'Seyahat Planlariniz',             'textarea', '', '', 500),
  ('ties_to_home',      'Your Ties to Turkey',            'Turkiye''ye Bagliliginiz',        'textarea', '', '', 500),
  ('previous_travels',  'Your Travels in the Last 3 Years', 'Son 3 Yildaki Seyahatleriniz', 'textarea', '', '', 500),
  ('personal_about',    'About Yourself',                 'Kendiniz Hakkinda',               'textarea', '', '', 500);

-- ═══════════════════════════════════════════════════════════════
-- 3. Insert global assignments (country=NULL, visa_type=NULL)
--    in the 'employment' section with sort_order 900-930
-- ═══════════════════════════════════════════════════════════════
INSERT INTO portal_field_assignments (definition_id, country, visa_type, is_required, sort_order, section)
SELECT id, NULL, NULL, false, 900, 'employment'
FROM portal_field_definitions WHERE field_key = 'trip_plans';

INSERT INTO portal_field_assignments (definition_id, country, visa_type, is_required, sort_order, section)
SELECT id, NULL, NULL, false, 910, 'employment'
FROM portal_field_definitions WHERE field_key = 'ties_to_home';

INSERT INTO portal_field_assignments (definition_id, country, visa_type, is_required, sort_order, section)
SELECT id, NULL, NULL, false, 920, 'employment'
FROM portal_field_definitions WHERE field_key = 'previous_travels';

INSERT INTO portal_field_assignments (definition_id, country, visa_type, is_required, sort_order, section)
SELECT id, NULL, NULL, false, 930, 'employment'
FROM portal_field_definitions WHERE field_key = 'personal_about';
