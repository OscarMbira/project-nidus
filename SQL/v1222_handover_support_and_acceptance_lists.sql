-- v1222: handover support arrangements and operational acceptance are multi-value
-- lists stored as newline-joined text. Add the columns when missing, and widen
-- them to TEXT so a longer list is not truncated.
-- Safe to run more than once.

ALTER TABLE public.project_handover
  ADD COLUMN IF NOT EXISTS support_arrangements TEXT,
  ADD COLUMN IF NOT EXISTS operational_acceptance TEXT;

ALTER TABLE public.project_handover
  ALTER COLUMN support_arrangements TYPE TEXT,
  ALTER COLUMN operational_acceptance TYPE TEXT;

SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'project_handover'
  AND column_name IN ('support_arrangements', 'operational_acceptance')
ORDER BY column_name;
