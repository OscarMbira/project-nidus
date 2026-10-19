-- ============================================================================
-- v1280: Ask Nidus menus and entry points (PRD D19, D16; plan SQL #9). Menus come from the DB
-- (rule 25.1); agents themselves are in-page buttons, not menus.
--
--   Platform
--     * '/platform/ai' rows (pm_ai_assistant)        → label "Ask Nidus"
--     * plat_acct_ai_settings  Account → AI Settings  → /platform/organisation/ai-settings
--         grants: copied from the Regional & Format Settings account leaf (same audience)
--     * plat_pt_report_layouts Template Library → Highlight report layouts → /platform/report-layouts
--         grants: copied from the Template Hub leaf
--   Simulator (rows live in public.menu_items with the sim_ prefix)
--     * sim_pm_ai / sim_learner_ai (/simulator/ai-workspace) → label "Ask Nidus"
--     * sim_pmo_admin_ai_settings      PMO Admin → AI Settings → /simulator/organisation/ai-settings
--     * sim_pmo_admin_report_layouts   PMO Admin → Highlight report layouts → /simulator/report-layouts
--     * sim_pm_report_builder          Reporting → Report Builder → /simulator/reports/builder
--   Planner (D16)
--     * pln_ask_nidus      top level  → /app/ask        (all planner roles)
--     * pln_settings_ai    Settings   → /app/settings/ai (account owner, project manager)
--     * both added to planner_menu_allowlist
-- Taxonomy: additive lines in Documentation/Core_PM_and_Industry_Menu_Taxonomy.md (rule 70).
-- Rollback: v1280_ask_nidus_menus_rollback.sql. Idempotent.
-- ============================================================================

-- ── Labels ──────────────────────────────────────────────────────────────────
UPDATE public.menu_items SET menu_label = 'Ask Nidus', updated_at = NOW()
 WHERE route_path = '/platform/ai' AND menu_code NOT LIKE 'pln\_%' AND COALESCE(is_deleted, FALSE) = FALSE;
UPDATE public.menu_items SET menu_label = 'Ask Nidus', updated_at = NOW()
 WHERE menu_code IN ('sim_pm_ai', 'sim_learner_ai') AND COALESCE(is_deleted, FALSE) = FALSE;

-- ── Helper: add a leaf under a parent and copy grants from a reference leaf ──
CREATE OR REPLACE FUNCTION pg_temp.ai_menu_leaf(
  p_code TEXT, p_label TEXT, p_description TEXT, p_route TEXT, p_parent_code TEXT, p_sort INT, p_icon TEXT, p_grant_from TEXT[]
) RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE v_parent UUID; v_level INT;
BEGIN
  SELECT id, COALESCE(menu_level, 1) + 1 INTO v_parent, v_level FROM public.menu_items
   WHERE menu_code = p_parent_code AND COALESCE(is_deleted, FALSE) = FALSE LIMIT 1;
  INSERT INTO public.menu_items (menu_code, menu_label, menu_description, route_path, parent_menu_id, menu_level, sort_order,
                                 methodology, menu_icon, is_active, is_visible)
  VALUES (p_code, p_label, p_description, p_route, v_parent, COALESCE(v_level, 1), p_sort, 'universal', p_icon, TRUE, TRUE)
  ON CONFLICT (menu_code) DO UPDATE SET
    menu_label = EXCLUDED.menu_label, menu_description = EXCLUDED.menu_description, route_path = EXCLUDED.route_path,
    parent_menu_id = EXCLUDED.parent_menu_id, menu_level = EXCLUDED.menu_level, sort_order = EXCLUDED.sort_order,
    menu_icon = EXCLUDED.menu_icon, is_active = TRUE, is_visible = TRUE, is_deleted = FALSE, updated_at = NOW();

  INSERT INTO public.role_menu_items (id, role_id, menu_item_id, can_view, can_use, is_active, created_at, updated_at)
  SELECT gen_random_uuid(), x.role_id, x.menu_item_id, TRUE, TRUE, TRUE, NOW(), NOW()
  FROM (
    SELECT DISTINCT ON (src.role_id, dst.id) src.role_id, dst.id AS menu_item_id
      FROM public.role_menu_items src
      JOIN public.menu_items ref ON ref.id = src.menu_item_id AND ref.menu_code = ANY (p_grant_from)
      JOIN public.menu_items dst ON dst.menu_code = p_code AND COALESCE(dst.is_deleted, FALSE) = FALSE
     WHERE src.can_view = TRUE AND src.is_active = TRUE AND COALESCE(src.is_deleted, FALSE) = FALSE
     ORDER BY src.role_id, dst.id
  ) x
  ON CONFLICT (role_id, menu_item_id) DO UPDATE SET can_view = TRUE, can_use = TRUE, is_active = TRUE, updated_at = NOW();
END $$;

-- ── Platform ────────────────────────────────────────────────────────────────
SELECT pg_temp.ai_menu_leaf('plat_acct_ai_settings', 'AI Settings',
  'Turn AI on or off for the organisation, accept the AI notice, set retention and see AI credit usage (v1272).',
  '/platform/organisation/ai-settings', 'plat_sec_account', 46, 'cpu',
  ARRAY['plat_acct_regional_format', 'plat_acct_org_profile', 'plat_acct_branding']);

SELECT pg_temp.ai_menu_leaf('plat_pt_report_layouts', 'Highlight report layouts',
  'Choose the sections and fields of highlight reports; Draft with AI fills exactly these (v1272).',
  '/platform/report-layouts', 'plat_grp_template_library', 60, 'layout-template',
  ARRAY['plat_pt_hub', 'pmo_pt_hub', 'pmo_pt_manage']);

-- ── Simulator ───────────────────────────────────────────────────────────────
SELECT pg_temp.ai_menu_leaf('sim_pmo_admin_ai_settings', 'AI Settings',
  'Turn AI on or off for the organisation, accept the AI notice, set retention and see AI credit usage (v1272).',
  '/simulator/organisation/ai-settings', 'sim_pmo_admin', 95, 'cpu',
  ARRAY['sim_pmo_admin_org_settings']);

SELECT pg_temp.ai_menu_leaf('sim_pmo_admin_report_layouts', 'Highlight report layouts',
  'Choose the sections and fields of practice highlight reports (v1272).',
  '/simulator/report-layouts', 'sim_pmo_admin', 96, 'layout-template',
  ARRAY['sim_pmo_admin_form_templates']);

SELECT pg_temp.ai_menu_leaf('sim_pm_report_builder', 'Report Builder',
  'Build reports from practice data with filters, grouping and totals (v1272).',
  '/simulator/reports/builder', 'sim_grp_pm_del_reporting', 5, 'file-bar-chart',
  ARRAY['sim_pm_report_highlight']);

-- ── Planner ─────────────────────────────────────────────────────────────────
DO $$
DECLARE v_settings UUID;
BEGIN
  SELECT id INTO v_settings FROM public.menu_items WHERE menu_code = 'pln_settings';

  INSERT INTO public.menu_items (menu_code, menu_label, menu_description, route_path, parent_menu_id, menu_level, sort_order, menu_icon, is_active, is_visible)
  VALUES ('pln_ask_nidus', 'Ask Nidus', 'Project Planner (v1272): ask about your schedule, resources and dependencies', '/app/ask', NULL, 1, 15, 'bot', TRUE, TRUE),
         ('pln_settings_ai', 'AI settings', 'Project Planner (v1272): AI notice, on/off, retention and credits', '/app/settings/ai', v_settings, 2, 15, 'cpu', TRUE, TRUE)
  ON CONFLICT (menu_code) DO UPDATE SET
    menu_label = EXCLUDED.menu_label, route_path = EXCLUDED.route_path, parent_menu_id = EXCLUDED.parent_menu_id,
    menu_level = EXCLUDED.menu_level, sort_order = EXCLUDED.sort_order, menu_icon = EXCLUDED.menu_icon,
    is_active = TRUE, is_visible = TRUE, is_deleted = FALSE, updated_at = NOW();
END $$;

WITH spec(role_name, menu_code) AS (
  SELECT r, 'pln_ask_nidus' FROM unnest(ARRAY['account_owner', 'project_manager', 'team_member', 'plan_viewer']) r
  UNION ALL
  SELECT r, 'pln_settings_ai' FROM unnest(ARRAY['account_owner', 'project_manager']) r
)
INSERT INTO public.role_menu_items (id, role_id, menu_item_id, can_view, can_use, is_active, is_deleted, created_at, updated_at)
SELECT gen_random_uuid(), r.id, mi.id, TRUE, TRUE, TRUE, FALSE, NOW(), NOW()
  FROM spec s
  JOIN public.roles r ON r.role_name = s.role_name AND r.account_id IS NULL AND r.is_active
  JOIN public.menu_items mi ON mi.menu_code = s.menu_code AND COALESCE(mi.is_deleted, FALSE) = FALSE
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET can_view = TRUE, can_use = TRUE, is_active = TRUE, is_deleted = FALSE, updated_at = NOW();

INSERT INTO public.planner_menu_allowlist (menu_item_id, menu_code)
SELECT id, menu_code FROM public.menu_items WHERE menu_code IN ('pln_ask_nidus', 'pln_settings_ai') AND COALESCE(is_deleted, FALSE) = FALSE
ON CONFLICT (menu_item_id) DO NOTHING;

DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT mi.menu_code, mi.menu_label, mi.route_path, (SELECT COUNT(*) FROM public.role_menu_items rmi WHERE rmi.menu_item_id = mi.id AND rmi.is_active) AS grants
             FROM public.menu_items mi
            WHERE mi.menu_code IN ('pm_ai_assistant', 'plat_acct_ai_settings', 'plat_pt_report_layouts', 'sim_pm_ai', 'sim_learner_ai',
                                   'sim_pmo_admin_ai_settings', 'sim_pmo_admin_report_layouts', 'sim_pm_report_builder', 'pln_ask_nidus', 'pln_settings_ai')
  LOOP
    RAISE NOTICE 'v1280: % "%" % — % grant(s)', r.menu_code, r.menu_label, r.route_path, r.grants;
  END LOOP;
END $$;
