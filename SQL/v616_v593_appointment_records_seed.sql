-- =============================================================================
-- v616_v593_appointment_records_seed.sql
-- Seed data for v593 Manager / Team Member appointment records + linked invitations
-- Plan: projectplan/v593_Manager_Appointment_Record_Plan.md
--
-- Idempotent: keyed by invitation_token (platform) and entity_name prefix (sim).
-- Uses existing public.users and SEED-PORT/PROG/PP entities (v305 / v334).
-- Does not create users or dummy emails.
--
-- Prerequisites:
--   v606–v608, v610–v613 (tables + RPCs)
--   v305 or v334 portfolio/programme/project seeds
--   v591 entity-scoped invitations
--   v594, v609 (sim invitations + manager appointments) for simulator section
-- =============================================================================

DO $$
DECLARE
  v_pmo_id           UUID;
  v_mgr_a            UUID;
  v_mgr_b            UUID;
  v_mgr_c            UUID;
  v_role_pm          UUID;
  v_role_prog        UUID;
  v_role_port        UUID;
  v_role_team        UUID;
  v_proj_id          UUID;
  v_prog_id          UUID;
  v_port_id          UUID;
  v_proj2_id         UUID;
  v_inv_id           UUID;
  v_appt_id          UUID;
  v_auth_uid         UUID;
