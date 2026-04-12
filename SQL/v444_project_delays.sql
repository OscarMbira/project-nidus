-- ============================================================================
-- v444: Project Delays — delay_templates, project_delays, project_delay_owner_history
-- PostgreSQL 15+ / Supabase. Prerequisites: projects, accounts, users, v406 auth_user_can_access_project
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Helpers: oversight read (programme / portfolio cross-project)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.delay_user_has_oversight_read()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    INNER JOIN public.roles r ON r.id = ur.role_id
    INNER JOIN public.users u ON u.id = ur.user_id
    WHERE u.auth_user_id = auth.uid()
      AND ur.project_id IS NULL
      AND r.role_name IN ('programme_manager', 'portfolio_manager', 'pm_programme_manager')
      AND ur.is_active = TRUE
      AND COALESCE(ur.is_deleted, FALSE) = FALSE
  );
$$;

COMMENT ON FUNCTION public.delay_user_has_oversight_read() IS
  'v353: Programme/portfolio managers may read delays across projects (oversight).';

CREATE OR REPLACE FUNCTION public.delay_user_can_read_project_delay(p_project_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
SET row_security = off
AS $$
  SELECT
    p_project_id IS NOT NULL
    AND (
      public.auth_user_can_access_project(p_project_id)
      OR public.delay_user_has_oversight_read()
    );
$$;

CREATE OR REPLACE FUNCTION public.delay_user_has_write_role_on_project(p_project_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
SET row_security = off
AS $$
  SELECT
    p_project_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.user_roles ur
      INNER JOIN public.roles r ON r.id = ur.role_id
      INNER JOIN public.users u ON u.id = ur.user_id
      WHERE ur.project_id = p_project_id
        AND u.auth_user_id = auth.uid()
        AND ur.is_active = TRUE
        AND COALESCE(ur.is_deleted, FALSE) = FALSE
        AND r.role_name IN (
          'project_manager',
          'team_lead',
          'team_manager',
          'pm_team_manager'
        )
    );
$$;

CREATE OR REPLACE FUNCTION public.delay_user_can_delete_project_delay(p_project_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
SET row_security = off
AS $$
  SELECT
    p_project_id IS NOT NULL
    AND (
      EXISTS (
        SELECT 1
        FROM public.user_roles ur
        INNER JOIN public.roles r ON r.id = ur.role_id
        INNER JOIN public.users u ON u.id = ur.user_id
        WHERE ur.project_id = p_project_id
          AND u.auth_user_id = auth.uid()
          AND ur.is_active = TRUE
          AND COALESCE(ur.is_deleted, FALSE) = FALSE
          AND r.role_name IN ('project_manager')
      )
      OR EXISTS (
        SELECT 1
        FROM public.user_roles ur
        INNER JOIN public.roles r ON r.id = ur.role_id
        INNER JOIN public.users u ON u.id = ur.user_id
        WHERE u.auth_user_id = auth.uid()
          AND ur.is_active = TRUE
          AND COALESCE(ur.is_deleted, FALSE) = FALSE
          AND ur.project_id IS NULL
          AND r.role_name IN ('system_admin', 'System Admin', 'super_admin', 'Super Admin')
      )
    );
$$;

-- ---------------------------------------------------------------------------
-- delay_templates (org-level)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.delay_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  delay_category TEXT NOT NULL DEFAULT 'other'
    CHECK (delay_category IN (
      'weather', 'resource', 'technical', 'external_dependency', 'change_request',
      'regulatory', 'financial', 'risk_materialised', 'stakeholder', 'other'
    )),
  delay_cause TEXT,
  responsible_party TEXT,
  default_severity TEXT NOT NULL DEFAULT 'medium'
    CHECK (default_severity IN ('low', 'medium', 'high', 'critical')),
  resolution_plan_template TEXT,
  tags TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'active', 'archived')),
  is_draft BOOLEAN NOT NULL DEFAULT FALSE,
  draft_expires_at TIMESTAMPTZ,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_delay_templates_org ON public.delay_templates(organisation_id);
