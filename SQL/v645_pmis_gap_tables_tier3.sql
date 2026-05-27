-- =============================================================================
-- v645_pmis_gap_tables_tier3.sql
-- PMIS Gap Analysis (v631) — Tier 3 tables: GAP-16 to GAP-25
-- Prerequisites: v643 (set_pmis_updated_at)
-- No seed data.
-- =============================================================================

-- ── GAP-16: Dashboard Builder ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.dashboards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE,
  owner_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  dashboard_name VARCHAR(255) NOT NULL,
  dashboard_type VARCHAR(30) NOT NULL DEFAULT 'personal'
    CHECK (dashboard_type IN ('personal', 'team', 'executive')),
  layout_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_shared BOOLEAN NOT NULL DEFAULT FALSE,
  share_token VARCHAR(64),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS public.dashboard_widgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dashboard_id UUID NOT NULL REFERENCES public.dashboards(id) ON DELETE CASCADE,
  widget_type VARCHAR(60) NOT NULL,
  grid_x INTEGER NOT NULL DEFAULT 0,
  grid_y INTEGER NOT NULL DEFAULT 0,
  grid_w INTEGER NOT NULL DEFAULT 4,
  grid_h INTEGER NOT NULL DEFAULT 3,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS public.dashboard_widget_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  widget_id UUID NOT NULL REFERENCES public.dashboard_widgets(id) ON DELETE CASCADE,
  config_key VARCHAR(80) NOT NULL,
  config_value JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_dashboard_widget_configs UNIQUE (widget_id, config_key)
);

-- ── GAP-17: Portfolio Map ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.portfolio_map_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  config_name VARCHAR(255) NOT NULL,
  x_axis_field VARCHAR(80) NOT NULL,
  y_axis_field VARCHAR(80) NOT NULL,
  bubble_size_field VARCHAR(80),
  color_field VARCHAR(80),
  quadrant_labels JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE
);

-- ── GAP-18: Whiteboard ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.whiteboards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE,
  board_name VARCHAR(255) NOT NULL,
  template_type VARCHAR(40) DEFAULT 'blank',
  canvas_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS public.whiteboard_elements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  whiteboard_id UUID NOT NULL REFERENCES public.whiteboards(id) ON DELETE CASCADE,
  element_type VARCHAR(40) NOT NULL,
  element_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  position_x NUMERIC(12,4) NOT NULL DEFAULT 0,
  position_y NUMERIC(12,4) NOT NULL DEFAULT 0,
  z_index INTEGER NOT NULL DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS public.whiteboard_collaborators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  whiteboard_id UUID NOT NULL REFERENCES public.whiteboards(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  permission_level VARCHAR(20) NOT NULL DEFAULT 'edit' CHECK (permission_level IN ('view', 'edit', 'admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_whiteboard_collaborators UNIQUE (whiteboard_id, user_id)
);

-- ── GAP-19: Guest Collaborators ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.guest_collaborators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  guest_email VARCHAR(255) NOT NULL,
  guest_name VARCHAR(255),
  permission_level VARCHAR(30) NOT NULL DEFAULT 'view' CHECK (permission_level IN ('view', 'comment', 'limited_edit')),
  invited_by UUID REFERENCES auth.users(id),
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  CONSTRAINT uq_guest_collaborators UNIQUE (project_id, guest_email)
);

CREATE TABLE IF NOT EXISTS public.guest_access_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guest_id UUID NOT NULL REFERENCES public.guest_collaborators(id) ON DELETE CASCADE,
  token_hash VARCHAR(128) NOT NULL,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ
);

-- ── GAP-20: Training & Certifications ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.training_certifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE,
  certification_name VARCHAR(255) NOT NULL,
  certification_code VARCHAR(60),
  issuing_body VARCHAR(255),
  validity_months INTEGER,
  linked_skill_id UUID REFERENCES public.skill_catalog(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS public.member_training_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  certification_id UUID REFERENCES public.training_certifications(id) ON DELETE SET NULL,
  record_type VARCHAR(30) NOT NULL DEFAULT 'certification'
    CHECK (record_type IN ('certification', 'training', 'development_plan')),
  title VARCHAR(255) NOT NULL,
  issue_date DATE,
  expiry_date DATE,
  completion_status VARCHAR(30) NOT NULL DEFAULT 'in_progress',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE
);

