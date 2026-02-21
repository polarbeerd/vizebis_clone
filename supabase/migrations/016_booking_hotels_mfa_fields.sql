-- ============================================================
-- 016_booking_hotels_mfa_fields.sql
-- Split address and phone into structured fields needed by
-- bot automation to fill MFA accommodation step (Step 15).
-- ============================================================

ALTER TABLE booking_hotels ADD COLUMN IF NOT EXISTS postal_code TEXT;
ALTER TABLE booking_hotels ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE booking_hotels ADD COLUMN IF NOT EXISTS phone_country_code TEXT;

-- Backfill "Cabinn Apartments":
-- address was: "Arne Jacobsens Allé 4, Amager Vest, 2300 Copenhagen, Denmark"
-- phone was: "004532465710"
UPDATE booking_hotels
SET
  address = 'Arne Jacobsens Allé 4',
  postal_code = '2300',
  city = 'Copenhagen',
  phone_country_code = '0045',
  phone = '32465710'
WHERE name = 'Cabinn Apartments';
