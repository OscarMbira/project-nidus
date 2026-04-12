-- ============================================================================
-- v448: Simulator — auto-link delays (sim schema)
-- Prerequisites: v445, v447 patterns; sim.practice_issues, sim.practice_risks, sim.practice_defects
-- ============================================================================

CREATE OR REPLACE FUNCTION sim.map_auth_user_to_platform_user(p_auth UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT id FROM public.users WHERE auth_user_id = p_auth LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION sim.apply_auto_delay_from_practice_issue_row(p_issue_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, sim
SET row_security = off
AS $$
DECLARE
  rec sim.practice_issues%ROWTYPE;
  v_delay_id UUID;
  v_days INTEGER;
  v_lbl TEXT;
  v_owner UUID;
  v_prev_owner UUID;
  v_overdue_unresolved BOOLEAN;
  v_resolved BOOLEAN;
BEGIN
  SELECT * INTO rec FROM sim.practice_issues WHERE id = p_issue_id;
  IF NOT FOUND OR COALESCE(rec.is_deleted, FALSE) THEN
    RETURN;
  END IF;

  v_resolved := lower(rec.status) IN ('resolved', 'closed', 'cancelled');
  v_overdue_unresolved := rec.due_date IS NOT NULL
    AND rec.due_date < CURRENT_DATE
    AND lower(rec.status) IN ('new', 'assigned', 'in_progress', 'reopened');

  v_owner := sim.map_auth_user_to_platform_user(rec.assigned_to_user_id);
  v_lbl := COALESCE(NULLIF(trim(rec.issue_identifier), ''), NULLIF(trim(rec.issue_code), ''), 'ISS');
  v_days := CASE WHEN rec.due_date IS NOT NULL THEN (CURRENT_DATE - rec.due_date)::INTEGER ELSE 0 END;

  SELECT id, resolution_owner_id INTO v_delay_id, v_prev_owner
  FROM sim.project_delays
  WHERE practice_project_id = rec.practice_project_id
    AND source_type = 'auto_issue'
    AND linked_issue_id = rec.id
    AND COALESCE(is_deleted, FALSE) = FALSE
  LIMIT 1;

  IF v_overdue_unresolved THEN
    IF v_delay_id IS NULL THEN
      INSERT INTO sim.project_delays (
        practice_project_id,
        title,
        description,
        delay_category,
        severity,
        status,
        identified_date,
        impact_schedule_days,
        source_type,
        is_auto_linked,
        auto_link_notes,
        linked_issue_id,
        resolution_owner_id,
        created_by,
        is_draft
      ) VALUES (
        rec.practice_project_id,
        '[AUTO] Issue ' || v_lbl || ' overdue by ' || GREATEST(v_days, 1) || ' day(s)',
        'Automatically linked because practice issue ' || v_lbl || ' is past due date and still unresolved.',
        'other',
        'medium',
        'identified',
        CURRENT_DATE,
        GREATEST(v_days, 1),
        'auto_issue',
        TRUE,
        'Issue ' || v_lbl || ' due ' || COALESCE(rec.due_date::text, '') || ', status ' || rec.status,
        rec.id,
        v_owner,
        NULL,
        FALSE
      );
    ELSE
      UPDATE sim.project_delays pd
      SET
        impact_schedule_days = GREATEST(v_days, 1),
        auto_link_notes = 'Issue ' || v_lbl || ' due ' || COALESCE(rec.due_date::text, '') || ', status ' || rec.status,
        updated_at = NOW()
      WHERE pd.id = v_delay_id;

      IF v_owner IS NOT NULL AND v_prev_owner IS DISTINCT FROM v_owner THEN
        PERFORM set_config('app.suppress_delay_owner_audit', '1', true);
        UPDATE sim.project_delays SET resolution_owner_id = v_owner, updated_at = NOW() WHERE id = v_delay_id;
        PERFORM set_config('app.suppress_delay_owner_audit', '', true);
        INSERT INTO sim.project_delay_owner_history (
          delay_id, practice_project_id, previous_owner_id, new_owner_id, changed_by_id,
          change_reason, source_event, delay_status_at_change
        )
        SELECT
          v_delay_id,
          rec.practice_project_id,
          v_prev_owner,
          v_owner,
          NULL,
          'Synced from issue assignee',
          'auto_link_owner_sync_issue',
          pd.status
        FROM sim.project_delays pd WHERE pd.id = v_delay_id;
      END IF;
    END IF;
  ELSIF v_resolved AND v_delay_id IS NOT NULL THEN
    UPDATE sim.project_delays
    SET
      status = 'resolved',
      resolved_date = COALESCE(rec.resolved_at::date, rec.closed_at::date, CURRENT_DATE),
      updated_at = NOW()
    WHERE id = v_delay_id;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION sim.trg_sim_issue_auto_delay_fn()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, sim
SET row_security = off
AS $$
BEGIN
  PERFORM sim.apply_auto_delay_from_practice_issue_row(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sim_issue_auto_delay ON sim.practice_issues;
CREATE TRIGGER trg_sim_issue_auto_delay
  AFTER INSERT OR UPDATE OF due_date, status, assigned_to_user_id
  ON sim.practice_issues
  FOR EACH ROW
  EXECUTE FUNCTION sim.trg_sim_issue_auto_delay_fn();

CREATE OR REPLACE FUNCTION sim.apply_auto_delay_from_practice_risk_row(p_risk_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, sim
SET row_security = off
AS $$
DECLARE
  rec sim.practice_risks%ROWTYPE;
  v_delay_id UUID;
  v_days INTEGER;
  v_lbl TEXT;
  v_owner UUID;
  v_prev_owner UUID;
  v_overdue_unresolved BOOLEAN;
  v_resolved BOOLEAN;
  v_sev TEXT;
BEGIN
  SELECT * INTO rec FROM sim.practice_risks WHERE id = p_risk_id;
  IF NOT FOUND OR COALESCE(rec.is_deleted, FALSE) THEN
    RETURN;
  END IF;

  v_resolved := lower(rec.status) IN ('mitigated', 'closed', 'realized');
  v_overdue_unresolved := rec.target_mitigation_date IS NOT NULL
    AND rec.target_mitigation_date < CURRENT_DATE
    AND lower(rec.status) IN ('identified', 'assessed', 'monitored');

  v_owner := sim.map_auth_user_to_platform_user(rec.risk_owner_user_id);
  v_lbl := COALESCE(NULLIF(trim(rec.risk_code), ''), 'RSK');
  v_days := CASE WHEN rec.target_mitigation_date IS NOT NULL
    THEN (CURRENT_DATE - rec.target_mitigation_date)::INTEGER ELSE 0 END;
  v_sev := CASE lower(COALESCE(rec.risk_level, 'medium'))
    WHEN 'critical' THEN 'critical'
    WHEN 'high' THEN 'high'
    WHEN 'low' THEN 'low'
    ELSE 'medium'
  END;

  SELECT id, resolution_owner_id INTO v_delay_id, v_prev_owner
  FROM sim.project_delays
  WHERE practice_project_id = rec.practice_project_id
    AND source_type = 'auto_risk'
    AND linked_risk_id = rec.id
    AND COALESCE(is_deleted, FALSE) = FALSE
  LIMIT 1;

  IF v_overdue_unresolved THEN
    IF v_delay_id IS NULL THEN
      INSERT INTO sim.project_delays (
        practice_project_id,
        title,
        description,
        delay_category,
        severity,
        status,
        identified_date,
        impact_schedule_days,
        source_type,
        is_auto_linked,
        auto_link_notes,
        linked_risk_id,
        resolution_owner_id,
        created_by,
        is_draft
      ) VALUES (
        rec.practice_project_id,
        '[AUTO] Risk ' || v_lbl || ' overdue by ' || GREATEST(v_days, 1) || ' day(s)',
        'Automatically linked because practice risk ' || v_lbl || ' is past target mitigation date.',
        'risk_materialised',
        v_sev,
        'identified',
        CURRENT_DATE,
        GREATEST(v_days, 1),
        'auto_risk',
        TRUE,
        'Risk ' || v_lbl || ' target ' || COALESCE(rec.target_mitigation_date::text, '') || ', status ' || rec.status,
        rec.id,
        v_owner,
        NULL,
        FALSE
      );
    ELSE
      UPDATE sim.project_delays pd
      SET
        impact_schedule_days = GREATEST(v_days, 1),
        auto_link_notes = 'Risk ' || v_lbl || ' target ' || COALESCE(rec.target_mitigation_date::text, '') || ', status ' || rec.status,
        updated_at = NOW()
      WHERE pd.id = v_delay_id;

      IF v_owner IS NOT NULL AND v_prev_owner IS DISTINCT FROM v_owner THEN
        PERFORM set_config('app.suppress_delay_owner_audit', '1', true);
        UPDATE sim.project_delays SET resolution_owner_id = v_owner, updated_at = NOW() WHERE id = v_delay_id;
        PERFORM set_config('app.suppress_delay_owner_audit', '', true);
        INSERT INTO sim.project_delay_owner_history (
          delay_id, practice_project_id, previous_owner_id, new_owner_id, changed_by_id,
          change_reason, source_event, delay_status_at_change
        )
        SELECT
          v_delay_id,
          rec.practice_project_id,
          v_prev_owner,
          v_owner,
          NULL,
          'Synced from risk owner',
          'auto_link_owner_sync_risk',
          pd.status
        FROM sim.project_delays pd WHERE pd.id = v_delay_id;
      END IF;
    END IF;
  ELSIF v_resolved AND v_delay_id IS NOT NULL THEN
    UPDATE sim.project_delays
    SET
      status = 'resolved',
      resolved_date = COALESCE(rec.closed_date, CURRENT_DATE),
      updated_at = NOW()
    WHERE id = v_delay_id;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION sim.trg_sim_risk_auto_delay_fn()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, sim
SET row_security = off
AS $$
BEGIN
  PERFORM sim.apply_auto_delay_from_practice_risk_row(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sim_risk_auto_delay ON sim.practice_risks;
CREATE TRIGGER trg_sim_risk_auto_delay
  AFTER INSERT OR UPDATE OF target_mitigation_date, status, risk_owner_user_id
  ON sim.practice_risks
  FOR EACH ROW
  EXECUTE FUNCTION sim.trg_sim_risk_auto_delay_fn();

CREATE OR REPLACE FUNCTION sim.apply_auto_delay_from_practice_defect_row(p_defect_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, sim
SET row_security = off
AS $$
DECLARE
  rec sim.practice_defects%ROWTYPE;
  v_delay_id UUID;
  v_days INTEGER;
  v_lbl TEXT;
  v_owner UUID;
  v_prev_owner UUID;
  v_overdue_unresolved BOOLEAN;
  v_resolved BOOLEAN;
  v_sev TEXT;
BEGIN
  SELECT * INTO rec FROM sim.practice_defects WHERE id = p_defect_id;
  IF NOT FOUND OR COALESCE(rec.is_deleted, FALSE) THEN
    RETURN;
  END IF;

  v_resolved := lower(rec.status) IN ('resolved', 'closed', 'duplicate');
  v_overdue_unresolved := rec.due_date IS NOT NULL
    AND rec.due_date < CURRENT_DATE
    AND lower(rec.status) IN ('new', 'open', 'in_progress', 'reopened', 'deferred');

  v_owner := rec.assigned_to;
  v_lbl := COALESCE(NULLIF(trim(rec.defect_ref), ''), 'DEF');
  v_days := CASE WHEN rec.due_date IS NOT NULL THEN (CURRENT_DATE - rec.due_date)::INTEGER ELSE 0 END;
  v_sev := CASE lower(COALESCE(rec.severity, 'medium'))
    WHEN 'trivial' THEN 'low'
    WHEN 'critical' THEN 'critical'
    WHEN 'high' THEN 'high'
    WHEN 'low' THEN 'low'
    ELSE 'medium'
  END;

  SELECT id, resolution_owner_id INTO v_delay_id, v_prev_owner
  FROM sim.project_delays
  WHERE practice_project_id = rec.practice_project_id
    AND source_type = 'auto_defect'
    AND linked_defect_id = rec.id
    AND COALESCE(is_deleted, FALSE) = FALSE
  LIMIT 1;

  IF v_overdue_unresolved THEN
    IF v_delay_id IS NULL THEN
      INSERT INTO sim.project_delays (
        practice_project_id,
        title,
        description,
        delay_category,
        severity,
        status,
        identified_date,
        impact_schedule_days,
        source_type,
        is_auto_linked,
        auto_link_notes,
        linked_defect_id,
        resolution_owner_id,
        created_by,
        is_draft
      ) VALUES (
        rec.practice_project_id,
        '[AUTO] Defect ' || v_lbl || ' overdue by ' || GREATEST(v_days, 1) || ' day(s)',
        'Automatically linked because practice defect ' || v_lbl || ' is past due date.',
        'technical',
        v_sev,
        'identified',
        CURRENT_DATE,
        GREATEST(v_days, 1),
        'auto_defect',
        TRUE,
        'Defect ' || v_lbl || ' due ' || COALESCE(rec.due_date::text, '') || ', status ' || rec.status,
        rec.id,
        v_owner,
        NULL,
        FALSE
      );
    ELSE
      UPDATE sim.project_delays pd
      SET
        impact_schedule_days = GREATEST(v_days, 1),
        auto_link_notes = 'Defect ' || v_lbl || ' due ' || COALESCE(rec.due_date::text, '') || ', status ' || rec.status,
        updated_at = NOW()
      WHERE pd.id = v_delay_id;

      IF v_owner IS NOT NULL AND v_prev_owner IS DISTINCT FROM v_owner THEN
        PERFORM set_config('app.suppress_delay_owner_audit', '1', true);
        UPDATE sim.project_delays SET resolution_owner_id = v_owner, updated_at = NOW() WHERE id = v_delay_id;
        PERFORM set_config('app.suppress_delay_owner_audit', '', true);
        INSERT INTO sim.project_delay_owner_history (
          delay_id, practice_project_id, previous_owner_id, new_owner_id, changed_by_id,
          change_reason, source_event, delay_status_at_change
        )
        SELECT
          v_delay_id,
          rec.practice_project_id,
          v_prev_owner,
          v_owner,
          NULL,
          'Synced from defect assignee',
          'auto_link_owner_sync_defect',
          pd.status
        FROM sim.project_delays pd WHERE pd.id = v_delay_id;
      END IF;
    END IF;
  ELSIF v_resolved AND v_delay_id IS NOT NULL THEN
    UPDATE sim.project_delays
    SET
      status = 'resolved',
      resolved_date = COALESCE(rec.resolved_at::date, CURRENT_DATE),
      updated_at = NOW()
    WHERE id = v_delay_id;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION sim.trg_sim_defect_auto_delay_fn()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, sim
SET row_security = off
AS $$
BEGIN
  PERFORM sim.apply_auto_delay_from_practice_defect_row(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sim_defect_auto_delay ON sim.practice_defects;
CREATE TRIGGER trg_sim_defect_auto_delay
  AFTER INSERT OR UPDATE OF due_date, status, assigned_to
  ON sim.practice_defects
  FOR EACH ROW
  EXECUTE FUNCTION sim.trg_sim_defect_auto_delay_fn();

CREATE OR REPLACE FUNCTION sim.sync_overdue_delays(p_practice_project_id UUID DEFAULT NULL)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, sim
SET row_security = off
AS $$
DECLARE
  n INTEGER := 0;
  r RECORD;
BEGIN
  FOR r IN
    SELECT id FROM sim.practice_issues
    WHERE COALESCE(is_deleted, FALSE) = FALSE
      AND (p_practice_project_id IS NULL OR practice_project_id = p_practice_project_id)
  LOOP
    PERFORM sim.apply_auto_delay_from_practice_issue_row(r.id);
    n := n + 1;
  END LOOP;

  FOR r IN
    SELECT id FROM sim.practice_risks
    WHERE COALESCE(is_deleted, FALSE) = FALSE
      AND (p_practice_project_id IS NULL OR practice_project_id = p_practice_project_id)
  LOOP
    PERFORM sim.apply_auto_delay_from_practice_risk_row(r.id);
    n := n + 1;
  END LOOP;

  FOR r IN
    SELECT id FROM sim.practice_defects
    WHERE COALESCE(is_deleted, FALSE) = FALSE
      AND (p_practice_project_id IS NULL OR practice_project_id = p_practice_project_id)
  LOOP
    PERFORM sim.apply_auto_delay_from_practice_defect_row(r.id);
    n := n + 1;
  END LOOP;

  RETURN n;
END;
$$;

GRANT EXECUTE ON FUNCTION sim.sync_overdue_delays(UUID) TO authenticated;
