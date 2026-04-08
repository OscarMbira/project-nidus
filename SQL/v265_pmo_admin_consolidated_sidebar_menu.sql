-- ============================================================================
-- v265: PMO Admin Consolidated Sidebar Menu Items
-- Description: Adds all missing PMO menu items to the platform sidebar so
--   that PMO Admin users see a unified sidebar (instead of the old separate
--   PMO sidebar).  Covers:
--     1. Governance  – 4 management-strategy sub-items
--     2. Reports & Analytics – 4 assurance-report sub-items
--     3. Project Oversight  – new parent section + 4 children
--     4. PMO Admin  – Business Case + Benefits Review Plan sections
--     5. Procurement – parent section + RFP Register, Load RFP, RFP Drafts
-- All new items are assigned to the pmo_admin role in role_menu_items.
-- ============================================================================

-- ============================================================
-- PART 1: GOVERNANCE – strategy sub-items
-- ============================================================
DO $$
DECLARE
  v_gov_id UUID;
BEGIN
  SELECT id INTO v_gov_id FROM menu_items WHERE menu_code = 'governance' LIMIT 1;

  IF v_gov_id IS NULL THEN
    RAISE NOTICE 'governance parent menu not found – skipping governance sub-items';
    RETURN;
  END IF;

  INSERT INTO menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
  VALUES
    ('gov_communication_strategy',   'Communication Strategy',      'PMO-wide communication management strategy',    v_gov_id, 2, 51, '/pmo/governance/communication-strategy',    'megaphone',    true, true),
    ('gov_configuration_strategy',   'Configuration Strategy',      'PMO-wide configuration management strategy',    v_gov_id, 2, 52, '/pmo/governance/configuration-strategy',    'settings-2',   true, true),
    ('gov_quality_strategy',         'Quality Management Strategy', 'PMO-wide quality management strategy',          v_gov_id, 2, 53, '/pmo/governance/quality-strategy',          'check-square', true, true),
    ('gov_risk_strategy',            'Risk Management Strategy',    'PMO-wide risk management strategy',             v_gov_id, 2, 54, '/pmo/governance/risk-strategy',             'alert-triangle', true, true)
  ON CONFLICT (menu_code) DO UPDATE SET
    menu_label      = EXCLUDED.menu_label,
    menu_description= EXCLUDED.menu_description,
    route_path      = EXCLUDED.route_path,
    menu_icon       = EXCLUDED.menu_icon,
    parent_menu_id  = EXCLUDED.parent_menu_id,
    menu_level      = EXCLUDED.menu_level,
    sort_order      = EXCLUDED.sort_order,
    updated_at      = NOW();

  RAISE NOTICE 'Governance strategy sub-items created';
END $$;

-- ============================================================
-- PART 2: REPORTS & ANALYTICS – assurance-report sub-items
-- ============================================================
DO $$
DECLARE
  v_reports_id UUID;
BEGIN
  -- The reports parent may be stored as 'reports' or 'reports-analytics'
  SELECT id INTO v_reports_id FROM menu_items WHERE menu_code IN ('reports', 'reports-analytics') ORDER BY sort_order LIMIT 1;

  IF v_reports_id IS NULL THEN
    RAISE NOTICE 'reports parent menu not found – skipping report sub-items';
    RETURN;
  END IF;

  INSERT INTO menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
  VALUES
    ('report_highlight_pmo',   'Highlight Reports',   'Cross-project highlight reports (PMO view)',   v_reports_id, 2, 51, '/pmo/reporting/highlight-reports',   'flag',         true, true),
    ('report_exception_pmo',   'Exception Reports',   'Cross-project exception reports (PMO view)',   v_reports_id, 2, 52, '/pmo/reporting/exception-reports',   'file-warning', true, true),
    ('report_end_stage_pmo',   'End Stage Reports',   'Cross-project end-stage reports (PMO view)',   v_reports_id, 2, 53, '/pmo/reporting/end-stage-reports',   'file-clock',   true, true),
    ('report_end_project_pmo', 'End Project Reports', 'Cross-project end-project reports (PMO view)', v_reports_id, 2, 54, '/pmo/reporting/end-project-reports', 'file-check',   true, true)
  ON CONFLICT (menu_code) DO UPDATE SET
    menu_label      = EXCLUDED.menu_label,
    menu_description= EXCLUDED.menu_description,
    route_path      = EXCLUDED.route_path,
    menu_icon       = EXCLUDED.menu_icon,
    parent_menu_id  = EXCLUDED.parent_menu_id,
    menu_level      = EXCLUDED.menu_level,
    sort_order      = EXCLUDED.sort_order,
    updated_at      = NOW();

  RAISE NOTICE 'Reporting sub-items created';