-- ── GAP-21: Notification Preferences ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.notification_preference_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_name VARCHAR(120) NOT NULL,
  role_name VARCHAR(80),
  event_category VARCHAR(60) NOT NULL,
  channel_in_app BOOLEAN NOT NULL DEFAULT TRUE,
  channel_email BOOLEAN NOT NULL DEFAULT TRUE,
  channel_push BOOLEAN NOT NULL DEFAULT FALSE,
  frequency VARCHAR(30) NOT NULL DEFAULT 'instant',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS public.notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_category VARCHAR(60) NOT NULL,
  channel_in_app BOOLEAN NOT NULL DEFAULT TRUE,
  channel_email BOOLEAN NOT NULL DEFAULT TRUE,
  channel_push BOOLEAN NOT NULL DEFAULT FALSE,
  frequency VARCHAR(30) NOT NULL DEFAULT 'instant',
  mute_project_ids UUID[] DEFAULT '{}',
  quiet_hours_start TIME,
  quiet_hours_end TIME,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_notification_preferences UNIQUE (user_id, event_category)
);

-- ── GAP-22: Project Cloning ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.project_clone_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  target_project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  clone_options JSONB NOT NULL DEFAULT '{}'::jsonb,
  date_shift_days INTEGER DEFAULT 0,
  job_status VARCHAR(30) NOT NULL DEFAULT 'pending'
    CHECK (job_status IN ('pending', 'running', 'completed', 'failed')),
  error_message TEXT,
  started_by UUID REFERENCES auth.users(id),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── GAP-23: Scheduled Health Reports ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.scheduled_health_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  schedule_name VARCHAR(255) NOT NULL,
  frequency VARCHAR(30) NOT NULL CHECK (frequency IN ('weekly', 'monthly', 'quarterly')),
  schedule_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  recipient_emails TEXT[] NOT NULL DEFAULT '{}',
  report_template_id UUID,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  next_run_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS public.scheduled_report_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID NOT NULL REFERENCES public.scheduled_health_reports(id) ON DELETE CASCADE,
  run_status VARCHAR(30) NOT NULL DEFAULT 'pending'
    CHECK (run_status IN ('pending', 'running', 'completed', 'failed')),
  report_data JSONB,
  sent_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── GAP-24: Quick Capture ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.quick_capture_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  capture_type VARCHAR(30) NOT NULL CHECK (capture_type IN ('task', 'risk', 'issue', 'note')),
  title TEXT NOT NULL,
  capture_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  sync_status VARCHAR(30) NOT NULL DEFAULT 'synced'
    CHECK (sync_status IN ('queued', 'syncing', 'synced', 'failed')),
  created_entity_type VARCHAR(40),
  created_entity_id UUID,
  captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE
);

-- ── GAP-25: Integrations Hub ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.integration_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_code VARCHAR(60) NOT NULL,
  integration_name VARCHAR(255) NOT NULL,
  category VARCHAR(60) NOT NULL,
  description TEXT,
  logo_url TEXT,
  is_available BOOLEAN NOT NULL DEFAULT TRUE,
  is_coming_soon BOOLEAN NOT NULL DEFAULT FALSE,
  setup_guide_url TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_integration_catalog_code UNIQUE (integration_code)
);

CREATE TABLE IF NOT EXISTS public.integration_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  integration_id UUID NOT NULL REFERENCES public.integration_catalog(id) ON DELETE CASCADE,
  connected_by UUID REFERENCES auth.users(id),
  connection_status VARCHAR(30) NOT NULL DEFAULT 'connected'
    CHECK (connection_status IN ('connected', 'disconnected', 'error')),
  credentials_encrypted JSONB,
  event_mapping JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_sync_at TIMESTAMPTZ,
  sync_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  CONSTRAINT uq_integration_connections UNIQUE (account_id, integration_id)
);

-- ── Triggers & RLS ─────────────────────────────────────────────────────────────

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'dashboards','dashboard_widgets','dashboard_widget_configs','portfolio_map_configs',
    'whiteboards','whiteboard_elements','training_certifications','member_training_records',
    'notification_preference_templates','notification_preferences','project_clone_jobs',
    'scheduled_health_reports','scheduled_report_runs','quick_capture_items',
    'integration_catalog','integration_connections','guest_collaborators'
  ]
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%s_updated_at ON public.%I', t, t);
    EXECUTE format('CREATE TRIGGER trg_%s_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_pmis_updated_at()', t, t);
  END LOOP;
