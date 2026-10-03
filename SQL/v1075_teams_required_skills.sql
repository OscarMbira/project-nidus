-- v1075: team-level required_skills (independent of members)
-- Roles continue to live in team_functional_roles; skills are stored on teams.

ALTER TABLE public.teams
  ADD COLUMN IF NOT EXISTS required_skills TEXT;

COMMENT ON COLUMN public.teams.required_skills IS
  'Team-level required skills (plain text; prefer one skill per line).';

ALTER TABLE sim.practice_teams
  ADD COLUMN IF NOT EXISTS required_skills TEXT;

COMMENT ON COLUMN sim.practice_teams.required_skills IS
  'Practice team-level required skills (plain text; prefer one skill per line).';

DO $$ BEGIN
  RAISE NOTICE 'v1075_teams_required_skills.sql applied';
END $$;
