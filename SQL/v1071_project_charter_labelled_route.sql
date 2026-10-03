-- ============================================================================
-- v1071: Project Charter menu keeps Charter URL + Charter labels
-- ============================================================================
-- Follow-up to v1070: pointing Charter at /pm/initiation/project-brief reused
-- Brief labels and confused Charter-first users. Charter now has its own list
-- URL; the React app renders the same Brief document with Charter wording.
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
  RAISE NOTICE 'v1071: plat_pm_s_charter route_path → /pm/initiation/project-charter';
END $$;
