-- ============================================================================
-- v406: Project Template Library & Per-Project Tailoring (Platform + Simulator)
-- PostgreSQL 15+ / Supabase. Prerequisites: accounts, projects, users, roles,
-- auth.users, is_pmo_admin_user(), user_has_access_to_account() (v403+).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Helpers: project access (Platform)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.auth_user_can_access_project(p_project_id UUID)
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
      public.is_pmo_admin_user()
      OR EXISTS (
        SELECT 1
        FROM public.project_memberships pm
        INNER JOIN public.users u ON u.id = pm.user_id
        WHERE pm.project_id = p_project_id
          AND u.auth_user_id = auth.uid()
          AND COALESCE(pm.is_active, TRUE) = TRUE
          AND pm.invitation_status = 'accepted'
      )
      OR EXISTS (
        SELECT 1
        FROM public.user_projects up
        INNER JOIN public.users u ON u.id = up.user_id
        WHERE up.project_id = p_project_id
          AND u.auth_user_id = auth.uid()
          AND COALESCE(up.is_deleted, FALSE) = FALSE
          AND COALESCE(up.is_active, TRUE) = TRUE
      )
      OR EXISTS (
        SELECT 1
        FROM public.user_roles ur
        INNER JOIN public.users u ON u.id = ur.user_id
        WHERE ur.project_id = p_project_id
          AND u.auth_user_id = auth.uid()
          AND ur.is_active = TRUE
          AND COALESCE(ur.is_deleted, FALSE) = FALSE
      )
    );
$$;

COMMENT ON FUNCTION public.auth_user_can_access_project(UUID) IS
  'TRUE if PMO/admin or the current user is linked to the project via memberships / user_projects / user_roles.';

CREATE OR REPLACE FUNCTION public.user_can_insert_project_template_copy(p_project_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_uid UUID;
BEGIN
  IF public.is_pmo_admin_user() THEN
    RETURN TRUE;
  END IF;
  SELECT id INTO v_uid FROM public.users WHERE auth_user_id = auth.uid();
  IF v_uid IS NULL THEN
    RETURN FALSE;
  END IF;
  IF NOT public.auth_user_can_access_project(p_project_id) THEN
    RETURN FALSE;
  END IF;
  RETURN EXISTS (
    SELECT 1
    FROM public.user_roles ur
    INNER JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = v_uid
      AND ur.project_id = p_project_id
      AND ur.is_active = TRUE
      AND COALESCE(ur.is_deleted, FALSE) = FALSE
      AND r.role_name IN ('project_manager', 'team_lead', 'system_admin')
  );
END;
$$;

COMMENT ON FUNCTION public.user_can_insert_project_template_copy(UUID) IS
  'TRUE if PMO/admin or PM/TL on the project (via user_roles).';

CREATE OR REPLACE FUNCTION public.user_can_update_project_template_copy(p_created_by_auth UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
SET row_security = off
AS $$
  SELECT public.is_pmo_admin_user()
    OR (p_created_by_auth IS NOT NULL AND p_created_by_auth = auth.uid());
$$;

-- ---------------------------------------------------------------------------
-- Helper: simulation run owned by current auth user
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sim_auth_user_owns_run(p_run_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1 FROM sim.simulation_runs sr
    WHERE sr.id = p_run_id AND sr.user_id = auth.uid()
  );
$$;

COMMENT ON FUNCTION public.sim_auth_user_owns_run(UUID) IS
  'TRUE if the simulation run belongs to the current auth user.';

-- ============================================================================
-- PLATFORM: lookup
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.template_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_code VARCHAR(50) NOT NULL UNIQUE,
  category_name VARCHAR(100) NOT NULL,
  description TEXT,
  sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_template_categories_active ON public.template_categories(is_active);

-- ============================================================================
-- PLATFORM: master library
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.template_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.template_categories(id) ON DELETE SET NULL,
  template_type_code VARCHAR(50) NOT NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  purpose TEXT,
  content JSONB NOT NULL DEFAULT '{}'::jsonb,
  content_schema JSONB,
  version VARCHAR(20) DEFAULT '1.0',
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived', 'deprecated')),
  is_default BOOLEAN DEFAULT FALSE,
  tags TEXT[] DEFAULT '{}',
  notes TEXT,
  published_at TIMESTAMPTZ,
  published_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  archived_at TIMESTAMPTZ,
  archived_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  is_deleted BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_template_library_account ON public.template_library(account_id);
CREATE INDEX IF NOT EXISTS idx_template_library_type ON public.template_library(template_type_code);
CREATE INDEX IF NOT EXISTS idx_template_library_status ON public.template_library(status);
CREATE INDEX IF NOT EXISTS idx_template_library_category ON public.template_library(category_id);
CREATE INDEX IF NOT EXISTS idx_template_library_default ON public.template_library(account_id, template_type_code) WHERE is_default = TRUE AND COALESCE(is_deleted, FALSE) = FALSE;

CREATE UNIQUE INDEX IF NOT EXISTS uq_template_library_one_default_per_type
  ON public.template_library(account_id, template_type_code)
  WHERE is_default = TRUE AND COALESCE(is_deleted, FALSE) = FALSE;

CREATE TABLE IF NOT EXISTS public.template_library_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.template_library(id) ON DELETE CASCADE,
  version_number VARCHAR(20) NOT NULL,
  content_snapshot JSONB NOT NULL,
  change_description TEXT,
  changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  changed_at TIMESTAMPTZ DEFAULT NOW(),
  is_published BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_template_library_versions_template ON public.template_library_versions(template_id);
CREATE INDEX IF NOT EXISTS idx_template_library_versions_changed ON public.template_library_versions(changed_at DESC);

CREATE TABLE IF NOT EXISTS public.project_template_copies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.template_library(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  content JSONB NOT NULL DEFAULT '{}'::jsonb,
  current_version INT DEFAULT 1,
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'archived')),
  copied_from_version VARCHAR(20),
  notes TEXT,
  is_on_hold BOOLEAN DEFAULT FALSE,
  on_hold_reason TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (template_id, project_id)
);

