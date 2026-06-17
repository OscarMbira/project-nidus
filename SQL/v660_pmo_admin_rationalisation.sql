-- v660: PMO Administration rationalisation — reparent misplaced DB rows + deactivate duplicates
-- Source: projectplan/v660_PMO_Administration_Rationalisation_Plan.md
-- Note: menu_items has no category column — hierarchy uses parent_menu_id only.

-- =============================================================================
-- PART 1: Upsert new section containers + registry leaves
-- =============================================================================
DO $$
DECLARE
  v_knowledge UUID;
  v_sys UUID;
  v_gov UUID;
  v_init UUID;
  v_workflows UUID;
  v_reporting UUID;
  v_comms UUID;
  v_projects UUID;
  v_admin UUID;
  v_teams UUID;
BEGIN
  INSERT INTO public.menu_items (
    menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order,
    route_path, menu_icon, is_visible, is_active
  ) VALUES
    ('pmo_section_knowledge', 'Knowledge & Assets', 'Organisational knowledge and process assets', NULL, 1, 88, NULL, 'library', TRUE, TRUE),
    ('pmo_section_system_admin', 'System Administration', 'Platform and PWA configuration', NULL, 1, 98, NULL, 'shield', TRUE, TRUE),
    ('pmo_section_workflows', 'Workflows & Approvals', 'Cross-document approval queues', NULL, 1, 82, NULL, 'workflow', TRUE, TRUE)
  ON CONFLICT (menu_code) DO UPDATE SET
    menu_label = EXCLUDED.menu_label,
    sort_order = EXCLUDED.sort_order,
    is_visible = TRUE,
    is_active = TRUE,
    updated_at = NOW();

  SELECT id INTO v_knowledge FROM public.menu_items WHERE menu_code = 'pmo_section_knowledge' LIMIT 1;
  SELECT id INTO v_sys FROM public.menu_items WHERE menu_code = 'pmo_section_system_admin' LIMIT 1;
  SELECT id INTO v_gov FROM public.menu_items WHERE menu_code = 'pmo_section_governance' LIMIT 1;
  SELECT id INTO v_init FROM public.menu_items WHERE menu_code = 'pmo_section_initiation' LIMIT 1;
  SELECT id INTO v_workflows FROM public.menu_items WHERE menu_code = 'pmo_section_workflows' LIMIT 1;
  SELECT id INTO v_reporting FROM public.menu_items WHERE menu_code = 'pmo_section_reporting' LIMIT 1;
  SELECT id INTO v_comms FROM public.menu_items WHERE menu_code = 'pmo_comms_section' LIMIT 1;

  SELECT id INTO v_projects
  FROM public.menu_items
  WHERE menu_code IN ('pmo_projects_section', 'pmo_section_projects', 'pmo_pp_section', 'pmo_projects')
  ORDER BY CASE menu_code WHEN 'pmo_projects_section' THEN 0 WHEN 'pmo_projects' THEN 1 ELSE 2 END
  LIMIT 1;

  SELECT id INTO v_admin FROM public.menu_items WHERE menu_code = 'pmo_admin_section' LIMIT 1;

  IF v_knowledge IS NOT NULL THEN
    INSERT INTO public.menu_items (
      menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order,
      route_path, menu_icon, is_visible, is_active
    ) VALUES
      ('pmo_knowledge_hub', 'Org Knowledge Hub', NULL, v_knowledge, 2, 1, '/platform/org-knowledge', 'book-open', TRUE, TRUE),
      ('pmo_knowledge_opa', 'Process Assets', NULL, v_knowledge, 2, 2, '/platform/opa', 'library', TRUE, TRUE),
      ('pmo_knowledge_opa_new', 'Add OPA', NULL, v_knowledge, 2, 3, '/platform/opa/new', 'file-plus', TRUE, TRUE),
      ('pmo_knowledge_opa_drafts', 'OPA Drafts', NULL, v_knowledge, 2, 4, '/platform/opa/on-hold', 'pause', TRUE, TRUE),
      ('pmo_knowledge_opa_bulk', 'OPA Bulk upload', NULL, v_knowledge, 2, 5, '/platform/opa/bulk-upload', 'upload', TRUE, TRUE)
    ON CONFLICT (menu_code) DO UPDATE SET
      parent_menu_id = EXCLUDED.parent_menu_id,
      route_path = EXCLUDED.route_path,
      sort_order = EXCLUDED.sort_order,
      is_active = TRUE,
      updated_at = NOW();
  END IF;

  IF v_sys IS NOT NULL THEN
    INSERT INTO public.menu_items (
      menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order,
      route_path, menu_icon, is_visible, is_active
    ) VALUES
      ('pmo_sys_platform_settings', 'Platform Settings', NULL, v_sys, 2, 1, '/platform/settings', 'settings-2', TRUE, TRUE),
      ('pmo_sys_pwa_settings', 'PWA Settings', NULL, v_sys, 2, 2, '/platform/pwa-settings', 'settings-2', TRUE, TRUE)
    ON CONFLICT (menu_code) DO UPDATE SET
      parent_menu_id = EXCLUDED.parent_menu_id,
      route_path = EXCLUDED.route_path,
      is_active = TRUE,
      updated_at = NOW();
  END IF;

  IF v_workflows IS NOT NULL THEN
    INSERT INTO public.menu_items (
      menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order,
      route_path, menu_icon, is_visible, is_active
    ) VALUES
      ('pmo_workflows_mandate_pending', 'Mandate Pending Approvals', NULL, v_workflows, 2, 1, '/platform/mandates/approvals', 'file-check', TRUE, TRUE),
      ('pmo_workflows_brief_pending', 'Brief Pending Approvals', NULL, v_workflows, 2, 2, '/platform/briefs/approvals', 'file-check', TRUE, TRUE)
    ON CONFLICT (menu_code) DO UPDATE SET
      parent_menu_id = EXCLUDED.parent_menu_id,
      route_path = EXCLUDED.route_path,
      is_active = TRUE,
      updated_at = NOW();
  END IF;

  IF v_admin IS NOT NULL THEN
    INSERT INTO public.menu_items (
      menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order,
      route_path, menu_icon, is_visible, is_active
    ) VALUES
      ('pmo_admin_project_statuses', 'Project Statuses', NULL, v_admin, 2, 6, '/platform/pmo-admin/project-statuses', 'layers', TRUE, TRUE),
      ('pmo_admin_integrations', 'Integrations Hub', NULL, v_admin, 2, 11, '/pmo/admin/integrations', 'plug', TRUE, TRUE)
    ON CONFLICT (menu_code) DO UPDATE SET
      parent_menu_id = EXCLUDED.parent_menu_id,
      route_path = EXCLUDED.route_path,
      is_active = TRUE,
      updated_at = NOW();
  END IF;

  RAISE NOTICE 'v660 Part 1: section containers and leaves upserted';
