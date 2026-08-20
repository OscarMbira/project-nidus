-- =============================================================================
-- v836: Repair governance seed visibility (RMS / QMS / CMS)
-- Plan: projectplan/v838_governance_documents_project_memberships_rls_plan.md
--
-- Why: v834 used ON CONFLICT DO NOTHING. Soft-deleted or stub rows for a
-- project_id cause the seed to skip, so the UI stays empty after v835 RLS.
-- This UPSERTs: insert if missing, otherwise undelete + refresh status.
-- Inserts rms/qms/cms_reference as '' so the AFTER INSERT admin display-ID
-- trigger assigns sequential IDs. On conflict, keeps any existing non-empty
-- reference (do not overwrite a good Admin ID with a blank). Hex-style seed
-- refs are repaired by v838.
--
-- Apply after: v834 + v835.
-- Syntax note: one DO block per table (no nested BEGIN/EXCEPTION) so the
-- Supabase SQL Editor parses cleanly.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1) Risk Management Strategies
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  proj RECORD;
  seed_user_id UUID;
BEGIN
  FOR proj IN
    SELECT id, project_name FROM projects WHERE is_deleted = FALSE
  LOOP
    SELECT COALESCE(
      p.project_manager_user_id,
      p.owner_user_id,
      (SELECT up.user_id FROM user_projects up
         WHERE up.project_id = proj.id AND up.is_deleted = FALSE
         ORDER BY CASE up.access_level WHEN 'owner' THEN 1 WHEN 'admin' THEN 2 ELSE 3 END
         LIMIT 1),
      (SELECT pm.user_id FROM project_memberships pm
         WHERE pm.project_id = proj.id AND pm.is_active = TRUE
         LIMIT 1),
      (SELECT u.id FROM users u WHERE u.is_active = TRUE AND u.is_deleted = FALSE LIMIT 1)
    )
    INTO seed_user_id
    FROM projects p
    WHERE p.id = proj.id;

    IF seed_user_id IS NULL THEN
      CONTINUE;
    END IF;

    INSERT INTO risk_management_strategies (
      project_id, rms_reference, author_id, owner_id, purpose, objectives, scope,
      risk_identification_approach, risk_assessment_approach, risk_response_approach,
      risk_monitoring_approach, status, approved_date, approved_by, created_by
    )
    VALUES (
      proj.id,
      '', -- filled by trg_risk_management_strategies_admin_display_id (v756b)
      seed_user_id, seed_user_id,
      'Defines how risks are identified, assessed and controlled for ' || proj.project_name || '.',
      'Identify, assess and respond to risk in a timely, proportionate way so that threats are minimised and opportunities are captured across the life of ' || proj.project_name || '.',
      'Covers all risk management activity for ' || proj.project_name || ', from identification through to closure, at project and stage level.',
      'Risks are identified via workshops, checklists and reviews at each stage boundary and logged in the Risk Register.',
      'Risks are assessed for probability and impact using the project''s standard 1-5 scale and prioritised on the risk matrix.',
      'Responses are selected from avoid, reduce, transfer, accept and share, with owners and actions tracked to closure.',
      'Risk status is reviewed at each checkpoint and highlight report, with escalation to the Project Board on tolerance breach.',
      'approved', CURRENT_DATE - 10, seed_user_id, seed_user_id
    )
    ON CONFLICT (project_id) DO UPDATE SET
      is_deleted = FALSE,
      deleted_at = NULL,
      deleted_by = NULL,
      rms_reference = COALESCE(
        NULLIF(risk_management_strategies.rms_reference, ''),
        EXCLUDED.rms_reference
      ),
      status = CASE
        WHEN risk_management_strategies.status IS NULL OR risk_management_strategies.status = ''
        THEN 'approved'
        ELSE risk_management_strategies.status
      END,
      updated_at = NOW();
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- 2) Quality Management Strategies
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  proj RECORD;
  seed_user_id UUID;
