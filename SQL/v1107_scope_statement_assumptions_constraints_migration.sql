-- ============================================================================
-- v1107: One-time migration — Scope Statement inline Assumptions/Constraints -> registers
-- ============================================================================
-- projectplan/v1100_constraints_register_and_assumptions_enrichment_plan.md Phase 0.
--
-- The Scope Statement page's Assumptions/Constraints tabs previously stored each line as plain
-- text in scope_statements.assumptions / .constraints (TEXT[]). Those tabs now read/write the
-- real Assumptions Register (public.assumptions / sim.assumptions) and the new Constraints
-- Register (public.constraints_register / sim.practice_constraints) instead. This migrates any
-- text already captured before that change shipped, so nothing already entered by a user
-- disappears from view. The old scope_statements.assumptions/.constraints columns are left in
-- place afterwards, unused — no destructive drop.
--
-- Idempotent: every migrated row is tagged with the marker text below in its notes column, and
-- re-running this file will not insert duplicates (NOT EXISTS guard against project + text +
-- marker).
--
-- public.assumptions.identified_by_user_id is NOT NULL (v26) — rows from a scope statement with
-- no created_by are skipped (can't attribute a required "identified by" user); this is expected
-- to be rare, since the Scope Statement save flow always sets created_by.
-- ============================================================================

-- ── 1. public.scope_statements.assumptions -> public.assumptions ───────────────

INSERT INTO public.assumptions (
  project_id, assumption_title, assumption_description, status,
  owner_user_id, identified_by_user_id, identified_date, validation_notes,
  created_by, updated_by
)
SELECT
  ss.project_id,
  LEFT(line, 200),
  line,
  'active',
  NULL,
  ss.created_by,
  CURRENT_DATE,
  'Migrated from Scope Statement (v1100)',
  ss.created_by,
  ss.created_by
FROM public.scope_statements ss
CROSS JOIN LATERAL unnest(ss.assumptions) AS line
WHERE COALESCE(ss.is_deleted, FALSE) = FALSE
  AND ss.created_by IS NOT NULL
  AND trim(line) <> ''
  AND NOT EXISTS (
    SELECT 1 FROM public.assumptions a
    WHERE a.project_id = ss.project_id
      AND a.assumption_description = line
      AND a.validation_notes = 'Migrated from Scope Statement (v1100)'
  );

-- ── 2. public.scope_statements.constraints -> public.constraints_register ──────

INSERT INTO public.constraints_register (
  project_id, constraint_text, status, owner_user_id, notes, created_by, updated_by
)
SELECT
  ss.project_id,
  line,
  'open',
  NULL,
  'Migrated from Scope Statement (v1100)',
  ss.created_by,
  ss.created_by
FROM public.scope_statements ss
CROSS JOIN LATERAL unnest(ss.constraints) AS line
WHERE COALESCE(ss.is_deleted, FALSE) = FALSE
  AND trim(line) <> ''
  AND NOT EXISTS (
    SELECT 1 FROM public.constraints_register c
    WHERE c.project_id = ss.project_id
      AND c.constraint_text = line
      AND c.notes = 'Migrated from Scope Statement (v1100)'
  );

-- ── 3. sim.scope_statements.assumptions -> sim.assumptions ─────────────────────
-- sim.scope_statements has no created_by column, so migrated sim rows have created_by = NULL
-- (nullable on sim.assumptions).

INSERT INTO sim.assumptions (project_id, assumption_text, validation_status, notes)
SELECT
  ss.practice_project_id,
  line,
  'active',
  'Migrated from Scope Statement (v1100)'
FROM sim.scope_statements ss
CROSS JOIN LATERAL unnest(ss.assumptions) AS line
WHERE COALESCE(ss.is_deleted, FALSE) = FALSE
  AND trim(line) <> ''
  AND NOT EXISTS (
    SELECT 1 FROM sim.assumptions a
    WHERE a.project_id = ss.practice_project_id
      AND a.assumption_text = line
      AND a.notes = 'Migrated from Scope Statement (v1100)'
  );

-- ── 4. sim.scope_statements.constraints -> sim.practice_constraints ────────────

INSERT INTO sim.practice_constraints (project_id, constraint_text, status, notes)
SELECT
  ss.practice_project_id,
  line,
  'open',
  'Migrated from Scope Statement (v1100)'
FROM sim.scope_statements ss
CROSS JOIN LATERAL unnest(ss.constraints) AS line
WHERE COALESCE(ss.is_deleted, FALSE) = FALSE
  AND trim(line) <> ''
  AND NOT EXISTS (
    SELECT 1 FROM sim.practice_constraints c
    WHERE c.project_id = ss.practice_project_id
      AND c.constraint_text = line
      AND c.notes = 'Migrated from Scope Statement (v1100)'
  );

DO $$ BEGIN
  RAISE NOTICE 'v1107_scope_statement_assumptions_constraints_migration.sql applied successfully';
END $$;
