-- ============================================================================
-- v1013: Grant role_menu_items access to v966/v981's new Core PM taxonomy
-- wrapper categories (Project Setup, RAID, Change Control, Resources,
-- Governance, Benefits, Planning, Quality, Project Closure) — currently ZERO
-- grants, for ANY role, system-wide.
-- ============================================================================
-- Root cause: each v981/v966h/i/j/k/m/n/o/q migration created a brand-new
-- top-level "wrapper" menu_items row (e.g. plat_pm_raid) via gen_random_uuid(), then
-- re-parented its existing child leaves (e.g. plat_pm_risk_reg) under it. Each
-- migration's own header reasoned "no grant migration needed — every leaf KEEPS
-- its existing menu_items.id, so role_menu_items grants (keyed by menu_item_id)
-- are preserved automatically." That reasoning is correct for the CHILDREN, but
-- overlooked that the NEW WRAPPER ROW ITSELF never existed before and so never
-- had any role_menu_items rows at all — a genuinely new id starts with zero
-- grants, full stop.
--
-- Effect in the live app: buildHierarchy() (apps/{platform,simulator}/src/hooks/
-- useMenu.js) only ever fetches menu_items rows a role's role_menu_items grants
-- actually reference. Since no role has ever been granted plat_pm_raid (etc.),
-- that row is never fetched, so when its granted child (plat_pm_risk_reg) is
-- hydrated and looks up its own parent_menu_id, the parent isn't in the fetched
-- map — the child is treated as an accidental top-level orphan and re-bucketed
-- by inferPmPlatformCategoryId()'s regex heuristics into whatever OLD category
-- it still pattern-matches (its pre-v966 home), not the new taxonomy section.
-- Net result: every one of these 8 new taxonomy sections is invisible to every
-- role, and their content silently reappears under its old grouping instead —
-- exactly what was seen live (a PM's sidebar showing only pre-v966-shaped
-- groups, none of RAID/Change Control/Resources/Governance/Benefits/Planning/
-- Quality/Project Closure).
--
-- Fix: grant each wrapper row to the UNION of roles that already hold an active
-- can_view grant on ANY of its direct children today — the natural, self-
-- maintaining policy (a category should be visible to anyone who can see
-- something inside it), computed from live data rather than a hand-copied role
-- list. Idempotent (ON CONFLICT DO UPDATE); safe to re-run.
-- ============================================================================

DO $$
DECLARE
  v_wrapper_codes TEXT[] := ARRAY[
    'plat_pm_project_setup',
    'plat_pm_raid',
    'plat_pm_change_control',
    'plat_pm_resources',
    'plat_pm_governance',
    'plat_pm_benefits',
    'plat_pm_planning',
    'plat_pm_quality',
    'plat_pm_project_closure'
  ];
  v_code TEXT;
  v_total_inserted INTEGER := 0;
  v_count INTEGER;
BEGIN
  FOREACH v_code IN ARRAY v_wrapper_codes LOOP
    INSERT INTO public.role_menu_items (id, role_id, menu_item_id, can_view, can_use, is_active, created_at, updated_at)
    SELECT gen_random_uuid(), r.role_id, w.id, TRUE, TRUE, TRUE, NOW(), NOW()
    FROM public.menu_items w
    JOIN (
      SELECT DISTINCT rmi.role_id, child.parent_menu_id
      FROM public.menu_items child
      JOIN public.role_menu_items rmi ON rmi.menu_item_id = child.id
      WHERE COALESCE(child.is_deleted, FALSE) = FALSE
        AND rmi.can_view = TRUE
        AND rmi.is_active = TRUE
        AND COALESCE(rmi.is_deleted, FALSE) = FALSE
    ) r ON r.parent_menu_id = w.id
    WHERE w.menu_code = v_code
      AND COALESCE(w.is_deleted, FALSE) = FALSE
    ON CONFLICT (role_id, menu_item_id) DO UPDATE
      SET can_view = TRUE, can_use = TRUE, is_active = TRUE, updated_at = NOW();

    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_total_inserted := v_total_inserted + v_count;
    RAISE NOTICE 'v1013: % — % role grants written', v_code, v_count;
  END LOOP;

  RAISE NOTICE '================================================';
  RAISE NOTICE 'v1013: Core PM taxonomy wrapper grants complete — % total role grants written across % wrapper categories', v_total_inserted, array_length(v_wrapper_codes, 1);
  RAISE NOTICE '================================================';
END $$;
