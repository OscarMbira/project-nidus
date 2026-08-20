-- =============================================================================
-- v873: Signatory slot mandatory / optional (extends v868)
--
-- Adds is_mandatory (DEFAULT true) to:
--   - process_template_signatory_requirements (public + sim)
--   - process_template_document_signatories (public + sim)
--
-- Refreshes sequential-turn UPDATE policies and storage write helpers so only
-- earlier *mandatory* slots must be signed before a later slot can act.
-- Existing rows stay mandatory (DEFAULT + NOT NULL) — no behaviour change until
-- a PMO Admin unchecks Mandatory on a config slot.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Columns
-- ---------------------------------------------------------------------------
ALTER TABLE public.process_template_signatory_requirements
  ADD COLUMN IF NOT EXISTS is_mandatory boolean NOT NULL DEFAULT true;

ALTER TABLE public.process_template_document_signatories
  ADD COLUMN IF NOT EXISTS is_mandatory boolean NOT NULL DEFAULT true;

ALTER TABLE sim.process_template_signatory_requirements
  ADD COLUMN IF NOT EXISTS is_mandatory boolean NOT NULL DEFAULT true;

ALTER TABLE sim.process_template_document_signatories
  ADD COLUMN IF NOT EXISTS is_mandatory boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.process_template_signatory_requirements.is_mandatory IS
  'TRUE = slot must be signed for the document to lock; FALSE = optional (does not block lock or turn order).';
COMMENT ON COLUMN public.process_template_document_signatories.is_mandatory IS
  'Snapshotted from requirements at signing-round start (v873).';

-- ---------------------------------------------------------------------------
-- public UPDATE policy — sequential check ignores earlier optional slots
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
            -- v873: only earlier *mandatory* slots must already be signed.
            AND NOT EXISTS (
                SELECT 1 FROM public.process_template_document_signatories prior
                WHERE prior.template_node_id = template_node_id
                  AND prior.signing_round = signing_round
                  AND prior.slot_order < slot_order
                  AND COALESCE(prior.is_mandatory, true) = true
                  AND prior.status <> 'signed'
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
    );

-- ---------------------------------------------------------------------------
-- Storage write helpers — same mandatory-only sequential rule
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.auth_user_can_write_signature_object(
    p_template_node_id UUID, p_signing_round INT, p_slot_order INT
)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.process_template_document_signatories s
    JOIN public.users u ON u.id = s.assigned_user_id
    WHERE s.template_node_id = p_template_node_id
      AND s.signing_round = p_signing_round
      AND s.slot_order = p_slot_order
      AND s.status = 'pending'
      AND u.auth_user_id = auth.uid()
      AND NOT EXISTS (
        SELECT 1 FROM public.process_template_document_signatories prior
        WHERE prior.template_node_id = p_template_node_id
          AND prior.signing_round = p_signing_round
          AND prior.slot_order < p_slot_order
          AND COALESCE(prior.is_mandatory, true) = true
          AND prior.status <> 'signed'
      )
  );
$$;

CREATE OR REPLACE FUNCTION sim.auth_user_can_write_signature_object(
    p_template_node_id UUID, p_signing_round INT, p_slot_order INT
)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = sim, public
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1 FROM sim.process_template_document_signatories s
    JOIN public.users u ON u.id = s.assigned_user_id
    WHERE s.template_node_id = p_template_node_id
      AND s.signing_round = p_signing_round
      AND s.slot_order = p_slot_order
      AND s.status = 'pending'
      AND u.auth_user_id = auth.uid()
      AND NOT EXISTS (
        SELECT 1 FROM sim.process_template_document_signatories prior
        WHERE prior.template_node_id = p_template_node_id
          AND prior.signing_round = p_signing_round
          AND prior.slot_order < p_slot_order
          AND COALESCE(prior.is_mandatory, true) = true
          AND prior.status <> 'signed'
      )
  );
$$;
