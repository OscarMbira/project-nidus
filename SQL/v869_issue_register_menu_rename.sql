-- =============================================================================
-- v869: Rename sidebar "Issue Log" labels → "Issue Register" (unification)
-- Keeps menu_code values for role_grant stability. Aligns route_path where the
-- old Issues list URL was used so both entry points hit Issue Register.
-- Form template titles (e.g. F047 "Issue Log") are intentionally untouched.
-- =============================================================================

UPDATE public.menu_items
SET
  menu_label = 'Issue Register',
  menu_description = COALESCE(
    NULLIF(TRIM(menu_description), ''),
    'Project issue register'
  ),
  updated_at = NOW()
WHERE COALESCE(is_deleted, FALSE) = FALSE
  AND (
    menu_label ILIKE 'Issue Log'
    OR menu_label ILIKE '%Issue Log%'
    OR menu_code IN (
      'plat_pm_issue_log',
      'pm_raid_issue_log',
      'tm_issue_log'
    )
  )
  AND menu_label IS DISTINCT FROM 'Issue Register';

-- Prefer canonical PM controls Issue Register path when leaf still pointed at Issues list
UPDATE public.menu_items
SET
  route_path = '/pm/controls/issue-register',
  updated_at = NOW()
WHERE menu_code IN ('plat_pm_issue_log', 'pm_raid_issue_log')
  AND COALESCE(is_deleted, FALSE) = FALSE
  AND route_path IN ('/platform/issues', '/app/issues', '/platform/issues/');

UPDATE public.menu_items
SET
  route_path = '/pmo/oversight/issue-register',
  updated_at = NOW()
WHERE menu_code = 'tm_issue_log'
  AND COALESCE(is_deleted, FALSE) = FALSE
  AND (
    route_path ILIKE '%issue%log%'
    OR route_path IN ('/platform/issues', '/app/issues')
  );

-- Simulator menu rows (same table; sim-prefixed codes)
UPDATE public.menu_items
SET
  menu_label = 'Issue Register',
  updated_at = NOW()
WHERE COALESCE(is_deleted, FALSE) = FALSE
  AND menu_code ILIKE '%issue%log%'
  AND menu_label ILIKE '%Issue Log%'
  AND menu_label IS DISTINCT FROM 'Issue Register';

UPDATE public.menu_items
SET
  menu_label = 'Practice Issue Register',
  updated_at = NOW()
WHERE COALESCE(is_deleted, FALSE) = FALSE
  AND menu_code ILIKE 'sim_%issue%'
  AND menu_label ILIKE '%Issue Log%'
  AND menu_label IS DISTINCT FROM 'Practice Issue Register';
