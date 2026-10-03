-- ============================================================================
-- v1031: De-duplicate + guard issue_registers / risk_registers against
-- multiple live rows per project (RAID "Loading Issue Register..." crash fix)
-- ============================================================================
-- Live symptom: /pm/controls/issue-register threw a raw browser alert() --
-- "Error: JSON object requested, multiple (or no) rows returned" -- a PostgREST
-- error from issueRegisterService.js's getIssueRegisterByProject() calling
-- .single() on a query that matched MORE than one row for this project.
--
-- Both v172 (risk_registers) and v174 (issue_registers) declare
-- `project_id UUID UNIQUE NOT NULL` inline on CREATE TABLE IF NOT EXISTS -- but
-- if either table already existed in this environment before those migrations
-- ran (a real possibility given this codebase's long history), IF NOT EXISTS
-- would have silently skipped creating that constraint, leaving the live table
-- with no uniqueness guarantee at all despite the migration file claiming one.
-- That would explain duplicate register rows accumulating from repeated
-- get-or-create races (two near-simultaneous page loads both finding "no
-- register yet" and both inserting one).
--
-- This migration is defensive regardless of which theory is correct:
--   1. De-duplicates any existing extra rows per project (keeps the oldest,
--      soft-deletes the rest) -- required before a unique index can be added.
--   2. Adds a partial unique index (IF NOT EXISTS, safe whether or not v172/
--      v174's inline UNIQUE is actually live) so this can never recur.
-- The client-side fix (issueRegisterService.js / riskRegisterService.js no
-- longer using .single() for this lookup) already ships independently of
-- this migration, so the page stops crashing even before this is run.
-- ============================================================================

-- ── 1. De-duplicate risk_registers (keep oldest active row per project) ─────────────────────

WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (PARTITION BY project_id ORDER BY created_at ASC, id ASC) AS rn
  FROM public.risk_registers
  WHERE COALESCE(is_deleted, FALSE) = FALSE
)
UPDATE public.risk_registers
SET is_deleted = TRUE
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

-- ── 2. De-duplicate issue_registers (keep oldest active row per project) ────────────────────

WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (PARTITION BY project_id ORDER BY created_at ASC, id ASC) AS rn
  FROM public.issue_registers
  WHERE COALESCE(is_deleted, FALSE) = FALSE
)
UPDATE public.issue_registers
SET is_deleted = TRUE
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

-- ── 3. Guard against recurrence ──────────────────────────────────────────────────────────────

CREATE UNIQUE INDEX IF NOT EXISTS uq_risk_registers_project_active
  ON public.risk_registers(project_id)
  WHERE COALESCE(is_deleted, FALSE) = FALSE;

CREATE UNIQUE INDEX IF NOT EXISTS uq_issue_registers_project_active
  ON public.issue_registers(project_id)
  WHERE COALESCE(is_deleted, FALSE) = FALSE;

DO $$
BEGIN
  RAISE NOTICE '================================================';
  RAISE NOTICE 'v1031: risk_registers / issue_registers de-duplicated and guarded against future duplicates';
  RAISE NOTICE '================================================';
END $$;

-- Post-run verification (run manually):
--   SELECT project_id, COUNT(*) FROM public.risk_registers WHERE COALESCE(is_deleted, FALSE) = FALSE GROUP BY project_id HAVING COUNT(*) > 1;
--   SELECT project_id, COUNT(*) FROM public.issue_registers WHERE COALESCE(is_deleted, FALSE) = FALSE GROUP BY project_id HAVING COUNT(*) > 1;
--   -- both should return zero rows.
