-- =============================================================================
-- v716: Rename [P] methodology track label to "Predictive - PMBOK"
-- Runtime label: src/config/methodologyMenuUtils.js (METHODOLOGY_TRACK_DEFS)
-- =============================================================================

UPDATE public.menu_items
SET menu_label = 'Predictive - PMBOK',
    updated_at = NOW()
WHERE menu_code IN ('plat_sec_pmbok', 'plat_track_pmbok')
  AND COALESCE(is_deleted, FALSE) = FALSE;

DO $$ BEGIN
  RAISE NOTICE 'v716_rename_pmbok_track_label.sql applied';
END $$;
