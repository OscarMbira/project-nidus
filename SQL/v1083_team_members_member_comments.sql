-- =============================================================================
-- v1083: team member comments (+ history tracking)
-- public.team_members.member_comments
-- sim.practice_team_members.member_comments
-- =============================================================================

ALTER TABLE public.team_members
  ADD COLUMN IF NOT EXISTS member_comments TEXT;

COMMENT ON COLUMN public.team_members.member_comments IS
  'v1083: Free-text comments about this member assignment on the team.';

ALTER TABLE sim.practice_team_members
  ADD COLUMN IF NOT EXISTS member_comments TEXT;

COMMENT ON COLUMN sim.practice_team_members.member_comments IS
  'v1083: Free-text comments about this practice team member assignment.';

-- Extend public history trigger to include member_comments
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
      v_changes, 'member_comments', NULL, NEW.member_comments
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
      v_changes, 'member_comments', OLD.member_comments, NEW.member_comments
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

-- Practice members history: include member_comments when column present
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
      v_changes, 'member_comments', NULL, NEW.member_comments
    );
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
      v_changes, 'member_comments', OLD.member_comments, NEW.member_comments
    );
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

DO $$
BEGIN
  RAISE NOTICE 'v1083_team_members_member_comments.sql applied';
END $$;