CREATE INDEX IF NOT EXISTS idx_project_template_copies_project ON public.project_template_copies(project_id);
CREATE INDEX IF NOT EXISTS idx_project_template_copies_template ON public.project_template_copies(template_id);
CREATE INDEX IF NOT EXISTS idx_project_template_copies_account ON public.project_template_copies(account_id);
CREATE INDEX IF NOT EXISTS idx_project_template_copies_status ON public.project_template_copies(status);

CREATE TABLE IF NOT EXISTS public.template_copy_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  copy_id UUID NOT NULL REFERENCES public.project_template_copies(id) ON DELETE CASCADE,
  version_number INT NOT NULL,
  content_snapshot JSONB NOT NULL,
  change_description TEXT,
  changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  changed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_template_copy_versions_copy ON public.template_copy_versions(copy_id);
CREATE INDEX IF NOT EXISTS idx_template_copy_versions_changed ON public.template_copy_versions(changed_at DESC);

CREATE TABLE IF NOT EXISTS public.template_update_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.template_library(id) ON DELETE CASCADE,
  copy_id UUID REFERENCES public.project_template_copies(id) ON DELETE CASCADE,
  notification_type VARCHAR(50) DEFAULT 'master_updated',
  message TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  notified_user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_template_notif_user ON public.template_update_notifications(notified_user_id, is_read);

-- ---------------------------------------------------------------------------
-- Triggers: touch updated_at
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_template_touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_template_categories_updated ON public.template_categories;
CREATE TRIGGER trg_template_categories_updated
  BEFORE UPDATE ON public.template_categories
  FOR EACH ROW EXECUTE FUNCTION public.trg_template_touch_updated_at();

DROP TRIGGER IF EXISTS trg_template_library_updated ON public.template_library;
CREATE TRIGGER trg_template_library_updated
  BEFORE UPDATE ON public.template_library
  FOR EACH ROW EXECUTE FUNCTION public.trg_template_touch_updated_at();

DROP TRIGGER IF EXISTS trg_project_template_copies_updated ON public.project_template_copies;
CREATE TRIGGER trg_project_template_copies_updated
  BEFORE UPDATE ON public.project_template_copies
  FOR EACH ROW EXECUTE FUNCTION public.trg_template_touch_updated_at();

-- ---------------------------------------------------------------------------
-- Trigger: snapshot master template versions
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_snapshot_template_library()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.template_library_versions (
      template_id, version_number, content_snapshot, change_description, changed_by, is_published
    ) VALUES (
      NEW.id, COALESCE(NEW.version, '1.0'), NEW.content, 'Initial version', NEW.created_by, NEW.status = 'published'
    );
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' THEN
    IF NEW.content IS DISTINCT FROM OLD.content
       OR NEW.version IS DISTINCT FROM OLD.version
       OR NEW.status IS DISTINCT FROM OLD.status
       OR NEW.title IS DISTINCT FROM OLD.title
    THEN
      INSERT INTO public.template_library_versions (
        template_id, version_number, content_snapshot, change_description, changed_by, is_published
      ) VALUES (
        NEW.id,
        COALESCE(NEW.version, '1.0'),
        NEW.content,
        NULL,
        NEW.updated_by,
        NEW.status = 'published'
      );
    END IF;
    RETURN NEW;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_snapshot_template_on_save ON public.template_library;
CREATE TRIGGER trg_snapshot_template_on_save
  AFTER INSERT OR UPDATE ON public.template_library
  FOR EACH ROW EXECUTE FUNCTION public.trg_snapshot_template_library();

