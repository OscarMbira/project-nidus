-- =============================================================================
-- v881: Hide duplicate EEF menu entries (Platform + Simulator)
-- Prerequisites: v681/v682 (menu hierarchy), v879 (Controls & Registers Scope & Value)
--
-- Scope & Value already has the short "EEF" leaf (plat_pm_eef / sim_pm_eef).
-- Older rows (plat_s_eef, sim_pmo_eef, org_knowledge_eef, pmo_gov_eef_list, …)
-- point at the same list route and appear as duplicates. Soft-hide every
-- non-canonical leaf on those exact routes; keep plat_pm_eef / sim_pm_eef.
-- Idempotent — safe to re-run.
-- =============================================================================

UPDATE public.menu_items
SET
  is_active = FALSE,
  is_visible = FALSE,
  is_deleted = TRUE,
  updated_at = NOW()
WHERE COALESCE(is_deleted, FALSE) = FALSE
  AND route_path IN ('/platform/eef', '/simulator/eef')
  AND menu_code NOT IN ('plat_pm_eef', 'sim_pm_eef');

-- Also retire related draft/new shortcuts that duplicate Controls navigation
-- (list remains reachable from Scope & Value → EEF).
UPDATE public.menu_items
SET
  is_active = FALSE,
  is_visible = FALSE,
  is_deleted = TRUE,
  updated_at = NOW()
WHERE COALESCE(is_deleted, FALSE) = FALSE
  AND menu_code IN (
    'plat_s_eef',
    'sim_pmo_eef',
    'org_knowledge_eef',
    'org_knowledge_eef_new',
    'org_knowledge_eef_drafts',
    'org_knowledge_eef_bulk',
    'pmo_gov_eef_list',
    'pmo_gov_eef_new',
    'pmo_gov_eef_drafts',
    'pmo-gov-eef-list'
  );
