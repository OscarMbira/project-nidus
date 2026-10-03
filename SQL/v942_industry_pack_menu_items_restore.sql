-- ============================================================================
-- v942: RESTORE industry_pack_menu_items — v940's cleanup was too aggressive
-- ============================================================================
-- v940's heuristic ("remove a pack's claim on any menu item that's ALSO granted to any
-- untagged/generic built-in role") was wrong: administrative/oversight roles like pmo_admin,
-- org_admin, portfolio_manager, programme_manager, project_manager, and team_manager are
-- THEMSELVES untagged/generic built-in roles, and SQL/v934 (Local Register Engine menu wiring)
-- deliberately grants ALL 28 genuinely industry-specific local-register menu items (Permits,
-- Clinical Trials, Bill of Materials, etc.) to exactly that same role set for oversight access.
-- So v940 didn't just remove generic PM chrome — it matched and deleted the real, hand-curated
-- industry-specific content too, emptying industry_pack_menu_items almost entirely (confirmed
-- live: the sidebar fell back to showing ONLY "Core Project Management", no industry sections
-- at all, after clearing the browser cache).
--
-- This migration re-runs the two ORIGINAL derivation inserts unchanged (both already idempotent,
-- ON CONFLICT-safe) to restore the pre-v939/v940 classification in full:
--   1. SQL/v921 step 2 — role_menu_items-derived pack content.
--   2. SQL/v934 step 3 — local_register_industry_packs-derived pack content (the 28 registers).
-- SQL/v939 and v940 are NOT reverted at the schema level (their DELETEs already ran) — this
-- migration is the correction, re-populating what both of them removed. Do not re-run v939 or
-- v940 after this — see SQL/v943 for the actual (much narrower, precise) fix that follows.
-- ============================================================================

-- ── 1. Restore SQL/v921 step 2 (role-grant-derived pack content) ───────────────────

INSERT INTO public.industry_pack_menu_items (industry_pack_id, menu_item_id)
SELECT DISTINCT ip.id, rmi.menu_item_id
FROM public.industry_packs ip
JOIN public.roles r
  ON r.industry_category_id = ip.industry_category_id
 AND r.account_id IS NULL
 AND r.is_active = TRUE
JOIN public.role_menu_items rmi
  ON rmi.role_id = r.id
 AND rmi.is_active = TRUE
JOIN public.menu_items mi
  ON mi.id = rmi.menu_item_id
 AND mi.is_active = TRUE
 AND mi.is_visible = TRUE
 AND COALESCE(mi.is_deleted, FALSE) = FALSE
ON CONFLICT (industry_pack_id, menu_item_id) DO NOTHING;

-- ── 2. Restore SQL/v934 step 3 (the 28 Local Register Engine menu items) ───────────

INSERT INTO public.industry_pack_menu_items (industry_pack_id, menu_item_id)
SELECT DISTINCT lrip.industry_pack_id, mi.id
FROM public.local_register_industry_packs lrip
JOIN public.local_registers lr ON lr.id = lrip.register_id
JOIN public.menu_items mi ON mi.route_path = '/platform/local-registers/' || lr.id::text
WHERE COALESCE(mi.is_deleted, FALSE) = FALSE
ON CONFLICT (industry_pack_id, menu_item_id) DO NOTHING;

DO $$
DECLARE
  v_total INT;
BEGIN
  SELECT COUNT(*) INTO v_total FROM public.industry_pack_menu_items;
  RAISE NOTICE 'v942: restore complete — industry_pack_menu_items now has % rows total', v_total;
END $$;
