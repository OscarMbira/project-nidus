-- ============================================================================
-- v412: Manager assignment — allow authenticated read of concurrent limit setting
-- Date: 2026-04-09
-- Problem: PMO Manager Assignments reads system_settings for setting_key
--          pm_max_concurrent_assignments with is_active = true. RLS
--          policy_system_settings_public_read only allows SELECT when is_public = TRUE.
--          v384 seeded this row with is_public = FALSE, so users who are not the legacy
--          "System Admin" role (including PMO admins) received 403.
-- Fix: Mark this non-sensitive numeric cap as public.
-- Prerequisites: system_settings (v02), v384 seed
-- ============================================================================

UPDATE system_settings
SET
  is_public = TRUE,
  updated_at = NOW()
WHERE setting_key = 'pm_max_concurrent_assignments';
