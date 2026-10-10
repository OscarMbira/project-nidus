-- =============================================================================
-- v1228: Make SEED334-PRJ-08 sample approvals visible to project members,
-- and seed Stage Gate reviews for the same project.
--
-- v1227 stored authorisation requests against projects.owner_user_id only.
-- Pending My Approval and My Submitted Records filter by the signed-in user,
-- so a member who is not that owner saw an empty list.
--
-- This file adds one pending request and one approved request for every
-- active member of SEED334-PRJ-08, and for the project owner.
-- It also inserts four stage_gate_reviews rows for that project.
--
-- Idempotent. Public schema only. Safe to re-run.
-- =============================================================================

DO $$
DECLARE
  v_project_id  UUID;
  v_account_id  UUID;
  v_owner_id    UUID;
  v_record_id   UUID;
  v_table_name  TEXT;
  v_decision_id UUID;
  v_review_id   UUID;
  v_member_id   UUID;
BEGIN
  SELECT id, account_id, owner_user_id
    INTO v_project_id, v_account_id, v_owner_id
  FROM public.projects
  WHERE project_code = 'SEED334-PRJ-08'
    AND COALESCE(is_deleted, FALSE) = FALSE
  LIMIT 1;

  IF v_project_id IS NULL THEN
    RAISE EXCEPTION 'v1228: project SEED334-PRJ-08 not found';
  END IF;
  IF v_account_id IS NULL THEN
    RAISE EXCEPTION 'v1228: project SEED334-PRJ-08 has no account_id';
  END IF;

  SELECT d.id INTO v_decision_id
  FROM public.project_decisions d
  WHERE d.project_id = v_project_id
    AND COALESCE(d.is_deleted, FALSE) = FALSE
  ORDER BY d.created_at NULLS LAST
  LIMIT 1;

  SELECT qr.id INTO v_review_id
  FROM public.quality_reviews qr
  WHERE qr.project_id = v_project_id
    AND COALESCE(qr.is_deleted, FALSE) = FALSE
  ORDER BY qr.created_at NULLS LAST
  LIMIT 1;

  IF v_decision_id IS NOT NULL THEN
    v_record_id := v_decision_id;
    v_table_name := 'project_decisions';
  ELSIF v_review_id IS NOT NULL THEN
    v_record_id := v_review_id;
    v_table_name := 'quality_reviews';
  ELSE
    v_record_id := 'c1227004-0000-4000-8000-000000000001';
    v_table_name := 'quality_reviews';
  END IF;

  FOR v_member_id IN
    SELECT DISTINCT s.user_id
    FROM (
      SELECT v_owner_id AS user_id
      UNION
      SELECT pm.user_id
      FROM public.project_memberships pm
      WHERE pm.project_id = v_project_id
        AND COALESCE(pm.is_active, TRUE) = TRUE
    ) s
    WHERE s.user_id IS NOT NULL
  LOOP
    INSERT INTO public.record_authorisers (
      account_id, project_id, table_name, authoriser_user_id,
      approval_level, role_label, is_active, created_by
    )
    SELECT
      v_account_id, v_project_id, 'project_decisions', v_member_id,
      1, 'Project member', TRUE, v_member_id
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.record_authorisers a
      WHERE a.account_id = v_account_id
        AND a.project_id = v_project_id
        AND a.table_name = 'project_decisions'
        AND a.authoriser_user_id = v_member_id
    );

    INSERT INTO public.record_authorisation_requests (
      record_type, table_name, root_record_id, record_id, submission_batch_id,
      submitted_by, authoriser_id, approval_level, role_label, status,
      submission_notes, submitted_at, activated_at
    )
    SELECT
      v_table_name, v_table_name, v_record_id, v_record_id, gen_random_uuid(),
      v_member_id, v_member_id, 1, 'Project member', 'pending',
      'Please approve the Velocity Freight sample submission.',
      '2026-10-08 08:00:00+00', '2026-10-08 08:00:00+00'
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.record_authorisation_requests r
      WHERE r.authoriser_id = v_member_id
        AND r.status = 'pending'
        AND r.submission_notes = 'Please approve the Velocity Freight sample submission.'
    );

    INSERT INTO public.record_authorisation_requests (
      record_type, table_name, root_record_id, record_id, submission_batch_id,
      submitted_by, authoriser_id, approval_level, role_label, status,
      submission_notes, decision_notes, submitted_at, activated_at, decided_at
    )
    SELECT
      v_table_name, v_table_name, v_record_id, v_record_id, gen_random_uuid(),
      v_member_id, v_member_id, 1, 'Project member', 'approved',
      'Earlier sample submission for the same project.',
      'Approved as the sample decision.',
      '2026-09-18 08:00:00+00', '2026-09-18 08:00:00+00', '2026-09-19 10:00:00+00'
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.record_authorisation_requests r
      WHERE r.submitted_by = v_member_id
        AND r.status = 'approved'
        AND r.submission_notes = 'Earlier sample submission for the same project.'
    );
  END LOOP;

  INSERT INTO public.stage_gate_reviews (
    id, gate_name, project_id, stage, status, decision_date, outcome, notes,
    is_deleted, created_by, updated_by
  )
  VALUES
    (
      'c1228001-0000-4000-8000-000000000001',
      'Initiation gate', v_project_id, 'Initiation', 'approved', '2026-03-12',
      'Go. The freight scope and depot plan were accepted.',
      'Board accepted the initiation pack for Velocity Freight.',
      FALSE, v_owner_id, v_owner_id
    ),
    (
      'c1228001-0000-4000-8000-000000000002',
      'Planning gate', v_project_id, 'Planning', 'pending', '2026-10-20',
      NULL,
      'Waiting on the routing cutover plan before a go decision.',
      FALSE, v_owner_id, v_owner_id
    ),
    (
      'c1228001-0000-4000-8000-000000000003',
      'Execution gate', v_project_id, 'Execution', 'draft', NULL,
      NULL,
      'Draft checkpoint before telematics rollout to the depots.',
      FALSE, v_owner_id, v_owner_id
    ),
    (
      'c1228001-0000-4000-8000-000000000004',
      'Closing gate', v_project_id, 'Closing', 'rejected', '2026-09-02',
      'No-go. Handover evidence was incomplete.',
      'Return to execution until the handover pack is complete.',
      FALSE, v_owner_id, v_owner_id
    )
  ON CONFLICT (id) DO NOTHING;

  RAISE NOTICE 'v1228: member approvals and stage gates seeded for SEED334-PRJ-08';
END $$;