-- ---------------------------------------------------------------------------
-- Trigger: notify project copy owners when published master changes (re-publish)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_notify_template_copy_owners()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE'
     AND NEW.status = 'published'
     AND OLD.status = 'published'
     AND (
       NEW.content IS DISTINCT FROM OLD.content
       OR NEW.title IS DISTINCT FROM OLD.title
       OR NEW.version IS DISTINCT FROM OLD.version
     )
  THEN
    INSERT INTO public.template_update_notifications (
      template_id, copy_id, notification_type, message, is_read, notified_user_id
    )
    SELECT
      NEW.id,
      c.id,
      'master_updated',
      'The master template "' || NEW.title || '" was updated. Review your project copy.',
      FALSE,
      u.id
    FROM public.project_template_copies c
    INNER JOIN public.users u ON u.auth_user_id = c.created_by
    WHERE c.template_id = NEW.id
      AND c.status = 'active';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_copy_owners ON public.template_library;
CREATE TRIGGER trg_notify_copy_owners
  AFTER UPDATE ON public.template_library
  FOR EACH ROW EXECUTE FUNCTION public.trg_notify_template_copy_owners();

-- ---------------------------------------------------------------------------
-- Trigger: project copy versions + increment
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_project_copy_before_update()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.content IS DISTINCT FROM OLD.content
     OR NEW.title IS DISTINCT FROM OLD.title
     OR NEW.description IS DISTINCT FROM OLD.description
     OR NEW.status IS DISTINCT FROM OLD.status
     OR NEW.notes IS DISTINCT FROM OLD.notes
     OR NEW.is_on_hold IS DISTINCT FROM OLD.is_on_hold
     OR NEW.on_hold_reason IS DISTINCT FROM OLD.on_hold_reason
  THEN
    NEW.current_version := COALESCE(OLD.current_version, 0) + 1;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_project_copy_before_update ON public.project_template_copies;
CREATE TRIGGER trg_project_copy_before_update
  BEFORE UPDATE ON public.project_template_copies
  FOR EACH ROW EXECUTE FUNCTION public.trg_project_copy_before_update();

CREATE OR REPLACE FUNCTION public.trg_project_copy_snapshot()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.template_copy_versions (
      copy_id, version_number, content_snapshot, change_description, changed_by
    ) VALUES (
      NEW.id, 1, NEW.content, 'Initial copy', NEW.created_by
    );
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' THEN
    IF NEW.current_version IS DISTINCT FROM OLD.current_version THEN
      INSERT INTO public.template_copy_versions (
        copy_id, version_number, content_snapshot, change_description, changed_by
      ) VALUES (
        NEW.id, NEW.current_version, NEW.content, NULL, NEW.updated_by
      );
    END IF;
    RETURN NEW;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_snapshot_copy_on_save ON public.project_template_copies;
CREATE TRIGGER trg_snapshot_copy_on_save
  AFTER INSERT OR UPDATE ON public.project_template_copies
  FOR EACH ROW EXECUTE FUNCTION public.trg_project_copy_snapshot();

-- ============================================================================
-- SIM SCHEMA: mirror tables
-- ============================================================================
CREATE TABLE IF NOT EXISTS sim.template_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_code VARCHAR(50) NOT NULL UNIQUE,
  category_name VARCHAR(100) NOT NULL,
  description TEXT,
  sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sim.template_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  category_id UUID REFERENCES sim.template_categories(id) ON DELETE SET NULL,
  template_type_code VARCHAR(50) NOT NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  purpose TEXT,
  content JSONB NOT NULL DEFAULT '{}'::jsonb,
  content_schema JSONB,
  version VARCHAR(20) DEFAULT '1.0',
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived', 'deprecated')),
  is_default BOOLEAN DEFAULT FALSE,
  tags TEXT[] DEFAULT '{}',
  notes TEXT,
  published_at TIMESTAMPTZ,
  published_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  archived_at TIMESTAMPTZ,
  archived_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  is_deleted BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_sim_template_library_account ON sim.template_library(account_id);
CREATE INDEX IF NOT EXISTS idx_sim_template_library_type ON sim.template_library(template_type_code);
CREATE INDEX IF NOT EXISTS idx_sim_template_library_status ON sim.template_library(status);

CREATE UNIQUE INDEX IF NOT EXISTS uq_sim_template_library_one_default_per_type
  ON sim.template_library(account_id, template_type_code)
  WHERE is_default = TRUE AND COALESCE(is_deleted, FALSE) = FALSE;

