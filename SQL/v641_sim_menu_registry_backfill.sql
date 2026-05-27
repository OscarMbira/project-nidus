-- v641: Simulator menu registry backfill — PMO + PM initiation, governance, oversight sections
-- Idempotent on menu_code. Run after v635 (process templates) and v450 (sim PM dashboard).
-- Source: src/config/menuRegistry.js (domain: simulator)

DO $$
DECLARE
  v_init UUID;
  v_gov UUID;
  v_oversight UUID;
  v_pm_init UUID;
BEGIN
  -- ── Simulator PMO: Initiation ─────────────────────────────────────────────
  INSERT INTO public.menu_items (
    menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order,
    route_path, menu_icon, is_visible, is_active
  ) VALUES (
    'sim_pmo_section_initiation',
    'Initiation & Business Justification',
    'Practice business case, brief, benefits review plan',
    NULL, 1, 50,
    NULL, 'briefcase', TRUE, TRUE
  )
  ON CONFLICT (menu_code) DO UPDATE SET
    menu_label = EXCLUDED.menu_label,
    sort_order = EXCLUDED.sort_order,
    is_visible = TRUE,
    is_active = TRUE,
    updated_at = NOW();

  -- Repoint legacy v300 single-link row to container (no route)
  UPDATE public.menu_items SET route_path = NULL, menu_label = 'Initiation & Business Justification', updated_at = NOW()
  WHERE menu_code = 'sim_pmo_initiation';

  SELECT id INTO v_init FROM public.menu_items WHERE menu_code = 'sim_pmo_section_initiation' LIMIT 1;

  INSERT INTO public.menu_items (
    menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order,
    route_path, menu_icon, is_visible, is_active
  ) VALUES
    ('sim_pmo_init_business_case',        'Practice Business Case',        NULL, v_init, 2, 1, '/simulator/pmo/initiation/business-case',        'briefcase', TRUE, TRUE),
    ('sim_pmo_init_project_brief',        'Practice Project Brief',        NULL, v_init, 2, 2, '/simulator/pmo/initiation/project-brief',        'file-text', TRUE, TRUE),
    ('sim_pmo_init_benefits_review_plan', 'Practice Benefits Review Plan', NULL, v_init, 2, 3, '/simulator/pmo/initiation/benefits-review-plan', 'book-open', TRUE, TRUE)
  ON CONFLICT (menu_code) DO UPDATE SET
    parent_menu_id = EXCLUDED.parent_menu_id,
    route_path = EXCLUDED.route_path,
    sort_order = EXCLUDED.sort_order,
    is_visible = TRUE,
    is_active = TRUE,
    updated_at = NOW();

  -- ── Simulator PMO: Governance ─────────────────────────────────────────────
  INSERT INTO public.menu_items (
    menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order,
    route_path, menu_icon, is_visible, is_active
  ) VALUES (
    'sim_pmo_section_governance',
    'Governance & Standards',
    'Practice PMO governance baselines and strategies',
    NULL, 1, 40,
    NULL, 'shield', TRUE, TRUE
  )
  ON CONFLICT (menu_code) DO UPDATE SET
    menu_label = EXCLUDED.menu_label,
    sort_order = EXCLUDED.sort_order,
    is_visible = TRUE,
    is_active = TRUE,
    updated_at = NOW();

  UPDATE public.menu_items SET route_path = NULL, menu_label = 'Governance & Standards', updated_at = NOW()
  WHERE menu_code = 'sim_pmo_governance';

  SELECT id INTO v_gov FROM public.menu_items WHERE menu_code = 'sim_pmo_section_governance' LIMIT 1;

  INSERT INTO public.menu_items (
    menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order,
    route_path, menu_icon, is_visible, is_active
  ) VALUES
    ('sim_pmo_gov_mandate',                'Practice Project Mandate',                   NULL, v_gov, 2, 1, '/simulator/pmo/governance/mandate',                'file-text',      TRUE, TRUE),
    ('sim_pmo_gov_communication_strategy', 'Practice Communication Management Strategy', NULL, v_gov, 2, 2, '/simulator/pmo/governance/communication-strategy', 'megaphone',      TRUE, TRUE),
    ('sim_pmo_gov_configuration_strategy', 'Practice Configuration Management Strategy', NULL, v_gov, 2, 3, '/simulator/pmo/governance/configuration-strategy', 'settings-2',     TRUE, TRUE),
    ('sim_pmo_gov_quality_strategy',       'Practice Quality Management Strategy',       NULL, v_gov, 2, 4, '/simulator/pmo/governance/quality-strategy',       'check-square',   TRUE, TRUE),
    ('sim_pmo_gov_risk_strategy',          'Practice Risk Management Strategy',          NULL, v_gov, 2, 5, '/simulator/pmo/governance/risk-strategy',          'alert-triangle', TRUE, TRUE),
    ('sim_pmo_gov_itto_templates',         'ITTO Templates',                             NULL, v_gov, 2, 6, '/simulator/pmo/itto/templates',                    'git-branch',     TRUE, TRUE),
    ('sim_pmo_gov_itto_drafts',            'ITTO Drafts',                                NULL, v_gov, 2, 7, '/simulator/pmo/itto/drafts',                       'pause',          TRUE, TRUE)
  ON CONFLICT (menu_code) DO UPDATE SET
    parent_menu_id = EXCLUDED.parent_menu_id,
    route_path = EXCLUDED.route_path,
    sort_order = EXCLUDED.sort_order,
    is_visible = TRUE,
    is_active = TRUE,
    updated_at = NOW();

  -- ── Simulator PMO: Oversight ──────────────────────────────────────────────
  INSERT INTO public.menu_items (
    menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order,
    route_path, menu_icon, is_visible, is_active
  ) VALUES (
    'sim_pmo_section_oversight',
    'Practice Project Oversight',
    'Practice risk, issue, quality registers and lessons',
    NULL, 1, 55,
    NULL, 'eye', TRUE, TRUE
  )
  ON CONFLICT (menu_code) DO UPDATE SET
    menu_label = EXCLUDED.menu_label,
    sort_order = EXCLUDED.sort_order,
    is_visible = TRUE,
    is_active = TRUE,
    updated_at = NOW();

  UPDATE public.menu_items SET route_path = NULL, menu_label = 'Practice Project Oversight', updated_at = NOW()
  WHERE menu_code = 'sim_pmo_oversight';

  SELECT id INTO v_oversight FROM public.menu_items WHERE menu_code = 'sim_pmo_section_oversight' LIMIT 1;

  INSERT INTO public.menu_items (
    menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order,
    route_path, menu_icon, is_visible, is_active
  ) VALUES
    ('sim_pmo_oversight_risk_register',    'Practice Risk Register',    NULL, v_oversight, 2, 1, '/simulator/pmo/oversight/risk-register',    'alert-triangle', TRUE, TRUE),
    ('sim_pmo_oversight_issue_register',   'Practice Issue Register',   NULL, v_oversight, 2, 2, '/simulator/pmo/oversight/issue-register',   'alert-circle',   TRUE, TRUE),
    ('sim_pmo_oversight_quality_register', 'Practice Quality Register', NULL, v_oversight, 2, 3, '/simulator/pmo/oversight/quality-register', 'clipboard-list', TRUE, TRUE),
    ('sim_pmo_oversight_lessons_log',      'Practice Lessons Log',      NULL, v_oversight, 2, 4, '/simulator/pmo/oversight/lessons-log',      'graduation-cap', TRUE, TRUE),
    ('sim_pmo_oversight_delays',           'Delay Register',            NULL, v_oversight, 2, 5, '/simulator/pmo/oversight/delays',           'file-clock',     TRUE, TRUE),
    ('sim_pmo_oversight_delay_templates',  'Delay Templates',           NULL, v_oversight, 2, 6, '/simulator/pmo/delays/templates',           'layers',         TRUE, TRUE),
    ('sim_pmo_oversight_scope',            'Scope Oversight',           NULL, v_oversight, 2, 7, '/simulator/pmo/oversight/scope',            'clipboard-list', TRUE, TRUE),
    ('sim_pmo_oversight_schedules',        'Schedule Oversight',        NULL, v_oversight, 2, 8, '/simulator/pmo/oversight/schedules',        'file-clock',     TRUE, TRUE)
  ON CONFLICT (menu_code) DO UPDATE SET
    parent_menu_id = EXCLUDED.parent_menu_id,
    route_path = EXCLUDED.route_path,
    sort_order = EXCLUDED.sort_order,
    is_visible = TRUE,
    is_active = TRUE,
    updated_at = NOW();

  -- ── Simulator PM: Initiation section (list-first) ─────────────────────────
  INSERT INTO public.menu_items (
    menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order,
    route_path, menu_icon, is_visible, is_active
  ) VALUES (
    'sim_pm_section_initiation',
    'Initiation & Business Justification',
    'Practice PM initiation documents',
    NULL, 1, 27,
    NULL, 'briefcase', TRUE, TRUE
  )
  ON CONFLICT (menu_code) DO UPDATE SET
    menu_label = EXCLUDED.menu_label,
    sort_order = EXCLUDED.sort_order,
    is_visible = TRUE,
    is_active = TRUE,
    updated_at = NOW();

  UPDATE public.menu_items SET route_path = NULL, updated_at = NOW()
  WHERE menu_code = 'sim_pm_initiation';

  SELECT id INTO v_pm_init FROM public.menu_items WHERE menu_code = 'sim_pm_section_initiation' LIMIT 1;

  INSERT INTO public.menu_items (
    menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order,
    route_path, menu_icon, is_visible, is_active
  ) VALUES
    ('sim_pm_init_business_case',        'Practice Business Case',                     NULL, v_pm_init, 2, 1, '/simulator/pm/initiation/business-case',        'briefcase', TRUE, TRUE),
    ('sim_pm_init_project_brief',        'Practice Project Brief',                     NULL, v_pm_init, 2, 2, '/simulator/pm/initiation/project-brief',        'file-text', TRUE, TRUE),
    ('sim_pm_init_pid',                  'Practice Project Initiation Document (PID)', NULL, v_pm_init, 2, 3, '/simulator/pm/initiation/pid',                  'file-text', TRUE, TRUE),
    ('sim_pm_init_benefits_review_plan', 'Practice Benefits Review Plan',              NULL, v_pm_init, 2, 4, '/simulator/pm/initiation/benefits-review-plan', 'book-open', TRUE, TRUE)
  ON CONFLICT (menu_code) DO UPDATE SET
    parent_menu_id = EXCLUDED.parent_menu_id,
    route_path = EXCLUDED.route_path,
    sort_order = EXCLUDED.sort_order,
    is_visible = TRUE,
    is_active = TRUE,
    updated_at = NOW();

  RAISE NOTICE 'v641_sim_menu_registry_backfill.sql completed';
END $$;
