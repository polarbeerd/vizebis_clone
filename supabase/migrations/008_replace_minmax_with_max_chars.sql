-- Replace min_length + max_length with a single max_chars column
ALTER TABLE portal_field_definitions
  ADD COLUMN IF NOT EXISTS max_chars INTEGER DEFAULT NULL;

-- Copy max_length values to max_chars where they exist
UPDATE portal_field_definitions
  SET max_chars = max_length
  WHERE max_length IS NOT NULL;

-- Drop old columns
ALTER TABLE portal_field_definitions
  DROP COLUMN IF EXISTS min_length,
  DROP COLUMN IF EXISTS max_length;
