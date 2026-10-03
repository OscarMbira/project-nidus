-- v1077: allocation period dates on team members
ALTER TABLE public.team_members
  ADD COLUMN IF NOT EXISTS allocation_start_date DATE,
  ADD COLUMN IF NOT EXISTS allocation_end_date DATE;

COMMENT ON COLUMN public.team_members.allocation_start_date IS
  'Planned start date for this member allocation on the team.';
COMMENT ON COLUMN public.team_members.allocation_end_date IS
  'Planned end date for this member allocation on the team.';

ALTER TABLE sim.practice_team_members
  ADD COLUMN IF NOT EXISTS allocation_start_date DATE,
  ADD COLUMN IF NOT EXISTS allocation_end_date DATE;

COMMENT ON COLUMN sim.practice_team_members.allocation_start_date IS
  'Planned start date for this practice member allocation.';
COMMENT ON COLUMN sim.practice_team_members.allocation_end_date IS
  'Planned end date for this practice member allocation.';

DO $$ BEGIN
  RAISE NOTICE 'v1077_team_members_allocation_dates.sql applied';
END $$;
