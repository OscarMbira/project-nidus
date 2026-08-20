-- ============================================================================
-- v919: SaaS Industry-Aware Tenant Provisioning — Phase 1b (professional_roles schema + seed)
-- ============================================================================
-- See projectprd/v918_saas_industry_tenant_provisioning_PRD.md, decision 4.
--
-- "Professional Role" (what a person does professionally, e.g. "Project Manager") is
-- deliberately a SEPARATE concept from the security/authorization roles system
-- (public.roles / public.project_roles, gated via role_menu_items). It is purely
-- informational/onboarding metadata and MUST NEVER be read by any authorization or RLS
-- check — closing the conflation the audit found already live in production (the
-- accept-invitation edge function currently overwrites users.job_title with the security
-- role's display name; that is fixed separately in v924, the invitation-flow phase).
--
-- DB-driven per rule 25.1 — not a hardcoded JS array, same reasoning as industry_categories.
-- Prerequisites: v03_user_access_tables.sql (users)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.professional_roles (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_code     VARCHAR(50) UNIQUE NOT NULL,
  role_label    VARCHAR(150) NOT NULL,
  description   TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMP NOT NULL DEFAULT NOW(),
  created_by    UUID REFERENCES public.users(id),
  updated_at    TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_by    UUID REFERENCES public.users(id)
);

COMMENT ON TABLE public.professional_roles IS
  'v918/v919: what a person does professionally (e.g. "Project Manager"), captured at '
  'registration/invitation acceptance for onboarding/informational purposes only. NEVER an '
  'authorization input — security/authorization is exclusively public.roles/project_roles via '
  'role_menu_items. Do not add any RLS/permission check that reads this table or '
  'users.professional_role_id.';

ALTER TABLE public.professional_roles ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.professional_roles TO authenticated, anon;
GRANT ALL ON public.professional_roles TO service_role;

DROP POLICY IF EXISTS policy_professional_roles_select_all ON public.professional_roles;
CREATE POLICY policy_professional_roles_select_all
  ON public.professional_roles FOR SELECT
  USING (is_active = TRUE);

INSERT INTO public.professional_roles (role_code, role_label, display_order)
VALUES
  ('project_manager',       'Project Manager',        10),
  ('pmo_professional',      'PMO Professional',       20),
  ('programme_manager',     'Programme Manager',      30),
  ('portfolio_manager',     'Portfolio Manager',      40),
  ('project_administrator', 'Project Administrator',  50),
  ('team_member',           'Team Member',            60),
  ('other',                 'Other',                  70)
ON CONFLICT (role_code) DO UPDATE SET
  role_label = EXCLUDED.role_label,
  display_order = EXCLUDED.display_order,
  is_active = TRUE,
  updated_at = NOW();

-- ── users.professional_role_id ──────────────────────────────────────────────
-- users.job_title stays free text and is left completely alone by this migration — the fix
-- to STOP overwriting it from the security role's display name lives in v924 (invitation flow),
-- since that's a code change (accept-invitation edge function), not a schema change.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS professional_role_id UUID REFERENCES public.professional_roles(id);

COMMENT ON COLUMN public.users.professional_role_id IS
  'v918/v919: informational professional-role tag (e.g. "Project Manager"). NOT an '
  'authorization input. NULL for users who registered/were invited before this column existed '
  '(v922 does not backfill this — there is nothing safe to infer it from).';

CREATE INDEX IF NOT EXISTS idx_users_professional_role_id
  ON public.users(professional_role_id) WHERE professional_role_id IS NOT NULL;

-- ── Database table registration (mandatory) ─────────────────────────────────

INSERT INTO public.database_tables (table_name, table_description, is_system_table, is_active)
VALUES
  ('professional_roles', 'Reference list of professional/job-title labels captured at registration and invitation acceptance — informational only, never an authorization input (v918/v919)', false, true)
ON CONFLICT (table_name) DO UPDATE SET
  table_description = EXCLUDED.table_description,
  is_system_table = EXCLUDED.is_system_table,
  updated_at = NOW();

DO $$
BEGIN
  RAISE NOTICE 'v919: professional_roles schema + seed installed; users.professional_role_id added';
END $$;
