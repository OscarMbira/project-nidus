-- =============================================================================
-- v1144: Seed stakeholder sample data for SEED334-PRJ-08 only
--        (Velocity Freight - Dynamic Route Optimization Pilot)
-- Covers the Stakeholders sidebar leaves:
--   Stakeholder Register, Stakeholder Analysis, Engagement Planning,
--   Communication Plans (plans + log), Assessment Matrix
-- Prerequisites: v334 (project), v35 (stakeholder tables), v603 (assessment
--   matrix), v317 (communication log effectiveness columns). v1136 assigns
--   stakeholder_reference when the column is left blank.
-- Idempotent: fixed UUIDs + ON CONFLICT (id) DO NOTHING.
-- Display IDs: stakeholder_reference is inserted blank so Admin ID Generation
--   assigns STK-YYYY-###. Do not hand-mint references.
-- No other projects are seeded. Simulator practice projects are out of scope
--   (SEED334-PRJ-08 is a Platform project).
-- =============================================================================

DO $$
DECLARE
  v_project_id   UUID;
  v_project_code TEXT := 'SEED334-PRJ-08';
  v_user_id      UUID;

  v_sh1 UUID := '11440001-5801-4a01-9c01-534433340001'; -- leading
  v_sh2 UUID := '11440001-5801-4a01-9c01-534433340002'; -- supportive
  v_sh3 UUID := '11440001-5801-4a01-9c01-534433340003'; -- neutral
  v_sh4 UUID := '11440001-5801-4a01-9c01-534433340004'; -- unsupportive
  v_sh5 UUID := '11440001-5801-4a01-9c01-534433340005'; -- blocking

  v_plan1 UUID := '11440005-c301-4a01-9c01-534433340001';
  v_plan2 UUID := '11440005-c301-4a01-9c01-534433340002';
  v_plan3 UUID := '11440005-c301-4a01-9c01-534433340003';
