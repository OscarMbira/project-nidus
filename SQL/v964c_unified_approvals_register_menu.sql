-- ============================================================================
-- v964c — Unified Approvals register — sidebar menu (Phase 5 of v963 plan)
-- ============================================================================
-- Adds a new "Approvals Register" sidebar entry, distinct from the existing "Approvals" /
-- "Authorisation Queue" entries (which point at the generic Record Lifecycle field-edit
-- queue, /pmo/authorisation/queue — see v964a's header comment for why that is a different
-- mechanism). Placed under the existing "Workflows & Approvals" category on both apps
-- (pmo-cat-workflows-approvals / sim_pmo_cat_workflows), which already parents the other
-- authorisation-related menu items (v676/v677 db_menu_hierarchy_as_source_of_truth).
-- Role grants mirror v916/v917's creator-tier + PM-tier population (Manage Menu Bundles).
-- ============================================================================

-- ── Platform ──────────────────────────────────────────────────────────────
INSERT INTO public.menu_items (
  id, menu_code, menu_label, menu_description, route_path, parent_menu_id, menu_level, sort_order,
  methodology, menu_icon, is_active, is_visible, created_at, updated_at
)
SELECT gen_random_uuid(), 'plat_unified_approvals_register', 'Approvals Register',
       'Pending, approved, and rejected approvals across Mandates, Change Requests, and Benefits Review Plans in one place',
       '/pmo/approvals/register',
       (SELECT id FROM public.menu_items WHERE menu_code = 'pmo-cat-workflows-approvals' AND COALESCE(is_deleted, FALSE) = FALSE LIMIT 1),
       2, 15, 'universal', 'list-checks', TRUE, TRUE, NOW(), NOW()
ON CONFLICT (menu_code) DO UPDATE SET
  menu_label = EXCLUDED.menu_label,
  menu_description = EXCLUDED.menu_description,
  route_path = EXCLUDED.route_path,
  parent_menu_id = EXCLUDED.parent_menu_id,
  menu_icon = EXCLUDED.menu_icon,
  sort_order = EXCLUDED.sort_order,
  is_visible = TRUE,
  is_active = TRUE,
  is_deleted = FALSE,
  updated_at = NOW();

INSERT INTO public.role_menu_items (id, role_id, menu_item_id, can_view, can_use, is_active, created_at, updated_at)
SELECT gen_random_uuid(), r.id, mi.id, TRUE, TRUE, TRUE, NOW(), NOW()
FROM public.menu_items mi
CROSS JOIN public.roles r
WHERE mi.menu_code = 'plat_unified_approvals_register'
  AND COALESCE(mi.is_deleted, FALSE) = FALSE
  AND COALESCE(r.is_deleted, FALSE) = FALSE
  AND lower(replace(r.role_name, ' ', '_')) IN (
    'pmo_admin', 'org_admin', 'system_admin', 'super_admin', 'account_owner',
    'portfolio_manager', 'programme_manager', 'project_manager', 'team_manager',
    'pm_portfolio_manager', 'pm_programme_manager', 'pm_project_manager', 'pm_team_manager'
  )
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET
  can_view = TRUE, can_use = TRUE, is_active = TRUE, updated_at = NOW();

-- ── Simulator ─────────────────────────────────────────────────────────────
INSERT INTO public.menu_items (
  id, menu_code, menu_label, menu_description, route_path, parent_menu_id, menu_level, sort_order,
  methodology, menu_icon, is_active, is_visible, created_at, updated_at
)
SELECT gen_random_uuid(), 'sim_unified_approvals_register', 'Approvals Register',
       'Pending, approved, and rejected approvals across Practice Briefs, Change Requests, and Benefits Review Plans in one place',
       '/simulator/pmo/approvals/register',
       (SELECT id FROM public.menu_items WHERE menu_code = 'sim_pmo_cat_workflows' AND COALESCE(is_deleted, FALSE) = FALSE LIMIT 1),
       2, 15, 'universal', 'list-checks', TRUE, TRUE, NOW(), NOW()
ON CONFLICT (menu_code) DO UPDATE SET
  menu_label = EXCLUDED.menu_label,
  menu_description = EXCLUDED.menu_description,
  route_path = EXCLUDED.route_path,
  parent_menu_id = EXCLUDED.parent_menu_id,
  menu_icon = EXCLUDED.menu_icon,
  sort_order = EXCLUDED.sort_order,
  is_visible = TRUE,
  is_active = TRUE,
  is_deleted = FALSE,
  updated_at = NOW();

INSERT INTO public.role_menu_items (id, role_id, menu_item_id, can_view, can_use, is_active, created_at, updated_at)
SELECT gen_random_uuid(), r.id, mi.id, TRUE, TRUE, TRUE, NOW(), NOW()
FROM public.menu_items mi
CROSS JOIN public.roles r
WHERE mi.menu_code = 'sim_unified_approvals_register'
  AND COALESCE(mi.is_deleted, FALSE) = FALSE
  AND COALESCE(r.is_deleted, FALSE) = FALSE
  AND lower(replace(r.role_name, ' ', '_')) IN (
    'pmo_admin', 'org_admin', 'system_admin', 'super_admin', 'account_owner',
    'portfolio_manager', 'programme_manager', 'project_manager', 'team_manager',
    'pm_portfolio_manager', 'pm_programme_manager', 'pm_project_manager', 'pm_team_manager'
  )
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET
  can_view = TRUE, can_use = TRUE, is_active = TRUE, updated_at = NOW();

DO $$
BEGIN
  RAISE NOTICE 'v964c: Approvals Register menu item + role grants installed (Platform + Simulator)';
END $$;
