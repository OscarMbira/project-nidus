-- ============================================================================
-- v1070: Project Charter menu → Charter-labelled Brief flow
-- ============================================================================
-- Charter and Brief share one document. Menu opens /pm/initiation/project-charter
-- so the UI uses Charter labels (see also v1071). Legacy /platform/project-charter*
-- URLs redirect in the React app.
-- ============================================================================

UPDATE public.menu_items
SET
  route_path = '/pm/initiation/project-charter',
  menu_description = 'Same document as Project Brief — shown with Charter labels when opened from this menu.',
  updated_at = NOW()
WHERE menu_code = 'plat_pm_s_charter'
  AND COALESCE(is_deleted, FALSE) = FALSE;

DO $$
BEGIN
  RAISE NOTICE 'v1070: plat_pm_s_charter route_path → /pm/initiation/project-charter';
END $$;
