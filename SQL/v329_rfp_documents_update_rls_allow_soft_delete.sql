-- v329: Fix "new row violates row-level security policy" on RFP delete (soft-delete)
-- Root cause: UPDATE policy WITH CHECK required is_pmo_admin_user() on the NEW row.
-- For soft-delete the new row has is_deleted = true; in some contexts the check still fails.
-- Fix: Allow the new row when EITHER user is PMO admin OR the row is being soft-deleted (is_deleted = TRUE).
-- This ensures soft-delete always passes WITHOUT relying on is_pmo_admin_user() in WITH CHECK context.

-- ============================================================================
-- Platform: public.rfp_documents — replace UPDATE policy
-- ============================================================================

DROP POLICY IF EXISTS "rfp_documents_update_policy" ON public.rfp_documents;
CREATE POLICY "rfp_documents_update_policy" ON public.rfp_documents
    FOR UPDATE TO authenticated
    USING (
        public.is_pmo_admin_user()
        AND is_deleted = FALSE
    )
    WITH CHECK (
        public.is_pmo_admin_user()
        OR is_deleted = TRUE
    );

COMMENT ON POLICY "rfp_documents_update_policy" ON public.rfp_documents IS
    'PMO Admin can update non-deleted rows. New row allowed if user is PMO admin OR row is being soft-deleted (is_deleted = TRUE).';

-- ============================================================================
-- Simulator: sim.rfp_documents — same fix
-- ============================================================================

DROP POLICY IF EXISTS "sim_rfp_documents_update" ON sim.rfp_documents;
CREATE POLICY "sim_rfp_documents_update" ON sim.rfp_documents
    FOR UPDATE TO authenticated
    USING (
        sim.is_pmo_admin_user()
        AND is_deleted = FALSE
    )
    WITH CHECK (
        sim.is_pmo_admin_user()
        OR is_deleted = TRUE
    );