BEGIN
  -- -------------------------------------------------------------------------
  -- Resolve users & roles
  -- -------------------------------------------------------------------------
  SELECT u.id INTO v_pmo_id
  FROM public.users u
  INNER JOIN public.user_roles ur ON ur.user_id = u.id AND COALESCE(ur.is_deleted, FALSE) = FALSE
  INNER JOIN public.roles r ON r.id = ur.role_id
    AND r.role_name IN ('pmo_admin', 'org_admin', 'system_admin')
  WHERE COALESCE(u.is_deleted, FALSE) = FALSE
  LIMIT 1;

  IF v_pmo_id IS NULL THEN
    SELECT u.id INTO v_pmo_id
    FROM public.users u
    WHERE COALESCE(u.is_deleted, FALSE) = FALSE
    ORDER BY u.created_at ASC NULLS LAST
    LIMIT 1;
  END IF;

  SELECT u.id INTO v_mgr_a
  FROM public.users u
  WHERE COALESCE(u.is_deleted, FALSE) = FALSE AND u.id IS DISTINCT FROM v_pmo_id
  ORDER BY u.created_at ASC NULLS LAST OFFSET 0 LIMIT 1;

  SELECT u.id INTO v_mgr_b
  FROM public.users u
  WHERE COALESCE(u.is_deleted, FALSE) = FALSE
    AND u.id IS DISTINCT FROM v_pmo_id AND u.id IS DISTINCT FROM v_mgr_a
  ORDER BY u.created_at ASC NULLS LAST OFFSET 0 LIMIT 1;

  SELECT u.id INTO v_mgr_c
  FROM public.users u
  WHERE COALESCE(u.is_deleted, FALSE) = FALSE
    AND u.id IS DISTINCT FROM v_pmo_id AND u.id IS DISTINCT FROM v_mgr_a AND u.id IS DISTINCT FROM v_mgr_b
  ORDER BY u.created_at ASC NULLS LAST OFFSET 0 LIMIT 1;

  IF v_mgr_b IS NULL THEN v_mgr_b := v_mgr_a; END IF;
  IF v_mgr_c IS NULL THEN v_mgr_c := v_mgr_a; END IF;

  SELECT id INTO v_role_pm FROM public.roles WHERE role_name = 'project_manager' AND COALESCE(is_deleted, FALSE) = FALSE LIMIT 1;
  SELECT id INTO v_role_prog FROM public.roles WHERE role_name IN ('programme_manager', 'pm_programme_manager') AND COALESCE(is_deleted, FALSE) = FALSE LIMIT 1;
  SELECT id INTO v_role_port FROM public.roles WHERE role_name = 'portfolio_manager' AND COALESCE(is_deleted, FALSE) = FALSE LIMIT 1;
  SELECT id INTO v_role_team FROM public.roles WHERE role_name IN ('team_member', 'pm_team_member', 'developer') AND COALESCE(is_deleted, FALSE) = FALSE LIMIT 1;

  IF v_pmo_id IS NULL OR v_role_pm IS NULL THEN
    RAISE NOTICE 'v616: Missing users or project_manager role — skipping platform appointment seed.';
    RETURN;
  END IF;

  -- -------------------------------------------------------------------------
  -- Resolve SEED entities (v334 preferred, else v305)
  -- -------------------------------------------------------------------------
  SELECT id INTO v_port_id FROM public.portfolios
  WHERE portfolio_code IN ('SEED334-PORT-01', 'SEED-PORT-01') AND COALESCE(is_deleted, FALSE) = FALSE
  ORDER BY CASE WHEN portfolio_code = 'SEED334-PORT-01' THEN 0 ELSE 1 END
  LIMIT 1;

  SELECT id INTO v_prog_id FROM public.programmes
  WHERE programme_code IN ('SEED334-PROG-01', 'SEED-PROG-01') AND COALESCE(is_deleted, FALSE) = FALSE
  ORDER BY CASE WHEN programme_code = 'SEED334-PROG-01' THEN 0 ELSE 1 END
  LIMIT 1;

  SELECT id INTO v_proj_id FROM public.projects
  WHERE project_code IN ('SEED334-PRJ-10', 'SEED-PP-01') AND COALESCE(is_deleted, FALSE) = FALSE
  ORDER BY CASE WHEN project_code LIKE 'SEED334%' THEN 0 ELSE 1 END
  LIMIT 1;

  SELECT id INTO v_proj2_id FROM public.projects
  WHERE project_code IN ('SEED334-PRJ-11', 'SEED-PP-02') AND COALESCE(is_deleted, FALSE) = FALSE
    AND id IS DISTINCT FROM v_proj_id
  ORDER BY CASE WHEN project_code LIKE 'SEED334%' THEN 0 ELSE 1 END
  LIMIT 1;

  IF v_proj2_id IS NULL THEN v_proj2_id := v_proj_id; END IF;

  -- -------------------------------------------------------------------------
  -- 1) Manager — project PM appointment (pending_acceptance)
  -- -------------------------------------------------------------------------
  IF v_proj_id IS NOT NULL AND v_mgr_a IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.project_invitations WHERE invitation_token = 'seed593-mgr-project-pending') THEN
      INSERT INTO public.project_invitations (
        entity_type, project_id, invited_email, invited_user_id, role_id,
        invited_by_user_id, invitation_token, invitation_message,
        invitation_status, invitation_expires_at
      )
      SELECT
        'project', v_proj_id, lower(trim(u.email)), u.id, v_role_pm,
        v_pmo_id, 'seed593-mgr-project-pending',
        '[SEED593] Formal appointment as Project Manager for ' || COALESCE(p.project_name, 'seed project'),
        'pending', NOW() + INTERVAL '14 days'
      FROM public.users u
      CROSS JOIN public.projects p
      WHERE u.id = v_mgr_a AND p.id = v_proj_id;
    END IF;

    SELECT id INTO v_inv_id FROM public.project_invitations WHERE invitation_token = 'seed593-mgr-project-pending';

    IF v_inv_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM public.manager_appointment_records WHERE invitation_id = v_inv_id
    ) THEN
      INSERT INTO public.manager_appointment_records (
        invitation_id, entity_type, project_id, manager_role_name,
        appointee_user_id, appointed_by_user_id, reporting_to_user_id,
        assignment_start_date, assignment_end_date, time_commitment_pct,
        budget_authority_limit, authority_notes, reporting_frequency,
        known_constraints, reference_document, appointment_message,
        appointment_status
      ) VALUES (
        v_inv_id, 'project', v_proj_id, 'project_manager',
        v_mgr_a, v_pmo_id, v_pmo_id,
        CURRENT_DATE + 14, CURRENT_DATE + 180, 75,
        250000.00,
        'Approve change requests within stage boundaries; escalate portfolio impacts.',
        'weekly',
        'Trial project — 5-member cap applies until upgrade.',
        'SEED593 / Project mandate reference',
        '[SEED593] Pending PM appointment — Digital Workplace delivery.',
        'pending_acceptance'
      );
    END IF;
  END IF;

  -- -------------------------------------------------------------------------
  -- 2) Manager — project PM appointment (active / accepted)
  -- -------------------------------------------------------------------------
  IF v_proj2_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.project_invitations WHERE invitation_token = 'seed593-mgr-project-active') THEN
      INSERT INTO public.project_invitations (
        entity_type, project_id, invited_email, invited_user_id, role_id,
        invited_by_user_id, invitation_token, invitation_message,
        invitation_status, invitation_expires_at, accepted_at, accepted_by_user_id
      )
      SELECT
        'project', v_proj2_id, lower(trim(u.email)), u.id, v_role_pm,
        v_pmo_id, 'seed593-mgr-project-active',
        '[SEED593] Active PM appointment (accepted).',
        'accepted', NOW() + INTERVAL '14 days', NOW(), u.id
      FROM public.users u WHERE u.id = v_mgr_b;
    END IF;

    SELECT id INTO v_inv_id FROM public.project_invitations WHERE invitation_token = 'seed593-mgr-project-active';

    IF v_inv_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM public.manager_appointment_records WHERE invitation_id = v_inv_id
    ) THEN
      INSERT INTO public.manager_appointment_records (
        invitation_id, entity_type, project_id, manager_role_name,
        appointee_user_id, appointed_by_user_id, reporting_to_user_id,
        assignment_start_date, assignment_end_date, time_commitment_pct,
        budget_authority_limit, reporting_frequency, appointment_message,
        appointment_status, accepted_at, availability_confirmed, actual_start_date,
        capability_acknowledged, initial_observations
      ) VALUES (
        v_inv_id, 'project', v_proj2_id, 'project_manager',
        v_mgr_b, v_pmo_id, v_pmo_id,
        CURRENT_DATE, CURRENT_DATE + 365, 100,
        500000.00, 'fortnightly',
        '[SEED593] Active PM appointment — accepted.',
        'active', NOW(), TRUE, CURRENT_DATE, TRUE,
        'Ready to mobilise; no blockers identified.'
      );
    END IF;
  END IF;

  -- -------------------------------------------------------------------------
  -- 3) Manager — programme appointment (pending)
  -- -------------------------------------------------------------------------
  IF v_prog_id IS NOT NULL AND v_role_prog IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.project_invitations WHERE invitation_token = 'seed593-mgr-programme-pending') THEN
      INSERT INTO public.project_invitations (
        entity_type, programme_id, invited_email, invited_user_id, role_id,
        invited_by_user_id, invitation_token, invitation_message,
        invitation_status, invitation_expires_at
      )
      SELECT
        'programme', v_prog_id, lower(trim(u.email)), u.id, v_role_prog,
        v_pmo_id, 'seed593-mgr-programme-pending',
        '[SEED593] Programme Manager formal appointment.',
        'pending', NOW() + INTERVAL '14 days'
      FROM public.users u WHERE u.id = v_mgr_c;
    END IF;

    SELECT id INTO v_inv_id FROM public.project_invitations WHERE invitation_token = 'seed593-mgr-programme-pending';

    IF v_inv_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM public.manager_appointment_records WHERE invitation_id = v_inv_id
    ) THEN
      INSERT INTO public.manager_appointment_records (
        invitation_id, entity_type, programme_id, manager_role_name,
        appointee_user_id, appointed_by_user_id, reporting_to_user_id,
        assignment_start_date, assignment_end_date, time_commitment_pct,
        budget_authority_limit, authority_notes, reporting_frequency,
        appointment_message, appointment_status
      ) VALUES (
        v_inv_id, 'programme', v_prog_id, 'programme_manager',
        v_mgr_c, v_pmo_id, v_pmo_id,
        CURRENT_DATE + 7, CURRENT_DATE + 400, 50,
        1000000.00,
        'Programme-level scope and benefits realisation accountability.',
        'monthly',
        '[SEED593] Pending programme manager appointment.',
        'pending_acceptance'
      );
    END IF;
  END IF;

  -- -------------------------------------------------------------------------
  -- 4) Manager — programme appointment (declined)
  -- -------------------------------------------------------------------------
  IF v_prog_id IS NOT NULL AND v_role_prog IS NOT NULL AND v_mgr_a IS DISTINCT FROM v_mgr_c THEN
    IF NOT EXISTS (SELECT 1 FROM public.project_invitations WHERE invitation_token = 'seed593-mgr-programme-declined') THEN
      INSERT INTO public.project_invitations (
        entity_type, programme_id, invited_email, invited_user_id, role_id,
        invited_by_user_id, invitation_token, invitation_message,
        invitation_status, invitation_expires_at, declined_at
      )
      SELECT
        'programme', v_prog_id, lower(trim(u.email)), u.id, v_role_prog,
        v_pmo_id, 'seed593-mgr-programme-declined',
        '[SEED593] Declined programme manager appointment sample.',
        'declined', NOW() + INTERVAL '14 days', NOW()
      FROM public.users u WHERE u.id = v_mgr_a;
    END IF;

    SELECT id INTO v_inv_id FROM public.project_invitations WHERE invitation_token = 'seed593-mgr-programme-declined';

    IF v_inv_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM public.manager_appointment_records WHERE invitation_id = v_inv_id
    ) THEN
      INSERT INTO public.manager_appointment_records (
        invitation_id, entity_type, programme_id, manager_role_name,
        appointee_user_id, appointed_by_user_id,
        assignment_start_date, time_commitment_pct, appointment_message,
        appointment_status, declined_at, decline_reason, decline_note
      ) VALUES (
        v_inv_id, 'programme', v_prog_id, 'programme_manager',
        v_mgr_a, v_pmo_id,
        CURRENT_DATE + 30, 50,
        '[SEED593] Declined programme manager appointment.',
        'declined', NOW(), 'overloaded',
        'Current portfolio load — cannot accept another programme accountability.'
      );
    END IF;
  END IF;

  -- -------------------------------------------------------------------------
  -- 5) Manager — portfolio appointment (pending)
  -- -------------------------------------------------------------------------
  IF v_port_id IS NOT NULL AND v_role_port IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.project_invitations WHERE invitation_token = 'seed593-mgr-portfolio-pending') THEN
      INSERT INTO public.project_invitations (
        entity_type, portfolio_id, invited_email, invited_user_id, role_id,
        invited_by_user_id, invitation_token, invitation_message,
        invitation_status, invitation_expires_at
      )
      SELECT
        'portfolio', v_port_id, lower(trim(u.email)), u.id, v_role_port,
        v_pmo_id, 'seed593-mgr-portfolio-pending',
        '[SEED593] Portfolio Manager formal appointment.',
        'pending', NOW() + INTERVAL '14 days'
      FROM public.users u WHERE u.id = v_mgr_b;
    END IF;

    SELECT id INTO v_inv_id FROM public.project_invitations WHERE invitation_token = 'seed593-mgr-portfolio-pending';

    IF v_inv_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM public.manager_appointment_records WHERE invitation_id = v_inv_id
    ) THEN
      INSERT INTO public.manager_appointment_records (
        invitation_id, entity_type, portfolio_id, manager_role_name,
        appointee_user_id, appointed_by_user_id, reporting_to_user_id,
        assignment_start_date, assignment_end_date, time_commitment_pct,
        budget_authority_limit, reporting_frequency, reference_document,
        appointment_message, appointment_status
      ) VALUES (
        v_inv_id, 'portfolio', v_port_id, 'portfolio_manager',
        v_mgr_b, v_pmo_id, v_pmo_id,
        CURRENT_DATE + 21, CURRENT_DATE + 730, 25,
        2500000.00, 'monthly', 'Portfolio strategic plan FY26',
        '[SEED593] Pending portfolio manager appointment.',
        'pending_acceptance'
      );
    END IF;
  END IF;

  -- -------------------------------------------------------------------------
  -- 6) Team member — developer (pending)
  -- -------------------------------------------------------------------------
  IF v_proj_id IS NOT NULL AND v_role_team IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.project_invitations WHERE invitation_token = 'seed593-team-dev-pending') THEN
      INSERT INTO public.project_invitations (
        entity_type, project_id, invited_email, invited_user_id, role_id,
        invited_by_user_id, invitation_token, invitation_message,
        invitation_status, invitation_expires_at
      )
      SELECT
        'project', v_proj_id, lower(trim(u.email)), u.id, v_role_team,
        v_pmo_id, 'seed593-team-dev-pending',
        '[SEED593] Team member assignment invitation.',
        'pending', NOW() + INTERVAL '14 days'
      FROM public.users u WHERE u.id = v_mgr_c;
    END IF;

    SELECT id INTO v_inv_id FROM public.project_invitations WHERE invitation_token = 'seed593-team-dev-pending';

    IF v_inv_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM public.team_member_appointment_records WHERE invitation_id = v_inv_id
    ) THEN
      INSERT INTO public.team_member_appointment_records (
        invitation_id, project_id, member_role_name, role_title,
        appointee_user_id, appointed_by_user_id, reporting_to_user_id,
        assignment_start_date, assignment_end_date, time_commitment_pct,
        primary_responsibilities, required_skills, working_arrangement, work_location,
        appointment_message, appointment_status
      ) VALUES (
        v_inv_id, v_proj_id, 'developer', 'Senior Backend Developer',
        v_mgr_c, v_pmo_id, v_pmo_id,
        CURRENT_DATE + 10, CURRENT_DATE + 120, 100,
        'Own API delivery for sprint backlog; participate in stand-ups and code reviews.',
        'Node.js, PostgreSQL, REST, unit testing',
        'hybrid', 'London — 2 days on-site',
        '[SEED593] Pending team developer assignment.',
        'pending_acceptance'
      );
    END IF;
  END IF;

  -- -------------------------------------------------------------------------
  -- 7) Team member — team_member (active)
  -- -------------------------------------------------------------------------
  IF v_proj2_id IS NOT NULL AND v_role_team IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.project_invitations WHERE invitation_token = 'seed593-team-member-active') THEN
      INSERT INTO public.project_invitations (
        entity_type, project_id, invited_email, invited_user_id, role_id,
        invited_by_user_id, invitation_token, invitation_message,
        invitation_status, invitation_expires_at, accepted_at, accepted_by_user_id
      )
      SELECT
        'project', v_proj2_id, lower(trim(u.email)), u.id, v_role_team,
        v_pmo_id, 'seed593-team-member-active',
        '[SEED593] Active team member assignment.',
        'accepted', NOW() + INTERVAL '14 days', NOW(), u.id
      FROM public.users u WHERE u.id = v_mgr_a;
    END IF;

    SELECT id INTO v_inv_id FROM public.project_invitations WHERE invitation_token = 'seed593-team-member-active';

    IF v_inv_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM public.team_member_appointment_records WHERE invitation_id = v_inv_id
    ) THEN
      INSERT INTO public.team_member_appointment_records (
        invitation_id, project_id, member_role_name, role_title,
        appointee_user_id, appointed_by_user_id, reporting_to_user_id,
        assignment_start_date, time_commitment_pct,
        primary_responsibilities, required_skills, working_arrangement,
        appointment_message, appointment_status,
        accepted_at, availability_confirmed, skills_acknowledged, initial_observations
      ) VALUES (
        v_inv_id, v_proj2_id, 'team_member', 'Business Analyst',
        v_mgr_a, v_pmo_id, v_pmo_id,
        CURRENT_DATE, 50,
        'Requirements workshops, user story refinement, UAT support.',
        'Workshop facilitation, Jira, acceptance criteria',
        'remote',
        '[SEED593] Active team member assignment — accepted.',
        'active', NOW(), TRUE, TRUE,
        'Will need access to legacy requirements repository in week 1.'
      );
    END IF;
  END IF;

  RAISE NOTICE 'v616: Platform appointment seed complete (manager + team records).';
