-- ============================================================================
-- v1040: Retire "Controls & Registers" legacy bucket — re-parent its 4 remaining
-- orphaned leaves, deactivate the now-fully-empty wrapper
-- ============================================================================
-- Found live while auditing "Controls & Registers" per user request (2026-09-11).
-- v966h/v966j/v966k/v966o already correctly RE-PARENTED (not duplicated — same row, same id,
-- UPDATE not INSERT) Risk Register/Issue Log/Assumptions Register/Dependencies Register/RAID
-- Log to plat_pm_raid, Change Log to plat_pm_change_control, Quality Register to plat_pm_quality,
-- and Decision Log to the new Governance group. That left plat_grp_pm_controls ("Controls &
-- Registers") mostly drained, but 4 leaves were never given a taxonomy-group home and are still
-- live there today:
--
--   plat_pm_delay_reg    "Delay Register"             /platform/delays
--     -> plat_pm_raid (schedule risk/issue tracking, same family as Risk/Issue/Dependencies)
--   plat_pm_config_reg   "Configuration Item Register" /pm/controls/configuration-items
--     -> plat_pm_quality (sibling to Quality Register, which already made this exact move —
--        both were under "Quality & Configuration" together)
--   plat_pm_requirements "Requirements Register"       /platform/scope/requirements
--     -> plat_pm_scope_deliverables
--   plat_pm_eef          "EEF" (Enterprise Environmental Factors) /platform/eef
--     -> plat_pm_scope_deliverables (grouped with Requirements under "Scope & Value" already)
--
-- Same-id re-parent for all 4 (role_menu_items grants keyed by menu_item_id, no grant migration
-- needed — identical pattern to v966h/j/k/o and v981/v1038).
--
-- After this, plat_pm_ctrl_core/plat_pm_ctrl_quality/plat_pm_ctrl_scope have zero children left
-- (plat_pm_ctrl_knowledge already had zero — Decision Log was its only child and already moved
-- to Governance by v966k) — all 5 nodes (the 4 sub-groups + plat_grp_pm_controls itself) are
-- deactivated below, each guarded by a live "zero active children" check.
-- ============================================================================

-- ── 1. Re-parent the 4 orphaned leaves ──────────────────────────────────────────────────────

UPDATE public.menu_items
SET parent_menu_id = (SELECT id FROM public.menu_items WHERE menu_code = 'plat_pm_raid' AND COALESCE(is_deleted, FALSE) = FALSE),
    menu_level = 2, sort_order = 60, updated_at = NOW()
WHERE menu_code = 'plat_pm_delay_reg' AND COALESCE(is_deleted, FALSE) = FALSE;

UPDATE public.menu_items
SET parent_menu_id = (SELECT id FROM public.menu_items WHERE menu_code = 'plat_pm_quality' AND COALESCE(is_deleted, FALSE) = FALSE),
    menu_level = 2, sort_order = 40, updated_at = NOW()
WHERE menu_code = 'plat_pm_config_reg' AND COALESCE(is_deleted, FALSE) = FALSE;

UPDATE public.menu_items
SET parent_menu_id = (SELECT id FROM public.menu_items WHERE menu_code = 'plat_pm_scope_deliverables' AND COALESCE(is_deleted, FALSE) = FALSE),
    menu_level = 2, sort_order = 70, updated_at = NOW()
WHERE menu_code = 'plat_pm_requirements' AND COALESCE(is_deleted, FALSE) = FALSE;

UPDATE public.menu_items
SET parent_menu_id = (SELECT id FROM public.menu_items WHERE menu_code = 'plat_pm_scope_deliverables' AND COALESCE(is_deleted, FALSE) = FALSE),
    menu_level = 2, sort_order = 80, updated_at = NOW()
WHERE menu_code = 'plat_pm_eef' AND COALESCE(is_deleted, FALSE) = FALSE;

-- ── 2. Deactivate the 4 sub-groups, each guarded by a live "zero active children" check ───────

UPDATE public.menu_items parent
SET is_active = FALSE, is_visible = FALSE, updated_at = NOW()
WHERE parent.menu_code IN ('plat_pm_ctrl_core', 'plat_pm_ctrl_quality', 'plat_pm_ctrl_knowledge', 'plat_pm_ctrl_scope')
  AND COALESCE(parent.is_deleted, FALSE) = FALSE
  AND NOT EXISTS (
    SELECT 1 FROM public.menu_items child
    WHERE child.parent_menu_id = parent.id
      AND COALESCE(child.is_deleted, FALSE) = FALSE
      AND child.is_active = TRUE
  );

-- ── 3. Deactivate "Controls & Registers" itself, guarded the same way ─────────────────────────

UPDATE public.menu_items parent
SET is_active = FALSE, is_visible = FALSE, updated_at = NOW()
WHERE parent.menu_code = 'plat_grp_pm_controls'
  AND COALESCE(parent.is_deleted, FALSE) = FALSE
  AND NOT EXISTS (
    SELECT 1 FROM public.menu_items child
    WHERE child.parent_menu_id = parent.id
      AND COALESCE(child.is_deleted, FALSE) = FALSE
      AND child.is_active = TRUE
  );

DO $$
BEGIN
  RAISE NOTICE '================================================';
  RAISE NOTICE 'v1040: Delay Register -> RAID, Configuration Item Register -> Quality, Requirements Register + EEF -> Scope & Deliverables; Controls & Registers and its 4 sub-groups deactivated (now empty)';
  RAISE NOTICE '================================================';
END $$;

-- Post-run verification (run manually):
--   SELECT menu_code, menu_label, is_active, is_visible,
--     (SELECT menu_code FROM public.menu_items p WHERE p.id = m.parent_menu_id) AS parent_code
--   FROM public.menu_items m
--   WHERE menu_code IN (
--     'plat_grp_pm_controls', 'plat_pm_ctrl_core', 'plat_pm_ctrl_quality',
--     'plat_pm_ctrl_knowledge', 'plat_pm_ctrl_scope',
--     'plat_pm_delay_reg', 'plat_pm_config_reg', 'plat_pm_requirements', 'plat_pm_eef'
--   )
--   ORDER BY parent_code, menu_code;
--   -- expect: all 5 "Controls & Registers" family rows is_active=false; the 4 leaves
--   -- is_active=true with parent_code = plat_pm_raid / plat_pm_quality / plat_pm_scope_deliverables (x2).
