-- =============================================================================
-- v1096: Structured escalation steps + reporting entries (JSONB)
-- Prerequisites: v1020, v1095
-- =============================================================================

ALTER TABLE public.project_governance_structure
  ADD COLUMN IF NOT EXISTS escalation_steps JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS reporting_entries JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.project_governance_structure.escalation_steps IS
  'v1096: Array of { level, whom, timeframe, notes }. Whom from bodies / governance members / project roles.';
COMMENT ON COLUMN public.project_governance_structure.reporting_entries IS
  'v1096: Array of { from_party, to_party, cadence, notes }. Parties from bodies / members / roles.';

-- Best-effort migrate legacy newline lists into structured rows (only when JSON empty)
UPDATE public.project_governance_structure g
SET escalation_steps = sub.steps
FROM (
  SELECT
    id,
    COALESCE(
      (
        SELECT jsonb_agg(step ORDER BY ord)
        FROM (
          SELECT
            ord,
            jsonb_build_object(
              'level', ord,
              'whom', trim(line),
              'timeframe', '',
              'notes', ''
            ) AS step
          FROM unnest(string_to_array(escalation_path, E'\n')) WITH ORDINALITY AS t(line, ord)
          WHERE NULLIF(trim(line), '') IS NOT NULL
        ) x
      ),
      '[]'::jsonb
    ) AS steps
  FROM public.project_governance_structure
  WHERE COALESCE(escalation_steps, '[]'::jsonb) = '[]'::jsonb
    AND NULLIF(btrim(COALESCE(escalation_path, '')), '') IS NOT NULL
) sub
WHERE g.id = sub.id;

UPDATE public.project_governance_structure g
SET reporting_entries = sub.entries
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
              'from_party', '',
              'to_party', '',
              'cadence', '',
              'notes', trim(line)
            ) AS entry
          FROM unnest(string_to_array(reporting_lines, E'\n')) WITH ORDINALITY AS t(line, ord)
          WHERE NULLIF(trim(line), '') IS NOT NULL
        ) x
      ),
      '[]'::jsonb
    ) AS entries
  FROM public.project_governance_structure
  WHERE COALESCE(reporting_entries, '[]'::jsonb) = '[]'::jsonb
    AND NULLIF(btrim(COALESCE(reporting_lines, '')), '') IS NOT NULL
) sub
WHERE g.id = sub.id;

DO $$
BEGIN
  RAISE NOTICE 'v1096: escalation_steps + reporting_entries JSONB added (with legacy migrate)';
END $$;
