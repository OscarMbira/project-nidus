-- v1076: required_skills per team functional role (role ↔ skills association)
ALTER TABLE public.team_functional_roles
  ADD COLUMN IF NOT EXISTS required_skills TEXT;

COMMENT ON COLUMN public.team_functional_roles.required_skills IS
  'Skills required for this functional role (plain text; prefer one skill per line).';

ALTER TABLE sim.practice_team_functional_roles
  ADD COLUMN IF NOT EXISTS required_skills TEXT;

COMMENT ON COLUMN sim.practice_team_functional_roles.required_skills IS
  'Skills required for this practice functional role (plain text; prefer one skill per line).';

DO $$ BEGIN
  RAISE NOTICE 'v1076_team_functional_roles_required_skills.sql applied';
END $$;
