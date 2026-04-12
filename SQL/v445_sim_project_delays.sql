-- ============================================================================
-- v445: Simulator — sim.delay_templates, sim.project_delays, sim.project_delay_owner_history
-- Prerequisites: v444, sim.practice_projects, public.accounts, public.users
-- ============================================================================

CREATE OR REPLACE FUNCTION sim.delay_user_has_oversight_read()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, sim
SET row_security = off
AS $$
  SELECT public.is_pmo_admin_user();
$$;

CREATE OR REPLACE FUNCTION sim.delay_user_can_read_sim_delay(p_practice_project_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, sim
SET row_security = off
AS $$
  SELECT
    p_practice_project_id IS NOT NULL
    AND (
      EXISTS (
        SELECT 1 FROM sim.practice_projects pp
        WHERE pp.id = p_practice_project_id
          AND COALESCE(pp.is_deleted, FALSE) = FALSE
          AND (pp.user_id = sim.get_current_user_id() OR public.is_pmo_admin_user())
      )
      OR sim.delay_user_has_oversight_read()
    );
$$;

CREATE OR REPLACE FUNCTION sim.delay_user_has_write_role_on_practice_project(p_practice_project_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, sim
SET row_security = off
AS $$
  SELECT
    p_practice_project_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM sim.practice_projects pp
      WHERE pp.id = p_practice_project_id
        AND COALESCE(pp.is_deleted, FALSE) = FALSE
        AND pp.user_id = sim.get_current_user_id()
    );
$$;

CREATE OR REPLACE FUNCTION sim.delay_user_can_delete_sim_delay(p_practice_project_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, sim
SET row_security = off
AS $$
  SELECT sim.delay_user_has_write_role_on_practice_project(p_practice_project_id)
    OR public.is_pmo_admin_user();
$$;

-- Templates
CREATE TABLE IF NOT EXISTS sim.delay_templates (
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

CREATE INDEX IF NOT EXISTS idx_sim_delay_templates_org ON sim.delay_templates(organisation_id);

-- Project delays (practice project scoped)
CREATE TABLE IF NOT EXISTS sim.project_delays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_project_id UUID NOT NULL REFERENCES sim.practice_projects(id) ON DELETE CASCADE,
  organisation_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
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
  linked_issue_id UUID REFERENCES sim.practice_issues(id) ON DELETE SET NULL,
  linked_risk_id UUID REFERENCES sim.practice_risks(id) ON DELETE SET NULL,
  linked_defect_id UUID REFERENCES sim.practice_defects(id) ON DELETE SET NULL,
  linked_work_package_id UUID REFERENCES sim.practice_work_packages(id) ON DELETE SET NULL,
  linked_change_request_id UUID,
  template_id UUID REFERENCES sim.delay_templates(id) ON DELETE SET NULL,
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

CREATE UNIQUE INDEX IF NOT EXISTS uq_sim_project_delays_auto_issue
  ON sim.project_delays (practice_project_id, source_type, linked_issue_id)
  WHERE linked_issue_id IS NOT NULL
    AND source_type = 'auto_issue'
    AND COALESCE(is_deleted, FALSE) = FALSE;

CREATE UNIQUE INDEX IF NOT EXISTS uq_sim_project_delays_auto_risk
  ON sim.project_delays (practice_project_id, source_type, linked_risk_id)
  WHERE linked_risk_id IS NOT NULL
    AND source_type = 'auto_risk'
    AND COALESCE(is_deleted, FALSE) = FALSE;

CREATE UNIQUE INDEX IF NOT EXISTS uq_sim_project_delays_auto_defect
  ON sim.project_delays (practice_project_id, source_type, linked_defect_id)
  WHERE linked_defect_id IS NOT NULL
    AND source_type = 'auto_defect'
    AND COALESCE(is_deleted, FALSE) = FALSE;

CREATE INDEX IF NOT EXISTS idx_sim_project_delays_pp ON sim.project_delays(practice_project_id)
  WHERE COALESCE(is_deleted, FALSE) = FALSE;
CREATE INDEX IF NOT EXISTS idx_sim_project_delays_status ON sim.project_delays(status)
  WHERE COALESCE(is_deleted, FALSE) = FALSE;
CREATE INDEX IF NOT EXISTS idx_sim_project_delays_severity ON sim.project_delays(severity)
  WHERE COALESCE(is_deleted, FALSE) = FALSE;
CREATE INDEX IF NOT EXISTS idx_sim_project_delays_created ON sim.project_delays(created_at DESC)
  WHERE COALESCE(is_deleted, FALSE) = FALSE;

CREATE OR REPLACE FUNCTION sim.trg_sim_project_delays_set_org_and_ref()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, sim
SET row_security = off
AS $$
DECLARE
  v_next INTEGER;
BEGIN
  IF NEW.organisation_id IS NULL AND NEW.template_id IS NOT NULL THEN
    SELECT organisation_id INTO NEW.organisation_id FROM sim.delay_templates WHERE id = NEW.template_id;
  END IF;
  IF NEW.delay_reference IS NULL OR NEW.delay_reference = '' THEN
    PERFORM pg_advisory_xact_lock(hashtext('sim_delay_' || NEW.practice_project_id::text));
    SELECT COALESCE(MAX(
      (regexp_match(delay_reference, '^DLY-(\d+)$'))[1]::INTEGER
    ), 0) + 1 INTO v_next
    FROM sim.project_delays
    WHERE practice_project_id = NEW.practice_project_id;
    NEW.delay_reference := 'DLY-' || LPAD(v_next::TEXT, 3, '0');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sim_project_delays_before_ins ON sim.project_delays;
CREATE TRIGGER trg_sim_project_delays_before_ins
  BEFORE INSERT ON sim.project_delays
  FOR EACH ROW EXECUTE FUNCTION sim.trg_sim_project_delays_set_org_and_ref();

CREATE OR REPLACE FUNCTION sim.trg_sim_project_delays_touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sim_project_delays_updated ON sim.project_delays;
CREATE TRIGGER trg_sim_project_delays_updated
  BEFORE UPDATE ON sim.project_delays
  FOR EACH ROW EXECUTE FUNCTION sim.trg_sim_project_delays_touch_updated_at();

-- Owner history
CREATE TABLE IF NOT EXISTS sim.project_delay_owner_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delay_id UUID NOT NULL REFERENCES sim.project_delays(id) ON DELETE CASCADE,
  practice_project_id UUID NOT NULL REFERENCES sim.practice_projects(id) ON DELETE CASCADE,
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

CREATE INDEX IF NOT EXISTS idx_sim_delay_owner_hist_delay ON sim.project_delay_owner_history(delay_id);
CREATE INDEX IF NOT EXISTS idx_sim_delay_owner_hist_changed ON sim.project_delay_owner_history(changed_at DESC);

CREATE OR REPLACE FUNCTION sim.trg_sim_project_delay_owner_audit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, sim
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
      v_src := CASE WHEN NEW.is_auto_linked THEN 'auto_link_created' ELSE 'manual_edit' END;
      INSERT INTO sim.project_delay_owner_history (
        delay_id, practice_project_id, previous_owner_id, new_owner_id, changed_by_id,
        change_reason, source_event, delay_status_at_change
      ) VALUES (
        NEW.id, NEW.practice_project_id, NULL, NEW.resolution_owner_id, NEW.created_by,
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
      INSERT INTO sim.project_delay_owner_history (
        delay_id, practice_project_id, previous_owner_id, new_owner_id, changed_by_id,
        change_reason, source_event, delay_status_at_change
      ) VALUES (
        NEW.id, NEW.practice_project_id, OLD.resolution_owner_id, NEW.resolution_owner_id, v_by,
        NULL, 'manual_edit', NEW.status
      );
    END IF;
    RETURN NEW;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sim_delay_owner_audit ON sim.project_delays;
CREATE TRIGGER trg_sim_delay_owner_audit
  AFTER INSERT OR UPDATE OF resolution_owner_id ON sim.project_delays
  FOR EACH ROW EXECUTE FUNCTION sim.trg_sim_project_delay_owner_audit();

-- RLS
GRANT USAGE ON SCHEMA sim TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON sim.delay_templates TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON sim.project_delays TO authenticated;
GRANT SELECT ON sim.project_delay_owner_history TO authenticated;

ALTER TABLE sim.delay_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.project_delays ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.project_delay_owner_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sim_delay_templates_select ON sim.delay_templates;
CREATE POLICY sim_delay_templates_select ON sim.delay_templates
  FOR SELECT TO authenticated
  USING (public.user_has_access_to_account(organisation_id));

DROP POLICY IF EXISTS sim_delay_templates_insert ON sim.delay_templates;
CREATE POLICY sim_delay_templates_insert ON sim.delay_templates
  FOR INSERT TO authenticated
  WITH CHECK (
    public.user_has_access_to_account(organisation_id)
    AND public.is_pmo_admin_user()
  );

DROP POLICY IF EXISTS sim_delay_templates_update ON sim.delay_templates;
CREATE POLICY sim_delay_templates_update ON sim.delay_templates
  FOR UPDATE TO authenticated
  USING (public.user_has_access_to_account(organisation_id) AND public.is_pmo_admin_user())
  WITH CHECK (public.user_has_access_to_account(organisation_id) AND public.is_pmo_admin_user());

DROP POLICY IF EXISTS sim_delay_templates_delete ON sim.delay_templates;
CREATE POLICY sim_delay_templates_delete ON sim.delay_templates
  FOR DELETE TO authenticated
  USING (public.user_has_access_to_account(organisation_id) AND public.is_pmo_admin_user());

DROP POLICY IF EXISTS sim_project_delays_select ON sim.project_delays;
CREATE POLICY sim_project_delays_select ON sim.project_delays
  FOR SELECT TO authenticated
  USING (sim.delay_user_can_read_sim_delay(practice_project_id));

DROP POLICY IF EXISTS sim_project_delays_insert ON sim.project_delays;
CREATE POLICY sim_project_delays_insert ON sim.project_delays
  FOR INSERT TO authenticated
  WITH CHECK (
    sim.delay_user_has_write_role_on_practice_project(practice_project_id)
  );

DROP POLICY IF EXISTS sim_project_delays_update ON sim.project_delays;
CREATE POLICY sim_project_delays_update ON sim.project_delays
  FOR UPDATE TO authenticated
  USING (sim.delay_user_has_write_role_on_practice_project(practice_project_id))
  WITH CHECK (sim.delay_user_has_write_role_on_practice_project(practice_project_id));

DROP POLICY IF EXISTS sim_project_delays_delete ON sim.project_delays;
CREATE POLICY sim_project_delays_delete ON sim.project_delays
  FOR DELETE TO authenticated
  USING (sim.delay_user_can_delete_sim_delay(practice_project_id));

DROP POLICY IF EXISTS sim_project_delay_owner_history_select ON sim.project_delay_owner_history;
CREATE POLICY sim_project_delay_owner_history_select ON sim.project_delay_owner_history
  FOR SELECT TO authenticated
  USING (sim.delay_user_can_read_sim_delay(practice_project_id));

INSERT INTO public.database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES
  ('sim.delay_templates', 'Simulator organisation delay templates', FALSE, TRUE, 'simulation'),
  ('sim.project_delays', 'Simulator practice project delay register', FALSE, TRUE, 'simulation'),
  ('sim.project_delay_owner_history', 'Simulator delay ownership audit', FALSE, TRUE, 'simulation')
ON CONFLICT (table_name) DO UPDATE SET
  table_description = EXCLUDED.table_description,
  table_category = EXCLUDED.table_category,
  updated_at = NOW();
