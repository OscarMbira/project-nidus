-- ============================================================================
-- v1444: Register engine — 'organisation' scope + organisation isolation for PMO / organisation records
-- ============================================================================
-- PRD/plan v1340, wave 3 (CLAUDE.md rule 74: engine gaps that block a move are fixed in the engine).
--
-- Gap 1 — no organisation-wide scope. Registers could be scoped to a PMO, portfolio, programme or
-- project, but not "everyone in my organisation". Policies & Compliance needs exactly that (all
-- members read it today). New scope_level 'organisation': any signed-in member may use the register,
-- and the record-level isolation below limits each record to its own organisation.
--
-- Gap 2 — PMO-scope records were not isolated by organisation. has_local_register_scope_access()
-- grants 'pmo' scope to any PMO-admin-tier user, with no check that the user belongs to the record's
-- organisation, so a PMO admin in one organisation could read another organisation's PMO-level
-- records. A RESTRICTIVE policy now requires, for 'pmo' and 'organisation' registers, that the user
-- belongs to the record's own organisation (auth_user_is_account_member, step 4a). Restrictive
-- policies are ANDed with the existing permissive ones (v932), which are left unchanged.
--
-- Backfill: PMO-scope records saved without an account_id (only possible before v937) get the
-- account of the user who created them, so they don't disappear behind the new check.
--
-- Simulator: practice records are per learner and carry no organisation, so the sim scope function
-- refuses 'organisation' (no Simulator register uses it). Prerequisites: v931, v932, v936, v937, v1016.
-- ============================================================================

-- ── 1. Allow scope_level 'organisation' (public and sim register definitions) ──
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT n.nspname AS schema_name, c.conname
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE t.relname = 'local_registers' AND n.nspname IN ('public', 'sim') AND c.contype = 'c'
      AND pg_get_constraintdef(c.oid) ILIKE '%scope_level%'
      AND pg_get_constraintdef(c.oid) ILIKE '%''pmo''%'
      AND pg_get_constraintdef(c.oid) NOT ILIKE '%scope_portfolio_id%'
  LOOP
    EXECUTE format('ALTER TABLE %I.local_registers DROP CONSTRAINT %I', r.schema_name, r.conname);
    RAISE NOTICE 'v1444: dropped %.%', r.schema_name, r.conname;
  END LOOP;
END $$;

ALTER TABLE public.local_registers DROP CONSTRAINT IF EXISTS chk_local_registers_scope_level;
ALTER TABLE public.local_registers ADD CONSTRAINT chk_local_registers_scope_level
  CHECK (scope_level IN ('pmo', 'portfolio', 'programme', 'project', 'organisation'));

ALTER TABLE sim.local_registers DROP CONSTRAINT IF EXISTS chk_sim_local_registers_scope_level;
ALTER TABLE sim.local_registers ADD CONSTRAINT chk_sim_local_registers_scope_level
  CHECK (scope_level IN ('pmo', 'portfolio', 'programme', 'project', 'organisation'));