END $$;

ALTER TABLE public.dashboards ENABLE ROW LEVEL SECURITY;
CREATE POLICY policy_dashboards_owner ON public.dashboards FOR ALL TO authenticated
  USING (owner_user_id = auth.uid() OR public.is_user_pmo_admin(auth.uid()))
  WITH CHECK (owner_user_id = auth.uid() OR public.is_user_pmo_admin(auth.uid()));

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY policy_notification_preferences_own ON public.notification_preferences FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

ALTER TABLE public.quick_capture_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY policy_quick_capture_own ON public.quick_capture_items FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

ALTER TABLE public.guest_collaborators ENABLE ROW LEVEL SECURITY;
CREATE POLICY policy_guest_collaborators_pm ON public.guest_collaborators FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_projects up WHERE up.project_id = guest_collaborators.project_id AND up.user_id = auth.uid() AND up.is_deleted = FALSE));

ALTER TABLE public.portfolio_map_configs ENABLE ROW LEVEL SECURITY;
CREATE POLICY policy_portfolio_map_pmo ON public.portfolio_map_configs FOR ALL TO authenticated
  USING (public.is_user_pmo_admin(auth.uid())) WITH CHECK (public.is_user_pmo_admin(auth.uid()));

ALTER TABLE public.integration_catalog ENABLE ROW LEVEL SECURITY;
CREATE POLICY policy_integration_catalog_read ON public.integration_catalog FOR SELECT TO authenticated USING (TRUE);

ALTER TABLE public.integration_connections ENABLE ROW LEVEL SECURITY;
CREATE POLICY policy_integration_connections ON public.integration_connections FOR ALL TO authenticated
  USING (public.is_user_pmo_admin(auth.uid()) OR connected_by = auth.uid())
  WITH CHECK (public.is_user_pmo_admin(auth.uid()) OR connected_by = auth.uid());

INSERT INTO public.database_tables (table_name, table_description, is_system_table, is_active)
VALUES
  ('dashboards', 'User-built widget dashboards (GAP-16)', false, true),
  ('dashboard_widgets', 'Widgets placed on dashboards (GAP-16)', false, true),
  ('dashboard_widget_configs', 'Per-widget configuration key/value (GAP-16)', false, true),
  ('portfolio_map_configs', 'Strategic portfolio bubble map axis configs (GAP-17)', false, true),
  ('whiteboards', 'Collaborative whiteboard canvases (GAP-18)', false, true),
  ('whiteboard_elements', 'Elements on whiteboard canvas (GAP-18)', false, true),
  ('whiteboard_collaborators', 'Whiteboard collaborator permissions (GAP-18)', false, true),
  ('guest_collaborators', 'External guest collaborator registry (GAP-19)', false, true),
  ('guest_access_tokens', 'Guest access token records (GAP-19)', false, true),
  ('training_certifications', 'Certification catalog (GAP-20)', false, true),
  ('member_training_records', 'Member training and certification records (GAP-20)', false, true),
  ('notification_preference_templates', 'Default notification templates by role (GAP-21)', false, true),
  ('notification_preferences', 'Per-user notification preferences (GAP-21)', false, true),
  ('project_clone_jobs', 'Project clone operation job log (GAP-22)', false, true),
  ('scheduled_health_reports', 'Scheduled automated health report configs (GAP-23)', false, true),
  ('scheduled_report_runs', 'Execution log for scheduled reports (GAP-23)', false, true),
  ('quick_capture_items', 'Mobile quick capture queue items (GAP-24)', false, true),
  ('integration_catalog', 'Integrations marketplace catalog (GAP-25)', false, true),
  ('integration_connections', 'Active integration connections per account (GAP-25)', false, true)
ON CONFLICT (table_name) DO UPDATE SET
  table_description = EXCLUDED.table_description,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

DO $$ BEGIN RAISE NOTICE 'v645_pmis_gap_tables_tier3.sql completed'; END $$;
