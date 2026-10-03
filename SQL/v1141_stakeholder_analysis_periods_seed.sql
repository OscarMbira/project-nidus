-- ============================================================================
-- v1141 seed: shared Stakeholder Analysis periods
-- ============================================================================
-- Run SQL/v1141_stakeholder_analysis_periods.sql first (it already inserts
-- these rows). This file is safe to run again: existing names are left as-is.
-- These rows have no organisation, so every organisation sees them.
-- ============================================================================

INSERT INTO public.stakeholder_analysis_periods (period_name, is_system, account_id)
SELECT seed.period_name, TRUE, NULL
FROM (
  VALUES
    ('Initiation'),
    ('Planning'),
    ('Execution'),
    ('Monitoring and control'),
    ('Closure'),
    ('Weekly'),
    ('Fortnightly'),
    ('Monthly'),
    ('Quarterly'),
    ('Annual'),
    ('Stage review'),
    ('Benefits review')
) AS seed(period_name)
WHERE NOT EXISTS (
  SELECT 1
  FROM public.stakeholder_analysis_periods existing
  WHERE existing.account_id IS NULL
    AND existing.is_deleted = FALSE
    AND lower(btrim(existing.period_name)) = lower(btrim(seed.period_name))
);
