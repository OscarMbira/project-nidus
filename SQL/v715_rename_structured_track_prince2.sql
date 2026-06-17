-- =============================================================================
-- v715: Rename [S] methodology track label to "Predictive - PRINCE2"
-- Runtime label: src/config/methodologyMenuUtils.js (METHODOLOGY_TRACK_DEFS)
-- =============================================================================

UPDATE public.menu_items
SET menu_label = 'Predictive - PRINCE2',
    updated_at = NOW()
WHERE menu_code IN ('plat_sec_structured', 'plat_track_structured')
  AND COALESCE(is_deleted, FALSE) = FALSE;

DO $$ BEGIN
  RAISE NOTICE 'v715_rename_structured_track_prince2.sql applied';
END $$;
