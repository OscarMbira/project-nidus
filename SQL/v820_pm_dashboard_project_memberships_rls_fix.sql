-- =============================================================================
-- v820: Add project_memberships as a valid RLS access path on the PM Dashboard's
-- 5 tables (risks, issues, work_packages, checkpoint_reports, lessons_learned)
-- Plan: projectplan/v817_pm_dashboard_project_selector_and_enrichment_plan.md
--
-- Root cause (confirmed via live query, not assumed): every one of these tables'
-- SELECT policies grants access via the OLD `user_projects` table only. The
-- app's actual, actively-maintained membership table is `project_memberships`
-- (confirmed: zero app-code INSERT/UPDATE/UPSERT into user_projects anywhere in
-- apps/platform or apps/simulator; project_memberships has active writes in
-- projectMembershipService.js, managerAssignmentService.js, roleService.js,
-- PlatformAccountSetup.jsx — and is explicitly commented elsewhere in the
-- codebase as "legacy / alternate membership; often populated when
-- project_memberships is empty"). A user with a real project_memberships row
-- but no user_projects row — the normal case for anyone added via the current
-- invitation flow — gets silently ZERO rows back from these tables: not an
-- error, just empty data, which is what made this look like a seeding problem.
--
-- Fix: ADD project_memberships as an additional OR'd access path on each table
-- (new policy where practical) — additive only, nothing currently granted via
-- user_projects loses access.
--
-- IMPORTANT — this is NOT a fix for the underlying issue project-wide. A scan
-- found ~138 tables whose RLS policies reference user_projects the same way.
-- This migration deliberately covers only the 5 tables the PM Dashboard needs;
-- the other ~133 have the same latent bug and should be tracked as a separate,
-- larger remediation effort — do not assume this migration "fixes RLS".
--
-- Also fixes a second, distinct, pre-existing bug found on checkpoint_reports:
-- its user_projects branch compared `up.user_id = auth.uid()::uuid` directly
-- with no join through users — user_projects.user_id is the internal users.id,
-- not the auth UUID, so that branch has never actually matched for any real
-- user (SQL/v192_checkpoint_report_rls_policies.sql:50-75).
-- =============================================================================

-- risks ----------------------------------------------------------------------
DROP POLICY IF EXISTS policy_risks_select_project_membership ON risks;
CREATE POLICY policy_risks_select_project_membership
    ON risks FOR SELECT
    TO authenticated
    USING (
        is_deleted = FALSE
        AND EXISTS (
            SELECT 1 FROM project_memberships pm
            JOIN users u ON pm.user_id = u.id
            WHERE u.auth_user_id = auth.uid()
              AND pm.project_id = risks.project_id
              AND pm.is_active = TRUE
        )
    );

-- issues -----------------------------------------------------------------------
DROP POLICY IF EXISTS policy_issues_select_project_membership ON issues;
CREATE POLICY policy_issues_select_project_membership
    ON issues FOR SELECT
    TO authenticated
    USING (
        is_deleted = FALSE
        AND EXISTS (
            SELECT 1 FROM project_memberships pm
            JOIN users u ON pm.user_id = u.id
            WHERE u.auth_user_id = auth.uid()
              AND pm.project_id = issues.project_id
              AND pm.is_active = TRUE
        )
    );

-- work_packages ------------------------------------------------------------------
DROP POLICY IF EXISTS policy_work_packages_select_project_membership ON work_packages;
CREATE POLICY policy_work_packages_select_project_membership
    ON work_packages FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM project_memberships pm
            JOIN users u ON pm.user_id = u.id
            WHERE u.auth_user_id = auth.uid()
              AND pm.project_id = work_packages.project_id
              AND pm.is_active = TRUE
        )
    );

-- checkpoint_reports — rewritten in place: adds project_memberships AND fixes
-- the pre-existing broken user_projects join (see header comment) ------------
DROP POLICY IF EXISTS policy_checkpoint_reports_auth_select ON checkpoint_reports;
CREATE POLICY policy_checkpoint_reports_auth_select
    ON checkpoint_reports FOR SELECT
    TO authenticated
    USING (
        is_deleted = FALSE
        AND (
            EXISTS (
                SELECT 1 FROM user_projects up
                JOIN users u ON up.user_id = u.id
                WHERE u.auth_user_id = auth.uid()
                  AND up.project_id = checkpoint_reports.project_id
                  AND up.is_deleted = FALSE
            )
            OR EXISTS (
                SELECT 1 FROM project_memberships pm
                JOIN users u ON pm.user_id = u.id
                WHERE u.auth_user_id = auth.uid()
                  AND pm.project_id = checkpoint_reports.project_id
                  AND pm.is_active = TRUE
            )
            OR EXISTS (
                SELECT 1 FROM users u
                WHERE u.auth_user_id = auth.uid()
                    AND u.is_deleted = FALSE
                    AND (
                        u.id = checkpoint_reports.reported_by_user_id
                        OR u.id = checkpoint_reports.author_id
                        OR u.id = checkpoint_reports.owner_id
                        OR u.id = checkpoint_reports.client_id
                    )
            )
        )
    );

-- lessons_learned — rewritten in place: v818 already fixed the self-referential
-- recursion bug; this adds the project_memberships path on top of that fix ----
DROP POLICY IF EXISTS policy_lessons_learned_auth_select ON lessons_learned;
CREATE POLICY policy_lessons_learned_auth_select
    ON lessons_learned FOR SELECT
    TO authenticated
    USING (
        is_deleted = FALSE
        AND (
            EXISTS (
                SELECT 1 FROM user_projects up
                JOIN users u ON up.user_id = u.id
                WHERE u.auth_user_id = auth.uid()
                  AND up.project_id = lessons_learned.project_id
                  AND up.is_deleted = FALSE
            )
            OR EXISTS (
                SELECT 1 FROM project_memberships pm
                JOIN users u ON pm.user_id = u.id
                WHERE u.auth_user_id = auth.uid()
                  AND pm.project_id = lessons_learned.project_id
                  AND pm.is_active = TRUE
            )
            OR EXISTS (
                SELECT 1
                FROM user_roles ur
                JOIN roles r ON ur.role_id = r.id
                JOIN users u ON ur.user_id = u.id
                WHERE u.auth_user_id = auth.uid()
                  AND r.role_name IN ('pmo_admin', 'System Admin')
                  AND ur.is_active = TRUE
                  AND ur.is_deleted = FALSE
            )
            OR (
                is_corporate_lesson = TRUE
                AND EXISTS (
                    SELECT 1 FROM projects p
                    JOIN user_projects up ON p.id = up.project_id
                    JOIN users u ON up.user_id = u.id
                    WHERE u.auth_user_id = auth.uid()
                      AND up.is_deleted = FALSE
                      AND p.account_id = (
                          SELECT p2.account_id
                          FROM projects p2
                          WHERE p2.id = lessons_learned.project_id
                      )
                )
            )
        )
    );

DO $$
BEGIN
  RAISE NOTICE 'v820_pm_dashboard_project_memberships_rls_fix.sql applied';
END $$;
