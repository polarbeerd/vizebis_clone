-- Add 'video' and 'key_point' content types to portal_content
ALTER TABLE portal_content DROP CONSTRAINT IF EXISTS portal_content_content_type_check;
ALTER TABLE portal_content ADD CONSTRAINT portal_content_content_type_check
  CHECK (content_type = ANY (ARRAY[
    'country_guide'::text,
    'process_guide'::text,
    'faq'::text,
    'general'::text,
    'video'::text,
    'key_point'::text
  ]));