CREATE TABLE IF NOT EXISTS sim.template_library_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES sim.template_library(id) ON DELETE CASCADE,
  version_number VARCHAR(20) NOT NULL,
  content_snapshot JSONB NOT NULL,
  change_description TEXT,
  changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  changed_at TIMESTAMPTZ DEFAULT NOW(),
  is_published BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS sim.project_template_copies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES sim.template_library(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES sim.simulation_runs(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  content JSONB NOT NULL DEFAULT '{}'::jsonb,
  current_version INT DEFAULT 1,
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'archived')),
  copied_from_version VARCHAR(20),
  notes TEXT,
  is_on_hold BOOLEAN DEFAULT FALSE,
  on_hold_reason TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (template_id, project_id)
);

CREATE INDEX IF NOT EXISTS idx_sim_project_template_copies_run ON sim.project_template_copies(project_id);
CREATE INDEX IF NOT EXISTS idx_sim_project_template_copies_template ON sim.project_template_copies(template_id);

CREATE TABLE IF NOT EXISTS sim.template_copy_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  copy_id UUID NOT NULL REFERENCES sim.project_template_copies(id) ON DELETE CASCADE,
  version_number INT NOT NULL,
  content_snapshot JSONB NOT NULL,
  change_description TEXT,
  changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  changed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sim.template_update_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES sim.template_library(id) ON DELETE CASCADE,
  copy_id UUID REFERENCES sim.project_template_copies(id) ON DELETE CASCADE,
  notification_type VARCHAR(50) DEFAULT 'master_updated',
  message TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  notified_user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_sim_template_categories_updated ON sim.template_categories;
CREATE TRIGGER trg_sim_template_categories_updated
  BEFORE UPDATE ON sim.template_categories
  FOR EACH ROW EXECUTE FUNCTION public.trg_template_touch_updated_at();

DROP TRIGGER IF EXISTS trg_sim_template_library_updated ON sim.template_library;
CREATE TRIGGER trg_sim_template_library_updated
  BEFORE UPDATE ON sim.template_library
  FOR EACH ROW EXECUTE FUNCTION public.trg_template_touch_updated_at();

DROP TRIGGER IF EXISTS trg_sim_project_template_copies_updated ON sim.project_template_copies;
CREATE TRIGGER trg_sim_project_template_copies_updated
  BEFORE UPDATE ON sim.project_template_copies
  FOR EACH ROW EXECUTE FUNCTION public.trg_template_touch_updated_at();

CREATE OR REPLACE FUNCTION public.trg_sim_snapshot_template_library()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, sim
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO sim.template_library_versions (
      template_id, version_number, content_snapshot, change_description, changed_by, is_published
    ) VALUES (
      NEW.id, COALESCE(NEW.version, '1.0'), NEW.content, 'Initial version', NEW.created_by, NEW.status = 'published'
    );
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' THEN
    IF NEW.content IS DISTINCT FROM OLD.content
       OR NEW.version IS DISTINCT FROM OLD.version
       OR NEW.status IS DISTINCT FROM OLD.status
       OR NEW.title IS DISTINCT FROM OLD.title
    THEN
      INSERT INTO sim.template_library_versions (
        template_id, version_number, content_snapshot, change_description, changed_by, is_published
      ) VALUES (
        NEW.id, COALESCE(NEW.version, '1.0'), NEW.content, NULL, NEW.updated_by, NEW.status = 'published'
      );
    END IF;
    RETURN NEW;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sim_snapshot_template_on_save ON sim.template_library;
CREATE TRIGGER trg_sim_snapshot_template_on_save
  AFTER INSERT OR UPDATE ON sim.template_library
  FOR EACH ROW EXECUTE FUNCTION public.trg_sim_snapshot_template_library();

CREATE OR REPLACE FUNCTION public.trg_sim_notify_template_copy_owners()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, sim
AS $$
BEGIN
  IF TG_OP = 'UPDATE'
     AND NEW.status = 'published'
     AND OLD.status = 'published'
     AND (
       NEW.content IS DISTINCT FROM OLD.content
       OR NEW.title IS DISTINCT FROM OLD.title
       OR NEW.version IS DISTINCT FROM OLD.version
     )
  THEN
    INSERT INTO sim.template_update_notifications (
      template_id, copy_id, notification_type, message, is_read, notified_user_id
    )
    SELECT
      NEW.id,
      c.id,
      'master_updated',
      'The master template "' || NEW.title || '" was updated. Review your practice copy.',
      FALSE,
      u.id
    FROM sim.project_template_copies c
    INNER JOIN public.users u ON u.auth_user_id = c.created_by
    WHERE c.template_id = NEW.id
      AND c.status = 'active';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sim_notify_copy_owners ON sim.template_library;
CREATE TRIGGER trg_sim_notify_copy_owners
  AFTER UPDATE ON sim.template_library
  FOR EACH ROW EXECUTE FUNCTION public.trg_sim_notify_template_copy_owners();

