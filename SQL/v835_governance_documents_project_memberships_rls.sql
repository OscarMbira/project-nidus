-- =============================================================================
-- v835: Add project_memberships as a SELECT access path on Governance Reference
-- and Initiation Documents tables seeded by v834.
-- Plan: projectplan/v838_governance_documents_project_memberships_rls_plan.md
--
-- Root cause (same class of bug as v820): v834 seeds public.risk_management_
-- strategies (and sibling governance/initiation tables) successfully, but the
-- list pages still render empty for Project Managers. Their RLS SELECT policies
-- only honour legacy user_projects membership. The live app grants access via
-- project_memberships (invitation / role assignment flow). A user with a real
-- project_memberships row and no user_projects row gets ZERO rows — not an
-- error — which looks identical to "seed did not run".
--
-- Fix: additive SELECT policies (OR'd with existing policies). Nothing currently
-- granted via user_projects / PMO role helpers is removed.
--
-- Tables covered (v834 seed set):
--   risk_management_strategies
--   quality_management_strategies
--   communication_management_strategies
--   business_cases
--   project_briefs
--   project_initiation_documents
--   benefits_review_plans
-- =============================================================================

-- risk_management_strategies -------------------------------------------------
DROP POLICY IF EXISTS policy_rms_select_project_membership ON risk_management_strategies;
CREATE POLICY policy_rms_select_project_membership
    ON risk_management_strategies FOR SELECT
    TO authenticated
    USING (
        is_deleted = FALSE
        AND EXISTS (
            SELECT 1 FROM project_memberships pm
            JOIN users u ON pm.user_id = u.id
            WHERE u.auth_user_id = auth.uid()
              AND pm.project_id = risk_management_strategies.project_id
              AND pm.is_active = TRUE
        )
    );

-- quality_management_strategies ----------------------------------------------
DROP POLICY IF EXISTS policy_qms_select_project_membership ON quality_management_strategies;
CREATE POLICY policy_qms_select_project_membership
    ON quality_management_strategies FOR SELECT
    TO authenticated
    USING (
        is_deleted = FALSE
        AND EXISTS (
            SELECT 1 FROM project_memberships pm
            JOIN users u ON pm.user_id = u.id
            WHERE u.auth_user_id = auth.uid()
              AND pm.project_id = quality_management_strategies.project_id
              AND pm.is_active = TRUE
        )
    );

-- communication_management_strategies ----------------------------------------
DROP POLICY IF EXISTS policy_cms_select_project_membership ON communication_management_strategies;
CREATE POLICY policy_cms_select_project_membership
    ON communication_management_strategies FOR SELECT
    TO authenticated
    USING (
        is_deleted = FALSE
        AND EXISTS (
            SELECT 1 FROM project_memberships pm
            JOIN users u ON pm.user_id = u.id
            WHERE u.auth_user_id = auth.uid()
              AND pm.project_id = communication_management_strategies.project_id
              AND pm.is_active = TRUE
        )
    );

-- business_cases -------------------------------------------------------------
DROP POLICY IF EXISTS policy_business_cases_select_project_membership ON business_cases;
CREATE POLICY policy_business_cases_select_project_membership
    ON business_cases FOR SELECT
    TO authenticated
    USING (
        COALESCE(is_deleted, FALSE) = FALSE
        AND project_id IS NOT NULL
        AND EXISTS (
            SELECT 1 FROM project_memberships pm
            JOIN users u ON pm.user_id = u.id
            WHERE u.auth_user_id = auth.uid()
              AND pm.project_id = business_cases.project_id
              AND pm.is_active = TRUE
        )
    );

-- project_briefs -------------------------------------------------------------
DROP POLICY IF EXISTS policy_project_briefs_select_project_membership ON project_briefs;
CREATE POLICY policy_project_briefs_select_project_membership
    ON project_briefs FOR SELECT
    TO authenticated
    USING (
        COALESCE(is_deleted, FALSE) = FALSE
        AND EXISTS (
            SELECT 1 FROM project_memberships pm
            JOIN users u ON pm.user_id = u.id
            WHERE u.auth_user_id = auth.uid()
              AND pm.project_id = project_briefs.project_id
              AND pm.is_active = TRUE
        )
    );

-- project_initiation_documents -----------------------------------------------
DROP POLICY IF EXISTS policy_pid_select_project_membership ON project_initiation_documents;
CREATE POLICY policy_pid_select_project_membership
    ON project_initiation_documents FOR SELECT
    TO authenticated
    USING (
        COALESCE(is_deleted, FALSE) = FALSE
        AND EXISTS (
            SELECT 1 FROM project_memberships pm
            JOIN users u ON pm.user_id = u.id
            WHERE u.auth_user_id = auth.uid()
              AND pm.project_id = project_initiation_documents.project_id
              AND pm.is_active = TRUE
        )
    );

-- benefits_review_plans ------------------------------------------------------
DROP POLICY IF EXISTS policy_brp_select_project_membership ON benefits_review_plans;
CREATE POLICY policy_brp_select_project_membership
    ON benefits_review_plans FOR SELECT
    TO authenticated
    USING (
        COALESCE(is_deleted, FALSE) = FALSE
        AND project_id IS NOT NULL
        AND EXISTS (
            SELECT 1 FROM project_memberships pm
            JOIN users u ON pm.user_id = u.id
            WHERE u.auth_user_id = auth.uid()
              AND pm.project_id = benefits_review_plans.project_id
              AND pm.is_active = TRUE
        )
    );

DO $$
BEGIN
  RAISE NOTICE 'v835_governance_documents_project_memberships_rls.sql applied';
END $$;
