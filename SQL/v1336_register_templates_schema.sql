-- ============================================================================
-- v1336: Register record templates — schema (Platform public + Simulator sim)
-- ============================================================================
-- PRD: projectprd/v1336_register_document_templates_cbs_dmsd_PRD.md (approved 2026-10-24)
--
--   * local_register_templates — a pre-filled record of a register (field_values, title, …);
--     template_scope system (shipped, read-only, account_id NULL) or organisation (account_id).
--   * local_register_template_children — child records copied with it (e.g. Data Scope products,
--     link_field_key = the linked-records field on the parent).
--   * local_register_template_attachments — annexure files (bucket local-register-templates).
--   * local_register_records.created_from_template_id / _version — provenance on copies.
--   * local_registers.one_record_per_project / versioned — switches used by v1339.
--   Read-only to clients (RLS); all writes through the v1337 functions. Storage: private bucket
--   local-register-templates — system/<id>/… readable by any signed-in user, platform|sim/<id>/…
--   by the template's organisation; uploads by template managers.
-- Display IDs: Admin rule in E:\project-nidus-admin\SQL\v244_local_register_templates_id_generation_seed.sql.
-- After running: re-run SQL/v1251_planner_table_wall.sql (new public tables).
-- Prerequisites: v931–v938, v1318. Idempotent.
-- ============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('local-register-templates', 'local-register-templates', false, 10485760, ARRAY[
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
  ])
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- System template files (system/<template_id>/…) — readable by any signed-in user.
DROP POLICY IF EXISTS "System: read local-register-templates" ON storage.objects;
CREATE POLICY "System: read local-register-templates"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'local-register-templates'
  AND (storage.foldername(name))[1] = 'system'
);

-- ═════════════════════════════════════════════════════════════════════════════
-- PUBLIC (Platform)
-- ═════════════════════════════════════════════════════════════════════════════

-- ── public.1 Register switches (used by v1339) and record provenance ─────────────────
ALTER TABLE public.local_registers
  ADD COLUMN IF NOT EXISTS one_record_per_project BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS versioned BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE public.local_register_records
  ADD COLUMN IF NOT EXISTS created_from_template_id UUID,
  ADD COLUMN IF NOT EXISTS created_from_template_version INT;
COMMENT ON COLUMN public.local_register_records.created_from_template_id IS
  'v1336: template the record was created from (system templates live in public, organisation templates in this schema) — no FK so it survives archiving.';

-- ── public.2 Templates ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.local_register_templates (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  display_id         TEXT,
  register_key       VARCHAR(80) NOT NULL,
  template_scope     TEXT NOT NULL DEFAULT 'organisation',
  account_id         UUID NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  name               TEXT NOT NULL,
  description        TEXT,
  version            INT NOT NULL DEFAULT 1,
  record_title       TEXT NOT NULL DEFAULT '',
  record_description TEXT,
  record_status      TEXT,
  field_values       JSONB NOT NULL DEFAULT '{}'::jsonb,
  source_template_id UUID,
  is_archived        BOOLEAN NOT NULL DEFAULT FALSE,
  created_by         UUID NULL REFERENCES public.users(id) ON DELETE SET NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by         UUID NULL REFERENCES public.users(id) ON DELETE SET NULL,
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_lrt_scope CHECK (
    (template_scope = 'system' AND account_id IS NULL)
    OR (template_scope = 'organisation' AND account_id IS NOT NULL)
  ),
  CONSTRAINT chk_lrt_name CHECK (length(btrim(name)) > 0)
);
CREATE INDEX IF NOT EXISTS idx_lrt_register ON public.local_register_templates (register_key) WHERE is_archived = FALSE;
CREATE INDEX IF NOT EXISTS idx_lrt_account ON public.local_register_templates (account_id) WHERE account_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_lrt_display_id ON public.local_register_templates (display_id) WHERE display_id IS NOT NULL AND display_id <> '';
COMMENT ON TABLE public.local_register_templates IS
  'v1336: register record templates — a pre-filled record (field_values) plus child records and annexure files. system = shipped, read-only; organisation = created by PMO Admin / Project Manager.';

