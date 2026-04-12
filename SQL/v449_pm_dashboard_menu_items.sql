-- ============================================================================
-- v449: Project Manager dashboard — menu_items + role_menu_items (DB-driven /pm/*)
-- Mirrors src/config/pmDashboardMenuConfig.js; Sidebar shows items when
-- route_path starts with /platform, /pmo, or /pm (see Sidebar.jsx filter).
--
-- Delay subsection: v451 also grants pm_delays / pm_delay_register / pm_delay_drafts
-- to every role that has delay.view / delay.create (same as v446 platform delays).
-- ============================================================================

DO $$
DECLARE
  v_gov UUID;
  v_init UUID;
  v_del UUID;
  v_ctrl UUID;
  v_rep UUID;
  v_fin UUID;
  v_itto UUID;
  v_delay UUID;
  v_close UUID;
BEGIN
  -- Top-level
  INSERT INTO menu_items (
    menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order,
    route_path, menu_icon, is_visible, is_active
  )
  VALUES
    ('pm_dashboard', 'Dashboard', 'Project Manager dashboard', NULL, 1, 45, '/pm/dashboard', 'layout-dashboard', TRUE, TRUE),
    ('pm_governance', 'Governance Reference', 'Mandates and management strategies', NULL, 1, 46, NULL, 'shield', TRUE, TRUE),
    ('pm_initiation', 'Initiation & Business Justification', 'Business case, brief, PID, benefits', NULL, 1, 47, NULL, 'briefcase', TRUE, TRUE),
    ('pm_delivery', 'Delivery Management', 'Work packages, products, daily log', NULL, 1, 48, NULL, 'package', TRUE, TRUE),
    ('pm_controls', 'Controls & Registers', 'Risk, issue, quality, config, lessons', NULL, 1, 49, NULL, 'list-checks', TRUE, TRUE),
    ('pm_reporting', 'Reporting', 'Checkpoint, highlight, exception, end stage', NULL, 1, 50, NULL, 'chart-bar', TRUE, TRUE),
    ('pm_financial', 'Financial Management', 'Expenses, reports, portfolio EVM', NULL, 1, 51, NULL, 'dollar-sign', TRUE, TRUE),
    ('pm_itto', 'ITTO Management', 'Templates, project ITTOs, drafts', NULL, 1, 52, NULL, 'git-branch', TRUE, TRUE),
    ('pm_delays', 'Delays', 'Project delay register and drafts', NULL, 1, 53, NULL, 'file-clock', TRUE, TRUE),
    ('pm_closure', 'Project Closure', 'Lessons and end project reports', NULL, 1, 54, NULL, 'folder-closed', TRUE, TRUE)
  ON CONFLICT (menu_code) DO UPDATE SET
    menu_label = EXCLUDED.menu_label,
    menu_description = EXCLUDED.menu_description,
    sort_order = EXCLUDED.sort_order,
    route_path = EXCLUDED.route_path,
    menu_icon = EXCLUDED.menu_icon,
    is_visible = TRUE,
    is_active = TRUE,
    is_deleted = FALSE,
    updated_at = NOW();

  SELECT id INTO v_gov FROM menu_items WHERE menu_code = 'pm_governance' AND COALESCE(is_deleted, FALSE) = FALSE LIMIT 1;
  SELECT id INTO v_init FROM menu_items WHERE menu_code = 'pm_initiation' AND COALESCE(is_deleted, FALSE) = FALSE LIMIT 1;
  SELECT id INTO v_del FROM menu_items WHERE menu_code = 'pm_delivery' AND COALESCE(is_deleted, FALSE) = FALSE LIMIT 1;
  SELECT id INTO v_ctrl FROM menu_items WHERE menu_code = 'pm_controls' AND COALESCE(is_deleted, FALSE) = FALSE LIMIT 1;
  SELECT id INTO v_rep FROM menu_items WHERE menu_code = 'pm_reporting' AND COALESCE(is_deleted, FALSE) = FALSE LIMIT 1;
  SELECT id INTO v_fin FROM menu_items WHERE menu_code = 'pm_financial' AND COALESCE(is_deleted, FALSE) = FALSE LIMIT 1;
  SELECT id INTO v_itto FROM menu_items WHERE menu_code = 'pm_itto' AND COALESCE(is_deleted, FALSE) = FALSE LIMIT 1;
  SELECT id INTO v_delay FROM menu_items WHERE menu_code = 'pm_delays' AND COALESCE(is_deleted, FALSE) = FALSE LIMIT 1;
  SELECT id INTO v_close FROM menu_items WHERE menu_code = 'pm_closure' AND COALESCE(is_deleted, FALSE) = FALSE LIMIT 1;

  INSERT INTO menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
  VALUES
    ('pm_gov_mandate', 'Project Mandate', NULL, v_gov, 2, 1, '/pm/governance/mandate', 'file-text', TRUE, TRUE),
    ('pm_gov_communication_strategy', 'Communication Management Strategy', NULL, v_gov, 2, 2, '/pm/governance/communication-strategy', 'megaphone', TRUE, TRUE),
    ('pm_gov_configuration_strategy', 'Configuration Management Strategy', NULL, v_gov, 2, 3, '/pm/governance/configuration-strategy', 'settings-2', TRUE, TRUE),
    ('pm_gov_quality_strategy', 'Quality Management Strategy', NULL, v_gov, 2, 4, '/pm/governance/quality-strategy', 'check-square', TRUE, TRUE),
    ('pm_gov_risk_strategy', 'Risk Management Strategy', NULL, v_gov, 2, 5, '/pm/governance/risk-strategy', 'alert-triangle', TRUE, TRUE),
    ('pm_init_business_case', 'Business Case', NULL, v_init, 2, 1, '/pm/initiation/business-case', 'briefcase', TRUE, TRUE),
    ('pm_init_project_brief', 'Project Brief', NULL, v_init, 2, 2, '/pm/initiation/project-brief', 'file-text', TRUE, TRUE),
    ('pm_init_pid', 'Project Initiation Document (PID)', NULL, v_init, 2, 3, '/pm/initiation/pid', 'file-text', TRUE, TRUE),
    ('pm_init_benefits_review_plan', 'Benefits Review Plan', NULL, v_init, 2, 4, '/pm/initiation/benefits-review-plan', 'book-open', TRUE, TRUE),
    ('pm_delivery_work_packages', 'Work Packages', NULL, v_del, 2, 1, '/pm/delivery/work-packages', 'layers', TRUE, TRUE),
    ('pm_delivery_product_description', 'Product Description', NULL, v_del, 2, 2, '/pm/delivery/product-description', 'file-text', TRUE, TRUE),
    ('pm_delivery_project_product_description', 'Project Product Description', NULL, v_del, 2, 3, '/pm/delivery/project-product-description', 'clipboard-list', TRUE, TRUE),
    ('pm_delivery_product_status_account', 'Product Status Account', NULL, v_del, 2, 4, '/pm/delivery/product-status-account', 'activity', TRUE, TRUE),
    ('pm_delivery_daily_log', 'Daily Log', NULL, v_del, 2, 5, '/pm/delivery/daily-log', 'calendar', TRUE, TRUE),
    ('pm_controls_risk_register', 'Risk Register', NULL, v_ctrl, 2, 1, '/pm/controls/risk-register', 'alert-triangle', TRUE, TRUE),
    ('pm_controls_issue_register', 'Issue Register', NULL, v_ctrl, 2, 2, '/pm/controls/issue-register', 'alert-circle', TRUE, TRUE),
    ('pm_controls_quality_register', 'Quality Register', NULL, v_ctrl, 2, 3, '/pm/controls/quality-register', 'check-square', TRUE, TRUE),
    ('pm_controls_configuration_items', 'Configuration Item Records', NULL, v_ctrl, 2, 4, '/pm/controls/configuration-items', 'wrench', TRUE, TRUE),
    ('pm_controls_lessons_log', 'Lessons Log', NULL, v_ctrl, 2, 5, '/pm/controls/lessons-log', 'graduation-cap', TRUE, TRUE),
    ('pm_report_checkpoint', 'Checkpoint Reports', NULL, v_rep, 2, 1, '/pm/reporting/checkpoint-reports', 'flag', TRUE, TRUE),
    ('pm_report_highlight', 'Highlight Reports', NULL, v_rep, 2, 2, '/pm/reporting/highlight-reports', 'flag', TRUE, TRUE),
    ('pm_report_issue_reports', 'Issue Reports', NULL, v_rep, 2, 3, '/pm/reporting/issue-reports', 'alert-circle', TRUE, TRUE),
    ('pm_report_exception', 'Exception Reports', NULL, v_rep, 2, 4, '/pm/reporting/exception-reports', 'file-warning', TRUE, TRUE),
    ('pm_report_end_stage', 'End Stage Report', NULL, v_rep, 2, 5, '/pm/reporting/end-stage-reports', 'file-clock', TRUE, TRUE),
    ('pm_fin_my_expenses', 'My Expenses', NULL, v_fin, 2, 1, '/platform/expenses/my', 'receipt', TRUE, TRUE),
    ('pm_fin_exp_approvals', 'Expense Approvals', NULL, v_fin, 2, 2, '/platform/expenses/approvals', 'clipboard-check', TRUE, TRUE),
    ('pm_fin_reports', 'Financial Reports', NULL, v_fin, 2, 3, '/platform/financial-reports', 'chart-bar', TRUE, TRUE),
    ('pm_fin_portfolio_evm', 'Portfolio EVM', NULL, v_fin, 2, 4, '/platform/portfolio/evm', 'trending-up', TRUE, TRUE),
    ('pm_itto_templates', 'ITTO Templates', NULL, v_itto, 2, 1, '/pm/itto/templates', 'layers', TRUE, TRUE),
    ('pm_itto_project', 'Project ITTOs', NULL, v_itto, 2, 2, '/pm/itto/project', 'layers', TRUE, TRUE),
    ('pm_itto_drafts', 'ITTO Drafts', NULL, v_itto, 2, 3, '/pm/itto/drafts', 'pause', TRUE, TRUE),
    ('pm_delay_register', 'Delay Register', NULL, v_delay, 2, 1, '/pm/delays', 'clipboard-list', TRUE, TRUE),
    ('pm_delay_drafts', 'Delay Drafts', NULL, v_delay, 2, 2, '/pm/delays/drafts', 'pause', TRUE, TRUE),
    ('pm_closure_lessons_report', 'Lessons Report', NULL, v_close, 2, 1, '/pm/closure/lessons-report', 'graduation-cap', TRUE, TRUE),
    ('pm_closure_end_project_report', 'End Project Report', NULL, v_close, 2, 2, '/pm/closure/end-project-report', 'file-check', TRUE, TRUE)
  ON CONFLICT (menu_code) DO UPDATE SET
    menu_label = EXCLUDED.menu_label,
    parent_menu_id = EXCLUDED.parent_menu_id,
    route_path = EXCLUDED.route_path,
    menu_icon = EXCLUDED.menu_icon,
    is_visible = TRUE,
    is_active = TRUE,
    is_deleted = FALSE,
    updated_at = NOW();
END $$;

-- Role access: PM-facing roles (align with v422 / v437 patterns)
INSERT INTO role_menu_items (role_id, menu_item_id, can_view, can_use, is_active, is_deleted)
SELECT r.id, m.id, TRUE, TRUE, TRUE, FALSE
FROM roles r
CROSS JOIN menu_items m
WHERE COALESCE(r.is_deleted, FALSE) = FALSE
  AND COALESCE(m.is_deleted, FALSE) = FALSE
  AND m.menu_code IN (
    'pm_dashboard',
    'pm_governance', 'pm_gov_mandate', 'pm_gov_communication_strategy', 'pm_gov_configuration_strategy', 'pm_gov_quality_strategy', 'pm_gov_risk_strategy',
    'pm_initiation', 'pm_init_business_case', 'pm_init_project_brief', 'pm_init_pid', 'pm_init_benefits_review_plan',
    'pm_delivery', 'pm_delivery_work_packages', 'pm_delivery_product_description', 'pm_delivery_project_product_description', 'pm_delivery_product_status_account', 'pm_delivery_daily_log',
    'pm_controls', 'pm_controls_risk_register', 'pm_controls_issue_register', 'pm_controls_quality_register', 'pm_controls_configuration_items', 'pm_controls_lessons_log',
    'pm_reporting', 'pm_report_checkpoint', 'pm_report_highlight', 'pm_report_issue_reports', 'pm_report_exception', 'pm_report_end_stage',
    'pm_financial', 'pm_fin_my_expenses', 'pm_fin_exp_approvals', 'pm_fin_reports', 'pm_fin_portfolio_evm',
    'pm_itto', 'pm_itto_templates', 'pm_itto_project', 'pm_itto_drafts',
    'pm_delays', 'pm_delay_register', 'pm_delay_drafts',
    'pm_closure', 'pm_closure_lessons_report', 'pm_closure_end_project_report'
  )
  AND r.role_name IN (
    'project_manager', 'programme_manager', 'portfolio_manager',
    'pmo_admin', 'system_admin',
    'team_lead', 'team_manager', 'pm_team_manager'
  )
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET
  can_view = TRUE, can_use = TRUE, is_active = TRUE, is_deleted = FALSE, updated_at = NOW();
