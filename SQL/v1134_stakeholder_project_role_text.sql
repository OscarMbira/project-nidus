-- =============================================================================
-- v1134: Stakeholder project role can hold more than one value
-- public.stakeholders and sim.practice_stakeholder_register
-- The form stores one role per line in project_role. Widen VARCHAR(200) to TEXT
-- so several role names fit. Existing single values are unchanged.
-- Run in Supabase after v35 / v240.
-- =============================================================================

ALTER TABLE public.stakeholders
  ALTER COLUMN project_role TYPE TEXT;

COMMENT ON COLUMN public.stakeholders.project_role IS
  'Roles this stakeholder holds on the project, one per line.';

ALTER TABLE sim.practice_stakeholder_register
  ALTER COLUMN project_role TYPE TEXT;

COMMENT ON COLUMN sim.practice_stakeholder_register.project_role IS
  'Roles this stakeholder holds on the practice project, one per line.';
