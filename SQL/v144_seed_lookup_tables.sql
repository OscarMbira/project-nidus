/**
 * Seed Data for Lookup Tables
 *
 * Populates project_types, project_statuses, and methodologies tables
 * with standard values needed for project creation.
 *
 * Run this if your lookup tables are empty and dropdowns show no options.
 */

-- ============================================================================
-- PROJECT TYPES - Standard project categories
-- ============================================================================
INSERT INTO project_types (type_name, type_description, is_default, is_active, is_deleted, created_at)
VALUES
  ('Software Development', 'Software or application development project', true, true, false, NOW()),
  ('Infrastructure', 'IT infrastructure and systems project', false, true, false, NOW()),
  ('Business Transformation', 'Business process transformation project', false, true, false, NOW()),
  ('Research & Development', 'Research and development initiative', false, true, false, NOW()),
  ('Marketing Campaign', 'Marketing and promotional campaign', false, true, false, NOW()),
  ('Internal Process', 'Internal operational process improvement', false, true, false, NOW())
ON CONFLICT (type_name) DO NOTHING;

-- ============================================================================
-- PROJECT STATUSES - Standard project lifecycle statuses
-- ============================================================================
INSERT INTO project_statuses (status_name, status_description, status_color, is_initial_status, is_final_status, is_active, is_deleted, created_at)
VALUES
  ('Planning', 'Project is in planning phase', '#3B82F6', true, false, true, false, NOW()),
  ('Active', 'Project is actively in progress', '#10B981', false, false, true, false, NOW()),
  ('On Hold', 'Project is temporarily paused', '#F59E0B', false, false, true, false, NOW()),
  ('Completed', 'Project has been completed', '#6366F1', false, true, true, false, NOW()),
  ('Cancelled', 'Project has been cancelled', '#EF4444', false, true, true, false, NOW())
ON CONFLICT (status_name) DO NOTHING;

-- ============================================================================
-- METHODOLOGIES - Standard project management methodologies
-- ============================================================================
INSERT INTO methodologies (methodology_name, methodology_description, methodology_type, is_default, is_active, is_deleted, created_at)
VALUES
  ('Agile Scrum', 'Iterative and incremental agile framework using sprints', 'agile', true, true, false, NOW()),
  ('Kanban', 'Visual workflow management system focused on continuous delivery', 'agile', false, true, false, NOW()),
  ('Waterfall', 'Sequential linear project management approach', 'traditional', false, true, false, NOW()),
  ('PRINCE2', 'Structured project management method focusing on organization and control', 'traditional', false, true, false, NOW()),
  ('Lean', 'Methodology focused on minimizing waste and maximizing value', 'lean', false, true, false, NOW()),
  ('Hybrid', 'Combination of agile and traditional methodologies', 'hybrid', false, true, false, NOW())
ON CONFLICT (methodology_name) DO NOTHING;

-- ============================================================================
-- Verification - Check data was inserted
-- ============================================================================
SELECT 'project_types' as table_name, COUNT(*) as rows_inserted
FROM project_types
WHERE is_active = true AND is_deleted = false
UNION ALL
SELECT 'project_statuses', COUNT(*)
FROM project_statuses
WHERE is_active = true AND is_deleted = false
UNION ALL
SELECT 'methodologies', COUNT(*)
FROM methodologies
WHERE is_active = true AND is_deleted = false;
