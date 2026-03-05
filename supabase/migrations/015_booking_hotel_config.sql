-- Add hotel_config JSONB column to booking_hotels for HTML-based booking generation
ALTER TABLE booking_hotels
ADD COLUMN IF NOT EXISTS hotel_config jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Add photo_path and map_path columns for hotel images
ALTER TABLE booking_hotels
ADD COLUMN IF NOT EXISTS photo_path text,
ADD COLUMN IF NOT EXISTS map_path text;
