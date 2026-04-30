-- =============================================================================
-- v510_sidebar_revamp_role_menu_items.sql
-- Purpose: Role -> menu section assignments for sidebar revamp
-- =============================================================================

-- Ensure top-level menu section codes exist in menu_items (platform context).
INSERT INTO public.menu_items (
  menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order,
  route_path, menu_icon, is_visible, is_active
)
VALUES
  ('platform_my_work',            'My Work',                'Personal work shortcuts', NULL, 1, 20, NULL, 'user-check', TRUE, TRUE),
  ('platform_controls',           'Controls & Registers',   'Project controls and registers', NULL, 1, 40, NULL, 'list-checks', TRUE, TRUE),
  ('platform_planning',           'Planning & Delivery',    'Planning and delivery artifacts', NULL, 1, 50, NULL, 'git-branch', TRUE, TRUE),
  ('platform_forms',              'Process Group Forms',    'Process group form engine access', NULL, 1, 60, '/platform/projects/:projectId/forms', 'file-text', TRUE, TRUE),
  ('platform_quality_testing',    'Quality & Testing',      'Quality and testing centre access', NULL, 1, 70, NULL, 'flask-conical', TRUE, TRUE),
  ('platform_people_stakeholders','People & Stakeholders',  'Teams and stakeholder functions', NULL, 1, 80, NULL, 'users', TRUE, TRUE),
  ('platform_reporting',          'Reporting',              'Reports and analytics', NULL, 1, 90, '/platform/reports', 'chart-bar', TRUE, TRUE),
  ('platform_governance_admin',   'Governance & Admin',     'Governance and administration', NULL, 1, 100, NULL, 'shield', TRUE, TRUE),
  ('platform_procurement',        'Procurement',            'Procurement and contracts', NULL, 1, 110, '/pmo/procurement/rfp', 'shopping-cart', TRUE, TRUE),
  ('platform_my_work_drafts',     'My Draft Forms',         'Resume held and draft form work', NULL, 1, 120, '/platform/projects/:projectId/forms/drafts', 'file-clock', TRUE, TRUE)
ON CONFLICT (menu_code) DO UPDATE SET
  menu_label = EXCLUDED.menu_label,
  menu_description = EXCLUDED.menu_description,
  sort_order = EXCLUDED.sort_order,
  route_path = EXCLUDED.route_path,
  menu_icon = EXCLUDED.menu_icon,
  is_visible = TRUE,
  is_active = TRUE,
  updated_at = NOW();

-- Deactivate obsolete duplicate section code if present.
UPDATE public.menu_items
SET is_active = FALSE, updated_at = NOW()
WHERE menu_code IN ('platform-testing-qa', 'platform_testing_qa');

-- Clean stale assignments for inactive menu sections.
DELETE FROM public.role_menu_items rmi
USING public.menu_items mi
WHERE rmi.menu_item_id = mi.id
  AND COALESCE(mi.is_active, TRUE) = FALSE;

-- Assign visibility to roles by section matrix.
-- NOTE: We keep can_view/can_use true and rely on permission filtering for child-level granularity.
INSERT INTO public.role_menu_items (role_id, menu_item_id, can_view, can_use, is_active, is_deleted)
SELECT r.id, mi.id, TRUE, TRUE, TRUE, FALSE
FROM public.roles r
JOIN public.menu_items mi ON mi.menu_code IN (
  'platform_my_work',
  'platform_controls',
  'platform_planning',
  'platform_forms',
  'platform_quality_testing',
  'platform_people_stakeholders',
  'platform_reporting',
  'platform_governance_admin',
  'platform_procurement',
  'platform_my_work_drafts'
)
WHERE COALESCE(mi.is_active, TRUE) = TRUE
  AND (
    (r.role_name IN ('system_admin', 'System Admin', 'super_admin', 'PMO Admin', 'pmo_admin', 'project_manager', 'Project Manager')
      AND mi.menu_code IN ('platform_my_work','platform_controls','platform_planning','platform_forms','platform_quality_testing','platform_people_stakeholders','platform_reporting','platform_governance_admin','platform_procurement','platform_my_work_drafts'))
    OR
    (r.role_name IN ('team_manager', 'team_lead', 'Team Manager', 'Team Lead')
      AND mi.menu_code IN ('platform_my_work','platform_controls','platform_planning','platform_forms','platform_quality_testing','platform_people_stakeholders','platform_reporting','platform_my_work_drafts'))
    OR
    (r.role_name IN ('team_member', 'pm_team_member', 'Team Member')
      AND mi.menu_code IN ('platform_my_work','platform_controls','platform_forms','platform_people_stakeholders','platform_reporting'))
    OR
    (r.role_name IN ('qa', 'quality_assurance', 'project_assurance', 'QA', 'Quality Assurance', 'Project Assurance')
      AND mi.menu_code IN ('platform_my_work','platform_controls','platform_forms','platform_quality_testing','platform_reporting','platform_my_work_drafts'))
    OR
    (r.role_name IN ('procurement_manager', 'Procurement Manager')
      AND mi.menu_code IN ('platform_my_work','platform_controls','platform_forms','platform_people_stakeholders','platform_reporting','platform_procurement','platform_my_work_drafts'))
    OR
    (r.role_name IN ('finance', 'cost_controller', 'Finance', 'Cost Controller')
      AND mi.menu_code IN ('platform_my_work','platform_controls','platform_forms','platform_reporting','platform_my_work_drafts'))
    OR
    (r.role_name IN ('project_executive', 'sponsor', 'Project Executive', 'Sponsor')
      AND mi.menu_code IN ('platform_my_work','platform_projects','platform_controls','platform_forms','platform_reporting'))
  )
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET
  can_view = TRUE,
  can_use = TRUE,
  is_active = TRUE,
  is_deleted = FALSE,
  updated_at = NOW();
