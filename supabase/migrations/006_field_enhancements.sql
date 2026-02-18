-- ============================================================
-- Migration 006: Field Definition Enhancements
-- Remove is_standard, add min/max length validation
-- ============================================================

-- Remove is_standard concept: all fields are user-managed
ALTER TABLE portal_field_definitions DROP COLUMN IF EXISTS is_standard;

-- Add validation rules
ALTER TABLE portal_field_definitions ADD COLUMN min_length INTEGER DEFAULT NULL;
ALTER TABLE portal_field_definitions ADD COLUMN max_length INTEGER DEFAULT NULL;