END $$;

-- ============================================================
-- PART 3: PROJECT OVERSIGHT – new parent + 4 children
-- ============================================================

-- Parent item
INSERT INTO menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
VALUES ('pmo_oversight', 'Project Oversight', 'Cross-project read-only oversight (PMO Admin)', NULL, 1, 14, NULL, 'eye', true, true)
ON CONFLICT (menu_code) DO UPDATE SET
  menu_label      = EXCLUDED.menu_label,
  menu_description= EXCLUDED.menu_description,
  sort_order      = EXCLUDED.sort_order,
  menu_icon       = EXCLUDED.menu_icon,
  updated_at      = NOW();

-- Children
DO $$
DECLARE
  v_oversight_id UUID;
BEGIN
  SELECT id INTO v_oversight_id FROM menu_items WHERE menu_code = 'pmo_oversight' LIMIT 1;

  INSERT INTO menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
  VALUES
    ('pmo_oversight_risk',    'Risk Register',    'Cross-project risk register (PMO view)',    v_oversight_id, 2, 1, '/pmo/oversight/risk-register',    'alert-triangle', true, true),
    ('pmo_oversight_issue',   'Issue Register',   'Cross-project issue register (PMO view)',   v_oversight_id, 2, 2, '/pmo/oversight/issue-register',   'alert-circle',   true, true),
    ('pmo_oversight_quality', 'Quality Register', 'Cross-project quality register (PMO view)', v_oversight_id, 2, 3, '/pmo/oversight/quality-register', 'clipboard-list', true, true),
    ('pmo_oversight_lessons', 'Lessons Log',      'Cross-project lessons log (PMO view)',      v_oversight_id, 2, 4, '/pmo/oversight/lessons-log',      'graduation-cap', true, true)
  ON CONFLICT (menu_code) DO UPDATE SET
    menu_label      = EXCLUDED.menu_label,
    menu_description= EXCLUDED.menu_description,
    route_path      = EXCLUDED.route_path,
    menu_icon       = EXCLUDED.menu_icon,
    parent_menu_id  = EXCLUDED.parent_menu_id,
    menu_level      = EXCLUDED.menu_level,
    sort_order      = EXCLUDED.sort_order,
    updated_at      = NOW();

  RAISE NOTICE 'Project Oversight section created';
END $$;

-- ============================================================
-- PART 4: PMO ADMIN – Business Case + Benefits Review Plan
-- ============================================================
DO $$
DECLARE
  v_pmo_admin_id UUID;
  v_bc_section   UUID;
  v_brp_section  UUID;
BEGIN
  SELECT id INTO v_pmo_admin_id FROM menu_items WHERE menu_code = 'pmo_admin_section' LIMIT 1;

  IF v_pmo_admin_id IS NULL THEN
    RAISE NOTICE 'pmo_admin_section not found – skipping Business Case and BRP items';
    RETURN;
  END IF;

  -- Business Cases section
  INSERT INTO menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
  VALUES ('pmo_admin_business_case_section', 'Business Cases', 'Manage project business cases', v_pmo_admin_id, 2, 5, NULL, 'briefcase', true, true)
  ON CONFLICT (menu_code) DO UPDATE SET
    menu_label      = EXCLUDED.menu_label,
    parent_menu_id  = EXCLUDED.parent_menu_id,
    sort_order      = EXCLUDED.sort_order,
    updated_at      = NOW();

  SELECT id INTO v_bc_section FROM menu_items WHERE menu_code = 'pmo_admin_business_case_section' LIMIT 1;

  INSERT INTO menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
  VALUES ('pmo_admin_business_case_all', 'All Business Cases', 'View all project business cases', v_bc_section, 3, 1, '/pmo/initiation/business-case', 'briefcase', true, true)
  ON CONFLICT (menu_code) DO UPDATE SET
    menu_label      = EXCLUDED.menu_label,
    route_path      = EXCLUDED.route_path,
    parent_menu_id  = EXCLUDED.parent_menu_id,
    updated_at      = NOW();

  -- Benefits Review Plan section
  INSERT INTO menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
  VALUES ('pmo_admin_brp_section', 'Benefits Review Plans', 'Manage benefits review plans', v_pmo_admin_id, 2, 6, NULL, 'book-open', true, true)
  ON CONFLICT (menu_code) DO UPDATE SET
    menu_label      = EXCLUDED.menu_label,
    parent_menu_id  = EXCLUDED.parent_menu_id,
    sort_order      = EXCLUDED.sort_order,
    updated_at      = NOW();

  SELECT id INTO v_brp_section FROM menu_items WHERE menu_code = 'pmo_admin_brp_section' LIMIT 1;

  INSERT INTO menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
  VALUES ('pmo_admin_brp_all', 'All Benefits Review Plans', 'View all benefits review plans', v_brp_section, 3, 1, '/pmo/initiation/benefits-review-plan', 'book-open', true, true)
  ON CONFLICT (menu_code) DO UPDATE SET
    menu_label      = EXCLUDED.menu_label,
    route_path      = EXCLUDED.route_path,
    parent_menu_id  = EXCLUDED.parent_menu_id,
    updated_at      = NOW();

  RAISE NOTICE 'PMO Admin – Business Case and BRP sections created';
