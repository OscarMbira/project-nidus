-- ============================================================================
-- v1458: Consolidated role menus — governance profile placements (Slice 8, D8)
-- PRD/plan: projectprd/v1341 (D8, stories 22, 23) / projectplan/v1341
-- Design source: Documentation/Consolidated_Role_Menus_Proposal.md §6.9
--
-- Each governance profile gets an explicit, compact menu: the pages it decides on or watches,
-- in the same sections and order as the Project Manager. This replaces the keyword filtering in
-- filterMenuByPmProfile when the organisation's switch is on (renaming a page no longer changes
-- who sees it). These keys show only placed pages (no default-section fallback).
-- A project's industries add nothing unless a page is placed for the profile (story 23); Quality
-- Assurance gets the industry quality and testing pages (e.g. inspections) by design.
-- Simulator pages with the same label are placed too (rule 34.1).
-- Idempotent. Run after v1457.
-- ============================================================================

WITH picks(placement_key, menu_code) AS (
  SELECT k.placement_key, c.menu_code
  FROM (VALUES ('executive'), ('sponsor'), ('board'), ('assurance'), ('qa'), ('change_authority'), ('stakeholder')) AS k(placement_key)
  CROSS JOIN (VALUES ('plat_pm_dashboard'), ('plat_grp_pm_projects'), ('plat_pm_communications'), ('plat_pm_rep_standard')) AS c(menu_code)
  UNION ALL
  SELECT * FROM (VALUES
    ('viewer', 'plat_pm_dashboard'), ('viewer', 'plat_grp_pm_projects'), ('viewer', 'plat_pm_rep_standard'), ('viewer', 'plat_pm_rep_tools'),
    ('executive', 'plat_pm_ai'), ('executive', 'plat_pm_pending_approval'), ('executive', 'plat_pm_s_mandate'),
    ('executive', 'plat_pm_s_brief'), ('executive', 'plat_pm_s_charter'), ('executive', 'plat_pm_s_business_case'),
    ('executive', 'plat_pm_gov_stage_gates'), ('executive', 'plat_pm_gov_meetings'), ('executive', 'plat_pm_s_decision_log'),
    ('executive', 'plat_pm_benefits'), ('executive', 'plat_pm_budget'), ('executive', 'plat_pm_fin_reports'),
    ('executive', 'plat_pm_cost_evm'), ('executive', 'plat_pm_s_highlight'), ('executive', 'plat_pm_s_exception'),
    ('executive', 'plat_pm_s_end_stage'),
    ('sponsor', 'plat_pm_pending_approval'), ('sponsor', 'plat_pm_s_mandate'), ('sponsor', 'plat_pm_s_brief'),
    ('sponsor', 'plat_pm_s_charter'), ('sponsor', 'plat_pm_s_business_case'), ('sponsor', 'plat_pm_stkh_register'),
    ('sponsor', 'plat_pm_stkh_engagement'), ('sponsor', 'plat_pm_benefits'), ('sponsor', 'plat_pm_budget'),
    ('sponsor', 'plat_pm_fin_reports'), ('sponsor', 'plat_pm_s_highlight'),
    ('board', 'plat_pm_pending_approval'), ('board', 'plat_pm_submitted'), ('board', 'plat_pm_s_mandate'),
    ('board', 'plat_pm_ps_governance'), ('board', 'plat_pm_gov_stage_gates'), ('board', 'plat_pm_s_stage_gates'),
    ('board', 'plat_pm_gov_meetings'), ('board', 'plat_pm_s_decision_log'), ('board', 'plat_pm_s_highlight'),
    ('board', 'plat_pm_s_exception'), ('board', 'plat_pm_s_end_stage'),
    ('assurance', 'plat_pm_quality'), ('assurance', 'plat_pm_gov_stage_gates'), ('assurance', 'plat_pm_gov_meetings'),
    ('assurance', 'plat_pm_s_policies'), ('assurance', 'plat_pm_raid_log'),
    ('qa', 'plat_pm_my_tasks'), ('qa', 'plat_pm_quality'), ('qa', 'plat_pm_testing'), ('qa', 'plat_pm_issue_log'),
    ('qa', 'plat_pm_risk_reg'),
    ('change_authority', 'plat_pm_pending_approval'), ('change_authority', 'plat_pm_change_control'),
    ('change_authority', 'plat_pm_s_decision_log'), ('change_authority', 'plat_pm_raid_log'),
    ('stakeholder', 'plat_pm_stkh_register'), ('stakeholder', 'plat_pm_stkh_comms')
  ) AS v(placement_key, menu_code)
),
plat_rows AS (
  SELECT pk.placement_key, p.menu_item_id, p.section_code, p.slot_key, p.sort_order,
         lower(regexp_replace(mi.menu_label, '^Practice\s+', '', 'i')) AS label_key
  FROM picks pk
  JOIN public.menu_items mi ON mi.menu_code = pk.menu_code AND COALESCE(mi.is_deleted, FALSE) = FALSE
  JOIN public.menu_item_placements p ON p.menu_item_id = mi.id AND p.placement_key = 'pm' AND p.is_active = TRUE
),
qa_industry AS (
  SELECT 'qa'::text AS placement_key, p.menu_item_id, p.section_code, p.slot_key, p.sort_order
  FROM public.menu_item_placements p
  JOIN public.menu_items mi ON mi.id = p.menu_item_id
  WHERE p.placement_key = 'pm' AND p.is_active = TRUE
    AND p.slot_key IN ('quality', 'testing') AND mi.menu_code ~ '^[a-z]{3}_cat_'
),
sim_rows AS (
  SELECT pr.placement_key, sp.menu_item_id, sp.section_code, sp.slot_key, sp.sort_order
  FROM plat_rows pr
  JOIN public.menu_items smi ON smi.menu_code LIKE 'sim\_%'
   AND lower(regexp_replace(smi.menu_label, '^Practice\s+', '', 'i')) = pr.label_key
   AND COALESCE(smi.is_deleted, FALSE) = FALSE
  JOIN public.menu_item_placements sp ON sp.menu_item_id = smi.id AND sp.placement_key = 'pm' AND sp.is_active = TRUE
),
all_rows AS (
  SELECT placement_key, menu_item_id, section_code, slot_key, sort_order FROM plat_rows
  UNION
  SELECT placement_key, menu_item_id, section_code, slot_key, sort_order FROM qa_industry
  UNION
  SELECT placement_key, menu_item_id, section_code, slot_key, sort_order FROM sim_rows
)
INSERT INTO public.menu_item_placements (menu_item_id, placement_key, section_code, parent_menu_item_id, slot_key, sort_order)
SELECT DISTINCT ON (menu_item_id, placement_key) menu_item_id, placement_key, section_code, NULL::uuid, slot_key, sort_order
FROM all_rows
ORDER BY menu_item_id, placement_key, sort_order
ON CONFLICT (menu_item_id, placement_key) DO UPDATE SET
  section_code = EXCLUDED.section_code,
  parent_menu_item_id = NULL,
  slot_key = EXCLUDED.slot_key,
  sort_order = EXCLUDED.sort_order,
  is_active = TRUE,
  updated_at = NOW();

SELECT placement_key, count(*) AS placements
FROM public.menu_item_placements
WHERE placement_key IN ('executive', 'sponsor', 'board', 'assurance', 'qa', 'change_authority', 'stakeholder', 'viewer')
GROUP BY placement_key ORDER BY placement_key;
