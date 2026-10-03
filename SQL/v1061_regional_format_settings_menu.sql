-- ============================================================================
-- v1061: Regional & Format Settings — menu wiring (Platform)
-- ============================================================================
-- Leaves:
--   1) Project Setup → Regional & Format Settings (project override page)
--   2) PMO Configuration → Regional & Format Settings (org defaults)
--   3) Account section → Regional & Format Settings (same org page as #2)
-- Simulator sidebar deferred (v988 precedent); Simulator routes/pages still built.
-- ============================================================================

-- 1. Project Setup leaf
INSERT INTO public.menu_items (
  id, menu_code, menu_label, menu_description, route_path, parent_menu_id, menu_level,
  sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at
)
SELECT
  gen_random_uuid(),
  'plat_pm_s_regional_format',
  'Regional & Format Settings',
  'Project overrides for currency, date/time, locale, and number formatting (inherits organisation defaults).',
  '/platform/project-setup/regional-format-settings',
  (SELECT id FROM public.menu_items WHERE menu_code = 'plat_pm_project_setup' AND COALESCE(is_deleted, FALSE) = FALSE),
  2, 75, 'universal', 'globe', TRUE, TRUE, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM public.menu_items
  WHERE menu_code = 'plat_pm_s_regional_format' AND COALESCE(is_deleted, FALSE) = FALSE
);

-- 2. PMO Configuration leaf (flat, like v988)
INSERT INTO public.menu_items (
  menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order,
  route_path, menu_icon, is_visible, is_active
)
VALUES (
  'pmo_regional_format_settings',
  'Regional & Format Settings',
  'Organisation defaults for currency, date/time, locale, and number formatting',
  NULL, 1, 69,
  '/platform/pmo-admin/regional-format-settings',
  'globe', TRUE, TRUE
)
ON CONFLICT (menu_code) DO UPDATE SET
  menu_label = EXCLUDED.menu_label,
  menu_description = EXCLUDED.menu_description,
  route_path = EXCLUDED.route_path,
  menu_icon = EXCLUDED.menu_icon,
  is_visible = TRUE,
  is_active = TRUE,
  updated_at = NOW();

-- 3. Account / Organisation Settings leaf (same org page via account route)
INSERT INTO public.menu_items (
  menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order,
  route_path, menu_icon, is_visible, is_active
)
SELECT
  'plat_acct_regional_format',
  'Regional & Format Settings',
  'Organisation defaults for currency, date/time, locale, and number formatting',
  (SELECT id FROM public.menu_items WHERE menu_code = 'plat_sec_account' AND COALESCE(is_deleted, FALSE) = FALSE LIMIT 1),
  2, 45,
  '/platform/organisation/regional-format-settings',
  'globe', TRUE, TRUE
WHERE NOT EXISTS (
  SELECT 1 FROM public.menu_items
  WHERE menu_code = 'plat_acct_regional_format' AND COALESCE(is_deleted, FALSE) = FALSE
);

-- If plat_sec_account missing, still insert as top-level so the leaf exists
INSERT INTO public.menu_items (
  menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order,
  route_path, menu_icon, is_visible, is_active
)
SELECT
  'plat_acct_regional_format',
  'Regional & Format Settings',
  'Organisation defaults for currency, date/time, locale, and number formatting',
  NULL, 1, 45,
  '/platform/organisation/regional-format-settings',
  'globe', TRUE, TRUE
WHERE NOT EXISTS (
  SELECT 1 FROM public.menu_items
  WHERE menu_code = 'plat_acct_regional_format' AND COALESCE(is_deleted, FALSE) = FALSE
)
AND NOT EXISTS (
  SELECT 1 FROM public.menu_items WHERE menu_code = 'plat_sec_account' AND COALESCE(is_deleted, FALSE) = FALSE
);

-- Grants: Project Setup leaf — copy from Project Details (dedupe roles)
INSERT INTO public.role_menu_items (id, role_id, menu_item_id, can_view, can_use, is_active, created_at, updated_at)
SELECT gen_random_uuid(), x.role_id, x.menu_item_id, TRUE, TRUE, TRUE, NOW(), NOW()
FROM (
  SELECT DISTINCT ON (src.role_id, dst.id)
    src.role_id,
    dst.id AS menu_item_id
  FROM public.role_menu_items src
  JOIN public.menu_items ref ON ref.id = src.menu_item_id AND ref.menu_code = 'plat_pm_s_project_details'
  JOIN public.menu_items dst ON dst.menu_code = 'plat_pm_s_regional_format' AND COALESCE(dst.is_deleted, FALSE) = FALSE
  WHERE src.can_view = TRUE AND src.is_active = TRUE AND COALESCE(src.is_deleted, FALSE) = FALSE
  ORDER BY src.role_id, dst.id
) x
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET
  can_view = TRUE, can_use = TRUE, is_active = TRUE, updated_at = NOW();

-- Grants: PMO leaf — system_admin + pmo_admin (dedupe if multiple role rows share a name)
INSERT INTO public.role_menu_items (id, role_id, menu_item_id, can_view, can_use, is_active, created_at, updated_at)
SELECT gen_random_uuid(), x.role_id, x.menu_item_id, TRUE, TRUE, TRUE, NOW(), NOW()
FROM (
  SELECT DISTINCT ON (r.id, m.id)
    r.id AS role_id,
    m.id AS menu_item_id
  FROM public.roles r
  CROSS JOIN public.menu_items m
  WHERE r.role_name IN ('system_admin', 'pmo_admin')
    AND m.menu_code = 'pmo_regional_format_settings'
    AND COALESCE(m.is_deleted, FALSE) = FALSE
    AND COALESCE(r.is_deleted, FALSE) = FALSE
  ORDER BY r.id, m.id
) x
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET
  can_view = TRUE, can_use = TRUE, is_active = TRUE, updated_at = NOW();

-- Grants: Account leaf — copy from org profile / branding (dedupe: one role may hold
-- grants to several source leaves, which previously caused
-- "ON CONFLICT DO UPDATE cannot affect row a second time")
INSERT INTO public.role_menu_items (id, role_id, menu_item_id, can_view, can_use, is_active, created_at, updated_at)
SELECT gen_random_uuid(), x.role_id, x.menu_item_id, TRUE, TRUE, TRUE, NOW(), NOW()
FROM (
  SELECT DISTINCT ON (src.role_id, dst.id)
    src.role_id,
    dst.id AS menu_item_id
  FROM public.role_menu_items src
  JOIN public.menu_items ref ON ref.id = src.menu_item_id
    AND ref.menu_code IN ('plat_acct_org_profile', 'plat_acct_branding', 'org_branding')
  JOIN public.menu_items dst ON dst.menu_code = 'plat_acct_regional_format' AND COALESCE(dst.is_deleted, FALSE) = FALSE
  WHERE src.can_view = TRUE AND src.is_active = TRUE AND COALESCE(src.is_deleted, FALSE) = FALSE
  ORDER BY src.role_id, dst.id
) x
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET
  can_view = TRUE, can_use = TRUE, is_active = TRUE, updated_at = NOW();

DO $$
BEGIN
  RAISE NOTICE 'v1061: Regional & Format Settings menu leaves wired';
END $$;
