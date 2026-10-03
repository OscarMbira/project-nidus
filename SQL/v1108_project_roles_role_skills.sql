-- ============================================================================
-- v1108: role_skills on project_roles + source_project_role_id on the project
--        functional-roles catalogs (Platform public + Simulator sim)
-- ============================================================================
-- projectplan/v1105_project_roles_from_role_library_plan.md Phase 0.
-- Foundation for "Add from Built-in Roles" (v1105): lets the role catalog
-- (public.project_roles — built-in + org custom roles) carry Required Skills,
-- and lets a project's functional-roles catalog remember which library role a
-- row was copied from (traceability only; the project's own row is always the
-- one used by team assignment / task screens — copying never re-links live).
-- ============================================================================

-- ── 1. public.project_roles.role_skills ─────────────────────────────────────
-- Same shape as project_functional_roles.required_skills: newline-joined text
-- (MultiLineListInput), nullable at the column level but enforced NOT BLANK by
-- the SECURITY DEFINER functions in v1110, not a CHECK here (RLS gives no
-- client UPDATE path to this table at all — see v99/v100 policies).

ALTER TABLE public.project_roles ADD COLUMN IF NOT EXISTS role_skills TEXT;

COMMENT ON COLUMN public.project_roles.role_skills IS
  'v1108: Required skills for this role (built-in or org custom), newline-joined. '
  'Mandatory going forward via create_org_custom_role/update_org_custom_role/update_builtin_role (v1110).';

-- ── 2. public.project_functional_roles.source_project_role_id ──────────────

ALTER TABLE public.project_functional_roles
  ADD COLUMN IF NOT EXISTS source_project_role_id UUID REFERENCES public.project_roles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_project_functional_roles_source_role
  ON public.project_functional_roles (source_project_role_id)
  WHERE source_project_role_id IS NOT NULL;

COMMENT ON COLUMN public.project_functional_roles.source_project_role_id IS
  'v1108: The public.project_roles row this catalog entry was added from via '
  '"Add from Built-in Roles" (v1105). NULL for hand-created rows. Traceability only.';

-- ── 3. sim.practice_project_functional_roles.source_project_role_id ────────
-- References public.project_roles (the role library is shared, not duplicated per schema).

ALTER TABLE sim.practice_project_functional_roles
  ADD COLUMN IF NOT EXISTS source_project_role_id UUID REFERENCES public.project_roles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_sim_practice_project_functional_roles_source_role
  ON sim.practice_project_functional_roles (source_project_role_id)
  WHERE source_project_role_id IS NOT NULL;

COMMENT ON COLUMN sim.practice_project_functional_roles.source_project_role_id IS
  'v1108: The public.project_roles row this catalog entry was added from via '
  '"Add from Built-in Roles" (v1105). NULL for hand-created rows. Traceability only.';

DO $$
BEGIN
  RAISE NOTICE 'v1108_project_roles_role_skills.sql applied successfully';
END $$;
