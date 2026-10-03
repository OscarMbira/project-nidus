-- =============================================================================
-- v1082: Team / team-member change history (append-only)
-- Platform: public.teams + public.team_members
-- Simulator: sim.practice_teams + sim.practice_team_members
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Helper: change reason pending row (UI requires non-empty reason for all roles)
-- Persisted per auth user so it survives separate PostgREST HTTP calls in one save.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.team_change_reason_pending (
  auth_user_id UUID PRIMARY KEY,
  reason TEXT,
  set_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.team_change_reason_pending ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS team_change_reason_pending_own ON public.team_change_reason_pending;
CREATE POLICY team_change_reason_pending_own ON public.team_change_reason_pending
  FOR ALL TO authenticated
  USING (auth_user_id = auth.uid())
  WITH CHECK (auth_user_id = auth.uid());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.team_change_reason_pending TO authenticated;

CREATE OR REPLACE FUNCTION public.set_team_change_reason(p_reason text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;
  INSERT INTO public.team_change_reason_pending (auth_user_id, reason, set_at)
  VALUES (auth.uid(), NULLIF(btrim(coalesce(p_reason, '')), ''), NOW())
  ON CONFLICT (auth_user_id) DO UPDATE
    SET reason = EXCLUDED.reason,
        set_at = NOW();
END;
$$;

COMMENT ON FUNCTION public.set_team_change_reason(text) IS
  'v1082: stash team change reason for the current auth user (UI requires it; read by history triggers).';

GRANT EXECUTE ON FUNCTION public.set_team_change_reason(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.clear_team_change_reason()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
BEGIN
  DELETE FROM public.team_change_reason_pending WHERE auth_user_id = auth.uid();
END;
$$;

GRANT EXECUTE ON FUNCTION public.clear_team_change_reason() TO authenticated;

CREATE OR REPLACE FUNCTION sim.set_team_change_reason(p_reason text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = sim, public
SET row_security = off
AS $$
BEGIN
  -- Reuse public pending table so one stash works across schemas in the same session/user.
  PERFORM public.set_team_change_reason(p_reason);
END;
$$;

GRANT EXECUTE ON FUNCTION sim.set_team_change_reason(text) TO authenticated;

CREATE OR REPLACE FUNCTION sim.clear_team_change_reason()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = sim, public
SET row_security = off
AS $$
BEGIN
  PERFORM public.clear_team_change_reason();
END;
$$;

GRANT EXECUTE ON FUNCTION sim.clear_team_change_reason() TO authenticated;

-- ---------------------------------------------------------------------------
-- public.team_change_history
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.team_change_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('team', 'team_member')),
  team_member_id UUID REFERENCES public.team_members(id) ON DELETE SET NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'created', 'updated', 'removed', 'lead_changed', 'reactivated'
  )),
  changes JSONB NOT NULL DEFAULT '[]'::jsonb,
  change_reason TEXT,
  changed_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source_event TEXT NOT NULL DEFAULT 'manual_edit'
);

