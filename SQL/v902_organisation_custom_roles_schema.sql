-- ============================================================================
-- v902: Organisation Custom Roles — Schema (Phase 1 of 3)
-- ============================================================================
-- See projectprd/v902_organisation_custom_roles_PRD.md and
-- projectplan/v902_organisation_custom_roles_plan.md for full context.
--
-- 1. Adds nullable account_id to public.roles and public.project_roles.
--    NULL = built-in system/template role, shared globally (unchanged).
--    Non-null = custom role owned by that organisation only.
-- 2. Adds is_governance_only to public.project_roles, replacing the hardcoded
--    GOVERNANCE_ONLY_ROLE_KEYS Set in packages/shared/src/utils/
--    projectRoleDashboardUtils.js as the source of truth for dashboard routing.
-- 3. Moves role-name uniqueness from global to (role_name, account_id) so
--    different organisations can independently use the same custom role name
--    without colliding, while built-in rows (account_id IS NULL) still dedupe
--    against each other exactly as before.
-- Prerequisites: v03_user_access_tables.sql (roles), v91_role_system_cleanup.sql
-- (project_roles), v84_accounts_and_extensions.sql (accounts)
-- ============================================================================

-- ── 1. account_id columns ───────────────────────────────────────────────────

ALTER TABLE public.roles
  ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE;

ALTER TABLE public.project_roles
  ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE;

COMMENT ON COLUMN public.roles.account_id IS
  'NULL = built-in system role shared by every organisation. Set = custom role created '
  'by and scoped to that organisation only (v902).';
COMMENT ON COLUMN public.project_roles.account_id IS
  'NULL = built-in template role shared by every organisation. Set = custom org-wide '
  'role created by that organisation, usable across all its projects (v902).';

CREATE INDEX IF NOT EXISTS idx_roles_account_id
  ON public.roles(account_id) WHERE account_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_project_roles_account_id
  ON public.project_roles(account_id) WHERE account_id IS NOT NULL;

-- ── 2. is_governance_only flag ──────────────────────────────────────────────

ALTER TABLE public.project_roles
  ADD COLUMN IF NOT EXISTS is_governance_only BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN public.project_roles.is_governance_only IS
  'TRUE = role is oversight-only and routes to the read-only Governance Dashboard '
  'instead of the operational PM Dashboard (v902). Backfilled TRUE for the 3 built-in '
  'governance roles below; DB-driven replacement for the old hardcoded '
  'GOVERNANCE_ONLY_ROLE_KEYS Set in projectRoleDashboardUtils.js.';

UPDATE public.project_roles
SET is_governance_only = TRUE
WHERE is_template = TRUE
  AND account_id IS NULL
  AND role_name IN ('project_board_member', 'project_sponsor', 'portfolio_manager');

-- ── 3. Uniqueness: role_name scoped per organisation ────────────────────────
-- Postgres treats NULL as distinct in a plain composite unique index, which would
-- silently allow duplicate built-in role names — coalesce account_id to a fixed
-- sentinel UUID so all "built-in" rows (account_id IS NULL) still dedupe together.

-- roles_role_name_key is a table-level UNIQUE constraint (from `role_name VARCHAR(100)
-- UNIQUE NOT NULL` in v03), not a standalone index — must drop the constraint, not the
-- index directly (dropping the constraint removes its backing index automatically).
ALTER TABLE public.roles DROP CONSTRAINT IF EXISTS roles_role_name_key;

CREATE UNIQUE INDEX IF NOT EXISTS uq_roles_role_name_per_account
  ON public.roles (
    role_name,
    COALESCE(account_id, '00000000-0000-0000-0000-000000000000'::uuid)
  );

DROP INDEX IF EXISTS uq_project_roles_template;
CREATE UNIQUE INDEX IF NOT EXISTS uq_project_roles_template
  ON public.project_roles (
    role_name,
    COALESCE(account_id, '00000000-0000-0000-0000-000000000000'::uuid)
  )
  WHERE is_template = TRUE AND project_id IS NULL;

-- Existing per-project custom-role index (project_id, role_name) is untouched —
-- out of scope for v902 (org-wide only; see PRD out-of-scope).

DO $$
BEGIN
  RAISE NOTICE 'v902 schema: account_id + is_governance_only added; role_name uniqueness now per-organisation';
END $$;