CREATE OR REPLACE FUNCTION public.trg_sim_project_copy_before_update()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.content IS DISTINCT FROM OLD.content
     OR NEW.title IS DISTINCT FROM OLD.title
     OR NEW.description IS DISTINCT FROM OLD.description
     OR NEW.status IS DISTINCT FROM OLD.status
     OR NEW.notes IS DISTINCT FROM OLD.notes
     OR NEW.is_on_hold IS DISTINCT FROM OLD.is_on_hold
     OR NEW.on_hold_reason IS DISTINCT FROM OLD.on_hold_reason
  THEN
    NEW.current_version := COALESCE(OLD.current_version, 0) + 1;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sim_project_copy_before_update ON sim.project_template_copies;
CREATE TRIGGER trg_sim_project_copy_before_update
  BEFORE UPDATE ON sim.project_template_copies
  FOR EACH ROW EXECUTE FUNCTION public.trg_sim_project_copy_before_update();

CREATE OR REPLACE FUNCTION public.trg_sim_project_copy_snapshot()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, sim
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO sim.template_copy_versions (
      copy_id, version_number, content_snapshot, change_description, changed_by
    ) VALUES (
      NEW.id, 1, NEW.content, 'Initial copy', NEW.created_by
    );
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' THEN
    IF NEW.current_version IS DISTINCT FROM OLD.current_version THEN
      INSERT INTO sim.template_copy_versions (
        copy_id, version_number, content_snapshot, change_description, changed_by
      ) VALUES (
        NEW.id, NEW.current_version, NEW.content, NULL, NEW.updated_by
      );
    END IF;
    RETURN NEW;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sim_snapshot_copy_on_save ON sim.project_template_copies;
CREATE TRIGGER trg_sim_snapshot_copy_on_save
  AFTER INSERT OR UPDATE ON sim.project_template_copies
  FOR EACH ROW EXECUTE FUNCTION public.trg_sim_project_copy_snapshot();

-- ============================================================================
-- GRANTS
-- ============================================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON public.template_categories TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.template_library TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.template_library_versions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_template_copies TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.template_copy_versions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.template_update_notifications TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON sim.template_categories TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON sim.template_library TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON sim.template_library_versions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON sim.project_template_copies TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON sim.template_copy_versions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON sim.template_update_notifications TO authenticated;

-- ============================================================================
-- RLS: PLATFORM
-- ============================================================================
ALTER TABLE public.template_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_library_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_template_copies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_copy_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_update_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS template_categories_select ON public.template_categories;
CREATE POLICY template_categories_select ON public.template_categories
  FOR SELECT TO authenticated USING (TRUE);

DROP POLICY IF EXISTS template_categories_all ON public.template_categories;
CREATE POLICY template_categories_all ON public.template_categories
  FOR ALL TO authenticated
  USING (public.is_pmo_admin_user())
  WITH CHECK (public.is_pmo_admin_user());

DROP POLICY IF EXISTS template_library_select ON public.template_library;
CREATE POLICY template_library_select ON public.template_library
  FOR SELECT TO authenticated
  USING (
    COALESCE(is_deleted, FALSE) = FALSE
    AND public.user_has_access_to_account(account_id)
    AND (
      status = 'published'
      OR public.is_pmo_admin_user()
    )
  );

DROP POLICY IF EXISTS template_library_insert ON public.template_library;
CREATE POLICY template_library_insert ON public.template_library
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_pmo_admin_user()
    AND public.user_has_access_to_account(account_id)
  );

DROP POLICY IF EXISTS template_library_update ON public.template_library;
CREATE POLICY template_library_update ON public.template_library
  FOR UPDATE TO authenticated
  USING (
    public.is_pmo_admin_user()
    AND public.user_has_access_to_account(account_id)
  )
  WITH CHECK (
    public.is_pmo_admin_user()
    AND public.user_has_access_to_account(account_id)
  );

DROP POLICY IF EXISTS template_library_delete ON public.template_library;
CREATE POLICY template_library_delete ON public.template_library
  FOR DELETE TO authenticated
  USING (
    public.is_pmo_admin_user()
    AND public.user_has_access_to_account(account_id)
  );

DROP POLICY IF EXISTS template_library_versions_select ON public.template_library_versions;
CREATE POLICY template_library_versions_select ON public.template_library_versions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.template_library t
      WHERE t.id = template_library_versions.template_id
        AND COALESCE(t.is_deleted, FALSE) = FALSE
        AND public.user_has_access_to_account(t.account_id)
        AND (t.status = 'published' OR public.is_pmo_admin_user())
    )
  );

-- No INSERT policy for authenticated: version rows are written by triggers only (table owner bypasses RLS).

DROP POLICY IF EXISTS project_template_copies_select ON public.project_template_copies;
CREATE POLICY project_template_copies_select ON public.project_template_copies
  FOR SELECT TO authenticated
  USING (
    public.auth_user_can_access_project(project_id)
    OR public.is_pmo_admin_user()
  );

