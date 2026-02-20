-- ============================================================
-- 014_booking_hotels_country.sql
-- Adds country column to booking_hotels so hotels can be
-- grouped by country and matched to applications.
-- ============================================================

ALTER TABLE booking_hotels ADD COLUMN IF NOT EXISTS country TEXT;

CREATE INDEX IF NOT EXISTS idx_booking_hotels_country
  ON booking_hotels (country);