CREATE INDEX IF NOT EXISTS idx_team_change_history_team
  ON public.team_change_history (team_id, changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_team_change_history_project
  ON public.team_change_history (project_id, changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_team_change_history_member
  ON public.team_change_history (team_member_id, changed_at DESC)
  WHERE team_member_id IS NOT NULL;

COMMENT ON TABLE public.team_change_history IS
  'v1082: Append-only history of team and team-member field changes.';

ALTER TABLE public.team_change_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS team_change_history_select ON public.team_change_history;
CREATE POLICY team_change_history_select ON public.team_change_history
  FOR SELECT TO authenticated
  USING (public.auth_user_can_access_project(project_id));

-- No INSERT/UPDATE/DELETE for authenticated — triggers (SECURITY DEFINER) write rows.
GRANT SELECT ON public.team_change_history TO authenticated;

-- ---------------------------------------------------------------------------
-- Trigger helpers (public)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public._team_change_history_actor()
RETURNS UUID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_id UUID;
BEGIN
  SELECT id INTO v_id FROM public.users WHERE auth_user_id = auth.uid() LIMIT 1;
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public._team_change_history_reason()
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_reason TEXT;
BEGIN
  SELECT p.reason INTO v_reason
  FROM public.team_change_reason_pending p
  WHERE p.auth_user_id = auth.uid()
    AND p.set_at > NOW() - INTERVAL '15 minutes';
  RETURN NULLIF(btrim(coalesce(v_reason, '')), '');
END;
$$;

CREATE OR REPLACE FUNCTION sim._team_change_history_reason()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT public._team_change_history_reason();
$$;

CREATE OR REPLACE FUNCTION public._team_change_json_push(
  p_arr jsonb,
  p_field text,
  p_old text,
  p_new text
)
RETURNS jsonb
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN p_old IS NOT DISTINCT FROM p_new THEN p_arr
    ELSE p_arr || jsonb_build_array(jsonb_build_object(
      'field', p_field,
      'old_value', to_jsonb(p_old),
      'new_value', to_jsonb(p_new)
    ))
  END;
$$;

CREATE OR REPLACE FUNCTION public.trg_team_members_change_history()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_changes jsonb := '[]'::jsonb;
  v_project UUID;
  v_event text;
  v_reason text;
  v_actor UUID;
BEGIN
  SELECT t.project_id INTO v_project FROM public.teams t WHERE t.id = COALESCE(NEW.team_id, OLD.team_id);
  IF v_project IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  v_reason := public._team_change_history_reason();
  v_actor := public._team_change_history_actor();

  IF TG_OP = 'INSERT' THEN
    v_changes := public._team_change_json_push(v_changes, 'user_id', NULL, NEW.user_id::text);
    v_changes := public._team_change_json_push(v_changes, 'member_role', NULL, NEW.member_role);
    v_changes := public._team_change_json_push(
      v_changes, 'allocation_percentage', NULL, NEW.allocation_percentage::text
    );
    v_changes := public._team_change_json_push(
      v_changes, 'allocation_start_date', NULL, NEW.allocation_start_date::text
    );
    v_changes := public._team_change_json_push(
      v_changes, 'allocation_end_date', NULL, NEW.allocation_end_date::text
    );
    v_changes := public._team_change_json_push(
      v_changes, 'required_skills', NULL, NEW.required_skills
    );
    v_changes := public._team_change_json_push(
      v_changes, 'is_active', NULL, NEW.is_active::text
    );

    INSERT INTO public.team_change_history (
      team_id, project_id, entity_type, team_member_id, user_id,
      event_type, changes, change_reason, changed_by, source_event
    ) VALUES (
      NEW.team_id, v_project, 'team_member', NEW.id, NEW.user_id,
      'created', v_changes, v_reason, v_actor, 'manual_edit'
    );
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    v_changes := public._team_change_json_push(
      v_changes, 'member_role', OLD.member_role, NEW.member_role
    );
    v_changes := public._team_change_json_push(
      v_changes, 'allocation_percentage',
      OLD.allocation_percentage::text, NEW.allocation_percentage::text
    );
    v_changes := public._team_change_json_push(
      v_changes, 'allocation_start_date',
      OLD.allocation_start_date::text, NEW.allocation_start_date::text
    );
    v_changes := public._team_change_json_push(
      v_changes, 'allocation_end_date',
      OLD.allocation_end_date::text, NEW.allocation_end_date::text
    );
    v_changes := public._team_change_json_push(
      v_changes, 'required_skills', OLD.required_skills, NEW.required_skills
    );
    v_changes := public._team_change_json_push(
      v_changes, 'is_active', OLD.is_active::text, NEW.is_active::text
    );
    v_changes := public._team_change_json_push(
      v_changes, 'is_deleted', OLD.is_deleted::text, NEW.is_deleted::text
    );

    IF jsonb_array_length(v_changes) = 0 THEN
      RETURN NEW;
    END IF;

    IF (NEW.is_deleted IS TRUE AND COALESCE(OLD.is_deleted, FALSE) IS FALSE)
       OR (NEW.is_active IS FALSE AND COALESCE(OLD.is_active, TRUE) IS TRUE) THEN
      v_event := 'removed';
    ELSIF (NEW.is_active IS TRUE AND COALESCE(OLD.is_active, FALSE) IS FALSE)
       OR (NEW.is_deleted IS FALSE AND COALESCE(OLD.is_deleted, TRUE) IS TRUE) THEN
      v_event := 'reactivated';
    ELSE
      v_event := 'updated';
    END IF;

    INSERT INTO public.team_change_history (
      team_id, project_id, entity_type, team_member_id, user_id,
      event_type, changes, change_reason, changed_by, source_event
    ) VALUES (
      NEW.team_id, v_project, 'team_member', NEW.id, NEW.user_id,
      v_event, v_changes, v_reason, v_actor, 'manual_edit'
    );
    RETURN NEW;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_team_members_change_history ON public.team_members;
CREATE TRIGGER trg_team_members_change_history
  AFTER INSERT OR UPDATE ON public.team_members
  FOR EACH ROW EXECUTE FUNCTION public.trg_team_members_change_history();

CREATE OR REPLACE FUNCTION public.trg_teams_change_history()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_changes jsonb := '[]'::jsonb;
  v_reason text;
  v_actor UUID;
  v_event text := 'updated';
BEGIN
  IF TG_OP <> 'UPDATE' THEN
    RETURN NEW;
  END IF;

  v_reason := public._team_change_history_reason();
  v_actor := public._team_change_history_actor();

  v_changes := public._team_change_json_push(
    v_changes, 'team_name', OLD.team_name, NEW.team_name
  );
  v_changes := public._team_change_json_push(
    v_changes, 'team_type', OLD.team_type, NEW.team_type
  );
  v_changes := public._team_change_json_push(
    v_changes, 'max_team_size', OLD.max_team_size::text, NEW.max_team_size::text
  );
  v_changes := public._team_change_json_push(
    v_changes, 'is_active', OLD.is_active::text, NEW.is_active::text
  );
  v_changes := public._team_change_json_push(
    v_changes, 'team_lead_user_id',
    OLD.team_lead_user_id::text, NEW.team_lead_user_id::text
  );

  IF jsonb_array_length(v_changes) = 0 THEN
    RETURN NEW;
  END IF;

  IF OLD.team_lead_user_id IS DISTINCT FROM NEW.team_lead_user_id
     AND jsonb_array_length(v_changes) = 1 THEN
    v_event := 'lead_changed';
  END IF;

  INSERT INTO public.team_change_history (
    team_id, project_id, entity_type, team_member_id, user_id,
    event_type, changes, change_reason, changed_by, source_event
  ) VALUES (
    NEW.id, NEW.project_id, 'team', NULL, NULL,
    v_event, v_changes, v_reason, v_actor, 'manual_edit'
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_teams_change_history ON public.teams;
CREATE TRIGGER trg_teams_change_history
  AFTER UPDATE ON public.teams
  FOR EACH ROW EXECUTE FUNCTION public.trg_teams_change_history();

-- ---------------------------------------------------------------------------
-- sim.team_change_history (practice teams)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sim.team_change_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES sim.practice_teams(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES sim.practice_projects(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('team', 'team_member')),
  team_member_id UUID REFERENCES sim.practice_team_members(id) ON DELETE SET NULL,
  user_id UUID,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'created', 'updated', 'removed', 'lead_changed', 'reactivated'
  )),
  changes JSONB NOT NULL DEFAULT '[]'::jsonb,
  change_reason TEXT,
  changed_by UUID,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source_event TEXT NOT NULL DEFAULT 'manual_edit'
);

CREATE INDEX IF NOT EXISTS idx_sim_team_change_history_team
  ON sim.team_change_history (team_id, changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_sim_team_change_history_project
  ON sim.team_change_history (project_id, changed_at DESC);

COMMENT ON TABLE sim.team_change_history IS
  'v1082: Append-only history for practice teams / practice team members.';

ALTER TABLE sim.team_change_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sim_team_change_history_select ON sim.team_change_history;
CREATE POLICY sim_team_change_history_select ON sim.team_change_history
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM sim.practice_teams pt
      WHERE pt.id = team_change_history.team_id
        AND pt.is_deleted = FALSE
        AND (
          pt.user_id = auth.uid()
          OR pt.created_by = auth.uid()
          OR pt.team_lead_user_id = auth.uid()
        )
    )
  );

