-- Add embassy/VFS credential fields to applications
ALTER TABLE applications ADD COLUMN IF NOT EXISTS denmark_embassy_email TEXT;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS denmark_embassy_password TEXT;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS vfs_account_email TEXT;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS vfs_account_password TEXT;
