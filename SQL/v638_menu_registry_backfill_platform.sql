-- v638: Menu registry backfill — Platform PMO initiation, governance, oversight sections
-- Idempotent on menu_code. Run after v629 (process templates).
-- Source of truth: src/config/menuRegistry.js

DO $$
DECLARE
  v_init UUID;
  v_gov UUID;
  v_oversight UUID;
BEGIN
  -- Initiation & Business Justification
  INSERT INTO public.menu_items (
    menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order,
    route_path, menu_icon, is_visible, is_active
  ) VALUES (
    'pmo_section_initiation',
    'Initiation & Business Justification',
    'Business case, project brief, benefits review plan',
    NULL, 1, 50,
    NULL, 'briefcase', TRUE, TRUE
  )
  ON CONFLICT (menu_code) DO UPDATE SET
    menu_label = EXCLUDED.menu_label,
    menu_description = EXCLUDED.menu_description,
    sort_order = EXCLUDED.sort_order,
    menu_icon = EXCLUDED.menu_icon,
    is_visible = TRUE,
    is_active = TRUE,
    updated_at = NOW();

  SELECT id INTO v_init FROM public.menu_items WHERE menu_code = 'pmo_section_initiation' LIMIT 1;

  INSERT INTO public.menu_items (
    menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order,
    route_path, menu_icon, is_visible, is_active
  ) VALUES
    ('pmo_init_business_case',       'Business Case',        NULL, v_init, 2, 1, '/pmo/initiation/business-case',       'briefcase',  TRUE, TRUE),
    ('pmo_init_project_brief',       'Project Brief',        NULL, v_init, 2, 2, '/pmo/initiation/project-brief',       'file-text',  TRUE, TRUE),
    ('pmo_init_benefits_review_plan','Benefits Review Plan', NULL, v_init, 2, 3, '/pmo/initiation/benefits-review-plan','book-open',  TRUE, TRUE)
  ON CONFLICT (menu_code) DO UPDATE SET
    parent_menu_id = EXCLUDED.parent_menu_id,
    route_path = EXCLUDED.route_path,
    sort_order = EXCLUDED.sort_order,
    menu_icon = EXCLUDED.menu_icon,
    is_visible = TRUE,
    is_active = TRUE,
    updated_at = NOW();

  -- Governance & Standards
  INSERT INTO public.menu_items (
    menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order,
    route_path, menu_icon, is_visible, is_active
  ) VALUES (
    'pmo_section_governance',
    'Governance & Standards',
    'PMO governance baselines and strategies',
    NULL, 1, 40,
    NULL, 'shield', TRUE, TRUE
  )
  ON CONFLICT (menu_code) DO UPDATE SET
    menu_label = EXCLUDED.menu_label,
    sort_order = EXCLUDED.sort_order,
    is_visible = TRUE,
    is_active = TRUE,
    updated_at = NOW();

  SELECT id INTO v_gov FROM public.menu_items WHERE menu_code = 'pmo_section_governance' LIMIT 1;

  INSERT INTO public.menu_items (
    menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order,
    route_path, menu_icon, is_visible, is_active
  ) VALUES
    ('pmo_gov_mandate',                'Project Mandate',                    NULL, v_gov, 2, 1, '/pmo/governance/mandate',                'file-text',       TRUE, TRUE),
    ('pmo_gov_mandate_approval',       'Approval / Authorisation',           NULL, v_gov, 2, 2, '/pmo/mandates/approvals',                'file-check',      TRUE, TRUE),
    ('pmo_gov_communication_strategy', 'Communication Management Strategy',  NULL, v_gov, 2, 3, '/pmo/governance/communication-strategy','megaphone',       TRUE, TRUE),
    ('pmo_gov_configuration_strategy', 'Configuration Management Strategy',  NULL, v_gov, 2, 4, '/pmo/governance/configuration-strategy','settings-2',      TRUE, TRUE),
    ('pmo_gov_quality_strategy',       'Quality Management Strategy',        NULL, v_gov, 2, 5, '/pmo/governance/quality-strategy',       'check-square',    TRUE, TRUE),
    ('pmo_gov_risk_strategy',          'Risk Management Strategy',           NULL, v_gov, 2, 6, '/pmo/governance/risk-strategy',          'alert-triangle',  TRUE, TRUE),
    ('pmo_gov_itto_templates',         'ITTO Templates',                     NULL, v_gov, 2, 7, '/pmo/itto/templates',                    'git-branch',      TRUE, TRUE),
    ('pmo_gov_itto_drafts',            'ITTO Drafts',                        NULL, v_gov, 2, 8, '/pmo/itto/drafts',                       'pause',           TRUE, TRUE)
  ON CONFLICT (menu_code) DO UPDATE SET
    parent_menu_id = EXCLUDED.parent_menu_id,
    route_path = EXCLUDED.route_path,
    sort_order = EXCLUDED.sort_order,
    menu_icon = EXCLUDED.menu_icon,
    is_visible = TRUE,
    is_active = TRUE,
    updated_at = NOW();

  -- Project Oversight
  INSERT INTO public.menu_items (
    menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order,
    route_path, menu_icon, is_visible, is_active
  ) VALUES (
    'pmo_section_oversight',
    'Project Oversight',
    'Read-only oversight registers across projects',
    NULL, 1, 55,
    NULL, 'eye', TRUE, TRUE
  )
  ON CONFLICT (menu_code) DO UPDATE SET
    menu_label = EXCLUDED.menu_label,
    sort_order = EXCLUDED.sort_order,
    is_visible = TRUE,
    is_active = TRUE,
    updated_at = NOW();

  SELECT id INTO v_oversight FROM public.menu_items WHERE menu_code = 'pmo_section_oversight' LIMIT 1;

  INSERT INTO public.menu_items (
    menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order,
    route_path, menu_icon, is_visible, is_active
  ) VALUES
    ('pmo_oversight_risk_register',    'Risk Register',          NULL, v_oversight, 2, 1, '/pmo/oversight/risk-register',    'alert-triangle', TRUE, TRUE),
    ('pmo_oversight_issue_register',   'Issue Register',         NULL, v_oversight, 2, 2, '/pmo/oversight/issue-register',   'alert-circle',   TRUE, TRUE),
    ('pmo_oversight_quality_register', 'Quality Register',       NULL, v_oversight, 2, 3, '/pmo/oversight/quality-register', 'clipboard-list', TRUE, TRUE),
    ('pmo_oversight_lessons_log',      'Lessons Log',            NULL, v_oversight, 2, 4, '/pmo/oversight/lessons-log',      'graduation-cap', TRUE, TRUE),
    ('pmo_oversight_delays',           'Delay Register',         NULL, v_oversight, 2, 5, '/pmo/oversight/delays',           'file-clock',     TRUE, TRUE),
    ('pmo_oversight_delay_templates',  'Delay Templates',        NULL, v_oversight, 2, 6, '/pmo/delays/templates',           'layers',         TRUE, TRUE),
    ('pmo_oversight_scope',            'Scope Oversight',        NULL, v_oversight, 2, 7, '/pmo/oversight/scope',            'clipboard-list', TRUE, TRUE),
    ('pmo_oversight_schedules',        'Schedule Oversight',     NULL, v_oversight, 2, 8, '/pmo/oversight/schedules',        'file-clock',     TRUE, TRUE)
  ON CONFLICT (menu_code) DO UPDATE SET
    parent_menu_id = EXCLUDED.parent_menu_id,
    route_path = EXCLUDED.route_path,
    sort_order = EXCLUDED.sort_order,
    menu_icon = EXCLUDED.menu_icon,
    is_visible = TRUE,
    is_active = TRUE,
    updated_at = NOW();

  -- PM initiation section (list-first /pm/* routes)
  INSERT INTO public.menu_items (
    menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order,
    route_path, menu_icon, is_visible, is_active
  ) VALUES (
    'pm_section_initiation',
    'Initiation & Business Justification',
    'PM workspace initiation documents',
    NULL, 1, 27,
    NULL, 'briefcase', TRUE, TRUE
  )
  ON CONFLICT (menu_code) DO UPDATE SET
    menu_label = EXCLUDED.menu_label,
    sort_order = EXCLUDED.sort_order,
    is_visible = TRUE,
    is_active = TRUE,
    updated_at = NOW();

  SELECT id INTO v_init FROM public.menu_items WHERE menu_code = 'pm_section_initiation' LIMIT 1;

  INSERT INTO public.menu_items (
    menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order,
    route_path, menu_icon, is_visible, is_active
  ) VALUES
    ('pm_init_business_case',       'Business Case',                        NULL, v_init, 2, 1, '/pm/initiation/business-case',       'briefcase', TRUE, TRUE),
    ('pm_init_project_brief',       'Project Brief',                        NULL, v_init, 2, 2, '/pm/initiation/project-brief',       'file-text', TRUE, TRUE),
    ('pm_init_pid',                 'Project Initiation Document (PID)',    NULL, v_init, 2, 3, '/pm/initiation/pid',                 'file-box',  TRUE, TRUE),
    ('pm_init_benefits_review_plan','Benefits Review Plan',                 NULL, v_init, 2, 4, '/pm/initiation/benefits-review-plan','book-open', TRUE, TRUE)
  ON CONFLICT (menu_code) DO UPDATE SET
    parent_menu_id = EXCLUDED.parent_menu_id,
    route_path = EXCLUDED.route_path,
    sort_order = EXCLUDED.sort_order,
    menu_icon = EXCLUDED.menu_icon,
    is_visible = TRUE,
    is_active = TRUE,
    updated_at = NOW();

  RAISE NOTICE 'v638_menu_registry_backfill_platform.sql completed';
END $$;
