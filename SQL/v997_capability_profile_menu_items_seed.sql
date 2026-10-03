-- ============================================================================
-- v997: Capability Profile default menu-item seed (DRAFT — for review before running)
-- Phase 6 of v982 SaaS User Journey
-- ============================================================================
-- projectplan/v982_phase6_capability_profiles_plan.md, task A. Per the coordinator's explicit
-- instruction, this is content work presented for review, not a settled engineering decision —
-- see the implementation plan's Review section for the same breakdown as a readable table
-- (tier -> included menu categories) before running this file. Adjust the TIER_TOP_CATEGORIES
-- VALUES list below (and re-run — the whole file is idempotent) if the tier boundaries need to
-- move; nothing else in this file needs to change to reassign a whole category to a different
-- tier.
--
-- APPROACH: each tier is assigned a list of TOP-LEVEL menu category menu_codes (drawn from
-- packages/config/src/pmoSidebarCategories.js's real PLATFORM_PM_CATEGORY_DEFS/PLATFORM_PMO_
-- CATEGORY_DEFS registries, so these are real, current category codes, not invented ones). A
-- recursive CTE walks each listed category down through menu_items.parent_menu_id to include
-- every descendant leaf, so a new item added under an existing category automatically inherits
-- that category's tier with no further seed changes needed. Each tier is CUMULATIVE (Standard =
-- Essential + its own additions, etc.) per the brief's escalating-scope framing. Comprehensive
-- additionally includes every menu_item reachable through ANY industry_pack_menu_items row (the
-- top tier unlocks everything an org's industry packs make available, full stop), not just its
-- own category list.
--
-- Prerequisites: v996_capability_profiles.sql, public.menu_items, public.industry_pack_menu_items.
-- ============================================================================

DO $$
DECLARE
  v_essential_id UUID;
  v_standard_id UUID;
  v_advanced_id UUID;
  v_comprehensive_id UUID;
BEGIN
  SELECT id INTO v_essential_id FROM public.capability_profiles WHERE tier_code = 'essential';
  SELECT id INTO v_standard_id FROM public.capability_profiles WHERE tier_code = 'standard';
  SELECT id INTO v_advanced_id FROM public.capability_profiles WHERE tier_code = 'advanced';
  SELECT id INTO v_comprehensive_id FROM public.capability_profiles WHERE tier_code = 'comprehensive';

  IF v_essential_id IS NULL OR v_standard_id IS NULL OR v_advanced_id IS NULL OR v_comprehensive_id IS NULL THEN
    RAISE EXCEPTION 'v996_capability_profiles.sql must run before this seed file (a tier row is missing)';
  END IF;

  -- ── Essential: the core basics ─────────────────────────────────────────────
  -- Dashboard, Projects, Tasks, Teams, Calendar, Project Setup.
  WITH RECURSIVE top_codes(menu_code) AS (
    VALUES ('plat_pm_dashboard'), ('plat_grp_pm_projects'), ('plat_grp_pm_tasks'),
           ('plat_grp_pm_teams'), ('plat_pm_calendar'), ('plat_pm_project_setup')
  ),
  roots AS (
    SELECT m.id FROM public.menu_items m INNER JOIN top_codes t ON t.menu_code = m.menu_code
    WHERE COALESCE(m.is_deleted, FALSE) = FALSE
  ),
  descendants AS (
    SELECT id FROM roots
    UNION
    SELECT mi.id FROM public.menu_items mi INNER JOIN descendants d ON mi.parent_menu_id = d.id
    WHERE COALESCE(mi.is_deleted, FALSE) = FALSE
  )
  INSERT INTO public.capability_profile_menu_items (capability_profile_id, menu_item_id)
  SELECT v_essential_id, id FROM descendants
  ON CONFLICT (capability_profile_id, menu_item_id) DO NOTHING;

  -- ── Standard: Essential + core delivery controls ───────────────────────────
  -- + Controls & Registers, Planning, RAID, Stakeholders, Documents, Reports, Quality.
  INSERT INTO public.capability_profile_menu_items (capability_profile_id, menu_item_id)
  SELECT v_standard_id, menu_item_id FROM public.capability_profile_menu_items WHERE capability_profile_id = v_essential_id
  ON CONFLICT (capability_profile_id, menu_item_id) DO NOTHING;

  WITH RECURSIVE top_codes(menu_code) AS (
    VALUES ('plat_grp_pm_controls'), ('plat_pm_planning'), ('plat_pm_raid'),
           ('plat_grp_pm_stakeholders'), ('plat_pm_project_documents'),
           ('plat_grp_pm_reporting'), ('plat_pm_quality')
  ),
  roots AS (
    SELECT m.id FROM public.menu_items m INNER JOIN top_codes t ON t.menu_code = m.menu_code
    WHERE COALESCE(m.is_deleted, FALSE) = FALSE
  ),
  descendants AS (
    SELECT id FROM roots
    UNION
    SELECT mi.id FROM public.menu_items mi INNER JOIN descendants d ON mi.parent_menu_id = d.id
    WHERE COALESCE(mi.is_deleted, FALSE) = FALSE
  )
  INSERT INTO public.capability_profile_menu_items (capability_profile_id, menu_item_id)
  SELECT v_standard_id, id FROM descendants
  ON CONFLICT (capability_profile_id, menu_item_id) DO NOTHING;

  -- ── Advanced: Standard + org-wide coordination & financial rigor ───────────
  -- + Change Control, Resources, Cost Management, Governance, Testing, Benefits, Authorisation,
  -- Project Closure, Templates.
  INSERT INTO public.capability_profile_menu_items (capability_profile_id, menu_item_id)
  SELECT v_advanced_id, menu_item_id FROM public.capability_profile_menu_items WHERE capability_profile_id = v_standard_id
  ON CONFLICT (capability_profile_id, menu_item_id) DO NOTHING;

  WITH RECURSIVE top_codes(menu_code) AS (
    VALUES ('plat_pm_change_control'), ('plat_pm_resources'), ('plat_grp_pm_financial'),
           ('plat_pm_governance'), ('plat_pm_quality_testing'), ('plat_pm_benefits'),
           ('plat_grp_pm_auth'), ('plat_pm_project_closure'), ('plat_pm_templates'),
           ('plat_pm_project_templates')
  ),
  roots AS (
    SELECT m.id FROM public.menu_items m INNER JOIN top_codes t ON t.menu_code = m.menu_code
    WHERE COALESCE(m.is_deleted, FALSE) = FALSE
  ),
  descendants AS (
    SELECT id FROM roots
    UNION
    SELECT mi.id FROM public.menu_items mi INNER JOIN descendants d ON mi.parent_menu_id = d.id
    WHERE COALESCE(mi.is_deleted, FALSE) = FALSE
  )
  INSERT INTO public.capability_profile_menu_items (capability_profile_id, menu_item_id)
  SELECT v_advanced_id, id FROM descendants
  ON CONFLICT (capability_profile_id, menu_item_id) DO NOTHING;

  -- ── Comprehensive: Advanced + everything else ──────────────────────────────
  -- + Cross-Framework, AI Assistant, Knowledge & Resources, and (the top tier's defining trait)
  -- every remaining menu_item reachable through ANY industry pack, regardless of category.
  INSERT INTO public.capability_profile_menu_items (capability_profile_id, menu_item_id)
  SELECT v_comprehensive_id, menu_item_id FROM public.capability_profile_menu_items WHERE capability_profile_id = v_advanced_id
  ON CONFLICT (capability_profile_id, menu_item_id) DO NOTHING;

  WITH RECURSIVE top_codes(menu_code) AS (
    VALUES ('plat_sec_cross_fw'), ('plat_pm_ai')
  ),
  roots AS (
    SELECT m.id FROM public.menu_items m INNER JOIN top_codes t ON t.menu_code = m.menu_code
    WHERE COALESCE(m.is_deleted, FALSE) = FALSE
  ),
  descendants AS (
    SELECT id FROM roots
    UNION
    SELECT mi.id FROM public.menu_items mi INNER JOIN descendants d ON mi.parent_menu_id = d.id
    WHERE COALESCE(mi.is_deleted, FALSE) = FALSE
  )
  INSERT INTO public.capability_profile_menu_items (capability_profile_id, menu_item_id)
  SELECT v_comprehensive_id, id FROM descendants
  ON CONFLICT (capability_profile_id, menu_item_id) DO NOTHING;

  -- Every item reachable via any industry pack (the top tier is the "unlocks everything your
  -- selected industries offer" tier, per the brief's escalating-scope framing).
  INSERT INTO public.capability_profile_menu_items (capability_profile_id, menu_item_id)
  SELECT DISTINCT v_comprehensive_id, ipmi.menu_item_id
  FROM public.industry_pack_menu_items ipmi
  ON CONFLICT (capability_profile_id, menu_item_id) DO NOTHING;

END $$;

DO $$
DECLARE
  v_counts TEXT;
BEGIN
  SELECT string_agg(p.tier_name || ': ' || cnt::text, ', ' ORDER BY p.tier_order)
  INTO v_counts
  FROM public.capability_profiles p
  LEFT JOIN (
    SELECT capability_profile_id, COUNT(*) AS cnt
    FROM public.capability_profile_menu_items
    GROUP BY capability_profile_id
  ) c ON c.capability_profile_id = p.id;
  RAISE NOTICE 'v997_capability_profile_menu_items_seed.sql applied — menu item counts per tier: %', v_counts;
END $$;

-- Post-run verification (run manually):
--   SELECT p.tier_name, COUNT(*) AS menu_item_count
--   FROM public.capability_profile_menu_items cpmi
--   JOIN public.capability_profiles p ON p.id = cpmi.capability_profile_id
--   GROUP BY p.tier_name, p.tier_order ORDER BY p.tier_order;
--   -- expect a strictly increasing count Essential < Standard < Advanced < Comprehensive.
