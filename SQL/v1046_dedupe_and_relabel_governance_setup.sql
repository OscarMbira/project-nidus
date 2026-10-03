-- ============================================================================
-- v1046: Dedupe Governance Decisions vs. Decision Log; relabel Project Setup's
-- "Governance" to "Governance Setup"
-- ============================================================================
-- User audit (2026-09-11): two menu groups both labeled "Governance" —
--   plat_pm_ps_governance (under Project Setup): Governance Structure, Steering Committee,
--     Project Board, Meeting Calendar, Delegated Authorities, Governance Decisions,
--     Governance Framework — this project's governance MODEL/SETUP.
--   plat_pm_governance (taxonomy top-level): Decision Log, Actions, Pending My Approval,
--     My Submitted Records, Approval Chains — the ONGOING decision/approval workflow.
--
-- Confirmed via live query: every item is genuinely distinct EXCEPT one true duplicate —
-- plat_pm_gov_decisions ("Governance Decisions", Project Setup's copy) and
-- plat_pm_s_decision_log ("Decision Log", taxonomy Governance's copy) both point at the
-- identical route /platform/governance/decisions. Kept: plat_pm_s_decision_log (the taxonomy-
-- aligned, canonical home, per v966k). Deactivated: plat_pm_gov_decisions (same v963a/v965
-- precedent — same underlying feature, redundant menu entry point).
--
-- The two groups' remaining content is NOT duplicated, so they stay separate — but sharing the
-- literal label "Governance" was genuinely confusing (found live via user report: clicking
-- "Governance Decisions" under one "Governance" landed on a page also reachable from the OTHER
-- "Governance"). plat_pm_ps_governance is relabelled "Governance Setup" to disambiguate; its own
-- menu_code, children, and grants are untouched.
-- ============================================================================

UPDATE public.menu_items
SET is_active = FALSE, is_visible = FALSE, updated_at = NOW()
WHERE menu_code = 'plat_pm_gov_decisions'
  AND COALESCE(is_deleted, FALSE) = FALSE;

UPDATE public.role_menu_items rmi
SET is_active = FALSE, updated_at = NOW()
FROM public.menu_items mi
WHERE rmi.menu_item_id = mi.id
  AND mi.menu_code = 'plat_pm_gov_decisions'
  AND COALESCE(rmi.is_deleted, FALSE) = FALSE;

UPDATE public.menu_items
SET menu_label = 'Governance Setup', updated_at = NOW()
WHERE menu_code = 'plat_pm_ps_governance'
  AND COALESCE(is_deleted, FALSE) = FALSE;

DO $$
BEGIN
  RAISE NOTICE '================================================';
  RAISE NOTICE 'v1046: plat_pm_gov_decisions deactivated (duplicate of Decision Log); plat_pm_ps_governance relabelled Governance Setup';
  RAISE NOTICE '================================================';
END $$;

-- Post-run verification (run manually):
--   SELECT menu_code, menu_label, is_active FROM public.menu_items
--   WHERE menu_code IN ('plat_pm_gov_decisions', 'plat_pm_ps_governance');
--   -- expect plat_pm_gov_decisions is_active=false; plat_pm_ps_governance menu_label='Governance Setup'.