GRANT SELECT ON sim.team_change_history TO authenticated;

CREATE OR REPLACE FUNCTION sim._team_change_history_reason()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT public._team_change_history_reason();
$$;

CREATE OR REPLACE FUNCTION sim.trg_practice_team_members_change_history()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = sim, public
SET row_security = off
AS $$
DECLARE
  v_changes jsonb := '[]'::jsonb;
  v_project UUID;
  v_event text;
  v_reason text;
BEGIN
  SELECT pt.practice_project_id INTO v_project
  FROM sim.practice_teams pt
  WHERE pt.id = COALESCE(NEW.practice_team_id, OLD.practice_team_id);

  IF v_project IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  v_reason := sim._team_change_history_reason();

  IF TG_OP = 'INSERT' THEN
    v_changes := public._team_change_json_push(v_changes, 'user_id', NULL, NEW.user_id::text);
    v_changes := public._team_change_json_push(v_changes, 'member_role', NULL, NEW.member_role);
    v_changes := public._team_change_json_push(
      v_changes, 'allocation_percentage', NULL, NEW.allocation_percentage::text
    );
    BEGIN
      v_changes := public._team_change_json_push(
        v_changes, 'allocation_start_date', NULL, NEW.allocation_start_date::text
      );
      v_changes := public._team_change_json_push(
        v_changes, 'allocation_end_date', NULL, NEW.allocation_end_date::text
      );
    EXCEPTION WHEN undefined_column THEN
      NULL;
    END;
    v_changes := public._team_change_json_push(
      v_changes, 'is_active', NULL, NEW.is_active::text
    );

    INSERT INTO sim.team_change_history (
      team_id, project_id, entity_type, team_member_id, user_id,
      event_type, changes, change_reason, changed_by, source_event
    ) VALUES (
      NEW.practice_team_id, v_project, 'team_member', NEW.id, NEW.user_id,
      'created', v_changes, v_reason, auth.uid(), 'manual_edit'
    );
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    v_changes := public._team_change_json_push(
      v_changes, 'member_role', OLD.member_role, NEW.member_role
    );
    v_changes := public._team_change_json_push(
      v_changes, 'allocation_percentage',
      OLD.allocation_percentage::text, NEW.allocation_percentage::text
    );
    BEGIN
      v_changes := public._team_change_json_push(
        v_changes, 'allocation_start_date',
        OLD.allocation_start_date::text, NEW.allocation_start_date::text
      );
      v_changes := public._team_change_json_push(
        v_changes, 'allocation_end_date',
        OLD.allocation_end_date::text, NEW.allocation_end_date::text
      );
    EXCEPTION WHEN undefined_column THEN
      NULL;
    END;
    v_changes := public._team_change_json_push(
      v_changes, 'is_active', OLD.is_active::text, NEW.is_active::text
    );

    IF jsonb_array_length(v_changes) = 0 THEN
      RETURN NEW;
    END IF;

    IF NEW.is_active IS FALSE AND COALESCE(OLD.is_active, TRUE) IS TRUE THEN
      v_event := 'removed';
    ELSIF NEW.is_active IS TRUE AND COALESCE(OLD.is_active, FALSE) IS FALSE THEN
      v_event := 'reactivated';
    ELSE
      v_event := 'updated';
    END IF;

    INSERT INTO sim.team_change_history (
      team_id, project_id, entity_type, team_member_id, user_id,
      event_type, changes, change_reason, changed_by, source_event
    ) VALUES (
      NEW.practice_team_id, v_project, 'team_member', NEW.id, NEW.user_id,
      v_event, v_changes, v_reason, auth.uid(), 'manual_edit'
    );
    RETURN NEW;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_practice_team_members_change_history ON sim.practice_team_members;
