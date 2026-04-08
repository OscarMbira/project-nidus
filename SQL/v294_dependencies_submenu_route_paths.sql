-- =====================================================
-- v294: Dependencies sub-menu route paths (Platform)
-- =====================================================
-- Ensures Dependencies sidebar shows: All Dependencies,
-- Inter-Project Dependencies, Dependency Map, Impact Analysis
-- with correct /platform/dependencies/* paths.
-- =====================================================

UPDATE menu_items
SET route_path = CASE menu_code
    WHEN 'dependencies'                  THEN '/platform/dependencies'
    WHEN 'dependencies_all'              THEN '/platform/dependencies'
    WHEN 'dependencies_inter_project'    THEN '/platform/dependencies/inter-project'
    WHEN 'dependencies_map'              THEN '/platform/dependencies/map'
    WHEN 'dependencies_impacts'          THEN '/platform/dependencies/impact'
    ELSE route_path
  END,
  updated_at = NOW()
WHERE menu_code IN (
  'dependencies',
  'dependencies_all',
  'dependencies_inter_project',
  'dependencies_map',
  'dependencies_impacts'
);
