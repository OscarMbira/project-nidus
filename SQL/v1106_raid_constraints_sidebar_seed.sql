-- =============================================================================
-- v1106: Constraints Register — sidebar wiring (Platform + Simulator)
-- =============================================================================
-- projectplan/v1100_constraints_register_and_assumptions_enrichment_plan.md Phase 0.
-- Mirrors SQL/v963c_assumptions_register_sidebar_seed.sql exactly: nests the new register as a
-- sibling of Risk/Assumptions/Issue/Delay registers under the Core Controls category
-- (plat_pm_ctrl_core / sim_pm_ctrl_core), sort_order 51 (right after Assumptions at 50).
-- =============================================================================

-- ── Platform leaf ────────────────────────────────────────────────────────────────

INSERT INTO public.menu_items (id, menu_code, menu_label, menu_description, route_path, parent_menu_id, menu_level, sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at)
SELECT gen_random_uuid(), 'plat_pm_constraints_reg', 'Constraints Register', 'Tracked project constraints (budget/schedule/resource/regulatory/technical) with owner, due date, impact and status',
  '/platform/constraints',
  (SELECT id FROM public.menu_items WHERE menu_code = 'plat_pm_ctrl_core' AND COALESCE(is_deleted,FALSE)=FALSE),
  4, 51, 'universal', 'shield-alert', TRUE, TRUE, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.menu_items WHERE menu_code = 'plat_pm_constraints_reg' AND COALESCE(is_deleted,FALSE)=FALSE);

-- ── Simulator leaf ───────────────────────────────────────────────────────────────

INSERT INTO public.menu_items (id, menu_code, menu_label, menu_description, route_path, parent_menu_id, menu_level, sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at)
SELECT gen_random_uuid(), 'sim_pm_constraints_reg', 'Constraints Register', 'Tracked practice project constraints with owner, due date, impact and status',
  '/simulator/practice-projects/constraints',
  (SELECT id FROM public.menu_items WHERE menu_code = 'sim_pm_ctrl_core' AND COALESCE(is_deleted,FALSE)=FALSE),
  4, 51, 'universal', 'shield-alert', TRUE, TRUE, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.menu_items WHERE menu_code = 'sim_pm_constraints_reg' AND COALESCE(is_deleted,FALSE)=FALSE);

-- ── Role grants — Platform (mirrors v963c exactly) ─────────────────────────────────

INSERT INTO public.role_menu_items (id, role_id, menu_item_id, can_view, can_use, is_active, created_at, updated_at)
SELECT gen_random_uuid(), (SELECT id FROM public.roles WHERE role_name = 'system_admin'), mi.id, TRUE, TRUE, TRUE, NOW(), NOW()
FROM public.menu_items mi WHERE mi.menu_code = 'plat_pm_constraints_reg' AND COALESCE(mi.is_deleted, FALSE) = FALSE
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET can_view=TRUE, can_use=TRUE, is_active=TRUE, updated_at=NOW();

INSERT INTO public.role_menu_items (id, role_id, menu_item_id, can_view, can_use, is_active, created_at, updated_at)
SELECT gen_random_uuid(), (SELECT id FROM public.roles WHERE role_name = 'account_owner'), mi.id, TRUE, TRUE, TRUE, NOW(), NOW()
FROM public.menu_items mi WHERE mi.menu_code = 'plat_pm_constraints_reg' AND COALESCE(mi.is_deleted, FALSE) = FALSE
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET can_view=TRUE, can_use=TRUE, is_active=TRUE, updated_at=NOW();

INSERT INTO public.role_menu_items (id, role_id, menu_item_id, can_view, can_use, is_active, created_at, updated_at)
SELECT gen_random_uuid(), (SELECT id FROM public.roles WHERE role_name = 'pmo_admin'), mi.id, TRUE, TRUE, TRUE, NOW(), NOW()
FROM public.menu_items mi WHERE mi.menu_code = 'plat_pm_constraints_reg' AND COALESCE(mi.is_deleted, FALSE) = FALSE
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET can_view=TRUE, can_use=TRUE, is_active=TRUE, updated_at=NOW();

INSERT INTO public.role_menu_items (id, role_id, menu_item_id, can_view, can_use, is_active, created_at, updated_at)
SELECT gen_random_uuid(), (SELECT id FROM public.roles WHERE role_name = 'project_manager'), mi.id, TRUE, TRUE, TRUE, NOW(), NOW()
FROM public.menu_items mi WHERE mi.menu_code = 'plat_pm_constraints_reg' AND COALESCE(mi.is_deleted, FALSE) = FALSE
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET can_view=TRUE, can_use=TRUE, is_active=TRUE, updated_at=NOW();

-- ── Role grants — Simulator (mirrors v963c exactly) ────────────────────────────────

INSERT INTO public.role_menu_items (id, role_id, menu_item_id, can_view, can_use, is_active, created_at, updated_at)
SELECT gen_random_uuid(), (SELECT id FROM public.roles WHERE role_name = 'simulator_admin'), mi.id, TRUE, TRUE, TRUE, NOW(), NOW()
FROM public.menu_items mi WHERE mi.menu_code = 'sim_pm_constraints_reg' AND COALESCE(mi.is_deleted, FALSE) = FALSE
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET can_view=TRUE, can_use=TRUE, is_active=TRUE, updated_at=NOW();

INSERT INTO public.role_menu_items (id, role_id, menu_item_id, can_view, can_use, is_active, created_at, updated_at)
SELECT gen_random_uuid(), (SELECT id FROM public.roles WHERE role_name = 'sim_pmo_admin'), mi.id, TRUE, TRUE, TRUE, NOW(), NOW()
FROM public.menu_items mi WHERE mi.menu_code = 'sim_pm_constraints_reg' AND COALESCE(mi.is_deleted, FALSE) = FALSE
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET can_view=TRUE, can_use=TRUE, is_active=TRUE, updated_at=NOW();

INSERT INTO public.role_menu_items (id, role_id, menu_item_id, can_view, can_use, is_active, created_at, updated_at)
SELECT gen_random_uuid(), (SELECT id FROM public.roles WHERE role_name = 'sim_project_manager'), mi.id, TRUE, TRUE, TRUE, NOW(), NOW()
FROM public.menu_items mi WHERE mi.menu_code = 'sim_pm_constraints_reg' AND COALESCE(mi.is_deleted, FALSE) = FALSE
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET can_view=TRUE, can_use=TRUE, is_active=TRUE, updated_at=NOW();

DO $$ BEGIN
  RAISE NOTICE 'v1106_raid_constraints_sidebar_seed.sql applied successfully';
END $$;
