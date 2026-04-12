-- ============================================================================
-- v384: System setting — maximum concurrent manager assignments (PMO)
-- Prerequisites: system_settings, database_tables
-- Date: 2026-04-05
-- ============================================================================

INSERT INTO system_settings (
  setting_key,
  setting_name,
  setting_description,
  setting_value,
  setting_value_type,
  default_value,
  setting_category,
  is_public,
  is_editable,
  is_active
)
VALUES (
  'pm_max_concurrent_assignments',
  'Maximum Concurrent Manager Assignments',
  'Maximum number of active projects, programmes, or portfolios a manager can be assigned to at any one time.',
  '5',
  'number',
  '5',
  'governance',
  true,
  true,
  true
)
ON CONFLICT (setting_key) DO UPDATE SET
  setting_name = EXCLUDED.setting_name,
  setting_description = EXCLUDED.setting_description,
  setting_value = EXCLUDED.setting_value,
  setting_value_type = EXCLUDED.setting_value_type,
  default_value = EXCLUDED.default_value,
  setting_category = EXCLUDED.setting_category,
  is_public = EXCLUDED.is_public,
  is_editable = EXCLUDED.is_editable,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();
