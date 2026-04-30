-- =============================================================================
-- v508_sidebar_revamp_permissions.sql
-- Purpose: Seed role-view permission keys for sidebar revamp and map to roles
-- =============================================================================

-- 1) Permission seed
INSERT INTO public.permissions (
  permission_code,
  permission_name,
  permission_description,
  permission_category,
  created_at
)
VALUES
  ('sponsor.view',     'Sponsor View',     'Approval-focused read access for sponsors/project executives', 'role_access', NOW()),
  ('team_member.view', 'Team Member View', 'Task and status focused access for team members', 'role_access', NOW()),
  ('qa.view',          'QA View',          'Quality and audit focused access', 'role_access', NOW()),
  ('procurement.view', 'Procurement View', 'Procurement and contract focused access', 'role_access', NOW()),
  ('finance.view',     'Finance View',     'Financial and EVM focused access', 'role_access', NOW()),
  ('system.admin',     'System Admin',     'Full system administration access (superset of PMO admin)', 'role_access', NOW())
ON CONFLICT (permission_code) DO UPDATE SET
  permission_name = EXCLUDED.permission_name,
  permission_description = EXCLUDED.permission_description,
  permission_category = EXCLUDED.permission_category,
  updated_at = NOW();

-- 2) Direct role mappings for the new permissions
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON
  (
    p.permission_code = 'sponsor.view' AND r.role_name IN ('project_executive', 'sponsor', 'Project Executive', 'Sponsor')
  ) OR (
    p.permission_code = 'team_member.view' AND r.role_name IN ('team_member', 'pm_team_member', 'Team Member')
  ) OR (
    p.permission_code = 'qa.view' AND r.role_name IN ('qa', 'project_assurance', 'quality_assurance', 'QA', 'Project Assurance', 'Quality Assurance')
  ) OR (
    p.permission_code = 'procurement.view' AND r.role_name IN ('procurement_manager', 'Procurement Manager')
  ) OR (
    p.permission_code = 'finance.view' AND r.role_name IN ('finance', 'cost_controller', 'Finance', 'Cost Controller')
  ) OR (
    p.permission_code = 'system.admin' AND r.role_name IN ('system_admin', 'super_admin', 'System Admin', 'Super Admin')
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- 3) Ensure system.admin inherits all permissions currently assigned to pmo.admin
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT sa.id, rp.permission_id
FROM public.role_permissions rp
JOIN public.roles pmo ON pmo.id = rp.role_id
JOIN public.roles sa ON sa.role_name IN ('system_admin', 'super_admin', 'System Admin', 'Super Admin')
WHERE pmo.role_name IN ('pmo_admin', 'PMO Admin')
ON CONFLICT (role_id, permission_id) DO NOTHING;
