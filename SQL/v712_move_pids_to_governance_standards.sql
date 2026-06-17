-- =============================================================================
-- v712: Move Project Initiation Documents (PIDs) from Initiation Hub to
-- Governance & Standards under [S] Predictive – Structured.
-- Runtime: src/config/v671PmoMenuCanonical.js (governance canonical + matchers)
-- =============================================================================

UPDATE public.menu_items AS child
SET parent_menu_id = gov.id,
    menu_level = 3,
    sort_order = 45,
    menu_label = 'Project Initiation Documents (PIDs)',
    route_path = '/platform/initiation/pids',
    updated_at = NOW()
FROM public.menu_items AS gov,
     public.menu_items AS old_par
WHERE child.menu_code = 'plat_s_pids'
  AND gov.menu_code = 'plat_grp_gov_standards'
  AND old_par.menu_code = 'plat_grp_initiation'
  AND child.parent_menu_id = old_par.id
  AND COALESCE(child.is_deleted, FALSE) = FALSE
  AND COALESCE(gov.is_deleted, FALSE) = FALSE
  AND COALESCE(old_par.is_deleted, FALSE) = FALSE;

DO $$ BEGIN
  RAISE NOTICE 'v712_move_pids_to_governance_standards.sql applied';
END $$;
