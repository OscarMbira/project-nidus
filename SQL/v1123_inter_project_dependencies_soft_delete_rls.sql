-- ============================================================================
-- v1123: Allow soft-delete updates on inter-project dependencies
-- ============================================================================
-- v295 created the UPDATE policy with USING (is_deleted = FALSE) and no
-- WITH CHECK. PostgreSQL then applies that same expression as WITH CHECK,
-- so setting is_deleted = TRUE (the list Delete action) is rejected.
-- Keep the USING clause so deleted rows stay out of further updates.
-- WITH CHECK (true) allows the soft-delete write and ordinary field edits.
-- ============================================================================

DROP POLICY IF EXISTS policy_inter_project_dependencies_update ON public.inter_project_dependencies;

CREATE POLICY policy_inter_project_dependencies_update ON public.inter_project_dependencies
    FOR UPDATE TO authenticated
    USING (is_deleted = FALSE)
    WITH CHECK (true);
