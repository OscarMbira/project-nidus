-- =============================================================================
-- v963b: Assumptions Register — schema (Platform + Simulator)
-- =============================================================================
-- projectplan/v963_pmis_core_gap_closure_plan.md Phase 3 / projectprd/v963_pmis_core_gap_closure_PRD.md
-- user story 1.
--
-- CORRECTED after a failed first run (ERROR 42703: column "validation_status" does not exist).
-- Root cause: public.assumptions already existed — created by SQL/v26_risk_management.sql as
-- part of the RAID log feature, with its own validation lifecycle (status/validation_date/
-- validated_by_user_id/validation_notes) and a RAID log view already reading it. The original
-- version of this file ran `CREATE TABLE IF NOT EXISTS public.assumptions (...)` with a
-- different column shape, which silently no-op'd against the pre-existing table, then failed on
-- `CREATE INDEX ... (validation_status)` — that column never existed on the real table.
--
-- Per explicit instruction, this feature now targets v26's EXISTING public.assumptions table
-- instead of a parallel one. Only the one genuinely new capability — a real FK back to the
-- risk/issue an assumption was converted into, instead of duplicating its text with no
-- traceability back — is added, via ALTER TABLE. apps/platform/src/services/assumptionService.js
-- was rewritten to read/write v26's real columns (assumption_title/assumption_description/
-- status/validation_notes) and maps them to/from the simpler assumption_text/validation_status/
-- notes shape the three Assumptions Register pages (List/Detail/Form) already use — v26's fuller
-- shape (code/category/impact/dates/tags) would be more form than this simple CRUD flow needs
-- (rule 62).
--
-- sim.assumptions is UNAFFECTED by this correction — no pre-existing Simulator table collided
-- (v26 is Platform/public-schema only), so it is still created fresh in its original, simpler
-- shape below; apps/simulator/src/services/assumptionService.js needs no changes.
--
-- No display_id / Admin ID Generation wiring (rule 16.2) — this table has no natural
-- human-readable reference column (v26's optional assumption_code is a free-text field, not an
-- Admin ID Generation target), so the UUID in the URL is acceptable per rule 16.3's explicit
-- exception (same call already made for Cost Actuals and unified Approvals in this same PRD).
--
-- Prerequisites: public.projects/risks/issues/users/assumptions (v26 — core + RAID log),
-- sim.practice_projects/practice_risks/practice_issues/practice_project_memberships
-- (v80/v227/v232/v233).
-- =============================================================================

-- ── 1. public.assumptions — extend the existing v26 table ──────────────────────
-- Adds only the conversion-linkage columns; the rest of the table (title/description/status/
-- validation lifecycle/etc.) already exists from v26 and is left untouched.

ALTER TABLE public.assumptions ADD COLUMN IF NOT EXISTS converted_to_risk_id UUID REFERENCES public.risks(id) ON DELETE SET NULL;
ALTER TABLE public.assumptions ADD COLUMN IF NOT EXISTS converted_to_issue_id UUID REFERENCES public.issues(id) ON DELETE SET NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_assumptions_single_conversion'
  ) THEN
    ALTER TABLE public.assumptions ADD CONSTRAINT chk_assumptions_single_conversion CHECK (
      NOT (converted_to_risk_id IS NOT NULL AND converted_to_issue_id IS NOT NULL)
    );
  END IF;
END $$;

COMMENT ON COLUMN public.assumptions.converted_to_risk_id IS
  'v963b: FK to the risk this assumption was converted into (Convert to Risk action). NULL otherwise.';
COMMENT ON COLUMN public.assumptions.converted_to_issue_id IS
  'v963b: FK to the issue this assumption was converted into (Convert to Issue action). NULL otherwise.';

-- Note: RLS is intentionally left untouched on public.assumptions. It is a pre-existing, already
-- live table (v26 RAID log feature) with no RLS defined anywhere in this repo's SQL history —
-- enabling it now would be a behaviour change to the existing RAID log feature, which is out of
-- scope for "add a conversion link to assumptions." If RLS is wanted here, it should be its own,
-- separately reviewed migration that audits every existing consumer of this table first.

-- ── 2. sim.assumptions ──────────────────────────────────────────────────────────
-- No pre-existing Simulator table collided (v26 never touched the sim schema), so this remains
-- the original, simpler design — unaffected by the public.assumptions correction above.

