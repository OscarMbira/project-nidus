-- =============================================================================
-- v1227: Seed governance pages for SEED334-PRJ-08 (Velocity Freight) only.
--   Pending My Approval / My Submitted Records -> record_authorisation_requests
--   Approval Chains                             -> record_authorisers
--   Governance Action Register                  -> quality_activity_actions
--                                                 (plus issue/lesson actions when
--                                                 a parent row already exists)
--   Meeting Calendar                            -> comm_meetings + participants
--
-- Also adds a SELECT policy so a project member can read approval chains.
-- Writes stay with the existing PMO policy.
--
-- Idempotent: fixed hex-only UUIDs, ON CONFLICT DO NOTHING.
-- Does not hand-mint display IDs. meeting_code stays blank.
-- Public schema only. Do not copy these rows into sim.
-- =============================================================================

DROP POLICY IF EXISTS policy_authorisers_select_member ON public.record_authorisers;
CREATE POLICY policy_authorisers_select_member ON public.record_authorisers
  FOR SELECT TO authenticated
  USING (
    public.is_user_pmo_admin(auth.uid())
    OR authoriser_user_id IN (
      SELECT u.id FROM public.users u WHERE u.auth_user_id = auth.uid() AND COALESCE(u.is_deleted, FALSE) = FALSE
    )
    OR (project_id IS NOT NULL AND public.auth_user_can_access_project(project_id))
    OR (account_id IS NOT NULL AND public.user_has_access_to_account(account_id))
  );

DO $$
DECLARE
  v_project_id  UUID;
  v_account_id  UUID;
  v_user_id     UUID;
  v_review_id   UUID;
  v_issue_id    UUID;
  v_lesson_id   UUID;
  v_decision_id UUID;
  v_record_id   UUID;
  v_table_name  TEXT;
  v_next_action INTEGER;