END $$;

-- =============================================================================
-- PART 2: Reparent misplaced items (parent_menu_id)
-- =============================================================================
DO $$
DECLARE
  v_knowledge UUID;
  v_sys UUID;
  v_gov UUID;
  v_init UUID;
  v_workflows UUID;
  v_reporting UUID;
  v_comms UUID;
  v_projects UUID;
  v_admin UUID;
  v_pmo_admin UUID;
BEGIN
  SELECT id INTO v_knowledge FROM public.menu_items WHERE menu_code = 'pmo_section_knowledge' LIMIT 1;
  SELECT id INTO v_sys FROM public.menu_items WHERE menu_code = 'pmo_section_system_admin' LIMIT 1;
  SELECT id INTO v_gov FROM public.menu_items WHERE menu_code = 'pmo_section_governance' LIMIT 1;
  SELECT id INTO v_init FROM public.menu_items WHERE menu_code = 'pmo_section_initiation' LIMIT 1;
  SELECT id INTO v_workflows FROM public.menu_items WHERE menu_code = 'pmo_section_workflows' LIMIT 1;
  SELECT id INTO v_reporting FROM public.menu_items WHERE menu_code = 'pmo_section_reporting' LIMIT 1;
  SELECT id INTO v_comms FROM public.menu_items WHERE menu_code = 'pmo_comms_section' LIMIT 1;
  SELECT id INTO v_pmo_admin FROM public.menu_items WHERE menu_code = 'pmo_admin_section' LIMIT 1;

  SELECT id INTO v_projects
  FROM public.menu_items
  WHERE menu_code IN ('pmo_projects_section', 'pmo_section_projects', 'pmo_pp_section', 'pmo_projects')
  ORDER BY CASE menu_code WHEN 'pmo_projects_section' THEN 0 WHEN 'pmo_projects' THEN 1 ELSE 2 END
  LIMIT 1;

  -- OPA / org knowledge → Knowledge & Assets
  IF v_knowledge IS NOT NULL THEN
    UPDATE public.menu_items SET parent_menu_id = v_knowledge, menu_level = 2, updated_at = NOW()
    WHERE menu_code IN (
      'org_knowledge', 'org_knowledge_opa', 'org_knowledge_opa_new', 'org_knowledge_opa_drafts', 'org_knowledge_opa_bulk',
      'pmo_knowledge_hub', 'pmo_knowledge_opa', 'pmo_knowledge_opa_new', 'pmo_knowledge_opa_drafts', 'pmo_knowledge_opa_bulk'
    ) AND COALESCE(is_deleted, FALSE) = FALSE;
  END IF;

  -- Platform / PWA settings → System Administration
  IF v_sys IS NOT NULL THEN
    UPDATE public.menu_items SET parent_menu_id = v_sys, menu_level = 2, updated_at = NOW()
    WHERE menu_code IN ('pmo_sys_platform_settings', 'pmo_sys_pwa_settings', 'platform_settings', 'pwa_settings')
      AND COALESCE(is_deleted, FALSE) = FALSE;

    UPDATE public.menu_items SET parent_menu_id = v_sys, menu_level = 2, updated_at = NOW()
    WHERE route_path IN ('/platform/settings', '/platform/pwa-settings')
      AND parent_menu_id = v_pmo_admin
      AND COALESCE(is_deleted, FALSE) = FALSE;
  END IF;

  -- Mandates → Governance; pending → Workflows
  IF v_gov IS NOT NULL THEN
    UPDATE public.menu_items SET parent_menu_id = v_gov, menu_level = 2, updated_at = NOW()
    WHERE menu_code IN (
      'pmo_admin_mandates_section', 'pmo_admin_mandates_create', 'pmo_admin_mandates_all', 'pmo_admin_mandates_unlinked',
      'pmo_gov_mandates_create', 'pmo_gov_mandates_all', 'pmo_gov_mandates_unlinked'
    ) AND COALESCE(is_deleted, FALSE) = FALSE;
  END IF;

  IF v_workflows IS NOT NULL THEN
    UPDATE public.menu_items SET parent_menu_id = v_workflows, menu_level = 2, updated_at = NOW()
    WHERE menu_code IN ('pmo_admin_mandates_pending_approvals', 'pmo_admin_briefs_pending_approvals', 'pmo_workflows_mandate_pending', 'pmo_workflows_brief_pending')
      AND COALESCE(is_deleted, FALSE) = FALSE;
  END IF;

  -- Briefs → Initiation
  IF v_init IS NOT NULL THEN
    UPDATE public.menu_items SET parent_menu_id = v_init, menu_level = 2, updated_at = NOW()
    WHERE menu_code IN ('pmo_admin_briefs_section', 'pmo_admin_briefs_all', 'pmo_init_briefs_all')
      AND COALESCE(is_deleted, FALSE) = FALSE;
  END IF;

  -- People & roles items out of PMO Admin
  UPDATE public.menu_items SET parent_menu_id = NULL, menu_level = 1, updated_at = NOW()
  WHERE menu_code IN ('pmo_admin_assign_roles', 'pmo_admin_add_project_users', 'pmo_people_assign_roles', 'pmo_people_add_users')
    AND COALESCE(is_deleted, FALSE) = FALSE;

  -- Reporting metrics
  IF v_reporting IS NOT NULL THEN
    UPDATE public.menu_items SET parent_menu_id = v_reporting, menu_level = 2, updated_at = NOW()
    WHERE menu_code IN ('pmo_report_lean_metrics', 'pmo_report_agile_metrics')
      AND COALESCE(is_deleted, FALSE) = FALSE;
  END IF;

  -- Pending AI reviews → Communications
  IF v_comms IS NOT NULL THEN
    UPDATE public.menu_items SET parent_menu_id = v_comms, menu_level = 3, updated_at = NOW()
    WHERE menu_code IN ('pmo_comms_pending_ai', 'comms_pending_ai')
      AND COALESCE(is_deleted, FALSE) = FALSE;

    UPDATE public.menu_items SET parent_menu_id = v_comms, menu_level = 3, updated_at = NOW()
    WHERE route_path = '/platform/comms/pending-review'
      AND parent_menu_id = v_pmo_admin
      AND COALESCE(is_deleted, FALSE) = FALSE;
  END IF;

  -- Integrations → PMO Admin (top-level category bucket item)
  IF v_pmo_admin IS NOT NULL THEN
    UPDATE public.menu_items SET parent_menu_id = v_pmo_admin, menu_level = 2, updated_at = NOW()
    WHERE menu_code IN ('pmo_admin_integrations')
      AND COALESCE(is_deleted, FALSE) = FALSE;
  END IF;

  -- End project report duplicate under admin → reporting (deactivated in Part 3 if duplicate)
  IF v_reporting IS NOT NULL AND v_pmo_admin IS NOT NULL THEN
    UPDATE public.menu_items SET parent_menu_id = v_reporting, menu_level = 2, updated_at = NOW()
    WHERE menu_code IN ('report_end_project_pmo', 'pm_reports_end_project')
      AND parent_menu_id = v_pmo_admin
      AND COALESCE(is_deleted, FALSE) = FALSE;
  END IF;

  RAISE NOTICE 'v660 Part 2: misplaced items reparented';