BEGIN
  FOR proj IN
    SELECT id, project_name FROM projects WHERE is_deleted = FALSE
  LOOP
    SELECT COALESCE(
      p.project_manager_user_id,
      p.owner_user_id,
      (SELECT up.user_id FROM user_projects up
         WHERE up.project_id = proj.id AND up.is_deleted = FALSE
         ORDER BY CASE up.access_level WHEN 'owner' THEN 1 WHEN 'admin' THEN 2 ELSE 3 END
         LIMIT 1),
      (SELECT pm.user_id FROM project_memberships pm
         WHERE pm.project_id = proj.id AND pm.is_active = TRUE
         LIMIT 1),
      (SELECT u.id FROM users u WHERE u.is_active = TRUE AND u.is_deleted = FALSE LIMIT 1)
    )
    INTO seed_user_id
    FROM projects p
    WHERE p.id = proj.id;

    IF seed_user_id IS NULL THEN
      CONTINUE;
    END IF;

    INSERT INTO quality_management_strategies (
      project_id, qms_reference, author_id, owner_id, purpose, objectives, scope,
      quality_planning_approach, quality_control_approach, quality_assurance_approach,
      status, approved_date, approved_by, created_by
    )
    VALUES (
      proj.id,
      '', -- filled by trg_quality_management_strategies_admin_display_id (v756b)
      seed_user_id, seed_user_id,
      'To define how the required quality of ' || proj.project_name || '''s products will be achieved.',
      'Ensure every product meets its agreed acceptance criteria and quality expectations, with defects caught before handover.',
      'Covers quality planning, control and assurance for all major products of ' || proj.project_name || '.',
      'Quality criteria and methods are defined per product in the Quality Register during planning.',
      'Products are checked against acceptance criteria via reviews and testing before being marked complete, recorded in the Quality Register.',
      'Independent quality assurance reviews are carried out at stage boundaries to confirm the quality approach itself is being followed.',
      'approved', CURRENT_DATE - 10, seed_user_id, seed_user_id
    )
    ON CONFLICT (project_id) DO UPDATE SET
      is_deleted = FALSE,
      deleted_at = NULL,
      deleted_by = NULL,
      qms_reference = COALESCE(
        NULLIF(quality_management_strategies.qms_reference, ''),
        EXCLUDED.qms_reference
      ),
      updated_at = NOW();
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- 3) Communication Management Strategies
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  proj RECORD;
  seed_user_id UUID;
BEGIN
  FOR proj IN
    SELECT id, project_name FROM projects WHERE is_deleted = FALSE
  LOOP
    SELECT COALESCE(
      p.project_manager_user_id,
      p.owner_user_id,
      (SELECT up.user_id FROM user_projects up
         WHERE up.project_id = proj.id AND up.is_deleted = FALSE
         ORDER BY CASE up.access_level WHEN 'owner' THEN 1 WHEN 'admin' THEN 2 ELSE 3 END
         LIMIT 1),
      (SELECT pm.user_id FROM project_memberships pm
         WHERE pm.project_id = proj.id AND pm.is_active = TRUE
         LIMIT 1),
      (SELECT u.id FROM users u WHERE u.is_active = TRUE AND u.is_deleted = FALSE LIMIT 1)
    )
    INTO seed_user_id
    FROM projects p
    WHERE p.id = proj.id;

    IF seed_user_id IS NULL THEN
      CONTINUE;
    END IF;

    INSERT INTO communication_management_strategies (
      project_id, cms_reference, author_id, owner_id, purpose, objectives, scope,
      communication_planning_approach, communication_control_approach, communication_assurance_approach,
      status, approved_date, approved_by, created_by
    )
    VALUES (
      proj.id,
      '', -- filled by trg_communication_management_strategies_admin_display_id (v756b)
      seed_user_id, seed_user_id,
      'To define how information will be communicated to and from stakeholders throughout ' || proj.project_name || '.',
      'Keep stakeholders informed at the right frequency and level of detail to support timely decisions.',
      'Covers all planned communication between the project and its stakeholders for ' || proj.project_name || '.',
      'Stakeholder communication needs are captured during Starting Up and reviewed at each stage boundary.',
      'Reports and updates are issued on the schedule agreed with each stakeholder group and tracked for delivery.',
      'Communication effectiveness is reviewed at checkpoints, with the approach adjusted if stakeholders report gaps.',
      'approved', CURRENT_DATE - 10, seed_user_id, seed_user_id
    )
    ON CONFLICT (project_id) DO UPDATE SET
      is_deleted = FALSE,
      deleted_at = NULL,
      deleted_by = NULL,
      cms_reference = COALESCE(
        NULLIF(communication_management_strategies.cms_reference, ''),
        EXCLUDED.cms_reference
      ),
      updated_at = NOW();
  END LOOP;
END $$;

-- Visibility check (Results grid)
SELECT
  'risk_management_strategies' AS table_name,
  COUNT(*) FILTER (WHERE is_deleted = FALSE) AS active_rows,
  COUNT(*) FILTER (WHERE is_deleted = TRUE) AS deleted_rows
FROM risk_management_strategies
UNION ALL
SELECT
  'quality_management_strategies',
  COUNT(*) FILTER (WHERE is_deleted = FALSE),
  COUNT(*) FILTER (WHERE is_deleted = TRUE)
FROM quality_management_strategies
UNION ALL
SELECT
  'communication_management_strategies',
  COUNT(*) FILTER (WHERE is_deleted = FALSE),
  COUNT(*) FILTER (WHERE is_deleted = TRUE)
FROM communication_management_strategies;
