-- =============================================================================
-- v797: Rename [P] methodology track label "PMBOK" → "Standards-Based"
-- (Platform + Simulator, public.menu_items — same table drives both apps,
--  distinguished by menu_code prefix plat_*/sim_*)
--
-- Why: PMBOK is a PMI trademark, same risk category as "PRINCE2" (already
-- renamed to "Structured" per CLAUDE rule 27). Companion Admin app rename:
-- project-nidus-admin/projectplans/v194_global_template_methodology_label_rename_plan.md
--
-- Scope: display label only. menu_code values and the `methodology` column
-- ('pmbok' | 'structured' | 'agile') are unchanged — only human-readable text.
-- Runtime label mirror: apps/platform + apps/simulator + packages/config +
-- src (legacy) config/methodologyMenuUtils.js (METHODOLOGY_TRACK_DEFS).
-- =============================================================================

UPDATE public.menu_items
SET menu_label = REPLACE(menu_label, 'PMBOK', 'Standards-Based'),
    updated_at = NOW()
WHERE menu_label LIKE '%PMBOK%'
  AND COALESCE(is_deleted, FALSE) = FALSE;

DO $$ BEGIN
  RAISE NOTICE 'v797_rename_pmbok_track_label_standards_based.sql applied';
END $$;
