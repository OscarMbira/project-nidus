-- ============================================================================
-- v991: Programme-scoped roles & memberships — Phase 3 of v982 SaaS User Journey
-- (Portfolio/Programme-Scoped Roles & Authority Model, brief §14-18)
-- ============================================================================
-- projectplan/v982_phase3_portfolio_programme_authority_plan.md, task A. Mirrors v990's
-- portfolio_roles/portfolio_memberships exactly, substituting programme_id. Supersedes nothing
-- from the dead public.programme_members table (v37) — same reasoning as v990's header re:
-- portfolio_members (shape debt, unreferenced by any RLS policy, left untouched).
--
-- Prerequisites: public.programmes (v37, account_id added by v989), public.users.
-- Write RLS policies for programme_memberships land in v992 (needs has_programme_role(), defined
-- there) — this file creates the tables + read-only/reference policies only.
-- ============================================================================

-- ── 1. public.programme_roles ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.programme_roles (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  programme_id        UUID REFERENCES public.programmes(id) ON DELETE CASCADE, -- NULL = template
  role_name           VARCHAR(100) NOT NULL,
  role_display_name   VARCHAR(200) NOT NULL,
  role_description    TEXT,
  is_system_default   BOOLEAN NOT NULL DEFAULT FALSE,
  is_template         BOOLEAN NOT NULL DEFAULT TRUE,
  role_level          INTEGER NOT NULL DEFAULT 1,
  permissions         JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active           BOOLEAN NOT NULL DEFAULT TRUE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.programme_roles IS
  'v991/v982 Phase 3: programme-scoped role templates + per-programme custom roles, mirroring '
  'project_roles/portfolio_roles exactly. NULL programme_id = template.';

CREATE INDEX IF NOT EXISTS idx_programme_roles_programme_id ON public.programme_roles(programme_id) WHERE programme_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_programme_roles_active ON public.programme_roles(is_active) WHERE is_active = TRUE;

CREATE UNIQUE INDEX IF NOT EXISTS uq_programme_roles_template
  ON public.programme_roles(role_name) WHERE is_template = TRUE AND programme_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_programme_roles_custom
  ON public.programme_roles(programme_id, role_name) WHERE is_template = FALSE AND programme_id IS NOT NULL;

-- ── 2. public.programme_memberships ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.programme_memberships (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  programme_id           UUID NOT NULL REFERENCES public.programmes(id) ON DELETE CASCADE,
  user_id                UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  programme_role_id      UUID NOT NULL REFERENCES public.programme_roles(id) ON DELETE RESTRICT,
  invited_by_user_id     UUID REFERENCES public.users(id),
  invitation_status      VARCHAR(50) NOT NULL DEFAULT 'accepted'
                           CHECK (invitation_status IN ('pending', 'accepted', 'expired', 'declined', 'cancelled')),
  accepted_at            TIMESTAMPTZ DEFAULT NOW(),
  is_active              BOOLEAN NOT NULL DEFAULT TRUE,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_programme_memberships_user UNIQUE (programme_id, user_id)
);

COMMENT ON TABLE public.programme_memberships IS
  'v991/v982 Phase 3: explicit programme-scoped role grants. A user has authority on a programme '
  'only via an active row here (or system_admin) — never inferred from portfolio membership alone.';

CREATE INDEX IF NOT EXISTS idx_programme_memberships_programme_id ON public.programme_memberships(programme_id);
CREATE INDEX IF NOT EXISTS idx_programme_memberships_user_id ON public.programme_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_programme_memberships_role_id ON public.programme_memberships(programme_role_id);
CREATE INDEX IF NOT EXISTS idx_programme_memberships_active ON public.programme_memberships(is_active) WHERE is_active = TRUE;

-- ── 3. Seed template roles ───────────────────────────────────────────────────

INSERT INTO public.programme_roles (programme_id, role_name, role_display_name, role_description, is_system_default, is_template, role_level, permissions, is_active)
VALUES
  (NULL, 'programme_manager', 'Programme Manager', 'Full authority over this programme: edit programme details, manage membership, assign/remove projects.', TRUE, TRUE, 7, '["programme.view", "programme.edit", "programme.manage_members", "programme.assign_children"]'::jsonb, TRUE),
  (NULL, 'programme_viewer', 'Programme Viewer', 'Read-only roll-up visibility into this programme (health, milestones, RAID counts) — never write or approve.', TRUE, TRUE, 2, '["programme.view"]'::jsonb, TRUE)
ON CONFLICT DO NOTHING;

-- ── 4. RLS (read-only / reference policies — write policies land in v992) ───────

ALTER TABLE public.programme_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.programme_memberships ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.programme_roles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.programme_memberships TO authenticated;

DROP POLICY IF EXISTS policy_programme_roles_select ON public.programme_roles;
CREATE POLICY policy_programme_roles_select ON public.programme_roles
  FOR SELECT TO authenticated USING (is_active = TRUE);

DROP POLICY IF EXISTS policy_programme_memberships_select ON public.programme_memberships;
CREATE POLICY policy_programme_memberships_select ON public.programme_memberships
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = programme_memberships.user_id AND u.auth_user_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.programmes pr
      WHERE pr.id = programme_memberships.programme_id
        AND pr.account_id IN (SELECT ga.account_id FROM public.get_user_accounts(auth.uid()) ga)
    )
  );

DO $$ BEGIN RAISE NOTICE 'v991_programme_roles_and_memberships.sql applied successfully'; END $$;
