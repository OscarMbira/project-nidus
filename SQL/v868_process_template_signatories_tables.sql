-- =============================================================================
-- v868: Process Template Document Signatories (public + sim) — v868 PRD/plan.
--
-- Three tables:
--   1) process_template_signatory_requirements — PMO Admin config: an ordered,
--      role-labelled list of required signatory slots per (account, document
--      type). document_type = one of the 24 process_template content tables
--      (packages/shared/src/services/pmTemplateContentService.js's
--      PROCESS_TEMPLATE_TABLES — kept in sync via the CHECK constraint below).
--   2) process_template_document_signatories — the actual per-document signing
--      instances. Append-only per signing_round: a decline+restart inserts a
--      fresh round rather than mutating prior rows, so full history is kept
--      for free (mirrors process_template_attachments's version-history style).
--      "Current round" = MAX(signing_round) per template_node_id, computed in
--      queries — no is_current flag, avoiding a whole class of sync bugs.
--   3) user_signature_images — a personal, reusable "my saved signature" asset,
--      keyed by auth_user_id directly (NOT sim-mirrored — a signature belongs
--      to the person, not to Platform or Simulator specifically). Owner-only
--      RLS; other viewers never need direct access to this table because
--      signing COPIES the image into the document's own signature storage
--      (see v868b) rather than referencing this row live.
--
-- RLS lesson carried forward from this session's process_template_attachments
-- debugging (v866/v866b/v866d/v866e): project-membership checks MUST use
-- public.auth_user_can_access_project(project_id) / sim's practice-project
-- equivalent — NEVER compare public.user_projects.user_id directly to
-- auth.uid() (user_projects.user_id is public.users.id, a different UUID
-- space entirely). All helpers below use the correct, already-proven join.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1) public.process_template_signatory_requirements
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.process_template_signatory_requirements (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
    document_table text NOT NULL,
    slot_order int NOT NULL,
    role_label text NOT NULL,
    is_active boolean NOT NULL DEFAULT true,
    is_deleted boolean NOT NULL DEFAULT false,
    created_by uuid NULL REFERENCES public.users(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT chk_ptsr_slot_order CHECK (slot_order >= 1),
    CONSTRAINT chk_ptsr_document_table CHECK (document_table IN (
        'project_charters', 'assumption_logs', 'project_management_plans',
        'requirements_management_plans', 'requirements_documentation', 'wbs_dictionary_entries',
        'activity_attributes', 'activity_resource_requirements', 'resource_breakdown_structure',
        'activity_duration_estimates', 'cost_management_plans', 'activity_cost_estimates',
        'cost_baselines', 'resource_management_plans', 'stakeholder_engagement_plans',
        'procurement_management_plans', 'quality_checklists', 'team_performance_assessments',
        'make_or_buy_decisions', 'variance_analysis_reports', 'evm_status_reports',
        'scope_acceptance_forms', 'project_closure_checklists', 'contract_closure_documents'
    ))
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_ptsr_slot
    ON public.process_template_signatory_requirements (account_id, document_table, slot_order)
    WHERE is_deleted = false;

CREATE INDEX IF NOT EXISTS idx_ptsr_lookup
    ON public.process_template_signatory_requirements (account_id, document_table)
    WHERE is_deleted = false AND is_active = true;

ALTER TABLE public.process_template_signatory_requirements ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.process_template_signatory_requirements TO authenticated;

DROP POLICY IF EXISTS policy_ptsr_select ON public.process_template_signatory_requirements;
CREATE POLICY policy_ptsr_select
    ON public.process_template_signatory_requirements FOR SELECT TO authenticated
    USING (public.user_has_access_to_account(account_id));

DROP POLICY IF EXISTS policy_ptsr_write ON public.process_template_signatory_requirements;
CREATE POLICY policy_ptsr_write
    ON public.process_template_signatory_requirements FOR ALL TO authenticated
    USING (public.user_has_access_to_account(account_id) AND public.is_pmo_admin_user())
    WITH CHECK (public.user_has_access_to_account(account_id) AND public.is_pmo_admin_user());

INSERT INTO public.database_tables (table_name, table_description, is_system_table, is_active)
VALUES
    ('process_template_signatory_requirements', 'PMO Admin-configured, per-organisation, ordered list of required signatory role-slots per process_templates document type.', false, true)
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    is_system_table = EXCLUDED.is_system_table,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();

-- ---------------------------------------------------------------------------
-- 2) public.process_template_document_signatories
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.process_template_document_signatories (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    template_node_id uuid NOT NULL REFERENCES public.pm_template_nodes(id) ON DELETE CASCADE,

    signing_round int NOT NULL DEFAULT 1,
    slot_order int NOT NULL,
    role_label text NOT NULL,

    assigned_user_id uuid NULL REFERENCES public.users(id) ON DELETE SET NULL,
    status text NOT NULL DEFAULT 'pending',

    storage_bucket text NULL,
    storage_path text NULL,
    file_name text NULL,
    mime_type text NULL,
    file_size bigint NULL,
    display_id text,

    signed_at timestamptz NULL,
    declined_at timestamptz NULL,
    decline_reason text NULL,

    created_by uuid NULL REFERENCES public.users(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT chk_ptds_status CHECK (status IN ('pending', 'signed', 'declined')),
    CONSTRAINT chk_ptds_slot_order CHECK (slot_order >= 1),
    CONSTRAINT chk_ptds_signing_round CHECK (signing_round >= 1)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_ptds_slot
    ON public.process_template_document_signatories (template_node_id, signing_round, slot_order);

CREATE INDEX IF NOT EXISTS idx_ptds_node
    ON public.process_template_document_signatories (template_node_id);

CREATE UNIQUE INDEX IF NOT EXISTS uq_ptds_display_id
    ON public.process_template_document_signatories (display_id)
    WHERE display_id IS NOT NULL;

ALTER TABLE public.process_template_document_signatories ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.process_template_document_signatories TO authenticated;

-- SECURITY DEFINER helpers (v866e pattern — avoids RLS-under-invoker fragility
-- when joining out to pm_template_nodes from a storage/table policy).
CREATE OR REPLACE FUNCTION public.auth_user_can_read_document_signatories(p_template_node_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT
    p_template_node_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.pm_template_nodes n
      WHERE n.id = p_template_node_id
        AND public.user_has_access_to_account(n.account_id)
    );
$$;

CREATE OR REPLACE FUNCTION public.auth_user_can_administer_document_signatories(p_template_node_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT
    p_template_node_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.pm_template_nodes n
      WHERE n.id = p_template_node_id
        AND (
          (
            n.scope_entity_type = 'project'
            AND n.scope_entity_id IS NOT NULL
            AND public.auth_user_can_access_project(n.scope_entity_id)
          )
          OR public.can_manage_pm_template_node(
            n.account_id, n.tier, n.scope_entity_type, n.scope_entity_id, n.is_system_synced
          )
        )
    );
$$;

GRANT EXECUTE ON FUNCTION public.auth_user_can_read_document_signatories(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.auth_user_can_administer_document_signatories(UUID) TO authenticated;

COMMENT ON FUNCTION public.auth_user_can_administer_document_signatories(UUID) IS
  'TRUE if the caller may assign/reassign who fills a signatory slot on this document (project member or template-managing role) — administrative rights, NOT the right to sign as someone else.';

DROP POLICY IF EXISTS policy_ptds_select ON public.process_template_document_signatories;
CREATE POLICY policy_ptds_select
    ON public.process_template_document_signatories FOR SELECT TO authenticated
    USING (public.auth_user_can_read_document_signatories(template_node_id));

DROP POLICY IF EXISTS policy_ptds_insert ON public.process_template_document_signatories;
CREATE POLICY policy_ptds_insert
    ON public.process_template_document_signatories FOR INSERT TO authenticated
    WITH CHECK (public.auth_user_can_administer_document_signatories(template_node_id));

-- Single, self-contained UPDATE policy covering BOTH allowed transitions in one
-- USING/WITH CHECK pair (deliberately not split across two permissive policies —
-- Postgres OR-combines separate permissive policies' USING and WITH CHECK
-- independently, which is easy to reason about wrong; one policy with an
-- internal OR is safer and was chosen for exactly that reason):
--   Case A — administrative reassignment: who fills a still-pending slot.
--   Case B — the assigned signatory signs or declines their OWN pending slot.
-- Neither case lets a project member sign on someone else's behalf, and
-- neither lets the signatory reassign the slot to someone else.
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
            -- Sequential enforcement at the DB layer, not just hidden by the UI:
            -- every earlier slot in this same round must already be signed.
            -- (Bare column names here correctly bind to the row being checked —
            -- the same pattern process_template_attachments's policies already
            -- rely on inside their own correlated subqueries — while `prior.`
            -- qualifies the self-joined inner copy of this table.)
            AND NOT EXISTS (
                SELECT 1 FROM public.process_template_document_signatories prior
                WHERE prior.template_node_id = template_node_id
                  AND prior.signing_round = signing_round
                  AND prior.slot_order < slot_order
                  AND prior.status <> 'signed'
            )
        )
    );

DROP POLICY IF EXISTS policy_ptds_delete ON public.process_template_document_signatories;
CREATE POLICY policy_ptds_delete
    ON public.process_template_document_signatories FOR DELETE TO authenticated
    USING (public.auth_user_can_administer_document_signatories(template_node_id));

INSERT INTO public.database_tables (table_name, table_description, is_system_table, is_active)
VALUES
    ('process_template_document_signatories', 'Per-document signatory signing instances (with append-only signing-round history) for process_templates documents, keyed by pm_template_nodes.id.', false, true)
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    is_system_table = EXCLUDED.is_system_table,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();

-- ---------------------------------------------------------------------------
-- 3) public.user_signature_images (NOT sim-mirrored — see header)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_signature_images (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id uuid NOT NULL UNIQUE,
    account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
    storage_bucket text NOT NULL DEFAULT 'user-signatures',
    storage_path text NOT NULL,
    file_name text NOT NULL,
    mime_type text NOT NULL,
    file_size bigint NOT NULL,
    uploaded_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_signature_images ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_signature_images TO authenticated;

DROP POLICY IF EXISTS policy_user_signature_images_owner ON public.user_signature_images;
CREATE POLICY policy_user_signature_images_owner
    ON public.user_signature_images FOR ALL TO authenticated
    USING (auth_user_id = auth.uid())
    WITH CHECK (auth_user_id = auth.uid());

INSERT INTO public.database_tables (table_name, table_description, is_system_table, is_active)
VALUES
    ('user_signature_images', 'Personal, reusable saved signature image per user (owner-only access), offered as a one-click default when signing process_templates documents.', false, true)
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    is_system_table = EXCLUDED.is_system_table,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();

-- =============================================================================
-- sim schema mirror — process_template_signatory_requirements and
-- process_template_document_signatories only (user_signature_images is shared,
-- see header).
-- =============================================================================

CREATE TABLE IF NOT EXISTS sim.process_template_signatory_requirements (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
    document_table text NOT NULL,
    slot_order int NOT NULL,
    role_label text NOT NULL,
    is_active boolean NOT NULL DEFAULT true,
    is_deleted boolean NOT NULL DEFAULT false,
    created_by uuid NULL REFERENCES public.users(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT chk_sim_ptsr_slot_order CHECK (slot_order >= 1),
    CONSTRAINT chk_sim_ptsr_document_table CHECK (document_table IN (
        'project_charters', 'assumption_logs', 'project_management_plans',
        'requirements_management_plans', 'requirements_documentation', 'wbs_dictionary_entries',
        'activity_attributes', 'activity_resource_requirements', 'resource_breakdown_structure',
        'activity_duration_estimates', 'cost_management_plans', 'activity_cost_estimates',
        'cost_baselines', 'resource_management_plans', 'stakeholder_engagement_plans',
        'procurement_management_plans', 'quality_checklists', 'team_performance_assessments',
        'make_or_buy_decisions', 'variance_analysis_reports', 'evm_status_reports',
        'scope_acceptance_forms', 'project_closure_checklists', 'contract_closure_documents'
    ))
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_sim_ptsr_slot
    ON sim.process_template_signatory_requirements (account_id, document_table, slot_order)
    WHERE is_deleted = false;

CREATE INDEX IF NOT EXISTS idx_sim_ptsr_lookup
    ON sim.process_template_signatory_requirements (account_id, document_table)
    WHERE is_deleted = false AND is_active = true;

ALTER TABLE sim.process_template_signatory_requirements ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON sim.process_template_signatory_requirements TO authenticated;

DROP POLICY IF EXISTS policy_sim_ptsr_select ON sim.process_template_signatory_requirements;
CREATE POLICY policy_sim_ptsr_select
    ON sim.process_template_signatory_requirements FOR SELECT TO authenticated
    USING (public.user_has_access_to_account(account_id));

DROP POLICY IF EXISTS policy_sim_ptsr_write ON sim.process_template_signatory_requirements;
CREATE POLICY policy_sim_ptsr_write
    ON sim.process_template_signatory_requirements FOR ALL TO authenticated
    USING (public.user_has_access_to_account(account_id) AND public.is_pmo_admin_user())
    WITH CHECK (public.user_has_access_to_account(account_id) AND public.is_pmo_admin_user());

INSERT INTO public.database_tables (table_name, table_description, is_system_table, is_active)
VALUES
    ('sim.process_template_signatory_requirements', 'PMO Admin-configured, per-organisation, ordered list of required signatory role-slots per Simulator process_templates document type.', false, true)
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    is_system_table = EXCLUDED.is_system_table,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();

CREATE TABLE IF NOT EXISTS sim.process_template_document_signatories (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    template_node_id uuid NOT NULL REFERENCES sim.pm_template_nodes(id) ON DELETE CASCADE,

    signing_round int NOT NULL DEFAULT 1,
    slot_order int NOT NULL,
    role_label text NOT NULL,

    assigned_user_id uuid NULL REFERENCES public.users(id) ON DELETE SET NULL,
    status text NOT NULL DEFAULT 'pending',

    storage_bucket text NULL,
    storage_path text NULL,
    file_name text NULL,
    mime_type text NULL,
    file_size bigint NULL,
    display_id text,

    signed_at timestamptz NULL,
    declined_at timestamptz NULL,
    decline_reason text NULL,

    created_by uuid NULL REFERENCES public.users(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT chk_sim_ptds_status CHECK (status IN ('pending', 'signed', 'declined')),
    CONSTRAINT chk_sim_ptds_slot_order CHECK (slot_order >= 1),
    CONSTRAINT chk_sim_ptds_signing_round CHECK (signing_round >= 1)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_sim_ptds_slot
    ON sim.process_template_document_signatories (template_node_id, signing_round, slot_order);

CREATE INDEX IF NOT EXISTS idx_sim_ptds_node
    ON sim.process_template_document_signatories (template_node_id);

CREATE UNIQUE INDEX IF NOT EXISTS uq_sim_ptds_display_id
    ON sim.process_template_document_signatories (display_id)
    WHERE display_id IS NOT NULL;

ALTER TABLE sim.process_template_document_signatories ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON sim.process_template_document_signatories TO authenticated;

CREATE OR REPLACE FUNCTION sim.auth_user_can_read_document_signatories(p_template_node_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = sim, public
SET row_security = off
AS $$
  SELECT
    p_template_node_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM sim.pm_template_nodes n
      WHERE n.id = p_template_node_id
        AND public.user_has_access_to_account(n.account_id)
    );
$$;

CREATE OR REPLACE FUNCTION sim.auth_user_can_administer_document_signatories(p_template_node_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = sim, public
SET row_security = off
AS $$
  SELECT
    p_template_node_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM sim.pm_template_nodes n
      WHERE n.id = p_template_node_id
        AND (
          (
            n.scope_entity_type = 'project'
            AND n.scope_entity_id IS NOT NULL
            AND sim.auth_user_can_access_practice_project(n.scope_entity_id)
          )
          OR sim.can_manage_pm_template_node(
            n.account_id, n.tier, n.scope_entity_type, n.scope_entity_id, n.is_system_synced
          )
        )
    );
$$;

GRANT EXECUTE ON FUNCTION sim.auth_user_can_read_document_signatories(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION sim.auth_user_can_administer_document_signatories(UUID) TO authenticated;

DROP POLICY IF EXISTS policy_sim_ptds_select ON sim.process_template_document_signatories;
CREATE POLICY policy_sim_ptds_select
    ON sim.process_template_document_signatories FOR SELECT TO authenticated
    USING (sim.auth_user_can_read_document_signatories(template_node_id));

DROP POLICY IF EXISTS policy_sim_ptds_insert ON sim.process_template_document_signatories;
CREATE POLICY policy_sim_ptds_insert
    ON sim.process_template_document_signatories FOR INSERT TO authenticated
    WITH CHECK (sim.auth_user_can_administer_document_signatories(template_node_id));

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
                  AND prior.status <> 'signed'
            )
        )
    );

DROP POLICY IF EXISTS policy_sim_ptds_delete ON sim.process_template_document_signatories;
CREATE POLICY policy_sim_ptds_delete
    ON sim.process_template_document_signatories FOR DELETE TO authenticated
    USING (sim.auth_user_can_administer_document_signatories(template_node_id));

INSERT INTO public.database_tables (table_name, table_description, is_system_table, is_active)
VALUES
    ('sim.process_template_document_signatories', 'Per-document signatory signing instances (with append-only signing-round history) for Simulator process_templates documents, keyed by sim.pm_template_nodes.id.', false, true)
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    is_system_table = EXCLUDED.is_system_table,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();

DO $$
BEGIN
  RAISE NOTICE 'v868_process_template_signatories_tables.sql applied';
END $$;
