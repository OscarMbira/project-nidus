-- ============================================================================
-- v966p: Core PM Menu Rationalisation — Phase 9 (taxonomy group 9 of N): Reports
-- ============================================================================
-- projectplan/v966_core_pm_menu_rationalisation_plan.md Phase 9.
-- Documentation/Core_PM_and_Industry_Menu_Taxonomy.md §3 (Reports: Project Status Report /
-- Executive Report / Schedule Report / Cost Report / RAID Report / Change Report / Resource
-- Report / Quality Report / Testing Report / Custom Reports).
--
-- Pure RELABEL (same pattern as v966l Cost Management), now safe to do because v966m (this same
-- run) already moved "S-Curve & Baselines" out of this group into the new Planning group. Before
-- that move, this group's own content was a genuine mix (Report Library / Report Builder /
-- Analytics Dashboards / Custom Metrics -- all Reports-shaped -- PLUS S-Curve & Baselines, a
-- Planning/Baselines concept per taxonomy §3, not Reports) -- the plan's Phase 9 notes explicitly
-- called this out as the reason the relabel could not happen yet ("Reporting & Analytics ->
-- Reports split ... a straight rename would misclassify S-Curve"). With S-Curve relocated, the
-- remaining content (Report Library, Report Builder, Analytics Dashboards, Custom Metrics) is
-- consistent with taxonomy §3's Reports group (per the mapping audit's §2.16 Reuse verdict:
-- "almost certainly generated as filtered/templated views from one Report Library + Builder
-- engine").
--
-- RUN ORDER: this file must run AFTER v966m (Planning) -- if run first, the group would still
-- contain S-Curve & Baselines at the moment of relabel (harmless either way since this is a
-- label-only UPDATE with no content check, but v966m first keeps the two files' own stated
-- preconditions true).
--
-- menu_code, id, and children are all untouched -- only this row's own menu_label changes.
-- Same "why a DB UPDATE is required" reasoning as v966l: applyCategoryPresentationLabels() never
-- overrides an already-set real DB label, so the paired PM_CATEGORY_DEFS label change (already
-- made this session) is inert without this UPDATE.
-- ============================================================================

UPDATE public.menu_items
SET menu_label = 'Reports',
    updated_at = NOW()
WHERE menu_code = 'plat_grp_pm_reporting' AND COALESCE(is_deleted, FALSE) = FALSE;

DO $$ BEGIN RAISE NOTICE 'v966p_phase9_reports_relabel.sql applied successfully'; END $$;