DROP POLICY IF EXISTS project_template_copies_insert ON public.project_template_copies;
CREATE POLICY project_template_copies_insert ON public.project_template_copies
  FOR INSERT TO authenticated
  WITH CHECK (
    public.user_has_access_to_account(account_id)
    AND public.user_can_insert_project_template_copy(project_id)
  );

DROP POLICY IF EXISTS project_template_copies_update ON public.project_template_copies;
CREATE POLICY project_template_copies_update ON public.project_template_copies
  FOR UPDATE TO authenticated
  USING (
    public.is_pmo_admin_user()
    OR (
      public.auth_user_can_access_project(project_id)
      AND public.user_can_update_project_template_copy(created_by)
    )
  )
  WITH CHECK (
    public.is_pmo_admin_user()
    OR (
      public.auth_user_can_access_project(project_id)
      AND public.user_can_update_project_template_copy(created_by)
    )
  );

DROP POLICY IF EXISTS project_template_copies_delete ON public.project_template_copies;
CREATE POLICY project_template_copies_delete ON public.project_template_copies
  FOR DELETE TO authenticated
  USING (public.is_pmo_admin_user());

DROP POLICY IF EXISTS template_copy_versions_select ON public.template_copy_versions;
CREATE POLICY template_copy_versions_select ON public.template_copy_versions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.project_template_copies c
      WHERE c.id = template_copy_versions.copy_id
        AND (public.auth_user_can_access_project(c.project_id) OR public.is_pmo_admin_user())
    )
  );

-- Immutable: no UPDATE/DELETE policies for authenticated (denied by default).

DROP POLICY IF EXISTS template_update_notifications_select ON public.template_update_notifications;
CREATE POLICY template_update_notifications_select ON public.template_update_notifications
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = template_update_notifications.notified_user_id
        AND u.auth_user_id = auth.uid()
    )
    OR public.is_pmo_admin_user()
  );

DROP POLICY IF EXISTS template_update_notifications_update ON public.template_update_notifications;
CREATE POLICY template_update_notifications_update ON public.template_update_notifications
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = template_update_notifications.notified_user_id
        AND u.auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = template_update_notifications.notified_user_id
        AND u.auth_user_id = auth.uid()
    )
  );

-- Notifications inserted by trigger only.

-- ============================================================================
-- RLS: SIM
-- ============================================================================
ALTER TABLE sim.template_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.template_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.template_library_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.project_template_copies ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.template_copy_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.template_update_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sim_template_categories_select ON sim.template_categories;
CREATE POLICY sim_template_categories_select ON sim.template_categories
  FOR SELECT TO authenticated USING (TRUE);

DROP POLICY IF EXISTS sim_template_categories_all ON sim.template_categories;
CREATE POLICY sim_template_categories_all ON sim.template_categories
  FOR ALL TO authenticated
  USING (public.is_pmo_admin_user())
  WITH CHECK (public.is_pmo_admin_user());

DROP POLICY IF EXISTS sim_template_library_select ON sim.template_library;
CREATE POLICY sim_template_library_select ON sim.template_library
  FOR SELECT TO authenticated
  USING (
    COALESCE(is_deleted, FALSE) = FALSE
    AND public.user_has_access_to_account(account_id)
    AND (status = 'published' OR public.is_pmo_admin_user())
  );

DROP POLICY IF EXISTS sim_template_library_insert ON sim.template_library;
CREATE POLICY sim_template_library_insert ON sim.template_library
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_pmo_admin_user()
    AND public.user_has_access_to_account(account_id)
  );

DROP POLICY IF EXISTS sim_template_library_update ON sim.template_library;
CREATE POLICY sim_template_library_update ON sim.template_library
  FOR UPDATE TO authenticated
  USING (public.is_pmo_admin_user() AND public.user_has_access_to_account(account_id))
  WITH CHECK (public.is_pmo_admin_user() AND public.user_has_access_to_account(account_id));

DROP POLICY IF EXISTS sim_template_library_delete ON sim.template_library;
CREATE POLICY sim_template_library_delete ON sim.template_library
  FOR DELETE TO authenticated
  USING (public.is_pmo_admin_user() AND public.user_has_access_to_account(account_id));

DROP POLICY IF EXISTS sim_template_library_versions_select ON sim.template_library_versions;
CREATE POLICY sim_template_library_versions_select ON sim.template_library_versions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM sim.template_library t
      WHERE t.id = template_library_versions.template_id
        AND COALESCE(t.is_deleted, FALSE) = FALSE
        AND public.user_has_access_to_account(t.account_id)
        AND (t.status = 'published' OR public.is_pmo_admin_user())
    )
  );

-- Version inserts via triggers only.

