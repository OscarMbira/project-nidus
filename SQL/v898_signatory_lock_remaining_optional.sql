-- =============================================================================
-- v898: Lock remaining optional signatories (extends v868/v873)
--
-- Lets any signatory who has already signed a MANDATORY slot in the current
-- round — once every mandatory slot in that round is signed — close the round
-- out early: every still-pending OPTIONAL slot flips to a new terminal status,
-- 'expired', recording who closed it and why. Mandatory slots are never
-- touched (they're already 'signed' by construction of the eligibility check).
--
-- Distinct from 'declined': declining is the assigned signatory personally
-- refusing their own slot (halts the chain, offers Restart). Expiring is an
-- administrative close-out of SOMEONE ELSE's still-open optional slot once
-- enough time has passed — it does not halt anything and does not offer/need
-- Restart.
--
-- RLS is the real enforcement boundary here (see v868 header comment) — both
-- eligibility conditions below are checked independently of any client-
-- computed flag:
--   (a) caller has a 'signed' row where is_mandatory = true in this round
--   (b) no row where is_mandatory = true in this round is anything but 'signed'
-- =============================================================================

-- ---------------------------------------------------------------------------
-- public: status + audit columns
-- ---------------------------------------------------------------------------
ALTER TABLE public.process_template_document_signatories DROP CONSTRAINT IF EXISTS chk_ptds_status;
ALTER TABLE public.process_template_document_signatories
    ADD CONSTRAINT chk_ptds_status CHECK (status IN ('pending', 'signed', 'declined', 'expired'));

ALTER TABLE public.process_template_document_signatories
    ADD COLUMN IF NOT EXISTS locked_by uuid NULL REFERENCES public.users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS locked_at timestamptz NULL,
    ADD COLUMN IF NOT EXISTS lock_reason text NULL;

COMMENT ON COLUMN public.process_template_document_signatories.locked_by IS
  'v898: who closed out this still-pending OPTIONAL slot early (a signed mandatory signatory), if status = expired.';
COMMENT ON COLUMN public.process_template_document_signatories.lock_reason IS
  'v898: why the remaining optional signing window was closed early.';

-- ---------------------------------------------------------------------------
-- sim: status + audit columns (mirror)
-- ---------------------------------------------------------------------------
ALTER TABLE sim.process_template_document_signatories DROP CONSTRAINT IF EXISTS chk_sim_ptds_status;
ALTER TABLE sim.process_template_document_signatories
    ADD CONSTRAINT chk_sim_ptds_status CHECK (status IN ('pending', 'signed', 'declined', 'expired'));

ALTER TABLE sim.process_template_document_signatories
    ADD COLUMN IF NOT EXISTS locked_by uuid NULL REFERENCES public.users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS locked_at timestamptz NULL,
    ADD COLUMN IF NOT EXISTS lock_reason text NULL;

-- ---------------------------------------------------------------------------
-- public UPDATE policy — add Case C (lock) alongside v868's Case A (admin
-- reassign) and Case B (assigned signatory signs/declines their own row).
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS policy_ptds_update ON public.process_template_document_signatories;
CREATE POLICY policy_ptds_update
    ON public.process_template_document_signatories FOR UPDATE TO authenticated
    USING (
        public.auth_user_can_administer_document_signatories(template_node_id)
        OR (
            status = 'pending'
            AND assigned_user_id IS NOT NULL
            AND EXISTS (
                SELECT 1 FROM public.users u
                WHERE u.id = assigned_user_id AND u.auth_user_id = auth.uid()
            )
        )
        OR (
            -- v898 Case C: a signed mandatory signatory targeting a pending optional slot
            status = 'pending'
            AND COALESCE(is_mandatory, true) = false
            AND EXISTS (
                SELECT 1 FROM public.process_template_document_signatories mine
                JOIN public.users u ON u.id = mine.assigned_user_id
                WHERE mine.template_node_id = template_node_id
                  AND mine.signing_round = signing_round
                  AND COALESCE(mine.is_mandatory, true) = true
                  AND mine.status = 'signed'
                  AND u.auth_user_id = auth.uid()
            )
            AND NOT EXISTS (
                SELECT 1 FROM public.process_template_document_signatories other
                WHERE other.template_node_id = template_node_id
                  AND other.signing_round = signing_round
                  AND COALESCE(other.is_mandatory, true) = true
                  AND other.status <> 'signed'
            )
        )
    )
    WITH CHECK (
        (
            status = 'pending'
            AND public.auth_user_can_administer_document_signatories(template_node_id)
        )
        OR (
            status IN ('signed', 'declined')
            AND assigned_user_id IS NOT NULL
            AND EXISTS (
                SELECT 1 FROM public.users u
                WHERE u.id = assigned_user_id AND u.auth_user_id = auth.uid()
            )
            AND NOT EXISTS (
                SELECT 1 FROM public.process_template_document_signatories prior
                WHERE prior.template_node_id = template_node_id
                  AND prior.signing_round = signing_round
                  AND prior.slot_order < slot_order
                  AND COALESCE(prior.is_mandatory, true) = true
                  AND prior.status <> 'signed'
            )
        )
        OR (
            -- v898 Case C: close-out transition to 'expired', optional slots only
            status = 'expired'
            AND COALESCE(is_mandatory, true) = false
            AND EXISTS (
                SELECT 1 FROM public.process_template_document_signatories mine
                JOIN public.users u ON u.id = mine.assigned_user_id
                WHERE mine.template_node_id = template_node_id
                  AND mine.signing_round = signing_round
                  AND COALESCE(mine.is_mandatory, true) = true
                  AND mine.status = 'signed'
                  AND u.auth_user_id = auth.uid()
            )
            AND NOT EXISTS (
                SELECT 1 FROM public.process_template_document_signatories other
                WHERE other.template_node_id = template_node_id
                  AND other.signing_round = signing_round
                  AND COALESCE(other.is_mandatory, true) = true
                  AND other.status <> 'signed'
            )
        )
    );

