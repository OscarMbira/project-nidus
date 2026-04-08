-- =====================================================
-- v140: Fix Menu Route Paths
-- =====================================================
-- Description: Updates all menu items to use correct /platform/ prefixed routes
-- Created: 2025-12-17
-- Dependencies: menu_items table
-- =====================================================

-- Fix Dashboard route (was '/', should be '/platform/dashboard')
UPDATE menu_items
SET route_path = '/platform/dashboard',
    updated_at = NOW()
WHERE menu_code = 'dashboard'
  AND (route_path = '/' OR route_path IS NULL OR route_path = '');

-- Fix Projects routes
UPDATE menu_items
SET route_path = '/platform/projects',
    updated_at = NOW()
WHERE menu_code = 'projects'
  AND (route_path = '/projects' OR route_path LIKE '/projects%' AND route_path NOT LIKE '/platform/projects%');

-- Fix Tasks routes
UPDATE menu_items
SET route_path = '/platform/tasks',
    updated_at = NOW()
WHERE menu_code = 'tasks'
  AND (route_path = '/tasks' OR route_path LIKE '/tasks%' AND route_path NOT LIKE '/platform/tasks%');

-- Fix Teams routes
UPDATE menu_items
SET route_path = '/platform/teams',
    updated_at = NOW()
WHERE menu_code = 'teams'
  AND (route_path = '/teams' OR route_path LIKE '/teams%' AND route_path NOT LIKE '/platform/teams%');

-- Fix Reports & Analytics routes
UPDATE menu_items
SET route_path = '/platform/reports',
    updated_at = NOW()
WHERE menu_code IN ('reports', 'reports-analytics')
  AND (route_path = '/reports' OR route_path LIKE '/reports%' AND route_path NOT LIKE '/platform/reports%');

-- Fix Governance routes
UPDATE menu_items
SET route_path = '/platform/governance',
    updated_at = NOW()
WHERE menu_code = 'governance'
  AND (route_path = '/governance' OR route_path LIKE '/governance%' AND route_path NOT LIKE '/platform/governance%');

-- Fix Portfolio routes
UPDATE menu_items
SET route_path = '/platform/portfolio',
    updated_at = NOW()
WHERE menu_code = 'portfolio'
  AND (route_path = '/portfolio' OR route_path LIKE '/portfolio%' AND route_path NOT LIKE '/platform/portfolio%');

-- Fix Programme routes
UPDATE menu_items
SET route_path = '/platform/programme',
    updated_at = NOW()
WHERE menu_code = 'programme'
  AND (route_path = '/programme' OR route_path LIKE '/programme%' AND route_path NOT LIKE '/platform/programme%');

-- Fix Dependencies routes
UPDATE menu_items
SET route_path = '/platform/dependencies',
    updated_at = NOW()
WHERE menu_code = 'dependencies'
  AND (route_path = '/dependencies' OR route_path LIKE '/dependencies%' AND route_path NOT LIKE '/platform/dependencies%');

-- Fix Benefits routes
UPDATE menu_items
SET route_path = '/platform/benefits',
    updated_at = NOW()
WHERE menu_code = 'benefits'
  AND (route_path = '/benefits' OR route_path LIKE '/benefits%' AND route_path NOT LIKE '/platform/benefits%');

-- Fix Strategy routes
UPDATE menu_items
SET route_path = '/platform/strategy',
    updated_at = NOW()
WHERE menu_code = 'strategy'
  AND (route_path = '/strategy' OR route_path LIKE '/strategy%' AND route_path NOT LIKE '/platform/strategy%');

-- Fix Quality routes
UPDATE menu_items
SET route_path = '/platform/quality',
    updated_at = NOW()
WHERE menu_code = 'quality'
  AND (route_path = '/quality' OR route_path LIKE '/quality%' AND route_path NOT LIKE '/platform/quality%');

-- Fix Stakeholders routes
UPDATE menu_items
SET route_path = '/platform/stakeholders',
    updated_at = NOW()
WHERE menu_code = 'stakeholders'
  AND (route_path = '/stakeholders' OR route_path LIKE '/stakeholders%' AND route_path NOT LIKE '/platform/stakeholders%');

-- Fix Organization Admin routes
UPDATE menu_items
SET route_path = '/platform/organization-admin',
    updated_at = NOW()
WHERE menu_code IN ('org-admin', 'organization-admin', 'organization_admin')
  AND (route_path != '/platform/organization-admin' OR route_path IS NULL);

-- Fix child menu items - Projects submenus
UPDATE menu_items
SET route_path = CASE
    WHEN menu_code = 'projects-my' THEN '/platform/projects'
    WHEN menu_code = 'projects-all' THEN '/platform/projects/all'
    WHEN menu_code = 'projects-create' THEN '/platform/projects/create'
    WHEN menu_code = 'projects-templates' THEN '/platform/projects/templates'
    WHEN menu_code = 'projects-archives' THEN '/platform/projects/archives'
    ELSE route_path
  END,
  updated_at = NOW()
WHERE parent_menu_id IN (SELECT id FROM menu_items WHERE menu_code = 'projects')
  AND route_path NOT LIKE '/platform/projects%';

-- Fix child menu items - Tasks submenus
UPDATE menu_items
SET route_path = CASE
    WHEN menu_code = 'tasks-my' THEN '/platform/tasks'
    WHEN menu_code = 'tasks-all' THEN '/platform/tasks/all'
    WHEN menu_code = 'tasks-board' THEN '/platform/tasks/board'
    WHEN menu_code = 'tasks-calendar' THEN '/platform/tasks/calendar'
    ELSE route_path
  END,
  updated_at = NOW()
WHERE parent_menu_id IN (SELECT id FROM menu_items WHERE menu_code = 'tasks')
  AND route_path NOT LIKE '/platform/tasks%';

-- Fix child menu items - Teams submenus
UPDATE menu_items
SET route_path = CASE
    WHEN menu_code LIKE 'teams-%' THEN REPLACE(route_path, '/teams', '/platform/teams')
    ELSE route_path
  END,
  updated_at = NOW()
WHERE parent_menu_id IN (SELECT id FROM menu_items WHERE menu_code = 'teams')
  AND route_path NOT LIKE '/platform/teams%'
  AND route_path LIKE '/teams%';

-- Fix child menu items - Reports submenus
UPDATE menu_items
SET route_path = REPLACE(route_path, '/reports', '/platform/reports'),
    updated_at = NOW()
WHERE parent_menu_id IN (SELECT id FROM menu_items WHERE menu_code IN ('reports', 'reports-analytics'))
  AND route_path NOT LIKE '/platform/reports%'
  AND route_path LIKE '/reports%';

-- Generic fix for any remaining routes that start with '/' but not '/platform/'
-- This catches any other menu items that might have been missed
UPDATE menu_items
SET route_path = '/platform' || route_path,
    updated_at = NOW()
WHERE route_path LIKE '/%'
  AND route_path NOT LIKE '/platform/%'
  AND route_path != '/'
  AND route_path NOT LIKE '/simulator/%'
  AND is_deleted = FALSE
  AND is_active = TRUE;

-- Success message
DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO updated_count
  FROM menu_items
  WHERE updated_at > NOW() - INTERVAL '1 second';
  
  RAISE NOTICE '✅ v140: Menu route paths fixed successfully';
  RAISE NOTICE '   - Updated % menu items to use /platform/ prefix', updated_count;
  RAISE NOTICE '   - Dashboard now routes to /platform/dashboard';
  RAISE NOTICE '   - All menu items now use correct platform routes';
END $$;

