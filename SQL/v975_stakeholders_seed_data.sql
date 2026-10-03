-- =============================================================================
-- v975: Seed Data — Stakeholders group (Core PM sidebar).
-- Finding: SQL/v305's random stakeholder-assignment UPDATE landed all 53
-- stakeholders on a single project (SEED-PP-15) rather than spreading them
-- across the 20 seed projects — an uncorrelated `(SELECT ... ORDER BY random()
-- LIMIT 1)` scalar subquery in v305 appears to have been evaluated once and
-- reused for all 53 rows rather than once per row. Not fixed here (out of
-- scope for this seed-data task; flagging for a future v305 correction).
-- Net effect: none of this task's established anchor projects (SEED-PP-01/02/
-- 03/09, SEED-IND-01/04) had any stakeholders, and none of the 4 stakeholder
-- facet tables (assessment matrix / analysis / engagement / communications)
-- had any rows for ANY project system-wide. This file adds a small, realistic
-- set to SEED-PP-01 and SEED-PP-02 so all 6 Stakeholders leaves have sample
-- content on the same anchor projects used throughout this seeding pass.
-- Prerequisites: v305 (anchor projects), v35 (stakeholders/analysis/
--                engagement/communications), v603 (assessment_matrix).
-- Idempotent: fixed hex-only UUIDs + ON CONFLICT (id) DO NOTHING. Safe to re-run.
-- Display IDs: stakeholder_reference / communication_reference are plain
--   optional text fields with no admin display-id trigger wired — left NULL.
-- =============================================================================

DO $$
DECLARE
  v_proj_dw UUID; -- SEED-PP-01 Digital Workspace Rollout
  v_proj_bi UUID; -- SEED-PP-02 BI Platform Implementation
  v_user_id UUID;
  v_auth_uid UUID;

  v_sh1 UUID := '97500001-5801-4a01-9c01-534433340001';
  v_sh2 UUID := '97500001-5801-4a01-9c01-534433340002';
  v_sh3 UUID := '97500001-5801-4a01-9c01-534433340003';