CREATE TRIGGER trg_practice_team_members_change_history
  AFTER INSERT OR UPDATE ON sim.practice_team_members
  FOR EACH ROW EXECUTE FUNCTION sim.trg_practice_team_members_change_history();

CREATE OR REPLACE FUNCTION sim.trg_practice_teams_change_history()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = sim, public
SET row_security = off
AS $$
DECLARE
  v_changes jsonb := '[]'::jsonb;
  v_reason text;
  v_event text := 'updated';
BEGIN
  IF TG_OP <> 'UPDATE' THEN
    RETURN NEW;
  END IF;

  v_reason := sim._team_change_history_reason();

  v_changes := public._team_change_json_push(
    v_changes, 'team_name', OLD.team_name, NEW.team_name
  );
  v_changes := public._team_change_json_push(
    v_changes, 'team_type', OLD.team_type, NEW.team_type
  );
  v_changes := public._team_change_json_push(
    v_changes, 'team_size', OLD.team_size::text, NEW.team_size::text
  );
  v_changes := public._team_change_json_push(
    v_changes, 'team_status', OLD.team_status, NEW.team_status
  );
  v_changes := public._team_change_json_push(
    v_changes, 'team_lead_user_id',
    OLD.team_lead_user_id::text, NEW.team_lead_user_id::text
  );

  IF jsonb_array_length(v_changes) = 0 THEN
    RETURN NEW;
  END IF;

  IF OLD.team_lead_user_id IS DISTINCT FROM NEW.team_lead_user_id
     AND jsonb_array_length(v_changes) = 1 THEN
    v_event := 'lead_changed';
  END IF;

  INSERT INTO sim.team_change_history (
    team_id, project_id, entity_type, team_member_id, user_id,
    event_type, changes, change_reason, changed_by, source_event
  ) VALUES (
    NEW.id, NEW.practice_project_id, 'team', NULL, NULL,
    v_event, v_changes, v_reason, auth.uid(), 'manual_edit'
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_practice_teams_change_history ON sim.practice_teams;
CREATE TRIGGER trg_practice_teams_change_history
  AFTER UPDATE ON sim.practice_teams
  FOR EACH ROW EXECUTE FUNCTION sim.trg_practice_teams_change_history();

-- ---------------------------------------------------------------------------
-- Registry
-- ---------------------------------------------------------------------------
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES
  ('team_change_history', 'Append-only history of team and team-member field changes', true, true, 'project'),
  ('sim.team_change_history', 'Append-only history for simulator practice teams', true, true, 'simulation')
ON CONFLICT (table_name) DO UPDATE SET
  table_description = EXCLUDED.table_description,
  is_system_table = EXCLUDED.is_system_table,
  table_category = EXCLUDED.table_category,
  updated_at = NOW();

DO $$
BEGIN
  RAISE NOTICE 'v1082_team_change_history.sql applied';
END $$;
