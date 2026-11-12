-- ============================================================================
-- v1446: Simulator parity — sim.assumptions.impact_if_invalid (Core PM wave 4)
-- ============================================================================
-- PRD/plan v1340, wave 4. The Platform assumption form now shows "Impact if this assumption proves
-- wrong" (public.assumptions.impact_if_invalid, v26). The Simulator form mirrors it, but
-- sim.assumptions (v963b) has no such column, so it is added here. Idempotent.
-- ============================================================================

ALTER TABLE sim.assumptions ADD COLUMN IF NOT EXISTS impact_if_invalid TEXT;

COMMENT ON COLUMN sim.assumptions.impact_if_invalid IS
  'v1446: what happens to the practice project if the assumption turns out to be false (parity with public.assumptions).';

-- Check: the column now exists.
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'sim' AND table_name = 'assumptions' AND column_name = 'impact_if_invalid';

NOTIFY pgrst, 'reload schema';
