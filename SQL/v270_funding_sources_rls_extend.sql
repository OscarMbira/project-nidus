-- ================================================
-- File: v270_funding_sources_rls_extend.sql
-- Description: Allow SELECT on funding_sources for users who have project access in that account
--   (not only account owner), so the Funding source dropdown populates on project create.
-- Prerequisites: v268 (funding_sources, RLS), user_projects table.
-- ================================================

-- Replace SELECT policy so any user with access to the account can read funding sources
DROP POLICY IF EXISTS policy_funding_sources_select ON funding_sources;
CREATE POLICY policy_funding_sources_select ON funding_sources
    FOR SELECT TO authenticated
    USING (
        account_id IN (
            SELECT a.id FROM accounts a
            WHERE a.owner_user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid() LIMIT 1)
            AND (a.is_deleted = false OR a.is_deleted IS NULL)
        )
        OR account_id IN (
            SELECT p.account_id FROM projects p
            WHERE p.account_id IS NOT NULL
            AND (p.is_deleted = false OR p.is_deleted IS NULL)
            AND (
                p.owner_user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid() LIMIT 1)
                OR EXISTS (
                    SELECT 1 FROM user_projects up
                    WHERE up.project_id = p.id AND up.user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid() LIMIT 1) AND (up.is_deleted = false OR up.is_deleted IS NULL)
                )
            )
        )
    );

COMMENT ON POLICY policy_funding_sources_select ON funding_sources IS 'Allow read for account owners and users with project access in that account';
