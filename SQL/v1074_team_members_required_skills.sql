-- v1074: team member required_skills on create/assign
-- Adds free-text required skills (newline-friendly) to platform + simulator team members.

ALTER TABLE public.team_members
  ADD COLUMN IF NOT EXISTS required_skills TEXT;

COMMENT ON COLUMN public.team_members.required_skills IS
  'Required skills for this team assignment (plain text; prefer one skill per line).';

ALTER TABLE sim.practice_team_members
  ADD COLUMN IF NOT EXISTS required_skills TEXT;

COMMENT ON COLUMN sim.practice_team_members.required_skills IS
  'Required skills for this practice team assignment (plain text; prefer one skill per line).';

DO $$ BEGIN
  RAISE NOTICE 'v1074_team_members_required_skills.sql applied';
END $$;
