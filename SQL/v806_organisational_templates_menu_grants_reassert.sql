-- =============================================================================
-- v806: Re-assert role_menu_items grants for Organisational Templates menu leaves
-- Plan: projectplan/v805_global_vs_organisational_template_libraries_plan.md
-- Context: v805 created plat_tpl_organisational / sim_tpl_organisational (confirmed
-- present with is_visible=true/is_active=true), but the sidebar still doesn't show
-- them. useMenu.js only shows a menu item when the user's role has a matching
-- role_menu_items grant (can_view=true, is_active=true, is_deleted=false) — DB
-- flags on menu_items alone are not sufficient. This file re-runs ONLY the grants
-- INSERT as an isolated statement (with a RETURNING-style verification SELECT
-- straight after) so a partial/tail-only run of v805 can be confirmed and fixed
-- in one step, matching the pattern used for v802's earlier menu-placement miss.
-- =============================================================================

INSERT INTO public.role_menu_items (id, role_id, menu_item_id, can_view, can_use, is_active, created_at, updated_at)
SELECT gen_random_uuid(), r.id, mi.id, TRUE, TRUE, TRUE, NOW(), NOW()
FROM public.menu_items mi
CROSS JOIN public.roles r
WHERE mi.menu_code IN ('plat_tpl_organisational', 'sim_tpl_organisational')
  AND COALESCE(mi.is_deleted, FALSE) = FALSE
  AND r.role_name IN (
    'pmo_admin',
    'system_admin',
    'account_owner',
    'PMO Admin',
    'System Admin',
    'Superuser'
  )
  AND COALESCE(r.is_deleted, FALSE) = FALSE
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET
  can_view = TRUE,
  can_use = TRUE,
  is_active = TRUE,
  updated_at = NOW();

-- Verification: run this SELECT (or the whole file) and check every row shows
-- can_view=true / can_use=true / is_active=true / is_deleted=false. Compare row
-- counts against plat_tpl_library / sim_tpl_library — they should match exactly.
SELECT
  mi.menu_code,
  r.role_name,
  rmi.can_view,
  rmi.can_use,
  rmi.is_active,
  rmi.is_deleted
FROM public.menu_items mi
LEFT JOIN public.role_menu_items rmi ON rmi.menu_item_id = mi.id
LEFT JOIN public.roles r ON rmi.role_id = r.id
WHERE mi.menu_code IN (
  'plat_tpl_organisational', 'plat_tpl_library',
  'sim_tpl_organisational', 'sim_tpl_library'
)
ORDER BY mi.menu_code, r.role_name;

DO $$
BEGIN
  RAISE NOTICE 'v806_organisational_templates_menu_grants_reassert.sql applied';
END $$;
