-- =============================================================================
-- v717: Rename [A] methodology track label to "Adaptive - Agile"
-- Runtime label: src/config/methodologyMenuUtils.js (METHODOLOGY_TRACK_DEFS)
-- =============================================================================

UPDATE public.menu_items
SET menu_label = 'Adaptive - Agile',
    updated_at = NOW()
WHERE menu_code IN ('plat_sec_agile', 'plat_track_agile')
  AND COALESCE(is_deleted, FALSE) = FALSE;

DO $$ BEGIN
  RAISE NOTICE 'v717_rename_agile_track_adaptive.sql applied';
END $$;