BEGIN

  SELECT id INTO v_proj_dw FROM public.projects WHERE project_code = 'SEED-PP-01' AND COALESCE(is_deleted, false) = false LIMIT 1;
  SELECT id INTO v_proj_bi FROM public.projects WHERE project_code = 'SEED-PP-02' AND COALESCE(is_deleted, false) = false LIMIT 1;

  IF v_proj_dw IS NULL OR v_proj_bi IS NULL THEN
    RAISE NOTICE 'v975: Anchor seed projects (SEED-PP-01/02) not found — run v305 first. Skipping.';
    RETURN;
  END IF;

  SELECT id INTO v_user_id FROM public.users WHERE COALESCE(is_deleted, false) = false LIMIT 1;
  IF v_user_id IS NULL THEN
    RAISE NOTICE 'v975: No user available to attribute seed rows. Skipping.';
    RETURN;
  END IF;

  SELECT auth_user_id INTO v_auth_uid FROM public.users WHERE id = v_user_id LIMIT 1;
  IF v_auth_uid IS NOT NULL THEN
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_auth_uid::text)::text, true);
  END IF;

  -- ---------------------------------------------------------------------------
  -- STAKEHOLDER REGISTER (public.stakeholders)
  -- ---------------------------------------------------------------------------
  INSERT INTO public.stakeholders (
    id, project_id, stakeholder_name, stakeholder_title, stakeholder_organization,
    stakeholder_type, stakeholder_category, email, preferred_contact_method,
    is_decision_maker, is_influencer, is_affected_by_project, is_powerful,
    is_negatively_affected, is_positively_affected, stakeholder_status,
    notes, is_deleted, created_at, created_by
  ) VALUES
    (v_sh1, v_proj_dw, 'Sarah Whitfield', 'Chief Information Officer', 'Client Organisation',
     'internal', 'executive_sponsor', 'sarah.whitfield@example.com', 'email',
     true, true, true, true, false, true, 'active',
     'Executive sponsor for the digital workspace rollout; monitors progress at monthly steering committee.',
     false, NOW() - INTERVAL '95 days', v_user_id),

    (v_sh2, v_proj_dw, 'Regional Office Staff Representatives', 'Staff Forum Chair', 'Client Organisation',
     'internal', 'end_user_group', 'staffforum@example.com', 'email',
     false, true, true, false, true, false, 'active',
     'Represents regional office staff concerned about disruption during rollout; historically resistant to change.',
     false, NOW() - INTERVAL '90 days', v_user_id),

    (v_sh3, v_proj_bi, 'Finance Director', 'Finance Director', 'Client Organisation',
     'internal', 'business_owner', 'finance.director@example.com', 'email',
     true, true, true, true, false, true, 'active',
     'Primary business owner for the BI platform; approves data source access and report priorities.',
     false, NOW() - INTERVAL '105 days', v_user_id)
  ON CONFLICT (id) DO NOTHING;

  -- ---------------------------------------------------------------------------
  -- POWER/INTEREST + ASSESSMENT MATRIX (public.stakeholder_assessment_matrix)
  -- ---------------------------------------------------------------------------
  INSERT INTO public.stakeholder_assessment_matrix (
    id, project_id, stakeholder_id, assessment_date, current_level, desired_level,
    gap_summary, notes, created_by
  ) VALUES
    ('97500002-a301-4a01-9c01-534433340001', v_proj_dw, v_sh1, CURRENT_DATE - 30, 'supportive', 'leading',
     'Already supportive; aim to make her a visible champion at the wave 2 town hall.', NULL, v_user_id),

    ('97500002-a301-4a01-9c01-534433340002', v_proj_dw, v_sh2, CURRENT_DATE - 30, 'resistant', 'supportive',
     'Gap driven by concerns over training time; targeted engagement plan in progress.', 'Follow-up session scheduled.', v_user_id),

    ('97500002-a301-4a01-9c01-534433340003', v_proj_bi, v_sh3, CURRENT_DATE - 25, 'neutral', 'leading',
     'Needs visibility of early report accuracy wins to move from neutral to leading.', NULL, v_user_id)
  ON CONFLICT (id) DO NOTHING;

  -- ---------------------------------------------------------------------------
  -- STAKEHOLDER ANALYSIS (public.stakeholder_analysis)
  -- ---------------------------------------------------------------------------
  -- NOTE (2026-08-24): power_level/interest_level/support_level are all INTEGER CHECK (1-5)
  -- columns (v35_stakeholder_management.sql), not text — 'high'/'medium'/'low' failed with
  -- ERROR 22P02. Converted to the schema's 1=low..5=high scale. matrix_quadrant also corrected
  -- from underscore to the hyphenated convention the schema's own comment documents
  -- ('keep-satisfied'/'manage-closely'/'monitor'/'keep-informed') — not DB-enforced (no CHECK
  -- constraint on that column), but kept consistent since it was being changed anyway.
  INSERT INTO public.stakeholder_analysis (
    id, stakeholder_id, project_id, analysis_date, power_level, interest_level,
    matrix_quadrant, current_attitude, desired_attitude, support_level,
    engagement_approach, has_power, has_legitimacy, has_urgency, analyzed_by, created_by
  ) VALUES
    ('97500003-5a01-4a01-9c01-534433340001', v_sh1, v_proj_dw, CURRENT_DATE - 30, 5, 5,
     'manage-closely', 'supportive', 'champion', 5,
     'Manage closely — keep informed and visible as executive champion.', true, true, true, v_user_id, v_user_id),

    ('97500003-5a01-4a01-9c01-534433340002', v_sh2, v_proj_dw, CURRENT_DATE - 30, 1, 5,
     'keep-informed', 'resistant', 'neutral', 1,
     'Keep informed — targeted communication and early training access to build trust.', false, true, true, v_user_id, v_user_id),

    ('97500003-5a01-4a01-9c01-534433340003', v_sh3, v_proj_bi, CURRENT_DATE - 25, 5, 3,
     'manage-closely', 'neutral', 'champion', 3,
     'Manage closely — share accuracy validation results as they land to build confidence.', true, true, false, v_user_id, v_user_id)
  ON CONFLICT (id) DO NOTHING;

  -- ---------------------------------------------------------------------------
  -- ENGAGEMENT PLANNING (public.stakeholder_engagement)
  -- ---------------------------------------------------------------------------
  INSERT INTO public.stakeholder_engagement (
    id, stakeholder_id, project_id, engagement_level, target_engagement_level,
    engagement_strategy, preferred_communication_frequency, preferred_communication_method,
    relationship_owner_user_id, engagement_status, notes, created_by
  ) VALUES
    ('97500004-e701-4a01-9c01-534433340001', v_sh1, v_proj_dw, 'leading', 'leading',
     'Maintain as visible executive champion; brief ahead of each steering committee.', 'monthly', 'meeting',
     v_user_id, 'active', NULL, v_user_id),

    ('97500004-e701-4a01-9c01-534433340002', v_sh2, v_proj_dw, 'resistant', 'supportive',
     'Run a targeted listening session and early-access training pilot with staff forum representatives.', 'biweekly', 'meeting',
     v_user_id, 'active', 'First listening session held; feedback being incorporated into wave 2 training plan.', v_user_id),

    ('97500004-e701-4a01-9c01-534433340003', v_sh3, v_proj_bi, 'neutral', 'leading',
     'Share weekly accuracy validation snapshots ahead of go-live decision.', 'weekly', 'email',
     v_user_id, 'active', NULL, v_user_id)
  ON CONFLICT (id) DO NOTHING;

  -- ---------------------------------------------------------------------------
  -- COMMUNICATION PLANS (public.stakeholder_communications)
  -- ---------------------------------------------------------------------------
  INSERT INTO public.stakeholder_communications (
    id, project_id, stakeholder_ids, communication_subject, communication_type,
    communication_category, communication_summary, planned_date, actual_date,
    communication_channel, sent_by_user_id, communication_status, created_by
  ) VALUES
    ('97500005-c301-4a01-9c01-534433340001', v_proj_dw, ARRAY[v_sh1]::uuid[],
     'Wave 2 Rollout Steering Update', 'status_update', 'project_update',
     'Monthly steering committee briefing covering wave 2 readiness and revised go-live date.',
     CURRENT_DATE - 10, CURRENT_DATE - 10, 'meeting', v_user_id, 'sent', v_user_id),

    ('97500005-c301-4a01-9c01-534433340002', v_proj_dw, ARRAY[v_sh2]::uuid[],
     'Regional Staff Forum Listening Session', 'consultation', 'stakeholder_engagement',
     'First of two listening sessions to gather feedback on training time concerns ahead of wave 2.',
     CURRENT_DATE - 15, CURRENT_DATE - 15, 'meeting', v_user_id, 'sent', v_user_id),

    ('97500005-c301-4a01-9c01-534433340003', v_proj_bi, ARRAY[v_sh3]::uuid[],
     'Weekly BI Accuracy Validation Snapshot', 'status_update', 'project_update',
     'Weekly email summarising report accuracy validation progress against the Finance test dataset.',
     CURRENT_DATE - 3, CURRENT_DATE - 3, 'email', v_user_id, 'sent', v_user_id)
  ON CONFLICT (id) DO NOTHING;

  RAISE NOTICE 'v975: Stakeholders seed complete (register, assessment matrix, analysis, engagement, communications) for SEED-PP-01/02.';

END $$;