BEGIN
  SELECT id INTO v_project_id
  FROM public.projects
  WHERE project_code = v_project_code
    AND COALESCE(is_deleted, FALSE) = FALSE
  LIMIT 1;

  IF v_project_id IS NULL THEN
    RAISE EXCEPTION 'v1144: project % not found — run v334 first', v_project_code;
  END IF;

  SELECT owner_user_id INTO v_user_id
  FROM public.projects
  WHERE id = v_project_id;

  IF v_user_id IS NULL THEN
    SELECT pm.user_id INTO v_user_id
    FROM public.project_memberships pm
    WHERE pm.project_id = v_project_id
      AND COALESCE(pm.is_active, TRUE) = TRUE
      AND pm.user_id IS NOT NULL
    ORDER BY pm.created_at NULLS LAST
    LIMIT 1;
  END IF;

  -- ---------------------------------------------------------------------------
  -- STAKEHOLDER REGISTER
  -- ---------------------------------------------------------------------------
  INSERT INTO public.stakeholders (
    id, project_id, stakeholder_reference, stakeholder_name, stakeholder_title,
    stakeholder_organization, stakeholder_type, stakeholder_category,
    stakeholder_role, project_role, email, phone, preferred_contact_method,
    interest_level, is_decision_maker, is_influencer, is_affected_by_project,
    stakeholder_status, notes, is_deleted, created_at, created_by
  ) VALUES
    (v_sh1, v_project_id, '', 'Lindiwe Moyo', 'Network Operations Director',
     'Velocity Freight', 'internal', 'individual',
     'Executive sponsor', 'Project sponsor',
     'lindiwe.moyo@velocityfreight.example', '+263 77 200 1101', 'email',
     'high', TRUE, TRUE, TRUE,
     'active',
     'Sponsors the dynamic route pilot and chairs the weekly operations review.',
     FALSE, NOW() - INTERVAL '40 days', v_user_id),

    (v_sh2, v_project_id, '', 'Harare Depot Supervisors', 'Depot supervisor forum',
     'Velocity Freight', 'internal', 'group',
     'Depot operations', 'Depot change champions',
     'depot.supervisors@velocityfreight.example', '+263 24 200 2202', 'in-person',
     'high', FALSE, TRUE, TRUE,
     'active',
     'Supervisors who release vehicles each morning and feel the effect of new route plans.',
     FALSE, NOW() - INTERVAL '38 days', v_user_id),

    (v_sh3, v_project_id, '', 'Regional Roads Authority', 'Permit liaison officer',
     'Regional Roads Authority', 'external', 'organization',
     'Regulator', 'Route permit consultee',
     'permits@roadsauthority.example', '+263 24 700 3303', 'email',
     'medium', TRUE, TRUE, FALSE,
     'active',
     'Must be told before night routes change on restricted urban corridors.',
     FALSE, NOW() - INTERVAL '36 days', v_user_id),

    (v_sh4, v_project_id, '', 'Tendai Ncube', 'Night-route driver representative',
     'Velocity Freight', 'internal', 'individual',
     'Driver representative', 'Driver voice',
     'tendai.ncube@velocityfreight.example', '+263 77 400 4404', 'phone',
     'high', FALSE, TRUE, TRUE,
     'active',
     'Speaks for night-shift drivers worried that tighter routes will cut rest windows.',
     FALSE, NOW() - INTERVAL '34 days', v_user_id),

    (v_sh5, v_project_id, '', 'Fuel Contract Manager', 'Fuel procurement lead',
     'Velocity Freight', 'internal', 'individual',
     'Supplier manager', 'Fuel contract owner',
     'fuel.contracts@velocityfreight.example', '+263 77 500 5505', 'email',
     'low', FALSE, FALSE, TRUE,
     'active',
     'Owns the fuel contract. New routes can move fill-up locations and breach volume bands.',
     FALSE, NOW() - INTERVAL '32 days', v_user_id)
  ON CONFLICT (id) DO NOTHING;

  -- ---------------------------------------------------------------------------
  -- STAKEHOLDER ANALYSIS (power / interest, 1 = low … 5 = high)
  -- ---------------------------------------------------------------------------
  INSERT INTO public.stakeholder_analysis (
    id, stakeholder_id, project_id, analysis_date, analysis_period,
    power_level, interest_level, matrix_quadrant,
    current_attitude, desired_attitude, support_level,
    engagement_approach, expectations, concerns,
    has_power, has_legitimacy, has_urgency,
    analyzed_by, created_by, is_deleted
  ) VALUES
    ('11440003-5a01-4a01-9c01-534433340001', v_sh1, v_project_id, CURRENT_DATE - 21, 'execution',
     5, 5, 'manage-closely',
     'champion', 'champion', 5,
     'Keep Lindiwe briefed before each operations review so she can defend the pilot in the leadership meeting.',
     'A measurable drop in empty kilometres within the first month.',
     'Late go-live would miss the peak season.',
     TRUE, TRUE, TRUE, v_user_id, v_user_id, FALSE),

    ('11440003-5a01-4a01-9c01-534433340002', v_sh2, v_project_id, CURRENT_DATE - 21, 'execution',
     2, 5, 'keep-informed',
     'supporter', 'champion', 4,
     'Walk supervisors through the next morning''s plan the afternoon before it goes live.',
     'Plans that still leave a buffer for late inbound freight.',
     'Drivers will blame the depot if the first week''s plans are wrong.',
     FALSE, TRUE, TRUE, v_user_id, v_user_id, FALSE),

    ('11440003-5a01-4a01-9c01-534433340003', v_sh3, v_project_id, CURRENT_DATE - 18, 'execution',
     5, 2, 'keep-satisfied',
     'neutral', 'supporter', 3,
     'Send a short permit note whenever a night corridor changes. Do not surprise them.',
     'Advance notice of restricted-road use.',
     'Unapproved night movements on school-zone roads.',
     TRUE, TRUE, FALSE, v_user_id, v_user_id, FALSE),

    ('11440003-5a01-4a01-9c01-534433340004', v_sh4, v_project_id, CURRENT_DATE - 14, 'execution',
     2, 4, 'keep-informed',
     'critic', 'neutral', 2,
     'Hold a listening session with night drivers before the next route cut, and publish the rest-window rules.',
     'No shorter legal rest between shifts.',
     'Optimised routes that ignore loading delays at the last stop.',
     FALSE, TRUE, TRUE, v_user_id, v_user_id, FALSE),

    ('11440003-5a01-4a01-9c01-534433340005', v_sh5, v_project_id, CURRENT_DATE - 10, 'execution',
     3, 2, 'monitor',
     'blocker', 'neutral', 1,
     'Show the fuel-volume impact before any depot is dropped from the fill-up list.',
     'Contract volume bands stay intact.',
     'A route change that strands trucks away from contracted filling stations.',
     TRUE, TRUE, FALSE, v_user_id, v_user_id, FALSE)
  ON CONFLICT (id) DO NOTHING;

  -- ---------------------------------------------------------------------------
  -- ASSESSMENT MATRIX (current → desired engagement)
  -- ---------------------------------------------------------------------------
  INSERT INTO public.stakeholder_assessment_matrix (
    id, project_id, stakeholder_id, assessment_date,
    current_level, desired_level, gap_summary, notes, created_by, is_deleted
  ) VALUES
    ('11440002-a301-4a01-9c01-534433340001', v_project_id, v_sh1, CURRENT_DATE - 21,
     'supportive', 'leading', 'Supportive → Leading',
     'Already backs the pilot. Ask her to open the next town hall.', v_user_id, FALSE),

    ('11440002-a301-4a01-9c01-534433340002', v_project_id, v_sh2, CURRENT_DATE - 21,
     'neutral', 'supportive', 'Neutral → Supportive',
     'Supervisors will support the plan once they have seen one clean morning dispatch.', v_user_id, FALSE),

    ('11440002-a301-4a01-9c01-534433340003', v_project_id, v_sh3, CURRENT_DATE - 18,
     'unaware', 'neutral', 'Unaware → Neutral',
     'They have not been briefed on the pilot corridors yet.', v_user_id, FALSE),

    ('11440002-a301-4a01-9c01-534433340004', v_project_id, v_sh4, CURRENT_DATE - 14,
     'resistant', 'supportive', 'Resistant → Supportive',
     'Resistance is about rest windows, not the idea of better routes.', v_user_id, FALSE),

    ('11440002-a301-4a01-9c01-534433340005', v_project_id, v_sh5, CURRENT_DATE - 10,
     'resistant', 'neutral', 'Resistant → Neutral',
     'Will block a depot drop until the fuel-contract impact is written down.', v_user_id, FALSE)
  ON CONFLICT (id) DO NOTHING;

  -- ---------------------------------------------------------------------------
  -- ENGAGEMENT PLANNING (one card in each board column)
  -- ---------------------------------------------------------------------------
  INSERT INTO public.stakeholder_engagement (
    id, stakeholder_id, project_id, engagement_level, target_engagement_level,
    engagement_strategy, preferred_communication_frequency, preferred_communication_method,
    relationship_owner_user_id, engagement_status, notes, created_by, is_deleted
  ) VALUES
    ('11440004-e701-4a01-9c01-534433340001', v_sh1, v_project_id, 'leading', 'leading',
     'Keep her as the visible sponsor. Send a one-page result note the day before each leadership meeting.',
     'weekly', 'meeting', v_user_id, 'active', NULL, v_user_id, FALSE),

    ('11440004-e701-4a01-9c01-534433340002', v_sh2, v_project_id, 'supportive', 'leading',
     'Invite two supervisors to check the next day''s plan before it is issued to drivers.',
     'daily', 'in-person', v_user_id, 'active',
     'First joint dispatch review is booked for Monday.', v_user_id, FALSE),

    ('11440004-e701-4a01-9c01-534433340003', v_sh3, v_project_id, 'neutral', 'supportive',
     'Send a corridor-change note 5 working days before any restricted road is added.',
     'monthly', 'email', v_user_id, 'active', NULL, v_user_id, FALSE),

    ('11440004-e701-4a01-9c01-534433340004', v_sh4, v_project_id, 'unsupportive', 'supportive',
     'Run a night-shift listening session and publish the rest-window rule before the next route cut.',
     'biweekly', 'meeting', v_user_id, 'active',
     'Drivers asked for the loading-delay allowance to stay in the plan.', v_user_id, FALSE),

    ('11440004-e701-4a01-9c01-534433340005', v_sh5, v_project_id, 'blocking', 'neutral',
     'Do not drop a filling station until the fuel-volume note is agreed with procurement.',
     'monthly', 'email', v_user_id, 'active',
     'Holding the west-depot fill-up change until the contract note is signed off.', v_user_id, FALSE)
  ON CONFLICT (id) DO NOTHING;

  -- ---------------------------------------------------------------------------
  -- COMMUNICATION PLANS
  -- ---------------------------------------------------------------------------
  INSERT INTO public.communication_plans (
    id, project_id, plan_name, plan_description, plan_status,
    plan_start_date, plan_end_date, communication_objectives, key_messages,
    target_stakeholder_groups, primary_channels,
    communication_owner_user_id, created_by, is_deleted
  ) VALUES
    (v_plan1, v_project_id,
     'Weekly route pilot briefing',
     'Short weekly note on kilometres saved, late deliveries, and the next corridor change.',
     'active', CURRENT_DATE - 28, CURRENT_DATE + 60,
     'Keep the sponsor and depot supervisors aligned on what changed this week.',
     'Empty kilometres are down. Rest windows are unchanged. Flag exceptions the same day.',
     ARRAY['Sponsor', 'Depot supervisors'],
     ARRAY['email', 'meetings'],
     v_user_id, v_user_id, FALSE),

    (v_plan2, v_project_id,
     'Roads authority consultation',
     'Advance notice to the regulator before a restricted night corridor is used.',
     'active', CURRENT_DATE - 20, CURRENT_DATE + 90,
     'Avoid a permit surprise on urban night routes.',
     'We will not use a restricted road without five working days'' notice.',
     ARRAY['Regulator'],
     ARRAY['email'],
     v_user_id, v_user_id, FALSE),

    (v_plan3, v_project_id,
     'Night-driver shift briefing',
     'Face-to-face briefing at shift start when a route plan changes.',
     'draft', CURRENT_DATE, CURRENT_DATE + 45,
     'Explain route changes before drivers leave the yard.',
     'The new plan keeps the legal rest window. Tell a supervisor if a stop will run long.',
     ARRAY['Night-shift drivers'],
     ARRAY['in-person'],
     v_user_id, v_user_id, FALSE)
  ON CONFLICT (id) DO NOTHING;

  -- ---------------------------------------------------------------------------
  -- COMMUNICATION LOG
  -- ---------------------------------------------------------------------------
  INSERT INTO public.stakeholder_communications (
    id, project_id, communication_plan_id, stakeholder_ids,
    communication_reference, communication_subject, communication_type,
    communication_category, communication_summary,
    planned_date, actual_date, communication_channel,
    sent_by_user_id, communication_status,
    response_required, response_received, response_notes,
    effectiveness_rating, next_action, next_action_due_date,
    created_by, is_deleted
  ) VALUES
    ('11440006-c401-4a01-9c01-534433340001', v_project_id, v_plan1, ARRAY[v_sh1, v_sh2]::uuid[],
     '', 'Week 3 route pilot results', 'email', 'status-update',
     'Empty kilometres down 6 percent. Two late drops caused by a supplier delay, not the new plan.',
     CURRENT_DATE - 7, CURRENT_DATE - 7, 'email',
     v_user_id, 'sent',
     FALSE, TRUE, 'Sponsor asked for the same note next week.',
     4, 'Send the week 4 note before the operations review.', CURRENT_DATE + 3,
     v_user_id, FALSE),

    ('11440006-c401-4a01-9c01-534433340002', v_project_id, v_plan2, ARRAY[v_sh3]::uuid[],
     '', 'Notice of Samora Machel night corridor trial', 'email', 'information',
     'Five-day notice that two night trunks will use the Samora Machel corridor for a two-week trial.',
     CURRENT_DATE - 5, CURRENT_DATE - 5, 'email',
     v_user_id, 'sent',
     TRUE, FALSE, NULL,
     3, 'Chase a written acknowledgement from the permit desk.', CURRENT_DATE + 2,
     v_user_id, FALSE),

    ('11440006-c401-4a01-9c01-534433340003', v_project_id, v_plan3, ARRAY[v_sh4]::uuid[],
     '', 'Night-shift listening session', 'meeting', 'stakeholder-engagement',
     'Drivers described two stops where loading always overruns. Rest window stayed the main concern.',
     CURRENT_DATE - 3, CURRENT_DATE - 3, 'face-to-face',
     v_user_id, 'acknowledged',
     TRUE, TRUE, 'Agreed to keep a 20-minute loading allowance on those two stops.',
     4, 'Update the route rules and show them at the next shift briefing.', CURRENT_DATE + 7,
     v_user_id, FALSE)
  ON CONFLICT (id) DO NOTHING;

  RAISE NOTICE 'v1144: stakeholder sample data ready for % (register, analysis, assessment, engagement, communication plans and log).', v_project_code;
END $$;