DROP POLICY IF EXISTS sim_project_template_copies_select ON sim.project_template_copies;
CREATE POLICY sim_project_template_copies_select ON sim.project_template_copies
  FOR SELECT TO authenticated
  USING (
    public.sim_auth_user_owns_run(project_id)
    OR public.is_pmo_admin_user()
  );

DROP POLICY IF EXISTS sim_project_template_copies_insert ON sim.project_template_copies;
CREATE POLICY sim_project_template_copies_insert ON sim.project_template_copies
  FOR INSERT TO authenticated
  WITH CHECK (
    public.user_has_access_to_account(account_id)
    AND public.sim_auth_user_owns_run(project_id)
    AND (
      public.is_pmo_admin_user()
      OR EXISTS (
        SELECT 1 FROM public.user_roles ur
        INNER JOIN public.roles r ON r.id = ur.role_id
        INNER JOIN public.users u ON u.id = ur.user_id
        WHERE u.auth_user_id = auth.uid()
          AND ur.is_active = TRUE
          AND COALESCE(ur.is_deleted, FALSE) = FALSE
          AND r.role_name IN ('project_manager', 'team_lead', 'system_admin', 'pmo_admin')
      )
    )
  );

DROP POLICY IF EXISTS sim_project_template_copies_update ON sim.project_template_copies;
CREATE POLICY sim_project_template_copies_update ON sim.project_template_copies
  FOR UPDATE TO authenticated
  USING (
    public.is_pmo_admin_user()
    OR (public.sim_auth_user_owns_run(project_id) AND public.user_can_update_project_template_copy(created_by))
  )
  WITH CHECK (
    public.is_pmo_admin_user()
    OR (public.sim_auth_user_owns_run(project_id) AND public.user_can_update_project_template_copy(created_by))
  );

DROP POLICY IF EXISTS sim_project_template_copies_delete ON sim.project_template_copies;
CREATE POLICY sim_project_template_copies_delete ON sim.project_template_copies
  FOR DELETE TO authenticated
  USING (public.is_pmo_admin_user());

DROP POLICY IF EXISTS sim_template_copy_versions_select ON sim.template_copy_versions;
CREATE POLICY sim_template_copy_versions_select ON sim.template_copy_versions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM sim.project_template_copies c
      WHERE c.id = template_copy_versions.copy_id
        AND (public.sim_auth_user_owns_run(c.project_id) OR public.is_pmo_admin_user())
    )
  );

-- Immutable copy versions for authenticated.

DROP POLICY IF EXISTS sim_template_update_notifications_select ON sim.template_update_notifications;
CREATE POLICY sim_template_update_notifications_select ON sim.template_update_notifications
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = template_update_notifications.notified_user_id
        AND u.auth_user_id = auth.uid()
    )
    OR public.is_pmo_admin_user()
  );

DROP POLICY IF EXISTS sim_template_update_notifications_update ON sim.template_update_notifications;
CREATE POLICY sim_template_update_notifications_update ON sim.template_update_notifications
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = template_update_notifications.notified_user_id
        AND u.auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = template_update_notifications.notified_user_id
        AND u.auth_user_id = auth.uid()
    )
  );

-- Notifications via trigger only.

-- ============================================================================
-- Permissions & role assignments
-- ============================================================================
INSERT INTO permissions (
  permission_code, permission_name, permission_description,
  permission_category, permission_module, permission_type, is_active
)
VALUES
  ('template_library.create', 'Create master templates', 'Create template library records', 'templates', 'template_library', 'create', TRUE),
  ('template_library.read', 'View master templates', 'Read template library', 'templates', 'template_library', 'read', TRUE),
  ('template_library.update', 'Update master templates', 'Edit template library', 'templates', 'template_library', 'update', TRUE),
  ('template_library.delete', 'Delete master templates', 'Delete template library records', 'templates', 'template_library', 'delete', TRUE),
  ('template_library.publish', 'Publish master templates', 'Publish template library', 'templates', 'template_library', 'execute', TRUE),
  ('template_library.archive', 'Archive master templates', 'Archive template library', 'templates', 'template_library', 'execute', TRUE),
  ('template_copy.create', 'Create project template copies', 'Create tailored copies', 'templates', 'template_copy', 'create', TRUE),
  ('template_copy.read', 'View project template copies', 'Read project template copies', 'templates', 'template_copy', 'read', TRUE),
  ('template_copy.update', 'Update project template copies', 'Edit project template copies', 'templates', 'template_copy', 'update', TRUE),
  ('template_copy.delete', 'Delete project template copies', 'Delete project template copies', 'templates', 'template_copy', 'delete', TRUE),
  ('template_copy.export', 'Export project template copies', 'Export copies', 'templates', 'template_copy', 'execute', TRUE),
  ('template_copy.view_history', 'View template copy history', 'View version history', 'templates', 'template_copy', 'read', TRUE)
ON CONFLICT (permission_code) DO UPDATE SET
  permission_name = EXCLUDED.permission_name,
  permission_description = EXCLUDED.permission_description,
  updated_at = NOW();

