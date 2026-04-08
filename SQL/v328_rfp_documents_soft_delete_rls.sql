-- v328: Fix RLS so soft-delete (UPDATE is_deleted = true) on rfp_documents is allowed
-- Error was: "new row violates row-level security policy for table rfp_documents"
-- Cause: UPDATE policy WITH CHECK only had is_pmo_admin_user(); in some contexts the new row
-- (with is_deleted = true) was still evaluated and failed. Adding an explicit policy for
-- soft-delete so PMO Admins can set is_deleted = true.

-- Platform: public.rfp_documents
DROP POLICY IF EXISTS "rfp_documents_update_soft_delete_policy" ON public.rfp_documents;
CREATE POLICY "rfp_documents_update_soft_delete_policy" ON public.rfp_documents
    FOR UPDATE TO authenticated
    USING (
        public.is_pmo_admin_user()
        AND is_deleted = FALSE
    )
    WITH CHECK (is_deleted = TRUE);

COMMENT ON POLICY "rfp_documents_update_soft_delete_policy" ON public.rfp_documents IS
    'Allows PMO Admin to soft-delete (set is_deleted = true). Either this or rfp_documents_update_policy will allow the update.';

-- Simulator: sim.rfp_documents (same pattern)
DROP POLICY IF EXISTS "sim_rfp_documents_update_soft_delete" ON sim.rfp_documents;
CREATE POLICY "sim_rfp_documents_update_soft_delete" ON sim.rfp_documents
    FOR UPDATE TO authenticated
    USING (sim.is_pmo_admin_user() AND is_deleted = FALSE)
    WITH CHECK (is_deleted = TRUE);
