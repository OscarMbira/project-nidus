-- ============================================================================
-- v1105: Assumptions Register enrichment (Platform public + Simulator sim)
-- ============================================================================
-- projectplan/v1100_constraints_register_and_assumptions_enrichment_plan.md Phase 0 /
-- projectprd/v1100_constraints_register_and_assumptions_enrichment_PRD.md.
--
-- public.assumptions (v26_risk_management.sql) already has owner_user_id, next_review_date and
-- impact_severity columns — they were simply never exposed by the v963 simplified Assumptions
-- Register UI. No new columns needed on public.assumptions. impact_severity has no CHECK
-- constraint in v26; adding one here as NOT VALID so it is enforced going forward without
-- requiring every pre-existing row to already satisfy it (avoids failing this migration on data
-- that predates this feature).
--
-- sim.assumptions (v963b) is missing next_review_date/impact_severity entirely, and its
-- validation_status is a 3-value CHECK (unvalidated/validated/invalidated) — this file widens it
-- to the same 4-value vocabulary (active/validated/invalidated/closed) public.assumptions already
-- has, migrating existing 'unvalidated' rows to 'active' first so the new CHECK is satisfied.
-- ============================================================================

-- ── 1. public.assumptions — impact_severity CHECK (NOT VALID: doesn't require pre-existing rows
--       to already conform) ──────────────────────────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_assumptions_impact_severity'
  ) THEN
    ALTER TABLE public.assumptions
      ADD CONSTRAINT chk_assumptions_impact_severity
      CHECK (impact_severity IS NULL OR impact_severity IN ('low', 'medium', 'high', 'critical'))
      NOT VALID;
  END IF;
END $$;

-- ── 2. sim.assumptions — add the two missing columns ────────────────────────────

ALTER TABLE sim.assumptions ADD COLUMN IF NOT EXISTS next_review_date DATE;
ALTER TABLE sim.assumptions ADD COLUMN IF NOT EXISTS impact_severity VARCHAR(20)
  CHECK (impact_severity IS NULL OR impact_severity IN ('low', 'medium', 'high', 'critical'));

-- ── 3. sim.assumptions — widen validation_status to the real 4-value vocabulary ──
-- Migrate existing 'unvalidated' rows to 'active' before swapping the CHECK, so no existing row
-- violates the new constraint.

UPDATE sim.assumptions SET validation_status = 'active' WHERE validation_status = 'unvalidated';

ALTER TABLE sim.assumptions ALTER COLUMN validation_status SET DEFAULT 'active';

ALTER TABLE sim.assumptions DROP CONSTRAINT IF EXISTS assumptions_validation_status_check;
ALTER TABLE sim.assumptions
  ADD CONSTRAINT assumptions_validation_status_check
  CHECK (validation_status IN ('active', 'validated', 'invalidated', 'closed'));

DO $$ BEGIN
  RAISE NOTICE 'v1105_assumptions_register_enrichment.sql applied successfully';
END $$;