END $$;

-- =============================================================================
-- PART 3: Deactivate DB duplicates and confusing nested containers
-- =============================================================================
UPDATE public.menu_items
SET is_active = FALSE, updated_at = NOW()
WHERE menu_code IN (
  'pmo_admin_business_case_section',
  'pmo_admin_business_case_all',
  'pmo_admin_brp_section',
  'pmo_admin_brp_all',
  'procurement',
  'proc_rfp_register',
  'proc_rfp_create',
  'proc_rfp_drafts',
  'pmo_admin_project_types',
  'pmo_admin_qms_section',
  'pmo_admin_qms_all',
  'pmo_admin_rms_section',
  'pmo_admin_rms_all',
  'pmo_admin_send_invites',
  'administration',
  'settings'
)
AND COALESCE(is_deleted, FALSE) = FALSE;

-- Deactivate duplicate end-project rows still under PMO Admin
UPDATE public.menu_items
SET is_active = FALSE, updated_at = NOW()
WHERE menu_code IN ('report_end_project_pmo', 'pm_reports_end_project', 'pm_closure_end_project_report')
  AND parent_menu_id = (SELECT id FROM public.menu_items WHERE menu_code = 'pmo_admin_section' LIMIT 1)
  AND COALESCE(is_deleted, FALSE) = FALSE;

