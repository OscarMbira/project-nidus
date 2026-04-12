-- ============================================================================
-- v450: Simulator Project Manager — menu_items + role_menu_items (/simulator/pm/*)
-- Mirrors src/config/simulatorPMMenuConfig.js for DB-driven Sidebar in simulator.
--
-- Delay subsection: v451 grants sim_pm_delays* to roles with delay.view / delay.create.
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
  INSERT INTO menu_items (
    menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order,
    route_path, menu_icon, is_visible, is_active
  )
  VALUES
    ('sim_pm_dashboard', 'Dashboard', 'Practice Project Manager dashboard', NULL, 1, 25, '/simulator/pm/dashboard', 'layout-dashboard', TRUE, TRUE),
    ('sim_pm_governance', 'Governance Reference', 'Practice mandates and strategies', NULL, 1, 26, NULL, 'shield', TRUE, TRUE),
    ('sim_pm_initiation', 'Initiation & Business Justification', NULL, NULL, 1, 27, NULL, 'briefcase', TRUE, TRUE),
    ('sim_pm_delivery', 'Delivery Management', NULL, NULL, 1, 28, NULL, 'package', TRUE, TRUE),
    ('sim_pm_controls', 'Controls & Registers', NULL, NULL, 1, 29, NULL, 'list-checks', TRUE, TRUE),
    ('sim_pm_reporting', 'Reporting', NULL, NULL, 1, 30, NULL, 'chart-bar', TRUE, TRUE),
    ('sim_pm_financial', 'Financial Management', NULL, NULL, 1, 31, NULL, 'dollar-sign', TRUE, TRUE),
    ('sim_pm_itto', 'ITTO Management', NULL, NULL, 1, 32, NULL, 'git-branch', TRUE, TRUE),
    ('sim_pm_delays', 'Delays', NULL, NULL, 1, 33, NULL, 'file-clock', TRUE, TRUE),
    ('sim_pm_closure', 'Project Closure', NULL, NULL, 1, 34, NULL, 'folder-closed', TRUE, TRUE)
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

  SELECT id INTO v_gov FROM menu_items WHERE menu_code = 'sim_pm_governance' AND COALESCE(is_deleted, FALSE) = FALSE LIMIT 1;
  SELECT id INTO v_init FROM menu_items WHERE menu_code = 'sim_pm_initiation' AND COALESCE(is_deleted, FALSE) = FALSE LIMIT 1;
  SELECT id INTO v_del FROM menu_items WHERE menu_code = 'sim_pm_delivery' AND COALESCE(is_deleted, FALSE) = FALSE LIMIT 1;
  SELECT id INTO v_ctrl FROM menu_items WHERE menu_code = 'sim_pm_controls' AND COALESCE(is_deleted, FALSE) = FALSE LIMIT 1;
  SELECT id INTO v_rep FROM menu_items WHERE menu_code = 'sim_pm_reporting' AND COALESCE(is_deleted, FALSE) = FALSE LIMIT 1;
  SELECT id INTO v_fin FROM menu_items WHERE menu_code = 'sim_pm_financial' AND COALESCE(is_deleted, FALSE) = FALSE LIMIT 1;
  SELECT id INTO v_itto FROM menu_items WHERE menu_code = 'sim_pm_itto' AND COALESCE(is_deleted, FALSE) = FALSE LIMIT 1;
  SELECT id INTO v_delay FROM menu_items WHERE menu_code = 'sim_pm_delays' AND COALESCE(is_deleted, FALSE) = FALSE LIMIT 1;
  SELECT id INTO v_close FROM menu_items WHERE menu_code = 'sim_pm_closure' AND COALESCE(is_deleted, FALSE) = FALSE LIMIT 1;

  INSERT INTO menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
  VALUES
    ('sim_pm_gov_mandate', 'Practice Project Mandate', NULL, v_gov, 2, 1, '/simulator/pm/governance/mandate', 'file-text', TRUE, TRUE),
    ('sim_pm_gov_communication_strategy', 'Practice Communication Management Strategy', NULL, v_gov, 2, 2, '/simulator/pm/governance/communication-strategy', 'megaphone', TRUE, TRUE),
    ('sim_pm_gov_configuration_strategy', 'Practice Configuration Management Strategy', NULL, v_gov, 2, 3, '/simulator/pm/governance/configuration-strategy', 'settings-2', TRUE, TRUE),
    ('sim_pm_gov_quality_strategy', 'Practice Quality Management Strategy', NULL, v_gov, 2, 4, '/simulator/pm/governance/quality-strategy', 'check-square', TRUE, TRUE),
    ('sim_pm_gov_risk_strategy', 'Practice Risk Management Strategy', NULL, v_gov, 2, 5, '/simulator/pm/governance/risk-strategy', 'alert-triangle', TRUE, TRUE),
    ('sim_pm_init_business_case', 'Practice Business Case', NULL, v_init, 2, 1, '/simulator/pm/initiation/business-case', 'briefcase', TRUE, TRUE),
    ('sim_pm_init_project_brief', 'Practice Project Brief', NULL, v_init, 2, 2, '/simulator/pm/initiation/project-brief', 'file-text', TRUE, TRUE),
    ('sim_pm_init_pid', 'Practice Project Initiation Document (PID)', NULL, v_init, 2, 3, '/simulator/pm/initiation/pid', 'file-text', TRUE, TRUE),
    ('sim_pm_init_benefits_review_plan', 'Practice Benefits Review Plan', NULL, v_init, 2, 4, '/simulator/pm/initiation/benefits-review-plan', 'book-open', TRUE, TRUE),
    ('sim_pm_delivery_work_packages', 'Practice Work Packages', NULL, v_del, 2, 1, '/simulator/pm/delivery/work-packages', 'layers', TRUE, TRUE),
    ('sim_pm_delivery_product_description', 'Practice Product Description', NULL, v_del, 2, 2, '/simulator/pm/delivery/product-description', 'file-text', TRUE, TRUE),
    ('sim_pm_delivery_project_product_description', 'Practice Project Product Description', NULL, v_del, 2, 3, '/simulator/pm/delivery/project-product-description', 'clipboard-list', TRUE, TRUE),
    ('sim_pm_delivery_product_status_account', 'Practice Product Status Account', NULL, v_del, 2, 4, '/simulator/pm/delivery/product-status-account', 'activity', TRUE, TRUE),
    ('sim_pm_delivery_daily_log', 'Practice Daily Log', NULL, v_del, 2, 5, '/simulator/pm/delivery/daily-log', 'calendar', TRUE, TRUE),
    ('sim_pm_controls_risk_register', 'Practice Risk Register', NULL, v_ctrl, 2, 1, '/simulator/pm/controls/risk-register', 'alert-triangle', TRUE, TRUE),
    ('sim_pm_controls_issue_register', 'Practice Issue Register', NULL, v_ctrl, 2, 2, '/simulator/pm/controls/issue-register', 'alert-circle', TRUE, TRUE),
    ('sim_pm_controls_quality_register', 'Practice Quality Register', NULL, v_ctrl, 2, 3, '/simulator/pm/controls/quality-register', 'check-square', TRUE, TRUE),
    ('sim_pm_controls_configuration_items', 'Practice Configuration Item Records', NULL, v_ctrl, 2, 4, '/simulator/pm/controls/configuration-items', 'wrench', TRUE, TRUE),
    ('sim_pm_controls_lessons_log', 'Practice Lessons Log', NULL, v_ctrl, 2, 5, '/simulator/pm/controls/lessons-log', 'graduation-cap', TRUE, TRUE),
    ('sim_pm_report_checkpoint', 'Practice Checkpoint Reports', NULL, v_rep, 2, 1, '/simulator/pm/reporting/checkpoint-reports', 'flag', TRUE, TRUE),
    ('sim_pm_report_highlight', 'Practice Highlight Reports', NULL, v_rep, 2, 2, '/simulator/pm/reporting/highlight-reports', 'flag', TRUE, TRUE),
    ('sim_pm_report_issue_reports', 'Practice Issue Reports', NULL, v_rep, 2, 3, '/simulator/pm/reporting/issue-reports', 'alert-circle', TRUE, TRUE),
    ('sim_pm_report_exception', 'Practice Exception Reports', NULL, v_rep, 2, 4, '/simulator/pm/reporting/exception-reports', 'file-warning', TRUE, TRUE),
    ('sim_pm_report_end_stage', 'Practice End Stage Report', NULL, v_rep, 2, 5, '/simulator/pm/reporting/end-stage-reports', 'file-clock', TRUE, TRUE),
    ('sim_pm_fin_my_expenses', 'My Expenses', NULL, v_fin, 2, 1, '/simulator/expenses/my', 'receipt', TRUE, TRUE),
    ('sim_pm_fin_exp_approvals', 'Expense Approvals', NULL, v_fin, 2, 2, '/simulator/expenses/approvals', 'clipboard-check', TRUE, TRUE),
    ('sim_pm_fin_reports', 'Financial Reports', NULL, v_fin, 2, 3, '/simulator/financial-reports', 'chart-bar', TRUE, TRUE),
    ('sim_pm_fin_portfolio_evm', 'Portfolio EVM', NULL, v_fin, 2, 4, '/simulator/practice-portfolio/evm', 'trending-up', TRUE, TRUE),
    ('sim_pm_itto_templates', 'ITTO Templates', NULL, v_itto, 2, 1, '/simulator/pm/itto/templates', 'layers', TRUE, TRUE),
    ('sim_pm_itto_project', 'Project ITTOs', NULL, v_itto, 2, 2, '/simulator/pm/itto/project', 'layers', TRUE, TRUE),
    ('sim_pm_itto_drafts', 'ITTO Drafts', NULL, v_itto, 2, 3, '/simulator/pm/itto/drafts', 'pause', TRUE, TRUE),
    ('sim_pm_delay_register', 'Delay Register', NULL, v_delay, 2, 1, '/simulator/pm/delays', 'clipboard-list', TRUE, TRUE),
    ('sim_pm_delay_drafts', 'Delay Drafts', NULL, v_delay, 2, 2, '/simulator/pm/delays/drafts', 'pause', TRUE, TRUE),
    ('sim_pm_closure_lessons_report', 'Practice Lessons Report', NULL, v_close, 2, 1, '/simulator/pm/closure/lessons-report', 'graduation-cap', TRUE, TRUE),
    ('sim_pm_closure_end_project_report', 'Practice End Project Report', NULL, v_close, 2, 2, '/simulator/pm/closure/end-project-report', 'file-check', TRUE, TRUE)
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

-- Grant to roles that already have simulator PMO menu (v300) + PM roles
DO $$
DECLARE
  v_menu_id UUID;
BEGIN
  FOR v_menu_id IN
    SELECT id FROM menu_items
    WHERE menu_code LIKE 'sim_pm_%'
      AND COALESCE(is_deleted, FALSE) = FALSE
      AND is_visible = TRUE
  LOOP
    INSERT INTO role_menu_items (role_id, menu_item_id, can_view, can_use, is_active, is_deleted)
    SELECT r.id, v_menu_id, TRUE, TRUE, TRUE, FALSE
    FROM roles r
    WHERE r.role_name IN (
      'project_manager', 'programme_manager', 'portfolio_manager',
      'pmo_admin', 'system_admin',
      'team_lead', 'team_manager', 'pm_team_manager',
      'PMO Admin', 'System Admin'
    )
      AND COALESCE(r.is_deleted, FALSE) = FALSE
    ON CONFLICT (role_id, menu_item_id) DO UPDATE SET
      can_view = TRUE,
      can_use = TRUE,
      is_active = TRUE,
      is_deleted = FALSE,
      updated_at = NOW();
  END LOOP;
END $$;
