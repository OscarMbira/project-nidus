-- ============================================================================
-- v1030: Grant Scope & Deliverables GROUP item itself (v1024 follow-up)
-- ============================================================================
-- Same bug class as v1021 (Project Team / Governance groups): v1024 granted the
-- 2 new leaves (plat_pm_sd_pbs, plat_pm_sd_deliverable_register) but not the
-- plat_pm_scope_deliverables GROUP itself. Unlike plat_pm_project_setup (a true
-- top-level DB root that renders via reorganizeMenuRoots()'s orphan-promotion
-- path regardless of grants), plat_pm_scope_deliverables has parent_menu_id = NULL
-- too (menu_level 1, per v1024) -- so it SHOULD already be promoted the same way...
-- but live evidence (view-only "eye" icon on the sidebar) shows canUse=false for
-- it, meaning it has no role_menu_items row of its own. Granting it directly is
-- the same safe, idempotent fix regardless of the exact mechanism.
-- ============================================================================

INSERT INTO public.role_menu_items (id, role_id, menu_item_id, can_view, can_use, is_active, created_at, updated_at)
SELECT gen_random_uuid(), src.role_id, dst.id, TRUE, TRUE, TRUE, NOW(), NOW()
FROM public.role_menu_items src
JOIN public.menu_items ref ON ref.id = src.menu_item_id AND ref.menu_code = 'plat_pm_sd_deliverable_register'
JOIN public.menu_items dst ON dst.menu_code = 'plat_pm_scope_deliverables' AND COALESCE(dst.is_deleted, FALSE) = FALSE
WHERE src.can_view = TRUE AND src.is_active = TRUE AND COALESCE(src.is_deleted, FALSE) = FALSE
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET can_view = TRUE, can_use = TRUE, is_active = TRUE, updated_at = NOW();

DO $$
BEGIN
  RAISE NOTICE '================================================';
  RAISE NOTICE 'v1030: plat_pm_scope_deliverables group granted directly';
  RAISE NOTICE '================================================';
END $$;