-- ---------------------------------------------------------------------------
-- sim UPDATE policy (mirror)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS policy_sim_ptds_update ON sim.process_template_document_signatories;
CREATE POLICY policy_sim_ptds_update
    ON sim.process_template_document_signatories FOR UPDATE TO authenticated
    USING (
        sim.auth_user_can_administer_document_signatories(template_node_id)
        OR (
            status = 'pending'
            AND assigned_user_id IS NOT NULL
            AND EXISTS (
                SELECT 1 FROM public.users u
                WHERE u.id = assigned_user_id AND u.auth_user_id = auth.uid()
            )
        )
        OR (
            status = 'pending'
            AND COALESCE(is_mandatory, true) = false
            AND EXISTS (
                SELECT 1 FROM sim.process_template_document_signatories mine
                JOIN public.users u ON u.id = mine.assigned_user_id
                WHERE mine.template_node_id = template_node_id
                  AND mine.signing_round = signing_round
                  AND COALESCE(mine.is_mandatory, true) = true
                  AND mine.status = 'signed'
                  AND u.auth_user_id = auth.uid()
            )
            AND NOT EXISTS (
                SELECT 1 FROM sim.process_template_document_signatories other
                WHERE other.template_node_id = template_node_id
                  AND other.signing_round = signing_round
                  AND COALESCE(other.is_mandatory, true) = true
                  AND other.status <> 'signed'
            )
        )
    )
    WITH CHECK (
        (
            status = 'pending'
            AND sim.auth_user_can_administer_document_signatories(template_node_id)
        )
        OR (
            status IN ('signed', 'declined')
            AND assigned_user_id IS NOT NULL
            AND EXISTS (
                SELECT 1 FROM public.users u
                WHERE u.id = assigned_user_id AND u.auth_user_id = auth.uid()
            )
            AND NOT EXISTS (
                SELECT 1 FROM sim.process_template_document_signatories prior
                WHERE prior.template_node_id = template_node_id
                  AND prior.signing_round = signing_round
                  AND prior.slot_order < slot_order
                  AND COALESCE(prior.is_mandatory, true) = true
                  AND prior.status <> 'signed'
            )
        )
        OR (
            status = 'expired'
            AND COALESCE(is_mandatory, true) = false
            AND EXISTS (
                SELECT 1 FROM sim.process_template_document_signatories mine
                JOIN public.users u ON u.id = mine.assigned_user_id
                WHERE mine.template_node_id = template_node_id
                  AND mine.signing_round = signing_round
                  AND COALESCE(mine.is_mandatory, true) = true
                  AND mine.status = 'signed'
                  AND u.auth_user_id = auth.uid()
            )
            AND NOT EXISTS (
                SELECT 1 FROM sim.process_template_document_signatories other
                WHERE other.template_node_id = template_node_id
                  AND other.signing_round = signing_round
                  AND COALESCE(other.is_mandatory, true) = true
                  AND other.status <> 'signed'
            )
        )
    );

DO $$
BEGIN
  RAISE NOTICE 'v898_signatory_lock_remaining_optional.sql applied';
END $$;
