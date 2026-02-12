-- ============================================================
-- VizeBis Platform — Core Database Schema Migration
-- ============================================================
-- This migration creates all tables, enums, indexes, RLS
-- policies, triggers, and seed data for the VizeBis visa
-- consulting management platform.
--
-- HOW TO USE:
--   1. Open Supabase Dashboard → SQL Editor
--   2. Paste this entire file
--   3. Click "Run"
-- ============================================================

-- =========================
-- 1. ENUM TYPES
-- =========================

CREATE TYPE visa_status AS ENUM (
  'beklemede',
  'hazirlaniyor',
  'konsoloslukta',
  'vize_cikti',
  'ret_oldu',
  'pasaport_teslim'
);

CREATE TYPE visa_type AS ENUM (
  'kultur',
  'ticari',
  'turistik',
  'ziyaret',
  'diger'
);

CREATE TYPE currency_type AS ENUM (
  'TL',
  'USD',
  'EUR'
);

CREATE TYPE payment_status AS ENUM (
  'odenmedi',
  'odendi'
);

CREATE TYPE payment_method AS ENUM (
  'nakit',
  'kredi_karti',
  'havale_eft',
  'sanal_pos'
);

CREATE TYPE invoice_status AS ENUM (
  'fatura_yok',
  'fatura_var',
  'fatura_kesildi'
);

CREATE TYPE document_type AS ENUM (
  'genel',
  'vize',
  'pasaport',
  'diger'
);

CREATE TYPE document_status AS ENUM (
  'aktif',
  'pasif',
  'taslak'
);

CREATE TYPE priority_type AS ENUM (
  'normal',
  'dusuk',
  'yuksek',
  'acil'
);

CREATE TYPE access_level AS ENUM (
  'firma_uyeleri',
  'herkes',
  'sadece_admin'
);

CREATE TYPE user_role AS ENUM (
  'firma_admin',
  'firma_calisan'
);

-- =========================
-- 2. TABLES
-- =========================

-- ---------------------------------------------------------
-- 2.1  profiles — extends Supabase auth.users
-- ---------------------------------------------------------
CREATE TABLE profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  username    TEXT,
  full_name   TEXT,
  phone       TEXT,
  email       TEXT,
  role        user_role DEFAULT 'firma_calisan',
  avatar_url  TEXT,
  telegram_chat_id TEXT,
  permissions JSONB DEFAULT '{}',
  is_active   BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- ---------------------------------------------------------