CREATE TABLE IF NOT EXISTS public.local_register_template_children (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id    UUID NOT NULL REFERENCES public.local_register_templates(id) ON DELETE CASCADE,
  link_field_key TEXT NOT NULL,
  register_key   VARCHAR(80) NOT NULL,
  sort_order     INT NOT NULL DEFAULT 0,
  title          TEXT NOT NULL,
  description    TEXT,
  status         TEXT,
  field_values   JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_lrtc_template ON public.local_register_template_children (template_id, sort_order);

CREATE TABLE IF NOT EXISTS public.local_register_template_attachments (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id    UUID NOT NULL REFERENCES public.local_register_templates(id) ON DELETE CASCADE,
  sort_order     INT NOT NULL DEFAULT 0,
  annexure_title TEXT NOT NULL,
  storage_bucket TEXT NOT NULL DEFAULT 'local-register-templates',
  storage_path   TEXT NOT NULL,
  file_name      TEXT NOT NULL,
  mime_type      TEXT NOT NULL,
  file_size      BIGINT NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_lrta_template ON public.local_register_template_attachments (template_id, sort_order);

-- ── public.3 Access helpers ──────────────────────────────────────────────────────────
-- Organisation templates: members of the organisation read; PMO Admin tier, Account Owner, or a Project /
-- Programme / Portfolio Manager in the organisation manage.
CREATE OR REPLACE FUNCTION public.auth_user_can_manage_register_templates(p_account_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT p_account_id IS NOT NULL
    AND public.user_has_access_to_account(p_account_id)
    AND (
      public.is_pmo_admin_tier(auth.uid())
      OR EXISTS (
        SELECT 1
        FROM public.user_roles ur
        JOIN public.users u ON u.id = ur.user_id
        JOIN public.roles r ON r.id = ur.role_id
        WHERE u.auth_user_id = auth.uid()
          AND ur.is_active = TRUE
          AND lower(regexp_replace(r.role_name, '[\s-]+', '_', 'g')) IN ('account_owner', 'project_manager', 'programme_manager', 'portfolio_manager', 'financial_programme_manager')
      )
      OR EXISTS (
        SELECT 1
        FROM public.projects pr
        JOIN public.users u ON u.id = pr.project_manager_user_id
        WHERE u.auth_user_id = auth.uid() AND pr.account_id = p_account_id
      )
    );
$$;
GRANT EXECUTE ON FUNCTION public.auth_user_can_manage_register_templates(UUID) TO authenticated;

-- Can read a template of this schema: system templates — any signed-in user (the register page that
-- offers them is already industry-gated); organisation templates — members of that organisation.
CREATE OR REPLACE FUNCTION public.auth_user_can_read_register_template(p_template_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.local_register_templates t
    WHERE t.id = p_template_id
      AND auth.uid() IS NOT NULL
      AND (t.template_scope = 'system' OR public.user_has_access_to_account(t.account_id))
  );
$$;
GRANT EXECUTE ON FUNCTION public.auth_user_can_read_register_template(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.auth_user_can_write_register_template(p_template_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.local_register_templates t
    WHERE t.id = p_template_id
      AND t.template_scope = 'organisation'
      AND public.auth_user_can_manage_register_templates(t.account_id)
  );
$$;
GRANT EXECUTE ON FUNCTION public.auth_user_can_write_register_template(UUID) TO authenticated;

-- ── public.4 RLS — read-only to clients; every write goes through the v1337 functions ─────
ALTER TABLE public.local_register_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.local_register_template_children ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.local_register_template_attachments ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.local_register_templates, public.local_register_template_children, public.local_register_template_attachments FROM anon, authenticated;
GRANT SELECT ON public.local_register_templates, public.local_register_template_children, public.local_register_template_attachments TO authenticated;
GRANT ALL ON public.local_register_templates, public.local_register_template_children, public.local_register_template_attachments TO service_role;

DROP POLICY IF EXISTS policy_lrt_select ON public.local_register_templates;
CREATE POLICY policy_lrt_select ON public.local_register_templates
  FOR SELECT TO authenticated
  USING (public.auth_user_can_read_register_template(id));

DROP POLICY IF EXISTS policy_lrtc_select ON public.local_register_template_children;
CREATE POLICY policy_lrtc_select ON public.local_register_template_children
  FOR SELECT TO authenticated
  USING (public.auth_user_can_read_register_template(template_id));

DROP POLICY IF EXISTS policy_lrta_select ON public.local_register_template_attachments;
CREATE POLICY policy_lrta_select ON public.local_register_template_attachments
  FOR SELECT TO authenticated
  USING (public.auth_user_can_read_register_template(template_id));

DROP TRIGGER IF EXISTS trg_lrt_admin_display_id ON public.local_register_templates;
CREATE TRIGGER trg_lrt_admin_display_id
  AFTER INSERT ON public.local_register_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_apply_admin_display_id('public.local_register_templates', 'display_id');

-- ── public.5 Storage: local-register-templates, paths system/<template_id>/… (system) and platform/<template_id>/… ──
DROP POLICY IF EXISTS "Platform: read local-register-templates" ON storage.objects;
CREATE POLICY "Platform: read local-register-templates"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'local-register-templates'
  AND (storage.foldername(name))[1] = 'platform'
  AND public.auth_user_can_read_register_template(NULLIF((storage.foldername(name))[2], '')::uuid)
);

DROP POLICY IF EXISTS "Platform: write local-register-templates" ON storage.objects;
CREATE POLICY "Platform: write local-register-templates"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'local-register-templates'
  AND (storage.foldername(name))[1] = 'platform'
  AND public.auth_user_can_write_register_template(NULLIF((storage.foldername(name))[2], '')::uuid)
);


-- ═════════════════════════════════════════════════════════════════════════════
-- SIM (Simulator)
-- ═════════════════════════════════════════════════════════════════════════════

-- ── sim.1 Register switches (used by v1339) and record provenance ─────────────────
ALTER TABLE sim.local_registers
  ADD COLUMN IF NOT EXISTS one_record_per_project BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS versioned BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE sim.local_register_records
  ADD COLUMN IF NOT EXISTS created_from_template_id UUID,
  ADD COLUMN IF NOT EXISTS created_from_template_version INT;
COMMENT ON COLUMN sim.local_register_records.created_from_template_id IS
  'v1336: template the record was created from (system templates live in public, organisation templates in this schema) — no FK so it survives archiving.';

-- ── sim.2 Templates ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sim.local_register_templates (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  display_id         TEXT,
  register_key       VARCHAR(80) NOT NULL,
  template_scope     TEXT NOT NULL DEFAULT 'organisation',
  account_id         UUID NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  name               TEXT NOT NULL,
  description        TEXT,
  version            INT NOT NULL DEFAULT 1,
  record_title       TEXT NOT NULL DEFAULT '',
  record_description TEXT,
  record_status      TEXT,
  field_values       JSONB NOT NULL DEFAULT '{}'::jsonb,
  source_template_id UUID,
  is_archived        BOOLEAN NOT NULL DEFAULT FALSE,
  created_by         UUID NULL REFERENCES public.users(id) ON DELETE SET NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by         UUID NULL REFERENCES public.users(id) ON DELETE SET NULL,
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_sim_lrt_scope CHECK (
    (template_scope = 'system' AND account_id IS NULL)
    OR (template_scope = 'organisation' AND account_id IS NOT NULL)
  ),
  CONSTRAINT chk_sim_lrt_name CHECK (length(btrim(name)) > 0)
);
CREATE INDEX IF NOT EXISTS idx_sim_lrt_register ON sim.local_register_templates (register_key) WHERE is_archived = FALSE;
CREATE INDEX IF NOT EXISTS idx_sim_lrt_account ON sim.local_register_templates (account_id) WHERE account_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_sim_lrt_display_id ON sim.local_register_templates (display_id) WHERE display_id IS NOT NULL AND display_id <> '';
COMMENT ON TABLE sim.local_register_templates IS
  'v1336: register record templates — a pre-filled record (field_values) plus child records and annexure files. system = shipped, read-only; organisation = created by PMO Admin / Project Manager.';

CREATE TABLE IF NOT EXISTS sim.local_register_template_children (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id    UUID NOT NULL REFERENCES sim.local_register_templates(id) ON DELETE CASCADE,
  link_field_key TEXT NOT NULL,
  register_key   VARCHAR(80) NOT NULL,
  sort_order     INT NOT NULL DEFAULT 0,
  title          TEXT NOT NULL,
  description    TEXT,
  status         TEXT,
  field_values   JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sim_lrtc_template ON sim.local_register_template_children (template_id, sort_order);

CREATE TABLE IF NOT EXISTS sim.local_register_template_attachments (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id    UUID NOT NULL REFERENCES sim.local_register_templates(id) ON DELETE CASCADE,
  sort_order     INT NOT NULL DEFAULT 0,
  annexure_title TEXT NOT NULL,
  storage_bucket TEXT NOT NULL DEFAULT 'local-register-templates',
  storage_path   TEXT NOT NULL,
  file_name      TEXT NOT NULL,
  mime_type      TEXT NOT NULL,
  file_size      BIGINT NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sim_lrta_template ON sim.local_register_template_attachments (template_id, sort_order);

-- ── sim.3 Access helpers ──────────────────────────────────────────────────────────
-- Organisation templates: members of the organisation read; PMO Admin tier, Account Owner, or a Project /
-- Programme / Portfolio Manager in the organisation manage.
CREATE OR REPLACE FUNCTION sim.auth_user_can_manage_register_templates(p_account_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = sim, public
SET row_security = off
AS $$
  SELECT p_account_id IS NOT NULL
    AND public.user_has_access_to_account(p_account_id)
    AND (
      public.is_pmo_admin_tier(auth.uid())
      OR EXISTS (
        SELECT 1
        FROM public.user_roles ur
        JOIN public.users u ON u.id = ur.user_id
        JOIN public.roles r ON r.id = ur.role_id
        WHERE u.auth_user_id = auth.uid()
          AND ur.is_active = TRUE
          AND lower(regexp_replace(r.role_name, '[\s-]+', '_', 'g')) IN ('account_owner', 'project_manager', 'programme_manager', 'portfolio_manager', 'financial_programme_manager')
      )
      OR EXISTS (
        SELECT 1
        FROM public.projects pr
        JOIN public.users u ON u.id = pr.project_manager_user_id
        WHERE u.auth_user_id = auth.uid() AND pr.account_id = p_account_id
      )
    );
$$;
GRANT EXECUTE ON FUNCTION sim.auth_user_can_manage_register_templates(UUID) TO authenticated;

-- Can read a template of this schema: system templates — any signed-in user (the register page that
-- offers them is already industry-gated); organisation templates — members of that organisation.
CREATE OR REPLACE FUNCTION sim.auth_user_can_read_register_template(p_template_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = sim, public
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1 FROM sim.local_register_templates t
    WHERE t.id = p_template_id
      AND auth.uid() IS NOT NULL
      AND (t.template_scope = 'system' OR public.user_has_access_to_account(t.account_id))
  );
$$;
GRANT EXECUTE ON FUNCTION sim.auth_user_can_read_register_template(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION sim.auth_user_can_write_register_template(p_template_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = sim, public
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1 FROM sim.local_register_templates t
    WHERE t.id = p_template_id
      AND t.template_scope = 'organisation'
      AND sim.auth_user_can_manage_register_templates(t.account_id)
  );
$$;
GRANT EXECUTE ON FUNCTION sim.auth_user_can_write_register_template(UUID) TO authenticated;

-- ── sim.4 RLS — read-only to clients; every write goes through the v1337 functions ─────
ALTER TABLE sim.local_register_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.local_register_template_children ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.local_register_template_attachments ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON sim.local_register_templates, sim.local_register_template_children, sim.local_register_template_attachments FROM anon, authenticated;
GRANT SELECT ON sim.local_register_templates, sim.local_register_template_children, sim.local_register_template_attachments TO authenticated;
GRANT ALL ON sim.local_register_templates, sim.local_register_template_children, sim.local_register_template_attachments TO service_role;

DROP POLICY IF EXISTS policy_sim_lrt_select ON sim.local_register_templates;
CREATE POLICY policy_sim_lrt_select ON sim.local_register_templates
  FOR SELECT TO authenticated
  USING (sim.auth_user_can_read_register_template(id));

DROP POLICY IF EXISTS policy_sim_lrtc_select ON sim.local_register_template_children;
CREATE POLICY policy_sim_lrtc_select ON sim.local_register_template_children
  FOR SELECT TO authenticated
  USING (sim.auth_user_can_read_register_template(template_id));

DROP POLICY IF EXISTS policy_sim_lrta_select ON sim.local_register_template_attachments;
CREATE POLICY policy_sim_lrta_select ON sim.local_register_template_attachments
  FOR SELECT TO authenticated
  USING (sim.auth_user_can_read_register_template(template_id));

DROP TRIGGER IF EXISTS trg_sim_lrt_admin_display_id ON sim.local_register_templates;
CREATE TRIGGER trg_sim_lrt_admin_display_id
  AFTER INSERT ON sim.local_register_templates
  FOR EACH ROW
  EXECUTE FUNCTION sim.trg_apply_admin_display_id('sim.local_register_templates', 'display_id');

-- ── sim.5 Storage: local-register-templates, paths sim/<template_id>/… ──
DROP POLICY IF EXISTS "Simulator: read local-register-templates" ON storage.objects;
CREATE POLICY "Simulator: read local-register-templates"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'local-register-templates'
  AND (storage.foldername(name))[1] = 'sim'
  AND sim.auth_user_can_read_register_template(NULLIF((storage.foldername(name))[2], '')::uuid)
);

DROP POLICY IF EXISTS "Simulator: write local-register-templates" ON storage.objects;
CREATE POLICY "Simulator: write local-register-templates"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'local-register-templates'
  AND (storage.foldername(name))[1] = 'sim'
  AND sim.auth_user_can_write_register_template(NULLIF((storage.foldername(name))[2], '')::uuid)
);

INSERT INTO public.database_tables (table_name, table_description, is_system_table, is_active)
VALUES
  ('local_register_templates', 'Local Register record templates: pre-filled records (system or organisation) used by New from template (v1336)', false, true),
  ('local_register_template_children', 'Local Register record templates: child records copied with a template, e.g. Data Scope products (v1336)', false, true),
  ('local_register_template_attachments', 'Local Register record templates: annexure files copied with a template (v1336)', false, true)
ON CONFLICT (table_name) DO UPDATE SET
  table_description = EXCLUDED.table_description,
  is_system_table = EXCLUDED.is_system_table,
  updated_at = NOW();

NOTIFY pgrst, 'reload schema';
