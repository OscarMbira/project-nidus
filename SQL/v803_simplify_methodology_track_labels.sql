-- =============================================================================
-- v803: Simplify [S]/[P]/[A] methodology track labels
-- Drops "Predictive -"/"Adaptive -" prefixes; fixes two real problems:
--   1. "Predictive - PRINCE2" displayed the literal trademarked word PRINCE2
--      to end users (CLAUDE rule 27) — same class of issue already fixed for
--      PMBOK (v794/v798). "Structured" was already the correct internal name.
--   2. "Predictive - Standards-Based" truncates in the sidebar ("Standards-...").
-- Runtime label: config/methodologyMenuUtils.js (METHODOLOGY_TRACK_DEFS) — the
-- actual authority for what renders; this DB update just keeps the menu_items
-- rows from going stale, same pattern as v715/v716/v717.
-- Platform only — Simulator's sim_sec_structured/sim_sec_agile rows never
-- carried "Predictive -"/"PRINCE2" wording (already "[S] Practice – Structured" /
-- "[A] Practice – Agile & Lean"), so no Simulator DB change is needed here.
-- =============================================================================

UPDATE public.menu_items
SET menu_label = 'Structured',
    updated_at = NOW()
WHERE menu_code IN ('plat_sec_structured', 'plat_track_structured')
  AND COALESCE(is_deleted, FALSE) = FALSE;

UPDATE public.menu_items
SET menu_label = 'Standards-Based',
    updated_at = NOW()
WHERE menu_code IN ('plat_sec_standards_based', 'plat_track_standards_based')
  AND COALESCE(is_deleted, FALSE) = FALSE;

UPDATE public.menu_items
SET menu_label = 'Agile',
    updated_at = NOW()
WHERE menu_code IN ('plat_sec_agile', 'plat_track_agile')
  AND COALESCE(is_deleted, FALSE) = FALSE;

DO $$ BEGIN
  RAISE NOTICE 'v803_simplify_methodology_track_labels.sql applied';
END $$;
