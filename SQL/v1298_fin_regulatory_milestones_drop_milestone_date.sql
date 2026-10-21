-- ============================================================================
-- v1298: Regulatory Milestones — retire legacy "Milestone Date" field
-- ============================================================================
-- An older field definition, milestone_date ("Milestone Date", created 2026-08-21), duplicates
-- the v1296 due_date ("Due Date", Deadline & Accountability tab) on the Regulatory Milestones
-- register (fin_regulatory_milestones, 00000000-0000-4000-9001-000000000005). Owner decision
-- 2026-10-21: move any values into due_date, then remove the old values and the field.
--
-- Steps (one transaction):
--   1. Copy milestone_date -> due_date on records where due_date is empty (never overwrites).
--   2. Strip the milestone_date key from every record's field_values.
--   3. Delete the milestone_date field definition.
-- Platform only (the Simulator has no FIN registers). Idempotent: re-running finds nothing to do.
-- ============================================================================

BEGIN;

-- 1. Move values into Due Date (only where Due Date is not already set)
UPDATE public.local_register_records
SET field_values = jsonb_set(field_values, '{due_date}', field_values->'milestone_date'),
    updated_at = NOW()
WHERE register_id = '00000000-0000-4000-9001-000000000005'::uuid
  AND COALESCE(field_values->>'milestone_date', '') <> ''
  AND COALESCE(field_values->>'due_date', '') = '';

-- 2. Remove the old values
UPDATE public.local_register_records
SET field_values = field_values - 'milestone_date',
    updated_at = NOW()
WHERE register_id = '00000000-0000-4000-9001-000000000005'::uuid
  AND field_values ? 'milestone_date';

-- 3. Remove the field definition
DELETE FROM public.local_register_fields
WHERE register_id = '00000000-0000-4000-9001-000000000005'::uuid
  AND field_key = 'milestone_date';

COMMIT;

DO $$
DECLARE
  v_fields INT;
  v_leftover INT;
BEGIN
  SELECT COUNT(*) INTO v_fields FROM public.local_register_fields
  WHERE register_id = '00000000-0000-4000-9001-000000000005'::uuid;
  SELECT COUNT(*) INTO v_leftover FROM public.local_register_records
  WHERE register_id = '00000000-0000-4000-9001-000000000005'::uuid AND field_values ? 'milestone_date';
  RAISE NOTICE 'v1298: Regulatory Milestones now has % fields (expected 15); % records still hold milestone_date (expected 0)', v_fields, v_leftover;
END $$;
