-- ============================================================================
-- v1318: Register documents — engine schema (document switch, sign-off, annexures)
-- ============================================================================
-- PRD: projectprd/v1318_register_document_export_and_signoff_PRD.md (approved 2026-10-24)
-- Plan: projectplan/v1318_register_document_export_and_signoff_plan.md
--
-- Platform (public) and Simulator (sim), rule 34:
--   1. local_registers.is_document — register records are formal documents.
--   2. local_register_records.signoff_state — none | in_progress | complete; a BEFORE UPDATE
--      trigger blocks edits while locked (only the v1319 sign-off functions may change it).
--   3. local_register_record_signatories — per-record signing rounds (mirrors v868's
--      process_template_document_signatories). Read-only to clients; writes via v1319 RPCs.
--   4. local_register_record_attachments — annexures (mirrors v867 + annexure_title);
--      writes blocked while the record is locked.
--   5. Signatory configuration (process_template_signatory_requirements / _scope_policies)
--      accepts document types 'local_register:<register_key>' (Document Signatory page).
--   6. Private Storage buckets local-register-signatures (2 MB) / local-register-attachments
--      (10 MB) with SECURITY DEFINER helper policies (v866e / v1016 pattern).
--
-- Display IDs: Admin ID Generation rules are seeded in
--   E:\project-nidus-admin\SQL\v243_local_register_document_id_generation_seed.sql (rule 16.2).
-- After running: re-run SQL/v1251_planner_table_wall.sql (new public tables, CLAUDE.md DB rule 6).
-- Prerequisites: v931–v938, v868–v898, v880c, v1075/v1076. Idempotent.
-- ============================================================================

