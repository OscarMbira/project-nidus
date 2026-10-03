-- =============================================================================
-- v963c: Assumptions Register — sidebar wiring (Platform + Simulator)
-- =============================================================================
-- projectplan/v963_pmis_core_gap_closure_plan.md Phase 3.
-- Nests the new register as a sibling of Risk/Issue/Change/Delay registers — same
-- "RAID-adjacent" Core Controls category those already live in (v879's plat_pm_ctrl_core /
-- sim_pm_ctrl_core), rather than inventing a new top-level category.
--
-- No public.grant_menu_role_group() helper exists yet at this point in the migration sequence
-- (that helper is introduced later, v946c) — role grants here use the same direct
-- role_menu_items INSERT pattern v879 Parts 5/9 already established for this exact hierarchy.
-- Prerequisites: v681/v682 (menu hierarchy baseline), v879 (Core Controls sub-groups).
-- =============================================================================

-- ── Platform leaf ────────────────────────────────────────────────────────────────

INSERT INTO public.menu_items (id, menu_code, menu_label, menu_description, route_path, parent_menu_id, menu_level, sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at)
SELECT gen_random_uuid(), 'plat_pm_assumptions_reg', 'Assumptions Register', 'Tracked project assumptions with validation status and risk/issue conversion',
  '/platform/assumptions',
  (SELECT id FROM public.menu_items WHERE menu_code = 'plat_pm_ctrl_core' AND COALESCE(is_deleted,FALSE)=FALSE),
  4, 50, 'universal', 'help-circle', TRUE, TRUE, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.menu_items WHERE menu_code = 'plat_pm_assumptions_reg' AND COALESCE(is_deleted,FALSE)=FALSE);

-- ── Simulator leaf ───────────────────────────────────────────────────────────────

INSERT INTO public.menu_items (id, menu_code, menu_label, menu_description, route_path, parent_menu_id, menu_level, sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at)
SELECT gen_random_uuid(), 'sim_pm_assumptions_reg', 'Assumptions Register', 'Tracked practice project assumptions with validation status and risk/issue conversion',
  '/simulator/practice-projects/assumptions',
  (SELECT id FROM public.menu_items WHERE menu_code = 'sim_pm_ctrl_core' AND COALESCE(is_deleted,FALSE)=FALSE),
  4, 50, 'universal', 'help-circle', TRUE, TRUE, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.menu_items WHERE menu_code = 'sim_pm_assumptions_reg' AND COALESCE(is_deleted,FALSE)=FALSE);

-- ── Role grants — Platform (mirrors v879 Part 5 exactly) ──────────────────────────

INSERT INTO public.role_menu_items (id, role_id, menu_item_id, can_view, can_use, is_active, created_at, updated_at)
SELECT gen_random_uuid(), (SELECT id FROM public.roles WHERE role_name = 'system_admin'), mi.id, TRUE, TRUE, TRUE, NOW(), NOW()
FROM public.menu_items mi WHERE mi.menu_code = 'plat_pm_assumptions_reg' AND COALESCE(mi.is_deleted, FALSE) = FALSE
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET can_view=TRUE, can_use=TRUE, is_active=TRUE, updated_at=NOW();

INSERT INTO public.role_menu_items (id, role_id, menu_item_id, can_view, can_use, is_active, created_at, updated_at)
SELECT gen_random_uuid(), (SELECT id FROM public.roles WHERE role_name = 'account_owner'), mi.id, TRUE, TRUE, TRUE, NOW(), NOW()
FROM public.menu_items mi WHERE mi.menu_code = 'plat_pm_assumptions_reg' AND COALESCE(mi.is_deleted, FALSE) = FALSE
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET can_view=TRUE, can_use=TRUE, is_active=TRUE, updated_at=NOW();

INSERT INTO public.role_menu_items (id, role_id, menu_item_id, can_view, can_use, is_active, created_at, updated_at)
SELECT gen_random_uuid(), (SELECT id FROM public.roles WHERE role_name = 'pmo_admin'), mi.id, TRUE, TRUE, TRUE, NOW(), NOW()
FROM public.menu_items mi WHERE mi.menu_code = 'plat_pm_assumptions_reg' AND COALESCE(mi.is_deleted, FALSE) = FALSE
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET can_view=TRUE, can_use=TRUE, is_active=TRUE, updated_at=NOW();

INSERT INTO public.role_menu_items (id, role_id, menu_item_id, can_view, can_use, is_active, created_at, updated_at)
SELECT gen_random_uuid(), (SELECT id FROM public.roles WHERE role_name = 'project_manager'), mi.id, TRUE, TRUE, TRUE, NOW(), NOW()
FROM public.menu_items mi WHERE mi.menu_code = 'plat_pm_assumptions_reg' AND COALESCE(mi.is_deleted, FALSE) = FALSE
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET can_view=TRUE, can_use=TRUE, is_active=TRUE, updated_at=NOW();

-- ── Role grants — Simulator (mirrors v879 Part 9 exactly) ─────────────────────────

INSERT INTO public.role_menu_items (id, role_id, menu_item_id, can_view, can_use, is_active, created_at, updated_at)
SELECT gen_random_uuid(), (SELECT id FROM public.roles WHERE role_name = 'simulator_admin'), mi.id, TRUE, TRUE, TRUE, NOW(), NOW()
FROM public.menu_items mi WHERE mi.menu_code = 'sim_pm_assumptions_reg' AND COALESCE(mi.is_deleted, FALSE) = FALSE
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET can_view=TRUE, can_use=TRUE, is_active=TRUE, updated_at=NOW();

INSERT INTO public.role_menu_items (id, role_id, menu_item_id, can_view, can_use, is_active, created_at, updated_at)
SELECT gen_random_uuid(), (SELECT id FROM public.roles WHERE role_name = 'sim_pmo_admin'), mi.id, TRUE, TRUE, TRUE, NOW(), NOW()
FROM public.menu_items mi WHERE mi.menu_code = 'sim_pm_assumptions_reg' AND COALESCE(mi.is_deleted, FALSE) = FALSE
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET can_view=TRUE, can_use=TRUE, is_active=TRUE, updated_at=NOW();

INSERT INTO public.role_menu_items (id, role_id, menu_item_id, can_view, can_use, is_active, created_at, updated_at)
SELECT gen_random_uuid(), (SELECT id FROM public.roles WHERE role_name = 'sim_project_manager'), mi.id, TRUE, TRUE, TRUE, NOW(), NOW()
FROM public.menu_items mi WHERE mi.menu_code = 'sim_pm_assumptions_reg' AND COALESCE(mi.is_deleted, FALSE) = FALSE
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET can_view=TRUE, can_use=TRUE, is_active=TRUE, updated_at=NOW();

DO $$ BEGIN
  RAISE NOTICE 'v963c_assumptions_register_sidebar_seed.sql applied successfully';
END $$;