BEGIN
  SELECT id, account_id, owner_user_id
    INTO v_project_id, v_account_id, v_user_id
  FROM public.projects
  WHERE project_code = 'SEED334-PRJ-08'
    AND COALESCE(is_deleted, FALSE) = FALSE
  LIMIT 1;

  IF v_project_id IS NULL THEN
    RAISE EXCEPTION 'v1227: project SEED334-PRJ-08 not found';
  END IF;
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'v1227: project SEED334-PRJ-08 has no owner_user_id';
  END IF;
  IF v_account_id IS NULL THEN
    RAISE EXCEPTION 'v1227: project SEED334-PRJ-08 has no account_id';
  END IF;

  -- Meetings
  INSERT INTO public.comm_meetings (
    id, project_id, account_id, title, description, meeting_type, status,
    scheduled_start, scheduled_end, organised_by, agora_channel_name
  )
  VALUES
    (
      'c1227001-0000-4000-8000-000000000001', v_project_id, v_account_id,
      'Velocity Freight steering',
      'Fortnightly steering review for SEED334-PRJ-08.',
      'scheduled', 'scheduled',
      '2026-10-15 09:00:00+00', '2026-10-15 10:00:00+00',
      v_user_id, 'nidus-seed334-steer-001'
    ),
    (
      'c1227001-0000-4000-8000-000000000002', v_project_id, v_account_id,
      'Routing cutover checkpoint',
      'Checkpoint before the routing software cutover.',
      'video', 'scheduled',
      '2026-10-22 13:00:00+00', '2026-10-22 14:00:00+00',
      v_user_id, 'nidus-seed334-cutover-001'
    )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.comm_meeting_participants (id, meeting_id, user_id, invite_status)
  VALUES
    ('c1227002-0000-4000-8000-000000000001', 'c1227001-0000-4000-8000-000000000001', v_user_id, 'accepted'),
    ('c1227002-0000-4000-8000-000000000002', 'c1227001-0000-4000-8000-000000000002', v_user_id, 'accepted')
  ON CONFLICT (meeting_id, user_id) DO NOTHING;

  -- Approval chains for this project
  INSERT INTO public.record_authorisers (
    id, account_id, project_id, table_name, authoriser_user_id,
    approval_level, role_label, is_active, created_by
  )
  VALUES
    ('c1227003-0000-4000-8000-000000000001', v_account_id, v_project_id, 'project_decisions', v_user_id, 1, 'Project owner', TRUE, v_user_id),
    ('c1227003-0000-4000-8000-000000000002', v_account_id, v_project_id, 'quality_reviews', v_user_id, 1, 'Quality chair', TRUE, v_user_id),
    ('c1227003-0000-4000-8000-000000000003', v_account_id, v_project_id, 'issues', v_user_id, 1, 'Issue owner', TRUE, v_user_id)
  ON CONFLICT ON CONSTRAINT uq_record_authorisers DO NOTHING;

  -- Quality actions hang off an existing review when one is already on the project
  SELECT qr.id INTO v_review_id
  FROM public.quality_reviews qr
  WHERE qr.project_id = v_project_id
    AND COALESCE(qr.is_deleted, FALSE) = FALSE
  ORDER BY qr.created_at NULLS LAST
  LIMIT 1;

  IF v_review_id IS NULL THEN
    v_review_id := 'c1227004-0000-4000-8000-000000000001';
    INSERT INTO public.quality_reviews (id, project_id, review_title, review_type, review_status, chair_user_id, created_by)
    VALUES (v_review_id, v_project_id, 'Velocity Freight quality review', 'management-review', 'planned', v_user_id, v_user_id)
    ON CONFLICT (id) DO NOTHING;
  END IF;

  INSERT INTO public.quality_activity_actions (
    id, activity_type, activity_id, action_description, action_type, priority,
    assigned_to_id, due_date, status, created_by
  )
  VALUES
    (
      'c1227005-0000-4000-8000-000000000001', 'review', v_review_id,
      'Confirm the routing acceptance criteria before cutover.',
      'corrective', 'high', v_user_id, '2026-10-20', 'open', v_user_id
    ),
    (
      'c1227005-0000-4000-8000-000000000002', 'review', v_review_id,
      'Close the open telematics inspection notes.',
      'preventive', 'medium', v_user_id, '2026-11-03', 'in_progress', v_user_id
    ),
    (
      'c1227005-0000-4000-8000-000000000003', 'review', v_review_id,
      'File the last management review minutes.',
      'observation', 'low', v_user_id, '2026-09-30', 'completed', v_user_id
    )
  ON CONFLICT (id) DO NOTHING;

  -- Issue action only when this project already has an issue
  SELECT i.id INTO v_issue_id
  FROM public.issues i
  WHERE i.project_id = v_project_id
    AND COALESCE(i.is_deleted, FALSE) = FALSE
  ORDER BY i.created_at NULLS LAST
  LIMIT 1;

  IF v_issue_id IS NOT NULL THEN
    SELECT COALESCE(MAX(action_number), 0) + 1 INTO v_next_action
    FROM public.issue_actions
    WHERE issue_id = v_issue_id;

    INSERT INTO public.issue_actions (
      id, issue_id, action_number, action_description, action_type,
      assigned_to_id, target_date, status, created_by
    )
    VALUES (
      'c1227006-0000-4000-8000-000000000001', v_issue_id, v_next_action,
      'Agree the workaround with the depot leads.',
      'workaround', v_user_id, '2026-10-24', 'planned', v_user_id
    )
    ON CONFLICT (id) DO NOTHING;
  END IF;

  -- Lesson action only when this project already has a lesson
  SELECT l.id INTO v_lesson_id
  FROM public.lessons l
  JOIN public.lessons_logs ll ON ll.id = l.lessons_log_id
  WHERE ll.project_id = v_project_id
    AND COALESCE(l.is_deleted, FALSE) = FALSE
    AND COALESCE(ll.is_deleted, FALSE) = FALSE
  ORDER BY l.created_at NULLS LAST
  LIMIT 1;

  IF v_lesson_id IS NOT NULL THEN
    INSERT INTO public.lesson_actions (
      id, lesson_id, action_description, assigned_to_id, target_date, status
    )
    VALUES (
      'c1227007-0000-4000-8000-000000000001', v_lesson_id,
      'Share the cutover lesson with the next stage team.',
      v_user_id, '2026-10-28', 'pending'
    )
    ON CONFLICT (id) DO NOTHING;
  END IF;

  -- Authorisation requests: one pending (shows on Pending My Approval and
  -- My Submitted Records) and one already approved (Submitted only).
  SELECT d.id INTO v_decision_id
  FROM public.project_decisions d
  WHERE d.project_id = v_project_id
    AND COALESCE(d.is_deleted, FALSE) = FALSE
  ORDER BY d.created_at NULLS LAST
  LIMIT 1;

  IF v_decision_id IS NOT NULL THEN
    v_record_id := v_decision_id;
    v_table_name := 'project_decisions';
  ELSE
    v_record_id := v_review_id;
    v_table_name := 'quality_reviews';
  END IF;

  INSERT INTO public.record_authorisation_requests (
    id, record_type, table_name, root_record_id, record_id, submission_batch_id,
    submitted_by, authoriser_id, approval_level, role_label, status,
    submission_notes, decision_notes, submitted_at, activated_at, decided_at
  )
  VALUES
    (
      'c1227008-0000-4000-8000-000000000001', v_table_name, v_table_name,
      v_record_id, v_record_id, 'c1227009-0000-4000-8000-000000000001',
      v_user_id, v_user_id, 1, 'Project owner', 'pending',
      'Please approve the Velocity Freight sample submission.',
      NULL, '2026-10-08 08:00:00+00', '2026-10-08 08:00:00+00', NULL
    ),
    (
      'c1227008-0000-4000-8000-000000000002', v_table_name, v_table_name,
      v_record_id, v_record_id, 'c1227009-0000-4000-8000-000000000002',
      v_user_id, v_user_id, 1, 'Project owner', 'approved',
      'Earlier sample submission for the same project.',
      'Approved as the sample decision.',
      '2026-09-18 08:00:00+00', '2026-09-18 08:00:00+00', '2026-09-19 10:00:00+00'
    )
  ON CONFLICT (id) DO NOTHING;

  RAISE NOTICE 'v1227: seeded meetings, approval chains, actions, and authorisation requests for SEED334-PRJ-08';
END $$;
