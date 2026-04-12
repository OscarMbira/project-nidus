-- ============================================================================
-- v416: Financial Management — permission codes + role_permissions
-- Prerequisites: permissions, roles, role_permissions (v03/v138)
-- Date: 2026-04-10 — v349 Financial Management Plan
-- ============================================================================

INSERT INTO permissions (permission_code, permission_name, permission_description, permission_category, created_at)
VALUES
  ('finance.view', 'View financial data', 'View financial data for projects in scope', 'finance', NOW()),
  ('finance.manage', 'Manage financial records', 'Create, update, delete financial records for own projects', 'finance', NOW()),
  ('finance.view_all', 'View all financials in org scope', 'View financials across programme/portfolio scope', 'finance', NOW()),
  ('finance.manage_all', 'Manage all financials', 'Full financial management across all projects (PMO)', 'finance', NOW()),
  ('financial.submit_expense', 'Submit expense claims', 'Submit own expense claims', 'finance', NOW()),
  ('financial.approve_l1', 'Approve expenses L1', 'Level 1 expense approval (project)', 'finance', NOW()),
  ('financial.approve_l2', 'Approve expenses L2', 'Level 2 expense approval (programme/portfolio)', 'finance', NOW()),
  ('financial.approve_l3', 'Approve expenses L3', 'Level 3 expense approval (PMO/org)', 'finance', NOW()),
  ('financial.mark_paid', 'Mark expenses paid', 'Mark approved expenses as paid/processed', 'finance', NOW())
ON CONFLICT (permission_code) DO UPDATE SET
  permission_name = EXCLUDED.permission_name,
  permission_description = EXCLUDED.permission_description,
  updated_at = NOW();

-- Map roles (v349 matrix)
INSERT INTO role_permissions (role_id, permission_id, is_active, is_deleted)
SELECT r.id, p.id, TRUE, FALSE
FROM roles r
CROSS JOIN permissions p
WHERE p.permission_code = 'finance.view'
  AND r.role_name IN (
    'project_sponsor', 'executive', 'project_board_member', 'project_manager',
    'programme_manager', 'portfolio_manager', 'pmo_admin', 'system_admin', 'team_lead', 'team_member', 'stakeholder', 'viewer'
  )
ON CONFLICT (role_id, permission_id) DO UPDATE SET is_active = TRUE, is_deleted = FALSE, updated_at = NOW();

INSERT INTO role_permissions (role_id, permission_id, is_active, is_deleted)
SELECT r.id, p.id, TRUE, FALSE
FROM roles r
CROSS JOIN permissions p
WHERE p.permission_code = 'finance.manage'
  AND r.role_name IN ('project_manager', 'programme_manager', 'portfolio_manager', 'pmo_admin', 'system_admin')
ON CONFLICT (role_id, permission_id) DO UPDATE SET is_active = TRUE, is_deleted = FALSE, updated_at = NOW();

INSERT INTO role_permissions (role_id, permission_id, is_active, is_deleted)
SELECT r.id, p.id, TRUE, FALSE
FROM roles r
CROSS JOIN permissions p
WHERE p.permission_code = 'finance.view_all'
  AND r.role_name IN ('programme_manager', 'portfolio_manager', 'pmo_admin', 'system_admin')
ON CONFLICT (role_id, permission_id) DO UPDATE SET is_active = TRUE, is_deleted = FALSE, updated_at = NOW();

INSERT INTO role_permissions (role_id, permission_id, is_active, is_deleted)
SELECT r.id, p.id, TRUE, FALSE
FROM roles r
CROSS JOIN permissions p
WHERE p.permission_code = 'finance.manage_all'
  AND r.role_name IN ('pmo_admin', 'system_admin')
ON CONFLICT (role_id, permission_id) DO UPDATE SET is_active = TRUE, is_deleted = FALSE, updated_at = NOW();

-- Expense permissions: submit for ALL roles
INSERT INTO role_permissions (role_id, permission_id, is_active, is_deleted)
SELECT r.id, p.id, TRUE, FALSE
FROM roles r
CROSS JOIN permissions p
WHERE p.permission_code = 'financial.submit_expense'
  AND r.is_active = TRUE AND COALESCE(r.is_deleted, FALSE) = FALSE
ON CONFLICT (role_id, permission_id) DO UPDATE SET is_active = TRUE, is_deleted = FALSE, updated_at = NOW();

INSERT INTO role_permissions (role_id, permission_id, is_active, is_deleted)
SELECT r.id, p.id, TRUE, FALSE
FROM roles r
CROSS JOIN permissions p
WHERE p.permission_code = 'financial.approve_l1'
  AND r.role_name IN ('project_manager', 'pmo_admin', 'system_admin')
ON CONFLICT (role_id, permission_id) DO UPDATE SET is_active = TRUE, is_deleted = FALSE, updated_at = NOW();

INSERT INTO role_permissions (role_id, permission_id, is_active, is_deleted)
SELECT r.id, p.id, TRUE, FALSE
FROM roles r
CROSS JOIN permissions p
WHERE p.permission_code = 'financial.approve_l2'
  AND r.role_name IN ('programme_manager', 'portfolio_manager', 'pmo_admin', 'system_admin')
ON CONFLICT (role_id, permission_id) DO UPDATE SET is_active = TRUE, is_deleted = FALSE, updated_at = NOW();

INSERT INTO role_permissions (role_id, permission_id, is_active, is_deleted)
SELECT r.id, p.id, TRUE, FALSE
FROM roles r
CROSS JOIN permissions p
WHERE p.permission_code = 'financial.approve_l3'
  AND r.role_name IN ('pmo_admin', 'system_admin', 'project_sponsor', 'executive')
ON CONFLICT (role_id, permission_id) DO UPDATE SET is_active = TRUE, is_deleted = FALSE, updated_at = NOW();

INSERT INTO role_permissions (role_id, permission_id, is_active, is_deleted)
SELECT r.id, p.id, TRUE, FALSE
FROM roles r
CROSS JOIN permissions p
WHERE p.permission_code = 'financial.mark_paid'
  AND r.role_name IN ('pmo_admin', 'system_admin', 'project_sponsor', 'executive')
ON CONFLICT (role_id, permission_id) DO UPDATE SET is_active = TRUE, is_deleted = FALSE, updated_at = NOW();