CREATE INDEX IF NOT EXISTS idx_delay_templates_status ON public.delay_templates(status);

-- ---------------------------------------------------------------------------
-- project_delays
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.project_delays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  organisation_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  delay_reference TEXT,
  title TEXT NOT NULL,
  description TEXT,
  delay_category TEXT NOT NULL DEFAULT 'other'
    CHECK (delay_category IN (
      'weather', 'resource', 'technical', 'external_dependency', 'change_request',
      'regulatory', 'financial', 'risk_materialised', 'stakeholder', 'other'
    )),
  delay_cause TEXT,
  responsible_party TEXT,
  impact_schedule_days INTEGER,
  impact_cost NUMERIC(18, 2),
  impact_scope TEXT,
  severity TEXT NOT NULL DEFAULT 'medium'
    CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  status TEXT NOT NULL DEFAULT 'identified'
    CHECK (status IN ('identified', 'under_review', 'approved', 'resolved', 'closed')),
  identified_date DATE,
  original_baseline_date DATE,
  revised_forecast_date DATE,
  resolution_plan TEXT,
  resolution_owner_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  resolution_target_date DATE,
  resolved_date DATE,
  linked_issue_id UUID REFERENCES public.issues(id) ON DELETE SET NULL,
  linked_risk_id UUID REFERENCES public.risks(id) ON DELETE SET NULL,
  linked_defect_id UUID REFERENCES public.defects(id) ON DELETE SET NULL,
  linked_work_package_id UUID REFERENCES public.work_packages(id) ON DELETE SET NULL,
  linked_change_request_id UUID REFERENCES public.change_requests(id) ON DELETE SET NULL,
  template_id UUID REFERENCES public.delay_templates(id) ON DELETE SET NULL,
  tailoring_notes TEXT,
  source_type TEXT NOT NULL DEFAULT 'manual'
    CHECK (source_type IN (
      'manual', 'from_template', 'auto_issue', 'auto_risk', 'auto_defect'
    )),
  is_auto_linked BOOLEAN NOT NULL DEFAULT FALSE,
  auto_link_notes TEXT,
  is_draft BOOLEAN NOT NULL DEFAULT FALSE,
  draft_expires_at TIMESTAMPTZ,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES public.users(id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_project_delays_auto_issue
  ON public.project_delays (project_id, source_type, linked_issue_id)
  WHERE linked_issue_id IS NOT NULL
    AND source_type = 'auto_issue'
    AND COALESCE(is_deleted, FALSE) = FALSE;

CREATE UNIQUE INDEX IF NOT EXISTS uq_project_delays_auto_risk
  ON public.project_delays (project_id, source_type, linked_risk_id)
  WHERE linked_risk_id IS NOT NULL
    AND source_type = 'auto_risk'
    AND COALESCE(is_deleted, FALSE) = FALSE;

CREATE UNIQUE INDEX IF NOT EXISTS uq_project_delays_auto_defect
  ON public.project_delays (project_id, source_type, linked_defect_id)
  WHERE linked_defect_id IS NOT NULL
    AND source_type = 'auto_defect'
    AND COALESCE(is_deleted, FALSE) = FALSE;

CREATE INDEX IF NOT EXISTS idx_project_delays_project ON public.project_delays(project_id)
  WHERE COALESCE(is_deleted, FALSE) = FALSE;
CREATE INDEX IF NOT EXISTS idx_project_delays_status ON public.project_delays(status)
  WHERE COALESCE(is_deleted, FALSE) = FALSE;
CREATE INDEX IF NOT EXISTS idx_project_delays_severity ON public.project_delays(severity)
  WHERE COALESCE(is_deleted, FALSE) = FALSE;
CREATE INDEX IF NOT EXISTS idx_project_delays_created ON public.project_delays(created_at DESC)
  WHERE COALESCE(is_deleted, FALSE) = FALSE;

-- Denormalise organisation_id from project
CREATE OR REPLACE FUNCTION public.trg_project_delays_set_org_and_ref()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_next INTEGER;
BEGIN
  IF NEW.organisation_id IS NULL THEN
    SELECT account_id INTO NEW.organisation_id FROM public.projects WHERE id = NEW.project_id;
  END IF;
  IF NEW.delay_reference IS NULL OR NEW.delay_reference = '' THEN
    PERFORM pg_advisory_xact_lock(hashtext(NEW.project_id::text));
    SELECT COALESCE(MAX(
      (regexp_match(delay_reference, '^DLY-(\d+)$'))[1]::INTEGER
    ), 0) + 1 INTO v_next
    FROM public.project_delays
    WHERE project_id = NEW.project_id;
    NEW.delay_reference := 'DLY-' || LPAD(v_next::TEXT, 3, '0');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_project_delays_before_ins ON public.project_delays;
CREATE TRIGGER trg_project_delays_before_ins
  BEFORE INSERT ON public.project_delays
  FOR EACH ROW EXECUTE FUNCTION public.trg_project_delays_set_org_and_ref();

CREATE OR REPLACE FUNCTION public.trg_project_delays_touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_project_delays_updated ON public.project_delays;
CREATE TRIGGER trg_project_delays_updated
  BEFORE UPDATE ON public.project_delays
  FOR EACH ROW EXECUTE FUNCTION public.trg_project_delays_touch_updated_at();

-- ---------------------------------------------------------------------------
-- project_delay_owner_history (append-only via trigger)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.project_delay_owner_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delay_id UUID NOT NULL REFERENCES public.project_delays(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  previous_owner_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  new_owner_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  changed_by_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  change_reason TEXT,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source_event TEXT NOT NULL DEFAULT 'manual_edit'
    CHECK (source_event IN (
      'manual_edit', 'auto_link_created', 'auto_resolved', 'status_change',
      'auto_link_owner_sync', 'auto_link_owner_sync_issue', 'auto_link_owner_sync_risk', 'auto_link_owner_sync_defect'
    )),
  delay_status_at_change TEXT
);

CREATE INDEX IF NOT EXISTS idx_delay_owner_hist_delay ON public.project_delay_owner_history(delay_id);
CREATE INDEX IF NOT EXISTS idx_delay_owner_hist_changed ON public.project_delay_owner_history(changed_at DESC);

CREATE OR REPLACE FUNCTION public.trg_project_delay_owner_audit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_src TEXT;
  v_by UUID;
  v_suppress TEXT;
BEGIN
  v_suppress := NULLIF(current_setting('app.suppress_delay_owner_audit', true), '');

  IF TG_OP = 'INSERT' THEN
    IF NEW.resolution_owner_id IS NOT NULL AND v_suppress IS DISTINCT FROM '1' THEN
      v_src := CASE
        WHEN NEW.is_auto_linked THEN 'auto_link_created'
        ELSE 'manual_edit'
      END;
      INSERT INTO public.project_delay_owner_history (
        delay_id, project_id, previous_owner_id, new_owner_id, changed_by_id,
        change_reason, source_event, delay_status_at_change
      ) VALUES (
        NEW.id, NEW.project_id, NULL, NEW.resolution_owner_id, NEW.created_by,
        NULL, v_src, NEW.status
      );
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF NEW.resolution_owner_id IS DISTINCT FROM OLD.resolution_owner_id THEN
      IF v_suppress = '1' THEN
        RETURN NEW;
      END IF;
      v_by := NULL;
      INSERT INTO public.project_delay_owner_history (
        delay_id, project_id, previous_owner_id, new_owner_id, changed_by_id,
        change_reason, source_event, delay_status_at_change
      ) VALUES (
        NEW.id, NEW.project_id, OLD.resolution_owner_id, NEW.resolution_owner_id, v_by,
        NULL, 'manual_edit', NEW.status
      );
    END IF;
    RETURN NEW;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_delay_owner_audit ON public.project_delays;
CREATE TRIGGER trg_delay_owner_audit
  AFTER INSERT OR UPDATE OF resolution_owner_id ON public.project_delays
  FOR EACH ROW EXECUTE FUNCTION public.trg_project_delay_owner_audit();

-- ---------------------------------------------------------------------------
-- RLS: delay_templates
-- ---------------------------------------------------------------------------
ALTER TABLE public.delay_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS delay_templates_select ON public.delay_templates;
CREATE POLICY delay_templates_select ON public.delay_templates
  FOR SELECT TO authenticated
  USING (
    COALESCE(organisation_id::text, '') <> ''
    AND public.user_has_access_to_account(organisation_id)
  );

DROP POLICY IF EXISTS delay_templates_insert ON public.delay_templates;
CREATE POLICY delay_templates_insert ON public.delay_templates
  FOR INSERT TO authenticated
  WITH CHECK (
    public.user_has_access_to_account(organisation_id)
    AND public.is_pmo_admin_user()
  );

DROP POLICY IF EXISTS delay_templates_update ON public.delay_templates;
CREATE POLICY delay_templates_update ON public.delay_templates
  FOR UPDATE TO authenticated
  USING (
    public.user_has_access_to_account(organisation_id)
    AND public.is_pmo_admin_user()
  )
  WITH CHECK (
    public.user_has_access_to_account(organisation_id)
    AND public.is_pmo_admin_user()
  );

DROP POLICY IF EXISTS delay_templates_delete ON public.delay_templates;
CREATE POLICY delay_templates_delete ON public.delay_templates
  FOR DELETE TO authenticated
  USING (
    public.user_has_access_to_account(organisation_id)
    AND public.is_pmo_admin_user()
  );

-- ---------------------------------------------------------------------------
-- RLS: project_delays
-- ---------------------------------------------------------------------------
ALTER TABLE public.project_delays ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS project_delays_select ON public.project_delays;
CREATE POLICY project_delays_select ON public.project_delays
  FOR SELECT TO authenticated
  USING (
    public.delay_user_can_read_project_delay(project_id)
  );

DROP POLICY IF EXISTS project_delays_insert ON public.project_delays;
CREATE POLICY project_delays_insert ON public.project_delays
  FOR INSERT TO authenticated
  WITH CHECK (
    public.auth_user_can_access_project(project_id)
    AND public.delay_user_has_write_role_on_project(project_id)
  );

DROP POLICY IF EXISTS project_delays_update ON public.project_delays;
CREATE POLICY project_delays_update ON public.project_delays
  FOR UPDATE TO authenticated
  USING (
    public.auth_user_can_access_project(project_id)
    AND public.delay_user_has_write_role_on_project(project_id)
  )
  WITH CHECK (
    public.auth_user_can_access_project(project_id)
    AND public.delay_user_has_write_role_on_project(project_id)
  );

DROP POLICY IF EXISTS project_delays_delete ON public.project_delays;
CREATE POLICY project_delays_delete ON public.project_delays
  FOR DELETE TO authenticated
  USING (
    public.auth_user_can_access_project(project_id)
    AND public.delay_user_can_delete_project_delay(project_id)
  );

-- ---------------------------------------------------------------------------
-- RLS: project_delay_owner_history — SELECT only for users who can read delay
-- ---------------------------------------------------------------------------
ALTER TABLE public.project_delay_owner_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS project_delay_owner_history_select ON public.project_delay_owner_history;
CREATE POLICY project_delay_owner_history_select ON public.project_delay_owner_history
  FOR SELECT TO authenticated
  USING (public.delay_user_can_read_project_delay(project_id));

-- No INSERT/UPDATE/DELETE for authenticated (append-only via SECURITY DEFINER triggers)

GRANT SELECT, INSERT, UPDATE, DELETE ON public.delay_templates TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_delays TO authenticated;
GRANT SELECT ON public.project_delay_owner_history TO authenticated;

INSERT INTO public.database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES
  ('delay_templates', 'Organisation-level delay templates (PMO)', FALSE, TRUE, 'governance'),
  ('project_delays', 'Project delay register entries', FALSE, TRUE, 'governance'),
  ('project_delay_owner_history', 'Append-only ownership audit for project delays', FALSE, TRUE, 'governance')
ON CONFLICT (table_name) DO UPDATE SET
  table_description = EXCLUDED.table_description,
  table_category = EXCLUDED.table_category,
  updated_at = NOW();