END $$;

-- =============================================================================
-- Simulator appointment seed (requires v594 + v609 + v613)
-- =============================================================================
DO $$
DECLARE
  v_owner_id   UUID;
  v_appointee  UUID;
  v_inv_id     UUID;
  v_pp_id      UUID;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'sim' AND table_name = 'sim_manager_appointment_records'
  ) THEN
    RAISE NOTICE 'v616: sim.sim_manager_appointment_records missing — skip sim seed.';
    RETURN;
  END IF;

  SELECT u.id INTO v_owner_id
  FROM public.users u
  WHERE COALESCE(u.is_deleted, FALSE) = FALSE
  ORDER BY u.created_at ASC NULLS LAST
  LIMIT 1;

  IF v_owner_id IS NULL THEN
    RAISE NOTICE 'v616: No linked public.users for sim seed.';
    RETURN;
  END IF;

  SELECT u.id INTO v_appointee
  FROM public.users u
  WHERE COALESCE(u.is_deleted, FALSE) = FALSE AND u.id IS DISTINCT FROM v_owner_id
  ORDER BY u.created_at ASC NULLS LAST
  LIMIT 1;

  IF v_appointee IS NULL THEN v_appointee := v_owner_id; END IF;

  SELECT id INTO v_pp_id FROM sim.practice_projects
  WHERE project_code = 'SEED592-PP-01' AND COALESCE(is_deleted, FALSE) = FALSE
  LIMIT 1;

  -- Sim entity invitation + manager appointment (pending)
  IF NOT EXISTS (
    SELECT 1 FROM sim.entity_invitations WHERE invitation_token = 'seed593-sim-mgr-pending'
  ) THEN
    INSERT INTO sim.entity_invitations (
      entity_type, entity_name, invited_email, role_name, role_display_name,
      invited_by_user_id, invitation_token, invitation_message, invitation_status,
      invitation_expires_at
    )
    SELECT
      'practice_project',
      'SEED592 Practice Project Alpha',
      lower(trim(u.email)),
      'project_manager',
      'Project Manager',
      v_owner_id,
      'seed593-sim-mgr-pending',
      '[SEED593] Simulator practice PM appointment.',
      'pending',
      NOW() + INTERVAL '14 days'
    FROM public.users u
    WHERE u.id = v_appointee;
  END IF;

  SELECT id INTO v_inv_id FROM sim.entity_invitations WHERE invitation_token = 'seed593-sim-mgr-pending';

  IF v_inv_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM sim.sim_manager_appointment_records
    WHERE appointment_message = '[SEED593] Sim pending PM practice appointment'
  ) THEN
    INSERT INTO sim.sim_manager_appointment_records (
      invitation_id, entity_type, practice_project_id, entity_name,
      manager_role_name, appointee_user_id, appointed_by_user_id,
      assignment_start_date, time_commitment_pct, reporting_frequency,
      appointment_message, appointment_status
    ) VALUES (
      v_inv_id, 'practice_project', v_pp_id, 'SEED592 Practice Project Alpha',
      'project_manager', v_appointee, v_owner_id,
      CURRENT_DATE + 7, 75, 'weekly',
      '[SEED593] Sim pending PM practice appointment',
      'pending_acceptance'
    );
  END IF;

  -- Sim team member appointment (active)
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'sim' AND table_name = 'sim_team_member_appointment_records'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM sim.entity_invitations WHERE invitation_token = 'seed593-sim-team-active'
    ) THEN
      INSERT INTO sim.entity_invitations (
        entity_type, entity_name, invited_email, role_name, role_display_name,
        invited_by_user_id, invitation_token, invitation_message, invitation_status,
        invitation_expires_at, accepted_at
      )
      SELECT
        'practice_project', 'SEED592 Practice Project Beta',
        lower(trim(u.email)), 'developer', 'Developer',
        v_owner_id, 'seed593-sim-team-active',
        '[SEED593] Sim active developer assignment.', 'accepted', NOW() + INTERVAL '14 days', NOW()
      FROM public.users u WHERE u.id = v_owner_id;
    END IF;

    SELECT id INTO v_inv_id FROM sim.entity_invitations WHERE invitation_token = 'seed593-sim-team-active';

    IF v_inv_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM sim.sim_team_member_appointment_records
      WHERE appointment_message = '[SEED593] Sim active developer assignment'
    ) THEN
      INSERT INTO sim.sim_team_member_appointment_records (
        invitation_id, practice_project_id, entity_name,
        member_role_name, role_title, appointee_user_id, appointed_by_user_id,
        assignment_start_date, time_commitment_pct, working_arrangement,
        primary_responsibilities, appointment_message, appointment_status,
        accepted_at, skills_acknowledged
      ) VALUES (
        v_inv_id, v_pp_id, 'SEED592 Practice Project Beta',
        'developer', 'Practice Developer', v_owner_id, v_owner_id,
        CURRENT_DATE, 100, 'remote',
        'Practice sprint delivery and defect triage.',
        '[SEED593] Sim active developer assignment',
        'active', NOW(), TRUE
      );
    END IF;
  END IF;

  RAISE NOTICE 'v616: Simulator appointment seed complete.';
END $$;

DO $$ BEGIN RAISE NOTICE 'v616_v593_appointment_records_seed.sql applied'; END $$;
