-- =============================================================================
-- v818: Fix self-referential RLS recursion on lessons_learned
-- Plan: projectplan/v817_pm_dashboard_project_selector_and_enrichment_plan.md
--       (found while wiring the PM Dashboard's "Lessons Logged" stat — a plain
--       count query against lessons_learned returned HTTP 500)
--
-- Root cause: policy_lessons_learned_auth_select's "corporate lesson" branch
-- (SQL/v170_lessons_log_rls_policies.sql) subqueries lessons_learned FROM INSIDE
-- lessons_learned's own RLS policy, keyed by `l2.id = lessons_learned.id`:
--
--   p.account_id = (
--       SELECT p2.account_id
--       FROM projects p2
--       JOIN lessons_learned l2 ON p2.id = l2.project_id   -- <-- queries lessons_learned
--       WHERE l2.id = lessons_learned.id                    --     from inside its own policy
--   )
--
-- Every row evaluation re-triggers RLS evaluation on lessons_learned for the
-- inner query, which is the same self-referential-RLS pattern this project has
-- hit before (v93/v100/v134 "RLS recursion" fixes, EMERGENCY_FIX_RUN_THIS_NOW.sql).
--
-- Fix: the outer row's own `lessons_learned.project_id` column is already directly
-- available inside the policy (a normal column reference, not a recursive query) —
-- looking up that project's account_id needs no join back through lessons_learned
-- at all. Same access semantics, no self-reference.
-- =============================================================================

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
  RAISE NOTICE 'v818_fix_lessons_learned_rls_recursion.sql applied';
END $$;