-- ── 0. Buckets ──────────────────────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'local-register-signatures', 'local-register-signatures', false, 2097152,
  ARRAY['image/png', 'image/jpeg', 'image/gif', 'image/svg+xml', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'local-register-attachments', 'local-register-attachments', false, 10485760,
  ARRAY[
    'image/png', 'image/jpeg', 'image/gif', 'image/svg+xml', 'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain', 'text/csv',
    'application/octet-stream'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ═════════════════════════════════════════════════════════════════════════════
-- PUBLIC (Platform)
-- ═════════════════════════════════════════════════════════════════════════════

-- ── public.1 Document switch and sign-off state ─────────────────────────────────
ALTER TABLE public.local_registers
  ADD COLUMN IF NOT EXISTS is_document BOOLEAN NOT NULL DEFAULT FALSE;
COMMENT ON COLUMN public.local_registers.is_document IS
  'v1318: TRUE = records are formal documents (in-app sign-off, attachments as annexures, complete Word/PDF document export).';

ALTER TABLE public.local_register_records
  ADD COLUMN IF NOT EXISTS signoff_state VARCHAR(20) NOT NULL DEFAULT 'none';
ALTER TABLE public.local_register_records DROP CONSTRAINT IF EXISTS chk_lrr_signoff_state;
ALTER TABLE public.local_register_records
  ADD CONSTRAINT chk_lrr_signoff_state CHECK (signoff_state IN ('none', 'in_progress', 'complete'));
COMMENT ON COLUMN public.local_register_records.signoff_state IS
  'v1318: none = editable; in_progress / complete = locked for sign-off (changed only by the local_register_signoff_* functions).';

-- ── public.2 Access helpers (SECURITY DEFINER, row_security off — v1016 pattern) ──
CREATE OR REPLACE FUNCTION public.auth_user_can_access_local_register_record(p_record_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.local_register_records r
    JOIN public.local_registers lr ON lr.id = r.register_id
    WHERE r.id = p_record_id
      AND r.is_deleted = FALSE
      AND public.has_local_register_scope_access(
        auth.uid(), lr.scope_level,
        COALESCE(lr.scope_portfolio_id, r.record_portfolio_id),
        COALESCE(lr.scope_programme_id, r.record_programme_id),
        COALESCE(lr.scope_project_id, r.record_project_id)
      )
  );
$$;
GRANT EXECUTE ON FUNCTION public.auth_user_can_access_local_register_record(UUID) TO authenticated;

-- Can add/replace attachments: has access AND the record is not locked for sign-off.
CREATE OR REPLACE FUNCTION public.auth_user_can_write_local_register_attachment(p_record_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT public.auth_user_can_access_local_register_record(p_record_id)
     AND EXISTS (
       SELECT 1 FROM public.local_register_records r
       WHERE r.id = p_record_id AND r.signoff_state = 'none'
     );
$$;
GRANT EXECUTE ON FUNCTION public.auth_user_can_write_local_register_attachment(UUID) TO authenticated;

-- ── public.3 Signatories (per-record signing rounds — mirrors process_template_document_signatories) ──
CREATE TABLE IF NOT EXISTS public.local_register_record_signatories (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  record_id        UUID NOT NULL REFERENCES public.local_register_records(id) ON DELETE CASCADE,
  signing_round    INT NOT NULL DEFAULT 1,
  slot_order       INT NOT NULL,
  role_label       TEXT NOT NULL,
  is_mandatory     BOOLEAN NOT NULL DEFAULT TRUE,
  assigned_user_id UUID NULL REFERENCES public.users(id) ON DELETE SET NULL,
  status           TEXT NOT NULL DEFAULT 'pending',
  storage_bucket   TEXT NULL,
  storage_path     TEXT NULL,
  file_name        TEXT NULL,
  mime_type        TEXT NULL,
  file_size        BIGINT NULL,
  display_id       TEXT,
  signed_at        TIMESTAMPTZ NULL,
  declined_at      TIMESTAMPTZ NULL,
  decline_reason   TEXT NULL,
  locked_by        UUID NULL REFERENCES public.users(id) ON DELETE SET NULL,
  locked_at        TIMESTAMPTZ NULL,
  lock_reason      TEXT NULL,
  created_by       UUID NULL REFERENCES public.users(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_lrrs_status CHECK (status IN ('pending', 'signed', 'declined', 'expired')),
  CONSTRAINT chk_lrrs_slot_order CHECK (slot_order >= 1),
  CONSTRAINT chk_lrrs_signing_round CHECK (signing_round >= 1)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_lrrs_slot
  ON public.local_register_record_signatories (record_id, signing_round, slot_order);
CREATE INDEX IF NOT EXISTS idx_lrrs_record
  ON public.local_register_record_signatories (record_id);
CREATE INDEX IF NOT EXISTS idx_lrrs_assigned
  ON public.local_register_record_signatories (assigned_user_id) WHERE status = 'pending';
CREATE UNIQUE INDEX IF NOT EXISTS uq_lrrs_display_id
  ON public.local_register_record_signatories (display_id) WHERE display_id IS NOT NULL AND display_id <> '';

ALTER TABLE public.local_register_record_signatories ENABLE ROW LEVEL SECURITY;
-- Read-only to clients: every change goes through the local_register_signoff_* functions (v1319).
REVOKE ALL ON public.local_register_record_signatories FROM anon, authenticated;
GRANT SELECT ON public.local_register_record_signatories TO authenticated;
GRANT ALL ON public.local_register_record_signatories TO service_role;

DROP POLICY IF EXISTS policy_lrrs_select ON public.local_register_record_signatories;
CREATE POLICY policy_lrrs_select ON public.local_register_record_signatories
  FOR SELECT TO authenticated
  USING (public.auth_user_can_access_local_register_record(record_id));

-- Can upload a signature image: caller is assigned to a pending slot in the record's current round.
CREATE OR REPLACE FUNCTION public.auth_user_is_pending_local_register_signatory(p_record_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.local_register_record_signatories sg
    JOIN public.users u ON u.id = sg.assigned_user_id
    WHERE sg.record_id = p_record_id
      AND sg.status = 'pending'
      AND u.auth_user_id = auth.uid()
      AND sg.signing_round = (
        SELECT MAX(x.signing_round) FROM public.local_register_record_signatories x WHERE x.record_id = p_record_id
      )
  );
$$;
GRANT EXECUTE ON FUNCTION public.auth_user_is_pending_local_register_signatory(UUID) TO authenticated;

DROP TRIGGER IF EXISTS trg_lrrs_admin_display_id ON public.local_register_record_signatories;
CREATE TRIGGER trg_lrrs_admin_display_id
  AFTER INSERT ON public.local_register_record_signatories
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_apply_admin_display_id('public.local_register_record_signatories', 'display_id');

-- ── public.4 Attachments (annexures — mirrors process_template_attachments + annexure_title) ──
CREATE TABLE IF NOT EXISTS public.local_register_record_attachments (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  record_id           UUID NOT NULL REFERENCES public.local_register_records(id) ON DELETE CASCADE,
  attachment_group_id UUID NOT NULL,
  version_number      INT NOT NULL DEFAULT 1,
  is_current          BOOLEAN NOT NULL DEFAULT TRUE,
  annexure_title      TEXT NOT NULL,
  storage_bucket      TEXT NOT NULL,
  storage_path        TEXT NOT NULL,
  file_name           TEXT NOT NULL,
  mime_type           TEXT NOT NULL,
  file_size           BIGINT NOT NULL,
  display_id          TEXT,
  uploaded_by         UUID NULL REFERENCES public.users(id),
  uploaded_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_deleted          BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at          TIMESTAMPTZ,
  deleted_by          UUID NULL REFERENCES public.users(id),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_lrra_title CHECK (length(btrim(annexure_title)) > 0),
  CONSTRAINT chk_lrra_size CHECK (file_size > 0 AND file_size <= 10485760)
);

CREATE INDEX IF NOT EXISTS idx_lrra_record
  ON public.local_register_record_attachments (record_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_lrra_group
  ON public.local_register_record_attachments (attachment_group_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_lrra_display_id
  ON public.local_register_record_attachments (display_id) WHERE display_id IS NOT NULL AND display_id <> '';

ALTER TABLE public.local_register_record_attachments ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.local_register_record_attachments FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.local_register_record_attachments TO authenticated;
GRANT ALL ON public.local_register_record_attachments TO service_role;

DROP POLICY IF EXISTS policy_lrra_select ON public.local_register_record_attachments;
CREATE POLICY policy_lrra_select ON public.local_register_record_attachments
  FOR SELECT TO authenticated
  USING (public.auth_user_can_access_local_register_record(record_id));

DROP POLICY IF EXISTS policy_lrra_insert ON public.local_register_record_attachments;
CREATE POLICY policy_lrra_insert ON public.local_register_record_attachments
  FOR INSERT TO authenticated
  WITH CHECK (public.auth_user_can_write_local_register_attachment(record_id));

DROP POLICY IF EXISTS policy_lrra_update ON public.local_register_record_attachments;
CREATE POLICY policy_lrra_update ON public.local_register_record_attachments
  FOR UPDATE TO authenticated
  USING (public.auth_user_can_write_local_register_attachment(record_id))
  WITH CHECK (public.auth_user_can_write_local_register_attachment(record_id));

DROP TRIGGER IF EXISTS trg_lrra_admin_display_id ON public.local_register_record_attachments;
CREATE TRIGGER trg_lrra_admin_display_id
  AFTER INSERT ON public.local_register_record_attachments
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_apply_admin_display_id('public.local_register_record_attachments', 'display_id');

-- ── public.5 Edit lock while a record is under sign-off ─────────────────────────
-- Only the local_register_signoff_* functions (which set nidus.local_register_signoff = 'on'
-- for their own transaction) may change a locked record or its signoff_state, or put a
-- document record into the sign-off statuses In Review / Approved.
CREATE OR REPLACE FUNCTION public.enforce_local_register_signoff_lock()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_is_document BOOLEAN;
BEGIN
  IF COALESCE(current_setting('nidus.local_register_signoff', TRUE), '') = 'on' THEN
    RETURN NEW;
  END IF;

  IF NEW.status IN ('in_review', 'approved')
     AND (TG_OP = 'INSERT' OR NEW.status IS DISTINCT FROM OLD.status) THEN
    SELECT lr.is_document INTO v_is_document FROM public.local_registers lr WHERE lr.id = NEW.register_id;
    IF COALESCE(v_is_document, FALSE) THEN
      RAISE EXCEPTION 'In Review and Approved are set by sign-off. Use the Sign-off tab.'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.signoff_state <> 'none' THEN
      RAISE EXCEPTION 'Sign-off state can only be changed through the sign-off actions.'
        USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.signoff_state IS DISTINCT FROM OLD.signoff_state THEN
    RAISE EXCEPTION 'Sign-off state can only be changed through the sign-off actions.'
      USING ERRCODE = '42501';
  END IF;
  IF OLD.signoff_state <> 'none' AND (
       NEW.title IS DISTINCT FROM OLD.title
    OR NEW.description IS DISTINCT FROM OLD.description
    OR NEW.status IS DISTINCT FROM OLD.status
    OR NEW.field_values IS DISTINCT FROM OLD.field_values
    OR NEW.is_deleted IS DISTINCT FROM OLD.is_deleted
  ) THEN
    RAISE EXCEPTION 'This document is locked for sign-off. Restart sign-off to make changes.'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_lrr_signoff_lock ON public.local_register_records;
CREATE TRIGGER trg_lrr_signoff_lock
  BEFORE INSERT OR UPDATE ON public.local_register_records
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_local_register_signoff_lock();

-- ── public.6 Signatory configuration accepts register document types ('local_register:<key>') ──
ALTER TABLE public.process_template_signatory_requirements DROP CONSTRAINT IF EXISTS chk_ptsr_document_table;
ALTER TABLE public.process_template_signatory_requirements ADD CONSTRAINT chk_ptsr_document_table CHECK (
  document_table IN (
      'project_charters', 'assumption_logs', 'project_management_plans',
      'requirements_management_plans', 'requirements_documentation', 'wbs_dictionary_entries',
      'activity_attributes', 'activity_resource_requirements', 'resource_breakdown_structure',
      'activity_duration_estimates', 'cost_management_plans', 'activity_cost_estimates',
      'cost_baselines', 'resource_management_plans', 'stakeholder_engagement_plans',
      'procurement_management_plans', 'quality_checklists', 'team_performance_assessments',
      'make_or_buy_decisions', 'variance_analysis_reports', 'evm_status_reports',
      'scope_acceptance_forms', 'project_closure_checklists', 'contract_closure_documents'
  )
  OR document_table LIKE 'local_register:%'
);

ALTER TABLE public.process_template_signatory_scope_policies DROP CONSTRAINT IF EXISTS chk_ptssp_document_table;
ALTER TABLE public.process_template_signatory_scope_policies ADD CONSTRAINT chk_ptssp_document_table CHECK (
  document_table IN (
      'project_charters', 'assumption_logs', 'project_management_plans',
      'requirements_management_plans', 'requirements_documentation', 'wbs_dictionary_entries',
      'activity_attributes', 'activity_resource_requirements', 'resource_breakdown_structure',
      'activity_duration_estimates', 'cost_management_plans', 'activity_cost_estimates',
      'cost_baselines', 'resource_management_plans', 'stakeholder_engagement_plans',
      'procurement_management_plans', 'quality_checklists', 'team_performance_assessments',
      'make_or_buy_decisions', 'variance_analysis_reports', 'evm_status_reports',
      'scope_acceptance_forms', 'project_closure_checklists', 'contract_closure_documents'
  )
  OR document_table LIKE 'local_register:%'
);

-- ── public.7 Storage (paths: platform/<record_id>/...) ─────────────────────────────
DROP POLICY IF EXISTS "Platform: local-register-attachments via record access" ON storage.objects;
CREATE POLICY "Platform: local-register-attachments via record access"
ON storage.objects
FOR ALL
TO authenticated
USING (
  bucket_id = 'local-register-attachments'
  AND (storage.foldername(name))[1] = 'platform'
  AND public.auth_user_can_access_local_register_record(NULLIF((storage.foldername(name))[2], '')::uuid)
)
WITH CHECK (
  bucket_id = 'local-register-attachments'
  AND (storage.foldername(name))[1] = 'platform'
  AND public.auth_user_can_write_local_register_attachment(NULLIF((storage.foldername(name))[2], '')::uuid)
);

DROP POLICY IF EXISTS "Platform: read local-register-signatures via record access" ON storage.objects;
CREATE POLICY "Platform: read local-register-signatures via record access"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'local-register-signatures'
  AND (storage.foldername(name))[1] = 'platform'
  AND public.auth_user_can_access_local_register_record(NULLIF((storage.foldername(name))[2], '')::uuid)
);

DROP POLICY IF EXISTS "Platform: upload local-register-signatures as pending signatory" ON storage.objects;
CREATE POLICY "Platform: upload local-register-signatures as pending signatory"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'local-register-signatures'
  AND (storage.foldername(name))[1] = 'platform'
  AND public.auth_user_is_pending_local_register_signatory(NULLIF((storage.foldername(name))[2], '')::uuid)
);

DROP POLICY IF EXISTS "Platform: replace local-register-signatures as pending signatory" ON storage.objects;
CREATE POLICY "Platform: replace local-register-signatures as pending signatory"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'local-register-signatures'
  AND (storage.foldername(name))[1] = 'platform'
  AND public.auth_user_is_pending_local_register_signatory(NULLIF((storage.foldername(name))[2], '')::uuid)
)
WITH CHECK (
  bucket_id = 'local-register-signatures'
  AND (storage.foldername(name))[1] = 'platform'
  AND public.auth_user_is_pending_local_register_signatory(NULLIF((storage.foldername(name))[2], '')::uuid)
);


-- ═════════════════════════════════════════════════════════════════════════════
-- SIM (Simulator)
-- ═════════════════════════════════════════════════════════════════════════════

-- ── sim.1 Document switch and sign-off state ─────────────────────────────────
ALTER TABLE sim.local_registers
  ADD COLUMN IF NOT EXISTS is_document BOOLEAN NOT NULL DEFAULT FALSE;
COMMENT ON COLUMN sim.local_registers.is_document IS
  'v1318: TRUE = records are formal documents (in-app sign-off, attachments as annexures, complete Word/PDF document export).';

ALTER TABLE sim.local_register_records
  ADD COLUMN IF NOT EXISTS signoff_state VARCHAR(20) NOT NULL DEFAULT 'none';
ALTER TABLE sim.local_register_records DROP CONSTRAINT IF EXISTS chk_sim_lrr_signoff_state;
ALTER TABLE sim.local_register_records
  ADD CONSTRAINT chk_sim_lrr_signoff_state CHECK (signoff_state IN ('none', 'in_progress', 'complete'));
COMMENT ON COLUMN sim.local_register_records.signoff_state IS
  'v1318: none = editable; in_progress / complete = locked for sign-off (changed only by the local_register_signoff_* functions).';

-- ── sim.2 Access helpers (SECURITY DEFINER, row_security off — v1016 pattern) ──
CREATE OR REPLACE FUNCTION sim.auth_user_can_access_local_register_record(p_record_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = sim, public
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM sim.local_register_records r
    WHERE r.id = p_record_id
      AND r.is_deleted = FALSE
      AND (
        (r.is_system_register = TRUE AND EXISTS (
          SELECT 1 FROM public.local_registers lr WHERE lr.id = r.register_id
            AND sim.has_local_register_scope_access(auth.uid(), lr.scope_level,
              COALESCE(lr.scope_portfolio_id, r.record_portfolio_id),
              COALESCE(lr.scope_programme_id, r.record_programme_id),
              COALESCE(lr.scope_project_id, r.record_project_id))
        ))
        OR (r.is_system_register = FALSE AND EXISTS (
          SELECT 1 FROM sim.local_registers lr WHERE lr.id = r.register_id
            AND sim.has_local_register_scope_access(auth.uid(), lr.scope_level,
              lr.scope_portfolio_id, lr.scope_programme_id, lr.scope_project_id)
        ))
      )
  );
$$;
GRANT EXECUTE ON FUNCTION sim.auth_user_can_access_local_register_record(UUID) TO authenticated;

-- Can add/replace attachments: has access AND the record is not locked for sign-off.
CREATE OR REPLACE FUNCTION sim.auth_user_can_write_local_register_attachment(p_record_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = sim, public
SET row_security = off
AS $$
  SELECT sim.auth_user_can_access_local_register_record(p_record_id)
     AND EXISTS (
       SELECT 1 FROM sim.local_register_records r
       WHERE r.id = p_record_id AND r.signoff_state = 'none'
     );
$$;
GRANT EXECUTE ON FUNCTION sim.auth_user_can_write_local_register_attachment(UUID) TO authenticated;

-- ── sim.3 Signatories (per-record signing rounds — mirrors process_template_document_signatories) ──
CREATE TABLE IF NOT EXISTS sim.local_register_record_signatories (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  record_id        UUID NOT NULL REFERENCES sim.local_register_records(id) ON DELETE CASCADE,
  signing_round    INT NOT NULL DEFAULT 1,
  slot_order       INT NOT NULL,
  role_label       TEXT NOT NULL,
  is_mandatory     BOOLEAN NOT NULL DEFAULT TRUE,
  assigned_user_id UUID NULL REFERENCES public.users(id) ON DELETE SET NULL,
  status           TEXT NOT NULL DEFAULT 'pending',
  storage_bucket   TEXT NULL,
  storage_path     TEXT NULL,
  file_name        TEXT NULL,
  mime_type        TEXT NULL,
  file_size        BIGINT NULL,
  display_id       TEXT,
  signed_at        TIMESTAMPTZ NULL,
  declined_at      TIMESTAMPTZ NULL,
  decline_reason   TEXT NULL,
  locked_by        UUID NULL REFERENCES public.users(id) ON DELETE SET NULL,
  locked_at        TIMESTAMPTZ NULL,
  lock_reason      TEXT NULL,
  created_by       UUID NULL REFERENCES public.users(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_sim_lrrs_status CHECK (status IN ('pending', 'signed', 'declined', 'expired')),
  CONSTRAINT chk_sim_lrrs_slot_order CHECK (slot_order >= 1),
  CONSTRAINT chk_sim_lrrs_signing_round CHECK (signing_round >= 1)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_sim_lrrs_slot
  ON sim.local_register_record_signatories (record_id, signing_round, slot_order);
CREATE INDEX IF NOT EXISTS idx_sim_lrrs_record
  ON sim.local_register_record_signatories (record_id);
CREATE INDEX IF NOT EXISTS idx_sim_lrrs_assigned
  ON sim.local_register_record_signatories (assigned_user_id) WHERE status = 'pending';
CREATE UNIQUE INDEX IF NOT EXISTS uq_sim_lrrs_display_id
  ON sim.local_register_record_signatories (display_id) WHERE display_id IS NOT NULL AND display_id <> '';

ALTER TABLE sim.local_register_record_signatories ENABLE ROW LEVEL SECURITY;
-- Read-only to clients: every change goes through the local_register_signoff_* functions (v1319).
REVOKE ALL ON sim.local_register_record_signatories FROM anon, authenticated;
GRANT SELECT ON sim.local_register_record_signatories TO authenticated;
GRANT ALL ON sim.local_register_record_signatories TO service_role;

DROP POLICY IF EXISTS policy_sim_lrrs_select ON sim.local_register_record_signatories;
CREATE POLICY policy_sim_lrrs_select ON sim.local_register_record_signatories
  FOR SELECT TO authenticated
  USING (sim.auth_user_can_access_local_register_record(record_id));

-- Can upload a signature image: caller is assigned to a pending slot in the record's current round.
CREATE OR REPLACE FUNCTION sim.auth_user_is_pending_local_register_signatory(p_record_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = sim, public
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM sim.local_register_record_signatories sg
    JOIN public.users u ON u.id = sg.assigned_user_id
    WHERE sg.record_id = p_record_id
      AND sg.status = 'pending'
      AND u.auth_user_id = auth.uid()
      AND sg.signing_round = (
        SELECT MAX(x.signing_round) FROM sim.local_register_record_signatories x WHERE x.record_id = p_record_id
      )
  );
$$;
GRANT EXECUTE ON FUNCTION sim.auth_user_is_pending_local_register_signatory(UUID) TO authenticated;

DROP TRIGGER IF EXISTS trg_sim_lrrs_admin_display_id ON sim.local_register_record_signatories;
CREATE TRIGGER trg_sim_lrrs_admin_display_id
  AFTER INSERT ON sim.local_register_record_signatories
  FOR EACH ROW
  EXECUTE FUNCTION sim.trg_apply_admin_display_id('sim.local_register_record_signatories', 'display_id');

-- ── sim.4 Attachments (annexures — mirrors process_template_attachments + annexure_title) ──
CREATE TABLE IF NOT EXISTS sim.local_register_record_attachments (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  record_id           UUID NOT NULL REFERENCES sim.local_register_records(id) ON DELETE CASCADE,
  attachment_group_id UUID NOT NULL,
  version_number      INT NOT NULL DEFAULT 1,
  is_current          BOOLEAN NOT NULL DEFAULT TRUE,
  annexure_title      TEXT NOT NULL,
  storage_bucket      TEXT NOT NULL,
  storage_path        TEXT NOT NULL,
  file_name           TEXT NOT NULL,
  mime_type           TEXT NOT NULL,
  file_size           BIGINT NOT NULL,
  display_id          TEXT,
  uploaded_by         UUID NULL REFERENCES public.users(id),
  uploaded_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_deleted          BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at          TIMESTAMPTZ,
  deleted_by          UUID NULL REFERENCES public.users(id),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_sim_lrra_title CHECK (length(btrim(annexure_title)) > 0),
  CONSTRAINT chk_sim_lrra_size CHECK (file_size > 0 AND file_size <= 10485760)
);

CREATE INDEX IF NOT EXISTS idx_sim_lrra_record
  ON sim.local_register_record_attachments (record_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_sim_lrra_group
  ON sim.local_register_record_attachments (attachment_group_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_sim_lrra_display_id
  ON sim.local_register_record_attachments (display_id) WHERE display_id IS NOT NULL AND display_id <> '';

ALTER TABLE sim.local_register_record_attachments ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON sim.local_register_record_attachments FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON sim.local_register_record_attachments TO authenticated;
GRANT ALL ON sim.local_register_record_attachments TO service_role;

DROP POLICY IF EXISTS policy_sim_lrra_select ON sim.local_register_record_attachments;
CREATE POLICY policy_sim_lrra_select ON sim.local_register_record_attachments
  FOR SELECT TO authenticated
  USING (sim.auth_user_can_access_local_register_record(record_id));

DROP POLICY IF EXISTS policy_sim_lrra_insert ON sim.local_register_record_attachments;
CREATE POLICY policy_sim_lrra_insert ON sim.local_register_record_attachments
  FOR INSERT TO authenticated
  WITH CHECK (sim.auth_user_can_write_local_register_attachment(record_id));

DROP POLICY IF EXISTS policy_sim_lrra_update ON sim.local_register_record_attachments;
CREATE POLICY policy_sim_lrra_update ON sim.local_register_record_attachments
  FOR UPDATE TO authenticated
  USING (sim.auth_user_can_write_local_register_attachment(record_id))
  WITH CHECK (sim.auth_user_can_write_local_register_attachment(record_id));

DROP TRIGGER IF EXISTS trg_sim_lrra_admin_display_id ON sim.local_register_record_attachments;
CREATE TRIGGER trg_sim_lrra_admin_display_id
  AFTER INSERT ON sim.local_register_record_attachments
  FOR EACH ROW
  EXECUTE FUNCTION sim.trg_apply_admin_display_id('sim.local_register_record_attachments', 'display_id');

-- ── sim.5 Edit lock while a record is under sign-off ─────────────────────────
-- Only the local_register_signoff_* functions (which set nidus.local_register_signoff = 'on'
-- for their own transaction) may change a locked record or its signoff_state, or put a
-- document record into the sign-off statuses In Review / Approved.
CREATE OR REPLACE FUNCTION sim.enforce_local_register_signoff_lock()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_is_document BOOLEAN;
BEGIN
  IF COALESCE(current_setting('nidus.local_register_signoff', TRUE), '') = 'on' THEN
    RETURN NEW;
  END IF;

  IF NEW.status IN ('in_review', 'approved')
     AND (TG_OP = 'INSERT' OR NEW.status IS DISTINCT FROM OLD.status) THEN
    IF NEW.is_system_register THEN
      SELECT lr.is_document INTO v_is_document FROM public.local_registers lr WHERE lr.id = NEW.register_id;
    ELSE
      SELECT lr.is_document INTO v_is_document FROM sim.local_registers lr WHERE lr.id = NEW.register_id;
    END IF;
    IF COALESCE(v_is_document, FALSE) THEN
      RAISE EXCEPTION 'In Review and Approved are set by sign-off. Use the Sign-off tab.'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.signoff_state <> 'none' THEN
      RAISE EXCEPTION 'Sign-off state can only be changed through the sign-off actions.'
        USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.signoff_state IS DISTINCT FROM OLD.signoff_state THEN
    RAISE EXCEPTION 'Sign-off state can only be changed through the sign-off actions.'
      USING ERRCODE = '42501';
  END IF;
  IF OLD.signoff_state <> 'none' AND (
       NEW.title IS DISTINCT FROM OLD.title
    OR NEW.description IS DISTINCT FROM OLD.description
    OR NEW.status IS DISTINCT FROM OLD.status
    OR NEW.field_values IS DISTINCT FROM OLD.field_values
    OR NEW.is_deleted IS DISTINCT FROM OLD.is_deleted
  ) THEN
    RAISE EXCEPTION 'This document is locked for sign-off. Restart sign-off to make changes.'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sim_lrr_signoff_lock ON sim.local_register_records;
CREATE TRIGGER trg_sim_lrr_signoff_lock
  BEFORE INSERT OR UPDATE ON sim.local_register_records
  FOR EACH ROW
  EXECUTE FUNCTION sim.enforce_local_register_signoff_lock();

-- ── sim.6 Signatory configuration accepts register document types ('local_register:<key>') ──
ALTER TABLE sim.process_template_signatory_requirements DROP CONSTRAINT IF EXISTS chk_sim_ptsr_document_table;
ALTER TABLE sim.process_template_signatory_requirements ADD CONSTRAINT chk_sim_ptsr_document_table CHECK (
  document_table IN (
      'project_charters', 'assumption_logs', 'project_management_plans',
      'requirements_management_plans', 'requirements_documentation', 'wbs_dictionary_entries',
      'activity_attributes', 'activity_resource_requirements', 'resource_breakdown_structure',
      'activity_duration_estimates', 'cost_management_plans', 'activity_cost_estimates',
      'cost_baselines', 'resource_management_plans', 'stakeholder_engagement_plans',
      'procurement_management_plans', 'quality_checklists', 'team_performance_assessments',
      'make_or_buy_decisions', 'variance_analysis_reports', 'evm_status_reports',
      'scope_acceptance_forms', 'project_closure_checklists', 'contract_closure_documents'
  )
  OR document_table LIKE 'local_register:%'
);

ALTER TABLE sim.process_template_signatory_scope_policies DROP CONSTRAINT IF EXISTS chk_sim_ptssp_document_table;
ALTER TABLE sim.process_template_signatory_scope_policies ADD CONSTRAINT chk_sim_ptssp_document_table CHECK (
  document_table IN (
      'project_charters', 'assumption_logs', 'project_management_plans',
      'requirements_management_plans', 'requirements_documentation', 'wbs_dictionary_entries',
      'activity_attributes', 'activity_resource_requirements', 'resource_breakdown_structure',
      'activity_duration_estimates', 'cost_management_plans', 'activity_cost_estimates',
      'cost_baselines', 'resource_management_plans', 'stakeholder_engagement_plans',
      'procurement_management_plans', 'quality_checklists', 'team_performance_assessments',
      'make_or_buy_decisions', 'variance_analysis_reports', 'evm_status_reports',
      'scope_acceptance_forms', 'project_closure_checklists', 'contract_closure_documents'
  )
  OR document_table LIKE 'local_register:%'
);

-- ── sim.7 Storage (paths: sim/<record_id>/...) ─────────────────────────────
DROP POLICY IF EXISTS "Simulator: local-register-attachments via record access" ON storage.objects;
CREATE POLICY "Simulator: local-register-attachments via record access"
ON storage.objects
FOR ALL
TO authenticated
USING (
  bucket_id = 'local-register-attachments'
  AND (storage.foldername(name))[1] = 'sim'
  AND sim.auth_user_can_access_local_register_record(NULLIF((storage.foldername(name))[2], '')::uuid)
)
WITH CHECK (
  bucket_id = 'local-register-attachments'
  AND (storage.foldername(name))[1] = 'sim'
  AND sim.auth_user_can_write_local_register_attachment(NULLIF((storage.foldername(name))[2], '')::uuid)
);

DROP POLICY IF EXISTS "Simulator: read local-register-signatures via record access" ON storage.objects;
CREATE POLICY "Simulator: read local-register-signatures via record access"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'local-register-signatures'
  AND (storage.foldername(name))[1] = 'sim'
  AND sim.auth_user_can_access_local_register_record(NULLIF((storage.foldername(name))[2], '')::uuid)
);

DROP POLICY IF EXISTS "Simulator: upload local-register-signatures as pending signatory" ON storage.objects;
CREATE POLICY "Simulator: upload local-register-signatures as pending signatory"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'local-register-signatures'
  AND (storage.foldername(name))[1] = 'sim'
  AND sim.auth_user_is_pending_local_register_signatory(NULLIF((storage.foldername(name))[2], '')::uuid)
);

DROP POLICY IF EXISTS "Simulator: replace local-register-signatures as pending signatory" ON storage.objects;
CREATE POLICY "Simulator: replace local-register-signatures as pending signatory"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'local-register-signatures'
  AND (storage.foldername(name))[1] = 'sim'
  AND sim.auth_user_is_pending_local_register_signatory(NULLIF((storage.foldername(name))[2], '')::uuid)
)
WITH CHECK (
  bucket_id = 'local-register-signatures'
  AND (storage.foldername(name))[1] = 'sim'
  AND sim.auth_user_is_pending_local_register_signatory(NULLIF((storage.foldername(name))[2], '')::uuid)
);

-- ── Registry (CLAUDE.md Database Table Registration Rule) ───────────────────────
INSERT INTO public.database_tables (table_name, table_description, is_system_table, is_active)
VALUES
  ('local_register_record_signatories', 'Local Register document records: per-record sign-off signatories by signing round (v1318)', false, true),
  ('local_register_record_attachments', 'Local Register document records: attachments shown as annexures, with versions (v1318)', false, true)
ON CONFLICT (table_name) DO UPDATE SET
  table_description = EXCLUDED.table_description,
  is_system_table = EXCLUDED.is_system_table,
  updated_at = NOW();

NOTIFY pgrst, 'reload schema';
