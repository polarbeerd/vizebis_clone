-- Add fee columns to countries table for country-based pricing
ALTER TABLE countries
  ADD COLUMN IF NOT EXISTS service_fee NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS consulate_fee NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'EUR';