-- ── 2. Scope access: 'organisation' = any signed-in member (record isolation is in step 3) ──
CREATE OR REPLACE FUNCTION public.has_local_register_scope_access(
  p_auth_user_id UUID,
  p_scope_level VARCHAR,
  p_scope_portfolio_id UUID,
  p_scope_programme_id UUID,
  p_scope_project_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE p_scope_level
    WHEN 'pmo' THEN public.is_pmo_admin_tier(p_auth_user_id)
    WHEN 'organisation' THEN p_auth_user_id IS NOT NULL
    WHEN 'portfolio' THEN EXISTS (
      SELECT 1 FROM public.portfolios pf
      JOIN public.users u ON u.id = pf.portfolio_manager_user_id
      WHERE pf.id = p_scope_portfolio_id AND u.auth_user_id = p_auth_user_id
    )
    WHEN 'programme' THEN EXISTS (
      SELECT 1 FROM public.programmes prog
      JOIN public.users u ON u.id = prog.programme_manager_user_id
      WHERE prog.id = p_scope_programme_id AND u.auth_user_id = p_auth_user_id
    )
    WHEN 'project' THEN EXISTS (
      SELECT 1 FROM public.project_memberships pm
      JOIN public.users u ON u.id = pm.user_id
      WHERE pm.project_id = p_scope_project_id
        AND u.auth_user_id = p_auth_user_id
        AND pm.is_active = TRUE
    )
    ELSE FALSE
  END;
$$;
GRANT EXECUTE ON FUNCTION public.has_local_register_scope_access(UUID, VARCHAR, UUID, UUID, UUID) TO authenticated;

CREATE OR REPLACE FUNCTION sim.has_local_register_scope_access(
  p_auth_user_id UUID,
  p_scope_level VARCHAR,
  p_scope_portfolio_id UUID,
  p_scope_programme_id UUID,
  p_scope_project_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = sim, public
AS $$
  SELECT CASE p_scope_level
    WHEN 'pmo' THEN public.is_pmo_admin_tier(p_auth_user_id)
    WHEN 'portfolio' THEN EXISTS (
      SELECT 1 FROM sim.practice_portfolios pf
      WHERE pf.id = p_scope_portfolio_id AND pf.portfolio_manager_user_id = p_auth_user_id
    )
    WHEN 'programme' THEN EXISTS (
      SELECT 1 FROM sim.practice_programmes prog
      WHERE prog.id = p_scope_programme_id AND prog.programme_manager_user_id = p_auth_user_id
    )
    WHEN 'project' THEN EXISTS (
      SELECT 1 FROM sim.practice_projects pp
      WHERE pp.id = p_scope_project_id
        AND (pp.user_id = p_auth_user_id OR EXISTS (
          SELECT 1 FROM sim.practice_project_memberships m
          WHERE m.practice_project_id = pp.id AND m.user_id = p_auth_user_id AND m.is_active = TRUE
        ))
    )
    -- 'organisation' is not used in the Simulator (practice records carry no organisation).
    ELSE FALSE
  END;
$$;
GRANT EXECUTE ON FUNCTION sim.has_local_register_scope_access(UUID, VARCHAR, UUID, UUID, UUID) TO authenticated;

-- ── 3. Backfill account_id on PMO-scope records saved without one ──
UPDATE public.local_register_records r
SET account_id = COALESCE(
      (SELECT a.id FROM public.accounts a WHERE a.owner_user_id = r.created_by AND COALESCE(a.is_deleted, FALSE) = FALSE LIMIT 1),
      (SELECT p.account_id FROM public.project_memberships pm JOIN public.projects p ON p.id = pm.project_id
        WHERE pm.user_id = r.created_by AND p.account_id IS NOT NULL ORDER BY pm.created_at LIMIT 1)
    ),
    updated_at = NOW()
FROM public.local_registers lr
WHERE lr.id = r.register_id
  AND lr.scope_level IN ('pmo', 'organisation')
  AND r.account_id IS NULL
  AND r.created_by IS NOT NULL;

-- ── 4a. Membership test that matches the app's own workspace list (get_user_accounts, v737):
--        account owner, an accepted organisation invitation, or an active project role in the account.
--        (auth_user_can_access_account, v1016, has no invitation path, so an invited PMO admin with
--        no project role would be locked out.) ──
CREATE OR REPLACE FUNCTION public.auth_user_is_account_member(p_account_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
SET row_security = off
AS $$
  SELECT p_account_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.auth_user_id = auth.uid()
      AND (
        EXISTS (SELECT 1 FROM public.accounts a
                WHERE a.id = p_account_id AND a.owner_user_id = u.id AND COALESCE(a.is_deleted, FALSE) = FALSE)
        OR EXISTS (SELECT 1 FROM public.organisation_invitations oi
                   WHERE oi.organisation_id = p_account_id AND oi.invitation_status = 'accepted'
                     AND COALESCE(oi.is_deleted, FALSE) = FALSE
                     AND (oi.accepted_by_user_id = u.id OR oi.invited_user_id = u.id))
        OR EXISTS (SELECT 1 FROM public.projects p JOIN public.user_roles ur ON ur.project_id = p.id
                   WHERE p.account_id = p_account_id AND ur.user_id = u.id AND ur.is_active = TRUE
                     AND COALESCE(ur.is_deleted, FALSE) = FALSE AND COALESCE(p.is_deleted, FALSE) = FALSE)
      )
  );
$$;
GRANT EXECUTE ON FUNCTION public.auth_user_is_account_member(UUID) TO authenticated;

COMMENT ON FUNCTION public.auth_user_is_account_member(UUID) IS
  'v1444: TRUE if the signed-in user owns the account, accepted an invitation to it, or holds an active project role in it — same sources as get_user_accounts() (v737). Used to isolate PMO / organisation register records by organisation.';

-- ── 4b. Organisation isolation for PMO and organisation records (restrictive, ANDed with v932) ──
DROP POLICY IF EXISTS policy_local_register_records_org_isolation ON public.local_register_records;
CREATE POLICY policy_local_register_records_org_isolation ON public.local_register_records
  AS RESTRICTIVE
  FOR ALL TO authenticated
  USING (
    NOT EXISTS (
      SELECT 1 FROM public.local_registers lr
      WHERE lr.id = local_register_records.register_id AND lr.scope_level IN ('pmo', 'organisation')
    )
    OR public.auth_user_is_account_member(local_register_records.account_id)
  )
  WITH CHECK (
    NOT EXISTS (
      SELECT 1 FROM public.local_registers lr
      WHERE lr.id = local_register_records.register_id AND lr.scope_level IN ('pmo', 'organisation')
    )
    OR public.auth_user_is_account_member(local_register_records.account_id)
  );

-- Check: PMO / organisation records and whether each now has an organisation.
SELECT lr.register_key, lr.scope_level, count(r.id) AS records,
       count(*) FILTER (WHERE r.account_id IS NULL) AS records_without_organisation
FROM public.local_registers lr
LEFT JOIN public.local_register_records r ON r.register_id = lr.id AND r.is_deleted = FALSE
WHERE lr.scope_level IN ('pmo', 'organisation')
GROUP BY lr.register_key, lr.scope_level
ORDER BY lr.register_key;