CREATE TABLE IF NOT EXISTS sim.assumptions (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id             UUID NOT NULL REFERENCES sim.practice_projects(id) ON DELETE CASCADE,
  assumption_text        TEXT NOT NULL,
  -- unvalidated (default, not yet reviewed) -> validated (confirmed true, stays an assumption) or
  -- invalidated (confirmed false — normally followed by a Convert to Risk/Issue action, which
  -- sets converted_to_risk_id/converted_to_issue_id below rather than duplicating the text).
  validation_status      VARCHAR(20) NOT NULL DEFAULT 'unvalidated'
                           CHECK (validation_status IN ('unvalidated', 'validated', 'invalidated')),
  owner_user_id          UUID REFERENCES public.users(id),
  converted_to_risk_id   UUID REFERENCES sim.practice_risks(id) ON DELETE SET NULL,
  converted_to_issue_id  UUID REFERENCES sim.practice_issues(id) ON DELETE SET NULL,
  notes                  TEXT,
  is_deleted             BOOLEAN NOT NULL DEFAULT FALSE,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by             UUID REFERENCES public.users(id),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by             UUID REFERENCES public.users(id),
  CONSTRAINT chk_sim_assumptions_single_conversion CHECK (
    NOT (converted_to_risk_id IS NOT NULL AND converted_to_issue_id IS NOT NULL)
  )
);

COMMENT ON TABLE sim.assumptions IS
  'v963b: standalone Simulator Assumptions Register, scoped to the practice hierarchy '
  '(sim.practice_projects). No Platform equivalent existed pre-v963 in the sim schema, so this '
  'keeps its original simple shape rather than mirroring public.assumptions'' (v26) fuller one.';

CREATE INDEX IF NOT EXISTS idx_sim_assumptions_project ON sim.assumptions(project_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_sim_assumptions_owner ON sim.assumptions(owner_user_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_sim_assumptions_validation_status ON sim.assumptions(validation_status) WHERE is_deleted = FALSE;

-- ── 3. database_tables registry ─────────────────────────────────────────────────

INSERT INTO public.database_tables (table_name, table_description, is_system_table, is_active)
VALUES
  ('assumptions', 'Assumptions Register (RAID log, v26): tracked project assumptions with a validation lifecycle; v963 added converted_to_risk_id/converted_to_issue_id for real conversion traceability to a Risk/Issue.', false, true),
  ('sim.assumptions', 'Assumptions Register (Simulator): standalone practice-hierarchy assumptions with a validation lifecycle and optional conversion to a risk/issue (v963)', false, true)
ON CONFLICT (table_name) DO UPDATE SET
  table_description = EXCLUDED.table_description,
  is_system_table = EXCLUDED.is_system_table,
  updated_at = NOW();

-- ── 4. RLS — sim.assumptions ────────────────────────────────────────────────────
-- Fresh table, no pre-existing consumers — safe to fully lock down as designed. Mirrors v938-
-- style sim project-scope check: practice_projects.user_id (owner) OR an active
-- sim.practice_project_memberships row, both matched directly against auth.uid() (v389
-- convention — no join through public.users needed in sim).

ALTER TABLE sim.assumptions ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON sim.assumptions TO authenticated;
GRANT ALL ON sim.assumptions TO service_role;

DROP POLICY IF EXISTS policy_sim_assumptions_select ON sim.assumptions;
CREATE POLICY policy_sim_assumptions_select ON sim.assumptions
  FOR SELECT TO authenticated
  USING (
    is_deleted = FALSE
    AND EXISTS (
      SELECT 1 FROM sim.practice_projects pp
      WHERE pp.id = assumptions.project_id
        AND (pp.user_id = auth.uid() OR EXISTS (
          SELECT 1 FROM sim.practice_project_memberships m
          WHERE m.practice_project_id = pp.id AND m.user_id = auth.uid() AND m.is_active = TRUE
        ))
    )
  );

DROP POLICY IF EXISTS policy_sim_assumptions_insert ON sim.assumptions;
CREATE POLICY policy_sim_assumptions_insert ON sim.assumptions
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM sim.practice_projects pp
      WHERE pp.id = assumptions.project_id
        AND (pp.user_id = auth.uid() OR EXISTS (
          SELECT 1 FROM sim.practice_project_memberships m
          WHERE m.practice_project_id = pp.id AND m.user_id = auth.uid() AND m.is_active = TRUE
        ))
    )
  );

DROP POLICY IF EXISTS policy_sim_assumptions_update ON sim.assumptions;
CREATE POLICY policy_sim_assumptions_update ON sim.assumptions
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM sim.practice_projects pp
      WHERE pp.id = assumptions.project_id
        AND (pp.user_id = auth.uid() OR EXISTS (
          SELECT 1 FROM sim.practice_project_memberships m
          WHERE m.practice_project_id = pp.id AND m.user_id = auth.uid() AND m.is_active = TRUE
        ))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM sim.practice_projects pp
      WHERE pp.id = assumptions.project_id
        AND (pp.user_id = auth.uid() OR EXISTS (
          SELECT 1 FROM sim.practice_project_memberships m
          WHERE m.practice_project_id = pp.id AND m.user_id = auth.uid() AND m.is_active = TRUE
        ))
    )
  );

DO $$ BEGIN
  RAISE NOTICE 'v963b_assumptions_register_schema.sql applied successfully';
END $$;
