-- Group Applications & Application Notes
-- Groups allow families to apply together sharing city and travel dates.
-- Notes allow admin staff to add timestamped comments per application.

-- application_groups table
CREATE TABLE IF NOT EXISTS application_groups (
  id              SERIAL PRIMARY KEY,
  group_name      TEXT NOT NULL,
  country         TEXT NOT NULL,
  application_city TEXT NOT NULL,
  travel_dates    JSONB,
  tracking_code   TEXT UNIQUE NOT NULL DEFAULT 'GRP-' || substr(md5(random()::text || clock_timestamp()::text), 1, 8),
  status          TEXT DEFAULT 'draft',
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- Add group_id to applications
ALTER TABLE applications ADD COLUMN IF NOT EXISTS group_id INTEGER REFERENCES application_groups(id);

-- application_notes table
CREATE TABLE IF NOT EXISTS application_notes (
  id              SERIAL PRIMARY KEY,
  application_id  INTEGER NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  content         TEXT NOT NULL,
  category        TEXT DEFAULT 'internal',
  is_pinned       BOOLEAN DEFAULT false,
  author_id       UUID REFERENCES profiles(id),
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- Index for efficient note lookups
CREATE INDEX IF NOT EXISTS idx_application_notes_app_id ON application_notes(application_id);
CREATE INDEX IF NOT EXISTS idx_applications_group_id ON applications(group_id);
