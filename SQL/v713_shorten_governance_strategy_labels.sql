-- =============================================================================
-- v713: Shorten Governance & Standards strategy sidebar labels (remove
-- "Management" to prevent overlap) and align ITTO + PIDs with v671 canonical.
-- Runtime: src/config/v671PmoMenuCanonical.js
-- =============================================================================

UPDATE public.menu_items
SET menu_label = 'Communication Strategy',
    updated_at = NOW()
WHERE menu_code IN ('plat_s_cms', 'pmo_gov_communication_strategy', 'pm_gov_communication_strategy')
  AND COALESCE(is_deleted, FALSE) = FALSE;

UPDATE public.menu_items
SET menu_label = 'Configuration Strategy',
    updated_at = NOW()
WHERE menu_code IN ('plat_s_config_ms', 'pmo_gov_configuration_strategy', 'pm_gov_configuration_strategy')
  AND COALESCE(is_deleted, FALSE) = FALSE;

UPDATE public.menu_items
SET menu_label = 'Quality Strategy',
    updated_at = NOW()
WHERE menu_code IN ('plat_s_qms', 'pmo_gov_quality_strategy', 'pm_gov_quality_strategy')
  AND COALESCE(is_deleted, FALSE) = FALSE;

UPDATE public.menu_items
SET menu_label = 'Risk Strategy',
    updated_at = NOW()
WHERE menu_code IN ('plat_s_rms', 'pmo_gov_risk_strategy', 'pm_gov_risk_strategy')
  AND COALESCE(is_deleted, FALSE) = FALSE;

UPDATE public.menu_items
SET menu_label = 'ITTO Templates / Drafts',
    route_path = '/platform/itto/templates',
    updated_at = NOW()
WHERE menu_code = 'plat_s_itto'
  AND COALESCE(is_deleted, FALSE) = FALSE;

UPDATE public.menu_items
SET menu_label = 'Enterprise Environmental Factors (EEF)',
    updated_at = NOW()
WHERE menu_code = 'plat_s_eef'
  AND COALESCE(is_deleted, FALSE) = FALSE;

DO $$ BEGIN
  RAISE NOTICE 'v713_shorten_governance_strategy_labels.sql applied';
END $$;
