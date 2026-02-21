-- ============================================================
-- 015_automation_jobs.sql
-- Tracks bot automation jobs triggered from the admin panel.
-- ============================================================

CREATE TABLE IF NOT EXISTS automation_jobs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id  INTEGER NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  country         TEXT NOT NULL,

  -- Status
  status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'queued', 'running', 'completed', 'failed', 'cancelled')),

  -- Stage tracking
  current_stage     TEXT,
  stage_progress    TEXT,
  stages_completed  JSONB DEFAULT '{}',

  -- Results
  mfa_case_number     TEXT,
  vfs_confirmation    TEXT,

  -- Error
  error_message   TEXT,
  error_stage     TEXT,

  -- Metadata
  triggered_by    UUID,
  bot_instance_id TEXT,

  -- Timestamps
  started_at      TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_automation_jobs_application_id ON automation_jobs(application_id);
CREATE INDEX idx_automation_jobs_status ON automation_jobs(status);
CREATE INDEX idx_automation_jobs_country ON automation_jobs(country);

-- RLS
ALTER TABLE automation_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated access" ON automation_jobs
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Service role access" ON automation_jobs
  FOR ALL USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