-- system_admin & pmo_admin: full template permissions
INSERT INTO role_permissions (role_id, permission_id, is_active)
SELECT r.id, p.id, TRUE
FROM roles r
CROSS JOIN permissions p
WHERE r.role_name IN ('system_admin', 'pmo_admin')
  AND p.permission_code LIKE 'template_%'
ON CONFLICT (role_id, permission_id) DO UPDATE SET
  is_active = TRUE,
  updated_at = NOW();

-- project_manager / team_lead: copy + read (master read implied by RLS for published)
INSERT INTO role_permissions (role_id, permission_id, is_active)
SELECT r.id, p.id, TRUE
FROM roles r
CROSS JOIN permissions p
WHERE r.role_name IN ('project_manager', 'team_lead')
  AND p.permission_code IN (
    'template_library.read',
    'template_copy.create', 'template_copy.read', 'template_copy.update',
    'template_copy.export', 'template_copy.view_history'
  )
ON CONFLICT (role_id, permission_id) DO UPDATE SET
  is_active = TRUE,
  updated_at = NOW();

INSERT INTO role_permissions (role_id, permission_id, is_active)
SELECT r.id, p.id, TRUE
FROM roles r
CROSS JOIN permissions p
WHERE r.role_name IN ('team_member', 'stakeholder', 'viewer')
  AND p.permission_code IN (
    'template_library.read',
    'template_copy.read', 'template_copy.export', 'template_copy.view_history'
  )
ON CONFLICT (role_id, permission_id) DO UPDATE SET
  is_active = TRUE,
  updated_at = NOW();

-- ============================================================================
-- database_tables registry
-- ============================================================================
INSERT INTO database_tables (table_name, table_description, schema_name, is_system_table, is_active, table_category)
VALUES
  ('template_categories', 'Lookup categories for template library (sim schema mirrors same physical name)', 'public', FALSE, TRUE, 'templates'),
  ('template_library', 'PMO-managed master templates (sim.template_library for Simulator)', 'public', FALSE, TRUE, 'templates'),
  ('template_library_versions', 'Version snapshots for master templates', 'public', TRUE, TRUE, 'templates'),
  ('project_template_copies', 'Project-specific tailored template copies (sim: FK to simulation_runs)', 'public', FALSE, TRUE, 'templates'),
  ('template_copy_versions', 'Version snapshots for project template copies', 'public', TRUE, TRUE, 'templates'),
  ('template_update_notifications', 'Notifications when master templates change', 'public', TRUE, TRUE, 'templates')
ON CONFLICT (table_name) DO UPDATE SET
  table_description = EXCLUDED.table_description,
  schema_name = EXCLUDED.schema_name,
  is_system_table = EXCLUDED.is_system_table,
  updated_at = NOW();

-- ---------------------------------------------------------------------------
-- Seed: template categories (Platform + Sim)
-- ---------------------------------------------------------------------------
INSERT INTO public.template_categories (category_code, category_name, description, sort_order, is_active)
VALUES
  ('initiation', 'Initiation', 'Mandate, brief, business case', 10, TRUE),
  ('planning', 'Planning', 'Benefits, communications, stakeholders', 20, TRUE),
  ('control', 'Control', 'Risk, issues, quality, change, configuration', 30, TRUE),
  ('delivery', 'Delivery', 'Work packages, checkpoints, highlights, lessons', 40, TRUE),
  ('closure', 'Closure', 'Lessons learned, highlight reports', 50, TRUE),
  ('testing', 'Testing', 'Test planning', 60, TRUE),
  ('generic', 'Generic', 'Custom / generic templates', 70, TRUE)
ON CONFLICT (category_code) DO UPDATE SET
  category_name = EXCLUDED.category_name,
  description = EXCLUDED.description,
  sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

INSERT INTO sim.template_categories (category_code, category_name, description, sort_order, is_active)
VALUES
  ('initiation', 'Initiation', 'Mandate, brief, business case', 10, TRUE),
  ('planning', 'Planning', 'Benefits, communications, stakeholders', 20, TRUE),
  ('control', 'Control', 'Risk, issues, quality, change, configuration', 30, TRUE),
  ('delivery', 'Delivery', 'Work packages, checkpoints, highlights, lessons', 40, TRUE),
  ('closure', 'Closure', 'Lessons learned, highlight reports', 50, TRUE),
  ('testing', 'Testing', 'Test planning', 60, TRUE),
  ('generic', 'Generic', 'Custom / generic templates', 70, TRUE)
ON CONFLICT (category_code) DO UPDATE SET
  category_name = EXCLUDED.category_name,
  description = EXCLUDED.description,
  sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

DO $$
BEGIN
  RAISE NOTICE 'v406_template_library_tables.sql applied';
END $$;
