-- =============================================================================
-- v1097: Structured decision flow entries (JSONB)
-- Prerequisites: v1020, v1095
-- =============================================================================

ALTER TABLE public.project_governance_structure
  ADD COLUMN IF NOT EXISTS decision_entries JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.project_governance_structure.decision_entries IS
  'v1097: Array of { decision, decided_by, method, notes }. Decided by from bodies / members / roles.';

-- Best-effort migrate legacy newline decision_flow into structured rows (only when JSON empty)
UPDATE public.project_governance_structure g
SET decision_entries = sub.entries
FROM (
  SELECT
    id,
    COALESCE(
      (
        SELECT jsonb_agg(entry ORDER BY ord)
        FROM (
          SELECT
            ord,
            jsonb_build_object(
              'decision', trim(line),
              'decided_by', '',
              'method', '',
              'notes', ''
            ) AS entry
          FROM unnest(string_to_array(decision_flow, E'\n')) WITH ORDINALITY AS t(line, ord)
          WHERE NULLIF(trim(line), '') IS NOT NULL
        ) x
      ),
      '[]'::jsonb
    ) AS entries
  FROM public.project_governance_structure
  WHERE COALESCE(decision_entries, '[]'::jsonb) = '[]'::jsonb
    AND NULLIF(btrim(COALESCE(decision_flow, '')), '') IS NOT NULL
) sub
WHERE g.id = sub.id;

DO $$
BEGIN
  RAISE NOTICE 'v1097: decision_entries JSONB added (with legacy migrate from decision_flow)';
END $$;
