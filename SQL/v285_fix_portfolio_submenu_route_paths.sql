-- =====================================================
-- v285: Fix Portfolio & Programme Sub-menu Route Paths
-- =====================================================
-- Problem: All portfolio AND programme sub-menu items were seeded with
--          route_path = '/portfolio' or '/programme' (same as their parent).
--          After v140 migrated them to '/platform/...' every child matched
--          the current URL simultaneously, making all sub-items appear active.
-- Fix:     Update each sub-menu item to its correct distinct route path.
-- =====================================================

-- ─────────────────────────────────────────
-- SECTION 1: Portfolio sub-menu route paths
-- ─────────────────────────────────────────
UPDATE menu_items
SET route_path = CASE menu_code
    WHEN 'portfolio_all'        THEN '/platform/portfolio'
    WHEN 'portfolio_dashboard'  THEN '/platform/portfolio/dashboard'
    WHEN 'portfolio_projects'   THEN '/platform/portfolio/projects'
    WHEN 'portfolio_resources'  THEN '/platform/portfolio/resources'
    WHEN 'portfolio_financial'  THEN '/platform/portfolio/financial'
    WHEN 'portfolio_reports'    THEN '/platform/portfolio/reports'
    WHEN 'portfolio_governance' THEN '/platform/portfolio/governance'
    ELSE route_path
  END,
  updated_at = NOW()
WHERE menu_code IN (
  'portfolio_all',
  'portfolio_dashboard',
  'portfolio_projects',
  'portfolio_resources',
  'portfolio_financial',
  'portfolio_reports',
  'portfolio_governance'
);

-- ─────────────────────────────────────────
-- SECTION 2: Programme sub-menu route paths
-- ─────────────────────────────────────────
UPDATE menu_items
SET route_path = CASE menu_code
    WHEN 'programme_all'          THEN '/platform/programme'
    WHEN 'programme_dashboard'    THEN '/platform/programme/dashboard'
    WHEN 'programme_projects'     THEN '/platform/programme/projects'
    WHEN 'programme_dependencies' THEN '/platform/programme/dependencies'
    WHEN 'programme_benefits'     THEN '/platform/programme/benefits'
    WHEN 'programme_timeline'     THEN '/platform/programme/timeline'
    WHEN 'programme_reports'      THEN '/platform/programme/reports'
    ELSE route_path
  END,
  updated_at = NOW()
WHERE menu_code IN (
  'programme_all',
  'programme_dashboard',
  'programme_projects',
  'programme_dependencies',
  'programme_benefits',
  'programme_timeline',
  'programme_reports'
);

-- ─────────────────────────────────────────
-- Verification
-- ─────────────────────────────────────────
DO $$
DECLARE
  r RECORD;
BEGIN
  RAISE NOTICE '✅ v285: Portfolio & Programme sub-menu route paths fixed';
  RAISE NOTICE '--- Portfolio ---';
  FOR r IN
    SELECT menu_code, route_path
    FROM menu_items
    WHERE menu_code IN (
      'portfolio_all', 'portfolio_dashboard', 'portfolio_projects',
      'portfolio_resources', 'portfolio_financial',
      'portfolio_reports', 'portfolio_governance'
    )
    ORDER BY sort_order
  LOOP
    RAISE NOTICE '   % → %', r.menu_code, r.route_path;
  END LOOP;

  RAISE NOTICE '--- Programme ---';
  FOR r IN
    SELECT menu_code, route_path
    FROM menu_items
    WHERE menu_code IN (
      'programme_all', 'programme_dashboard', 'programme_projects',
      'programme_dependencies', 'programme_benefits',
      'programme_timeline', 'programme_reports'
    )
    ORDER BY sort_order
  LOOP
    RAISE NOTICE '   % → %', r.menu_code, r.route_path;
  END LOOP;
END $$;