-- =============================================================================
-- PART 4: Role seeds for new menu codes (pmo_admin)
-- =============================================================================
INSERT INTO public.role_menu_items (role_id, menu_item_id, can_view, can_use, is_active, is_deleted)
SELECT r.id, m.id, TRUE, TRUE, TRUE, FALSE
FROM public.roles r
CROSS JOIN public.menu_items m
WHERE r.role_name IN ('pmo_admin', 'system_admin')
  AND m.menu_code IN (
    'pmo_section_knowledge', 'pmo_knowledge_hub', 'pmo_knowledge_opa', 'pmo_knowledge_opa_new', 'pmo_knowledge_opa_drafts', 'pmo_knowledge_opa_bulk',
    'pmo_section_system_admin', 'pmo_sys_platform_settings', 'pmo_sys_pwa_settings',
    'pmo_section_workflows', 'pmo_workflows_mandate_pending', 'pmo_workflows_brief_pending',
    'pmo_admin_project_statuses', 'pmo_admin_integrations',
    'pmo_gov_mandates_create', 'pmo_gov_mandates_all', 'pmo_gov_mandates_unlinked',
    'pmo_init_briefs_all', 'pmo_report_lean_metrics', 'pmo_report_agile_metrics',
    'pmo_comms_pending_ai', 'pmo_agile_scrum_of_scrums', 'pmo_agile_value_stream', 'pmo_agile_kaizen', 'pmo_delivery_releases',
    'pmo_people_assign_roles', 'pmo_people_add_users'
  )
  AND COALESCE(m.is_deleted, FALSE) = FALSE
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET
  can_view = TRUE,
  can_use = TRUE,
  is_active = TRUE,
  is_deleted = FALSE,
  updated_at = NOW();