-- 2.2  companies
-- ---------------------------------------------------------
CREATE TABLE companies (
  id            SERIAL PRIMARY KEY,
  customer_type TEXT,
  company_name  TEXT,
  company_code  TEXT UNIQUE,
  phone         TEXT,
  email         TEXT,
  tax_number    TEXT,
  tax_office    TEXT,
  password      TEXT,
  province      TEXT,
  district      TEXT,
  address       TEXT,
  is_active     BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

-- ---------------------------------------------------------
-- 2.3  referrals
-- ---------------------------------------------------------
CREATE TABLE referrals (
  id              SERIAL PRIMARY KEY,
  name            TEXT,
  phone           TEXT,
  email           TEXT,
  commission_rate DECIMAL(5, 2),
  description     TEXT,
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- ---------------------------------------------------------
-- 2.4  applications
-- ---------------------------------------------------------
CREATE TABLE applications (
  id                SERIAL PRIMARY KEY,
  full_name         TEXT,
  id_number         TEXT,
  date_of_birth     DATE,
  phone             TEXT,
  email             TEXT,
  company_id        INTEGER REFERENCES companies (id) ON DELETE SET NULL,
  passport_no       TEXT,
  passport_expiry   DATE,
  visa_start        DATE,
  visa_end          DATE,
  visa_status       visa_status DEFAULT 'beklemede',
  visa_type         visa_type,
  country           TEXT,
  appointment_date  DATE,
  appointment_time  TIME,
  pickup_date       DATE,
  travel_date       DATE,
  consulate_fee     DECIMAL(12, 2),
  service_fee       DECIMAL(12, 2),
  currency          currency_type DEFAULT 'TL',
  invoice_status    invoice_status DEFAULT 'fatura_yok',
  invoice_date      DATE,
  invoice_number    TEXT,
  payment_status    payment_status DEFAULT 'odenmedi',
  payment_date      DATE,
  payment_method    payment_method,
  payment_note      TEXT,
  consulate_app_no  TEXT,
  consulate_office  TEXT,
  passport_photo    TEXT,      -- Supabase Storage path
  visa_photo        TEXT,      -- Supabase Storage path
  referral_id       INTEGER REFERENCES referrals (id) ON DELETE SET NULL,
  visa_rejected     BOOLEAN DEFAULT false,
  notes             TEXT,
  assigned_user_id  UUID REFERENCES profiles (id) ON DELETE SET NULL,
  assignment_note   TEXT,
  is_deleted        BOOLEAN DEFAULT false,
  created_by        UUID REFERENCES profiles (id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
);

-- ---------------------------------------------------------
-- 2.5  appointments
-- ---------------------------------------------------------
CREATE TABLE appointments (
  id                SERIAL PRIMARY KEY,
  full_name         TEXT,
  passport_no       TEXT,
  id_number         TEXT,
  date_of_birth     DATE,
  email             TEXT,
  passport_expiry   DATE,
  company_name      TEXT,
  country           TEXT,
  visa_type         visa_type,
  travel_date       DATE,
  appointment_date  DATE,
  payment_status    TEXT,
  notes             TEXT,
  passport_photo    TEXT,
  application_id    INTEGER REFERENCES applications (id) ON DELETE SET NULL,
  created_by        UUID REFERENCES profiles (id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
);

-- ---------------------------------------------------------
-- 2.6  documents
-- ---------------------------------------------------------
CREATE TABLE documents (
  id            SERIAL PRIMARY KEY,
  name          TEXT,
  description   TEXT,
  html_content  TEXT,
  document_type document_type DEFAULT 'genel',
  category      TEXT,
  status        document_status DEFAULT 'aktif',
  priority      priority_type DEFAULT 'normal',
  access_level  access_level DEFAULT 'firma_uyeleri',
  tags          TEXT[],
  view_count    INTEGER DEFAULT 0,
  created_by    UUID REFERENCES profiles (id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

-- ---------------------------------------------------------
-- 2.7  tags
-- ---------------------------------------------------------
CREATE TABLE tags (
  id         SERIAL PRIMARY KEY,
  name       TEXT,
  color      TEXT DEFAULT '#6c757d',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ---------------------------------------------------------
-- 2.8  application_tags  (many-to-many)
-- ---------------------------------------------------------
CREATE TABLE application_tags (
  application_id INTEGER REFERENCES applications (id) ON DELETE CASCADE,
  tag_id         INTEGER REFERENCES tags (id) ON DELETE CASCADE,
  PRIMARY KEY (application_id, tag_id)
);

-- ---------------------------------------------------------
-- 2.9  forms
-- ---------------------------------------------------------
CREATE TABLE forms (
  id           SERIAL PRIMARY KEY,
  name         TEXT,
  fields       JSONB DEFAULT '[]',
  status       TEXT DEFAULT 'aktif',
  access_level access_level DEFAULT 'firma_uyeleri',
  share_token  TEXT UNIQUE DEFAULT gen_random_uuid()::TEXT,
  created_by   UUID REFERENCES profiles (id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ DEFAULT now(),
  updated_at   TIMESTAMPTZ DEFAULT now()
);

-- ---------------------------------------------------------
-- 2.10  form_submissions
-- ---------------------------------------------------------
CREATE TABLE form_submissions (
  id         SERIAL PRIMARY KEY,
  form_id    INTEGER REFERENCES forms (id) ON DELETE CASCADE,
  data       JSONB,
  status     TEXT DEFAULT 'bekleyen',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ---------------------------------------------------------
-- 2.11  password_categories
-- ---------------------------------------------------------
CREATE TABLE password_categories (
  id         SERIAL PRIMARY KEY,
  name       TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ---------------------------------------------------------
-- 2.12  passwords
-- ---------------------------------------------------------
CREATE TABLE passwords (
  id             SERIAL PRIMARY KEY,
  category_id    INTEGER REFERENCES password_categories (id) ON DELETE SET NULL,
  title          TEXT,
  application_id INTEGER REFERENCES applications (id) ON DELETE SET NULL,
  username       TEXT,
  password       TEXT,
  url            TEXT,
  notes          TEXT,
  created_by     UUID REFERENCES profiles (id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ DEFAULT now(),
  updated_at     TIMESTAMPTZ DEFAULT now()
);

-- ---------------------------------------------------------
-- 2.13  chat_messages
-- ---------------------------------------------------------
CREATE TABLE chat_messages (
  id          SERIAL PRIMARY KEY,
  sender_id   UUID REFERENCES profiles (id) ON DELETE SET NULL,
  receiver_id UUID REFERENCES profiles (id) ON DELETE SET NULL,
  message     TEXT,
  is_read     BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- ---------------------------------------------------------
-- 2.14  notifications
-- ---------------------------------------------------------
CREATE TABLE notifications (
  id         SERIAL PRIMARY KEY,
  user_id    UUID REFERENCES profiles (id) ON DELETE CASCADE,
  title      TEXT,
  message    TEXT,
  type       TEXT DEFAULT 'info',
  is_read    BOOLEAN DEFAULT false,
  link       TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ---------------------------------------------------------
-- 2.15  activity_logs
-- ---------------------------------------------------------
CREATE TABLE activity_logs (
  id          SERIAL PRIMARY KEY,
  user_id     UUID REFERENCES profiles (id) ON DELETE SET NULL,
  action      TEXT,
  entity_type TEXT,
  entity_id   TEXT,
  details     JSONB,
  ip_address  TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- ---------------------------------------------------------
-- 2.16  tickets
-- ---------------------------------------------------------
CREATE TABLE tickets (
  id         SERIAL PRIMARY KEY,
  subject    TEXT,
  message    TEXT,
  status     TEXT DEFAULT 'acik',
  priority   priority_type DEFAULT 'normal',
  created_by UUID REFERENCES profiles (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ---------------------------------------------------------
-- 2.17  ticket_replies
-- ---------------------------------------------------------
CREATE TABLE ticket_replies (
  id         SERIAL PRIMARY KEY,
  ticket_id  INTEGER REFERENCES tickets (id) ON DELETE CASCADE,
  message    TEXT,
  sender_id  UUID REFERENCES profiles (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ---------------------------------------------------------
-- 2.18  ai_prompts
-- ---------------------------------------------------------
CREATE TABLE ai_prompts (
  id          SERIAL PRIMARY KEY,
  name        TEXT,
  prompt_text TEXT,
  variables   JSONB DEFAULT '[]',
  is_active   BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- ---------------------------------------------------------
-- 2.19  ai_settings
-- ---------------------------------------------------------
CREATE TABLE ai_settings (
  id             SERIAL PRIMARY KEY,
  api_key        TEXT,
  model          TEXT DEFAULT 'gpt-3.5-turbo',
  max_tokens     INTEGER DEFAULT 1024,
  temperature    DECIMAL(3, 2) DEFAULT 0.70,
  usage_limit    INTEGER DEFAULT 100,
  auto_generate  BOOLEAN DEFAULT false,
  updated_at     TIMESTAMPTZ DEFAULT now()
);

-- ---------------------------------------------------------
-- 2.20  email_templates
-- ---------------------------------------------------------
CREATE TABLE email_templates (
  id           SERIAL PRIMARY KEY,
  name         TEXT,
  subject      TEXT,
  html_content TEXT,
  is_active    BOOLEAN DEFAULT true,
  created_at   TIMESTAMPTZ DEFAULT now(),
  updated_at   TIMESTAMPTZ DEFAULT now()
);

-- ---------------------------------------------------------
-- 2.21  settings  (key-value store)
-- ---------------------------------------------------------
CREATE TABLE settings (
  key        TEXT PRIMARY KEY,
  value      JSONB,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ---------------------------------------------------------
-- 2.22  cdn_files
-- ---------------------------------------------------------
CREATE TABLE cdn_files (
  id          SERIAL PRIMARY KEY,
  file_name   TEXT,
  file_path   TEXT,
  file_size   BIGINT,
  mime_type   TEXT,
  uploaded_by UUID REFERENCES profiles (id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- ---------------------------------------------------------
-- 2.23  countries
-- ---------------------------------------------------------
CREATE TABLE countries (
  id         SERIAL PRIMARY KEY,
  name       TEXT UNIQUE,
  sort_order INTEGER DEFAULT 0
);


-- =========================
-- 3. INDEXES
-- =========================

-- applications
CREATE INDEX idx_applications_company_id       ON applications (company_id);
CREATE INDEX idx_applications_visa_status      ON applications (visa_status);
CREATE INDEX idx_applications_country          ON applications (country);
CREATE INDEX idx_applications_appointment_date ON applications (appointment_date);
CREATE INDEX idx_applications_created_at       ON applications (created_at);
CREATE INDEX idx_applications_is_deleted       ON applications (is_deleted);

-- appointments
CREATE INDEX idx_appointments_appointment_date ON appointments (appointment_date);

-- chat_messages
CREATE INDEX idx_chat_messages_receiver_id     ON chat_messages (receiver_id);

-- notifications
CREATE INDEX idx_notifications_user_id         ON notifications (user_id);

-- activity_logs
CREATE INDEX idx_activity_logs_user_id         ON activity_logs (user_id);
CREATE INDEX idx_activity_logs_created_at      ON activity_logs (created_at);


-- =========================
-- 4. ROW LEVEL SECURITY
-- =========================

-- Helper: enable RLS and add authenticated-only policy for a table
-- (Single-tenant model — every authenticated user can access all rows.)

-- profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated access" ON profiles
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- companies
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated access" ON companies
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- referrals
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated access" ON referrals
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- applications
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated access" ON applications
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- appointments
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated access" ON appointments
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- documents
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated access" ON documents
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- tags
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated access" ON tags
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- application_tags
ALTER TABLE application_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated access" ON application_tags
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- forms
ALTER TABLE forms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated access" ON forms
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- form_submissions  (public read + authenticated write)
ALTER TABLE form_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read access" ON form_submissions
  FOR SELECT USING (true);
CREATE POLICY "Authenticated write access" ON form_submissions
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Authenticated modify access" ON form_submissions
  FOR UPDATE USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated delete access" ON form_submissions
  FOR DELETE USING (auth.role() = 'authenticated');

-- password_categories
ALTER TABLE password_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated access" ON password_categories
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- passwords
ALTER TABLE passwords ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated access" ON passwords
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- chat_messages
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated access" ON chat_messages
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated access" ON notifications
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- activity_logs
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated access" ON activity_logs
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- tickets
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated access" ON tickets
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- ticket_replies
ALTER TABLE ticket_replies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated access" ON ticket_replies
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- ai_prompts
ALTER TABLE ai_prompts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated access" ON ai_prompts
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- ai_settings
ALTER TABLE ai_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated access" ON ai_settings
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- email_templates
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated access" ON email_templates
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- settings
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated access" ON settings
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- cdn_files
ALTER TABLE cdn_files ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated access" ON cdn_files
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- countries  (public read + authenticated write)
ALTER TABLE countries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read access" ON countries
  FOR SELECT USING (true);
CREATE POLICY "Authenticated write access" ON countries
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated modify access" ON countries
  FOR UPDATE USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated delete access" ON countries
  FOR DELETE USING (auth.role() = 'authenticated');


-- =========================
-- 5. TRIGGERS
-- =========================

-- ---------------------------------------------------------
-- 5.1  Auto-update `updated_at` trigger function
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply the trigger to every table that has an updated_at column
CREATE TRIGGER set_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON companies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON applications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON appointments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON forms
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON passwords
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON tickets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON ai_prompts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON ai_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON email_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ---------------------------------------------------------
-- 5.2  Auto-create profile on new auth.users signup
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();


-- =========================
-- 6. SEED DATA
-- =========================

-- ---------------------------------------------------------
-- 6.1  Countries
-- ---------------------------------------------------------
INSERT INTO countries (name, sort_order) VALUES
  ('ABD',               1),
  ('ALMANYA',           2),
  ('AVUSTURYA',         3),
  ('BELCIKA',           4),
  ('BULGARISTAN',       5),
  ('CEK CUMHURRIYETI',  6),
  ('CEZAYIR',           7),
  ('CIN',               8),
  ('DANIMARKA',         9),
  ('DUBAI',            10),
  ('FINLADIYA',        11),
  ('FRANSA',           12),
  ('HINDISTAN',        13),
  ('HOLLANDA',         14),
  ('INGILTERE',        15),
  ('ISPANYA',          16),
  ('ISVEC',            17),
  ('ISVICRE',          18),
  ('ITALYA',           19),
  ('KATAR',            20),
  ('KUVEYT',           21),
  ('MACARISTAN',       22),
  ('PAKISTAN',          23),
  ('PORTEKIZ',         24),
  ('ROMANYA',          25),
  ('RUSYA',            26),
  ('SLOVENYA',         27),
  ('SUUDI ARABISTAN',  28),
  ('YUNANISTAN',       29);

-- ---------------------------------------------------------
-- 6.2  Default AI settings
-- ---------------------------------------------------------
INSERT INTO ai_settings (api_key, model, max_tokens, temperature, usage_limit, auto_generate)
VALUES ('', 'gpt-3.5-turbo', 1024, 0.70, 100, false);