END $$;

-- ============================================================
-- PART 5: PROCUREMENT – parent + RFP items
-- ============================================================

-- Parent item (create if not already in DB)
INSERT INTO menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
VALUES ('procurement', 'Procurement', 'Procurement and RFP management', NULL, 1, 16, NULL, 'shopping-cart', true, true)
ON CONFLICT (menu_code) DO UPDATE SET
  menu_label      = EXCLUDED.menu_label,
  menu_description= EXCLUDED.menu_description,
  sort_order      = EXCLUDED.sort_order,
  menu_icon       = EXCLUDED.menu_icon,
  updated_at      = NOW();

-- Children
DO $$
DECLARE
  v_proc_id UUID;
BEGIN
  SELECT id INTO v_proc_id FROM menu_items WHERE menu_code = 'procurement' LIMIT 1;

  INSERT INTO menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
  VALUES
    ('proc_rfp_register', 'RFP Register',  'View all RFP documents',       v_proc_id, 2, 1, '/pmo/procurement/rfp', 'file-spreadsheet', true, true),
    ('proc_rfp_create',   'Load RFP',      'Create / load new RFP',        v_proc_id, 2, 2, '/pmo/rfp/create',      'file-plus',        true, true),
    ('proc_rfp_drafts',   'RFP Drafts',    'RFP drafts / on-hold queue',   v_proc_id, 2, 3, '/pmo/rfp/on-hold',     'pause',            true, true)
  ON CONFLICT (menu_code) DO UPDATE SET
    menu_label      = EXCLUDED.menu_label,
    menu_description= EXCLUDED.menu_description,
    route_path      = EXCLUDED.route_path,
    menu_icon       = EXCLUDED.menu_icon,
    parent_menu_id  = EXCLUDED.parent_menu_id,
    menu_level      = EXCLUDED.menu_level,
    sort_order      = EXCLUDED.sort_order,
    updated_at      = NOW();

  RAISE NOTICE 'Procurement section and RFP items created';
END $$;

-- ============================================================
-- PART 6: ASSIGN ALL NEW ITEMS TO pmo_admin ROLE
-- ============================================================
INSERT INTO role_menu_items (role_id, menu_item_id, can_view, can_use, is_active)
SELECT
  r.id  AS role_id,
  m.id  AS menu_item_id,
  true  AS can_view,
  true  AS can_use,
  true  AS is_active
FROM roles r
CROSS JOIN menu_items m
WHERE r.role_name = 'pmo_admin'
  AND m.menu_code IN (
    -- Governance strategies
    'gov_communication_strategy',
    'gov_configuration_strategy',
    'gov_quality_strategy',
    'gov_risk_strategy',
    -- Reporting
    'report_highlight_pmo',
    'report_exception_pmo',
    'report_end_stage_pmo',
    'report_end_project_pmo',
    -- Project Oversight
    'pmo_oversight',
    'pmo_oversight_risk',
    'pmo_oversight_issue',
    'pmo_oversight_quality',
    'pmo_oversight_lessons',
    -- PMO Admin initiation docs
    'pmo_admin_business_case_section',
    'pmo_admin_business_case_all',
    'pmo_admin_brp_section',
    'pmo_admin_brp_all',
    -- Procurement
    'procurement',
    'proc_rfp_register',
    'proc_rfp_create',
    'proc_rfp_drafts'
  )
  AND m.is_deleted = FALSE
  AND m.is_active  = TRUE
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET
  can_view   = true,
  can_use    = true,
  is_active  = true,
  updated_at = NOW();

DO $$
BEGIN
  RAISE NOTICE '=======================================================';
  RAISE NOTICE 'v265 complete: PMO consolidated sidebar menu items added';
  RAISE NOTICE '=======================================================';
END $$;
