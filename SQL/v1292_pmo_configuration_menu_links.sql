-- ============================================================================
-- v1292: PMO Configuration sidebar links (Platform + Simulator) — Slice 0 of
-- projectplan/v1292_pmo_configuration_managed_areas_plan.md (PRD stories 25–29)
-- ============================================================================
--   Simulator  PMO Admin → PMO Configuration → /simulator/pmo/configuration
--              New row sim_pmo_admin_configuration. The page has been routed since v982 but had no
--              sidebar link (v988 deferred Simulator wiring). Placed under the SAME live parent as
--              PMO Admin → AI Settings (sim_pmo_admin_ai_settings, v1280), just above it, and given
--              that row's role grants (same audience).
--   Platform   PMO Configuration (pmo_configuration_home, v988) was granted only to pmo_admin /
--              system_admin. Account Owners can now manage the PMO Configuration list (v1292 Q3),
--              so they get the link too.
--   Both       pmo_admin, account_owner, org_admin, system_admin, super_admin are granted
--              can_view + can_use on both PMO Configuration rows (whichever of those roles exist).
--
-- No new tables. Idempotent; safe to re-run.
-- Prerequisites: v988 (pmo_configuration_home), v1280 (sim_pmo_admin_ai_settings).
-- Rollback: SQL/v1292_pmo_configuration_menu_links_rollback.sql.
-- ============================================================================

-- ── 1. Simulator leaf ────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  v_parent UUID;
  v_level  INT;
  v_sort   INT;
BEGIN
  SELECT parent_menu_id, COALESCE(menu_level, 2), COALESCE(sort_order, 95)
    INTO v_parent, v_level, v_sort
  FROM public.menu_items
  WHERE menu_code = 'sim_pmo_admin_ai_settings'
    AND COALESCE(is_deleted, FALSE) = FALSE
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'v1292: sim_pmo_admin_ai_settings not found — apply SQL/v1280_ask_nidus_menus.sql first';
  END IF;

  INSERT INTO public.menu_items (
    id, menu_code, menu_label, menu_description, route_path, parent_menu_id, menu_level,
    sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at
  )
  VALUES (
    gen_random_uuid(), 'sim_pmo_admin_configuration', 'PMO Configuration',
    'Guided entry point into methodology, classifications, templates, workflows, authorities, roles, AI and reference data (v1292).',
    '/simulator/pmo/configuration', v_parent, v_level, v_sort - 1, 'universal', 'layout-dashboard',
    TRUE, TRUE, NOW(), NOW()
  )
  ON CONFLICT (menu_code) DO UPDATE SET
    menu_label = EXCLUDED.menu_label,
    menu_description = EXCLUDED.menu_description,
    route_path = EXCLUDED.route_path,
    parent_menu_id = EXCLUDED.parent_menu_id,
    menu_level = EXCLUDED.menu_level,
    sort_order = EXCLUDED.sort_order,
    methodology = 'universal',
    menu_icon = EXCLUDED.menu_icon,
    is_active = TRUE,
    is_visible = TRUE,
    is_deleted = FALSE,
    updated_at = NOW();
END $$;

-- ── 2. Simulator leaf: copy AI Settings' grants (same audience) ──────────────────────────────
INSERT INTO public.role_menu_items (id, role_id, menu_item_id, can_view, can_use, is_active, is_deleted, created_at, updated_at)
SELECT gen_random_uuid(), x.role_id, x.menu_item_id, TRUE, TRUE, TRUE, FALSE, NOW(), NOW()
FROM (
  SELECT DISTINCT src.role_id, dst.id AS menu_item_id
  FROM public.role_menu_items src
  JOIN public.menu_items ref ON ref.id = src.menu_item_id AND ref.menu_code = 'sim_pmo_admin_ai_settings'
  JOIN public.menu_items dst ON dst.menu_code = 'sim_pmo_admin_configuration' AND COALESCE(dst.is_deleted, FALSE) = FALSE
  WHERE src.can_view = TRUE AND src.is_active = TRUE AND COALESCE(src.is_deleted, FALSE) = FALSE
) x
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET
  can_view = TRUE, can_use = TRUE, is_active = TRUE, is_deleted = FALSE, updated_at = NOW();

-- ── 3. Both PMO Configuration rows: PMO Admin, Account Owner and admin roles ────────────────
WITH target_roles AS (
  SELECT id
  FROM public.roles
  WHERE COALESCE(is_deleted, FALSE) = FALSE
    AND account_id IS NULL
    AND lower(regexp_replace(trim(role_name), '[[:space:]]+', '_', 'g')) IN (
      'pmo_admin', 'account_owner', 'org_admin', 'system_admin', 'super_admin'
    )
),
target_items AS (
  SELECT id
  FROM public.menu_items
  WHERE COALESCE(is_deleted, FALSE) = FALSE
    AND menu_code IN ('pmo_configuration_home', 'sim_pmo_admin_configuration')
)
INSERT INTO public.role_menu_items (id, role_id, menu_item_id, can_view, can_use, is_active, is_deleted, created_at, updated_at)
SELECT gen_random_uuid(), r.id, m.id, TRUE, TRUE, TRUE, FALSE, NOW(), NOW()
FROM target_roles r
CROSS JOIN target_items m
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET
  can_view = TRUE, can_use = TRUE, is_active = TRUE, is_deleted = FALSE, updated_at = NOW();

-- ── 4. Check (read-only): who sees each PMO Configuration / AI Settings row ─────────────────
SELECT mi.menu_code, mi.menu_label, mi.route_path, p.menu_code AS parent_code, mi.sort_order,
       string_agg(r.role_name, ', ' ORDER BY r.role_name) AS granted_roles
FROM public.menu_items mi
LEFT JOIN public.menu_items p ON p.id = mi.parent_menu_id
LEFT JOIN public.role_menu_items rmi
  ON rmi.menu_item_id = mi.id AND rmi.can_view = TRUE AND rmi.is_active = TRUE AND COALESCE(rmi.is_deleted, FALSE) = FALSE
LEFT JOIN public.roles r ON r.id = rmi.role_id
WHERE mi.menu_code IN ('pmo_configuration_home', 'sim_pmo_admin_configuration', 'plat_acct_ai_settings', 'sim_pmo_admin_ai_settings')
GROUP BY mi.menu_code, mi.menu_label, mi.route_path, p.menu_code, mi.sort_order
ORDER BY mi.menu_code;
