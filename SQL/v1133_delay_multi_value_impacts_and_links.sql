-- =============================================================================
-- v1133: Delay impact and link fields can hold more than one value
-- Platform public.project_delays and Simulator sim.project_delays
-- Run in Supabase after v444 / v445.
-- Existing single values are copied into the new list columns.
-- The original numeric / single-id columns stay: days and cost store the
-- total of the list, and the first linked id stays in the single-id column
-- so auto-link triggers keep working.
-- =============================================================================

ALTER TABLE public.project_delays
  ADD COLUMN IF NOT EXISTS impact_schedule_entries TEXT,
  ADD COLUMN IF NOT EXISTS impact_cost_entries TEXT,
  ADD COLUMN IF NOT EXISTS linked_issue_ids UUID[],
  ADD COLUMN IF NOT EXISTS linked_risk_ids UUID[],
  ADD COLUMN IF NOT EXISTS linked_defect_ids UUID[],
  ADD COLUMN IF NOT EXISTS linked_work_package_ids UUID[],
  ADD COLUMN IF NOT EXISTS linked_change_request_ids UUID[];

COMMENT ON COLUMN public.project_delays.impact_schedule_entries IS
  'Schedule impact day counts, one per line. impact_schedule_days is their total.';
COMMENT ON COLUMN public.project_delays.impact_cost_entries IS
  'Cost impact amounts, one per line (10k / 3m allowed). impact_cost is their total.';
COMMENT ON COLUMN public.project_delays.impact_scope IS
  'Scope impacts, one per line.';
COMMENT ON COLUMN public.project_delays.linked_issue_ids IS
  'All linked issue ids. linked_issue_id is the first.';
COMMENT ON COLUMN public.project_delays.linked_risk_ids IS
  'All linked risk ids. linked_risk_id is the first.';
COMMENT ON COLUMN public.project_delays.linked_defect_ids IS
  'All linked defect ids. linked_defect_id is the first.';
COMMENT ON COLUMN public.project_delays.linked_work_package_ids IS
  'All linked work package ids. linked_work_package_id is the first.';
COMMENT ON COLUMN public.project_delays.linked_change_request_ids IS
  'All linked change request ids. linked_change_request_id is the first.';

UPDATE public.project_delays
SET impact_schedule_entries = impact_schedule_days::text
WHERE impact_schedule_days IS NOT NULL
  AND (impact_schedule_entries IS NULL OR btrim(impact_schedule_entries) = '');

UPDATE public.project_delays
SET impact_cost_entries = impact_cost::text
WHERE impact_cost IS NOT NULL
  AND (impact_cost_entries IS NULL OR btrim(impact_cost_entries) = '');

UPDATE public.project_delays
SET linked_issue_ids = ARRAY[linked_issue_id]
WHERE linked_issue_id IS NOT NULL
  AND (linked_issue_ids IS NULL OR cardinality(linked_issue_ids) = 0);

UPDATE public.project_delays
SET linked_risk_ids = ARRAY[linked_risk_id]
WHERE linked_risk_id IS NOT NULL
  AND (linked_risk_ids IS NULL OR cardinality(linked_risk_ids) = 0);

UPDATE public.project_delays
SET linked_defect_ids = ARRAY[linked_defect_id]
WHERE linked_defect_id IS NOT NULL
  AND (linked_defect_ids IS NULL OR cardinality(linked_defect_ids) = 0);

UPDATE public.project_delays
SET linked_work_package_ids = ARRAY[linked_work_package_id]
WHERE linked_work_package_id IS NOT NULL
  AND (linked_work_package_ids IS NULL OR cardinality(linked_work_package_ids) = 0);

UPDATE public.project_delays
SET linked_change_request_ids = ARRAY[linked_change_request_id]
WHERE linked_change_request_id IS NOT NULL
  AND (linked_change_request_ids IS NULL OR cardinality(linked_change_request_ids) = 0);

ALTER TABLE sim.project_delays
  ADD COLUMN IF NOT EXISTS impact_schedule_entries TEXT,
  ADD COLUMN IF NOT EXISTS impact_cost_entries TEXT,
  ADD COLUMN IF NOT EXISTS linked_issue_ids UUID[],
  ADD COLUMN IF NOT EXISTS linked_risk_ids UUID[],
  ADD COLUMN IF NOT EXISTS linked_defect_ids UUID[],
  ADD COLUMN IF NOT EXISTS linked_work_package_ids UUID[],
  ADD COLUMN IF NOT EXISTS linked_change_request_ids UUID[];

COMMENT ON COLUMN sim.project_delays.impact_schedule_entries IS
  'Schedule impact day counts, one per line. impact_schedule_days is their total.';
COMMENT ON COLUMN sim.project_delays.impact_cost_entries IS
  'Cost impact amounts, one per line (10k / 3m allowed). impact_cost is their total.';
COMMENT ON COLUMN sim.project_delays.impact_scope IS
  'Scope impacts, one per line.';

UPDATE sim.project_delays
SET impact_schedule_entries = impact_schedule_days::text
WHERE impact_schedule_days IS NOT NULL
  AND (impact_schedule_entries IS NULL OR btrim(impact_schedule_entries) = '');

UPDATE sim.project_delays
SET impact_cost_entries = impact_cost::text
WHERE impact_cost IS NOT NULL
  AND (impact_cost_entries IS NULL OR btrim(impact_cost_entries) = '');

UPDATE sim.project_delays
SET linked_issue_ids = ARRAY[linked_issue_id]
WHERE linked_issue_id IS NOT NULL
  AND (linked_issue_ids IS NULL OR cardinality(linked_issue_ids) = 0);

UPDATE sim.project_delays
SET linked_risk_ids = ARRAY[linked_risk_id]
WHERE linked_risk_id IS NOT NULL
  AND (linked_risk_ids IS NULL OR cardinality(linked_risk_ids) = 0);

UPDATE sim.project_delays
SET linked_defect_ids = ARRAY[linked_defect_id]
WHERE linked_defect_id IS NOT NULL
  AND (linked_defect_ids IS NULL OR cardinality(linked_defect_ids) = 0);

UPDATE sim.project_delays
SET linked_work_package_ids = ARRAY[linked_work_package_id]
WHERE linked_work_package_id IS NOT NULL
  AND (linked_work_package_ids IS NULL OR cardinality(linked_work_package_ids) = 0);

UPDATE sim.project_delays
SET linked_change_request_ids = ARRAY[linked_change_request_id]
WHERE linked_change_request_id IS NOT NULL
  AND (linked_change_request_ids IS NULL OR cardinality(linked_change_request_ids) = 0);
