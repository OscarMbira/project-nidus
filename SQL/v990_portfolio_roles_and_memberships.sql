-- ============================================================================
-- v990: Portfolio-scoped roles & memberships — Phase 3 of v982 SaaS User Journey
-- (Portfolio/Programme-Scoped Roles & Authority Model, brief §14-18)
-- ============================================================================
-- projectplan/v982_phase3_portfolio_programme_authority_plan.md, task A.
--
-- Mirrors public.project_roles / public.project_memberships (SQL/v91_role_system_cleanup.sql)
-- exactly, substituting project_id -> portfolio_id, per the plan's own investigation note. This is
-- new, cleanly-named, cleanly-shaped infrastructure — NOT a repurposing of the dead
-- public.portfolio_members table (v36), which was reviewed and found to carry real shape debt
-- (free-text member_role instead of an FK'd role template, ad hoc boolean permission flags instead
-- of the JSONB permissions array project_roles uses) and is confirmed unreferenced by any RLS
-- policy today. portfolio_members is left untouched (not dropped — out of scope for this phase;
-- flagged as dead code in the implementation report).
--
-- Prerequisites: public.portfolios (v36, account_id added by v989), public.users.
-- ============================================================================

-- ── 1. public.portfolio_roles ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.portfolio_roles (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_id        UUID REFERENCES public.portfolios(id) ON DELETE CASCADE, -- NULL = template
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

COMMENT ON TABLE public.portfolio_roles IS
  'v990/v982 Phase 3: portfolio-scoped role templates + per-portfolio custom roles, mirroring '
  'project_roles exactly. NULL portfolio_id = template (e.g. portfolio_manager, portfolio_viewer).';
COMMENT ON COLUMN public.portfolio_roles.portfolio_id IS 'NULL for templates, specific portfolio UUID for custom roles';

CREATE INDEX IF NOT EXISTS idx_portfolio_roles_portfolio_id ON public.portfolio_roles(portfolio_id) WHERE portfolio_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_portfolio_roles_active ON public.portfolio_roles(is_active) WHERE is_active = TRUE;

CREATE UNIQUE INDEX IF NOT EXISTS uq_portfolio_roles_template
  ON public.portfolio_roles(role_name) WHERE is_template = TRUE AND portfolio_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_portfolio_roles_custom
  ON public.portfolio_roles(portfolio_id, role_name) WHERE is_template = FALSE AND portfolio_id IS NOT NULL;

-- ── 2. public.portfolio_memberships ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.portfolio_memberships (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_id           UUID NOT NULL REFERENCES public.portfolios(id) ON DELETE CASCADE,
  user_id                UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  portfolio_role_id      UUID NOT NULL REFERENCES public.portfolio_roles(id) ON DELETE RESTRICT,
  invited_by_user_id     UUID REFERENCES public.users(id),
  invitation_status      VARCHAR(50) NOT NULL DEFAULT 'accepted'
                           CHECK (invitation_status IN ('pending', 'accepted', 'expired', 'declined', 'cancelled')),
  accepted_at            TIMESTAMPTZ DEFAULT NOW(),
  is_active              BOOLEAN NOT NULL DEFAULT TRUE,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_portfolio_memberships_user UNIQUE (portfolio_id, user_id)
);

COMMENT ON TABLE public.portfolio_memberships IS
  'v990/v982 Phase 3: explicit portfolio-scoped role grants. A user has authority on a portfolio '
  'only via an active row here (or system_admin) — never inferred from account membership alone.';

CREATE INDEX IF NOT EXISTS idx_portfolio_memberships_portfolio_id ON public.portfolio_memberships(portfolio_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_memberships_user_id ON public.portfolio_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_memberships_role_id ON public.portfolio_memberships(portfolio_role_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_memberships_active ON public.portfolio_memberships(is_active) WHERE is_active = TRUE;

-- ── 3. Seed template roles (rule 18.2 — mirrors project_roles' template convention) ────────────

INSERT INTO public.portfolio_roles (portfolio_id, role_name, role_display_name, role_description, is_system_default, is_template, role_level, permissions, is_active)
VALUES
  (NULL, 'portfolio_manager', 'Portfolio Manager', 'Full authority over this portfolio: edit portfolio details, manage membership, assign/remove programmes and projects.', TRUE, TRUE, 8, '["portfolio.view", "portfolio.edit", "portfolio.manage_members", "portfolio.assign_children"]'::jsonb, TRUE),
  (NULL, 'portfolio_viewer', 'Portfolio Viewer', 'Read-only roll-up visibility into this portfolio (health, milestones, RAID counts) — never write or approve. Matches the brief''s no-automatic-write-authority worked example.', TRUE, TRUE, 2, '["portfolio.view"]'::jsonb, TRUE)
ON CONFLICT DO NOTHING;

-- ── 4. RLS ──────────────────────────────────────────────────────────────────────
-- Broad authenticated SELECT for portfolio_roles (reference data, like project_roles' own
-- established read policy) — writes are account/portfolio-scoped. portfolio_memberships is
-- scoped to portfolio account membership + a portfolio_manager grant (or system_admin) for writes,
-- self-read for the member's own row.

ALTER TABLE public.portfolio_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolio_memberships ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.portfolio_roles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.portfolio_memberships TO authenticated;

DROP POLICY IF EXISTS policy_portfolio_roles_select ON public.portfolio_roles;
CREATE POLICY policy_portfolio_roles_select ON public.portfolio_roles
  FOR SELECT TO authenticated USING (is_active = TRUE);

DROP POLICY IF EXISTS policy_portfolio_memberships_select ON public.portfolio_memberships;
CREATE POLICY policy_portfolio_memberships_select ON public.portfolio_memberships
  FOR SELECT TO authenticated
  USING (
    -- the member themself
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = portfolio_memberships.user_id AND u.auth_user_id = auth.uid())
    -- or anyone in the owning account (visibility into who has what role, same tier as portfolios' own account-scoped SELECT below)
    OR EXISTS (
      SELECT 1 FROM public.portfolios p
      WHERE p.id = portfolio_memberships.portfolio_id
        AND p.account_id IN (SELECT ga.account_id FROM public.get_user_accounts(auth.uid()) ga)
    )
  );

DO $$ BEGIN RAISE NOTICE 'v990_portfolio_roles_and_memberships.sql applied successfully'; END $$;
