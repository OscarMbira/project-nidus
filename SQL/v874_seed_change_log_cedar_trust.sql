-- =============================================================================
-- v874: Seed Data – Change Log for Cedar Trust Schools (SEED334-PRJ-07)
-- Purpose: Populate public.change_requests + public.change_log so the Platform
--          Change Log page shows sample lifecycle entries for the selected project.
-- Prerequisites:
--   - Project SEED334-PRJ-07 exists (v334 / portfolio seed)
--   - change_requests / change_log tables (v31, v486 is_deleted)
-- Idempotent: fixed UUIDs + ON CONFLICT (id) DO NOTHING. Safe to re-run.
-- Display IDs: change_reference left NULL so BEFORE INSERT trigger (v526 /
--   Admin display-id path) assigns CR-NNNN — do not hand-mint references.
-- =============================================================================

DO $$
DECLARE
  v_project_id UUID;
  v_user_id    UUID;
  v_auth_uid   UUID;

  -- Fixed change_request ids
  v_cr1 UUID := '874a0001-c7ed-4a01-9c01-534433340001';
  v_cr2 UUID := '874a0001-c7ed-4a01-9c01-534433340002';
  v_cr3 UUID := '874a0001-c7ed-4a01-9c01-534433340003';
  v_cr4 UUID := '874a0001-c7ed-4a01-9c01-534433340004';
  v_cr5 UUID := '874a0001-c7ed-4a01-9c01-534433340005';
BEGIN

  SELECT id INTO v_project_id
  FROM public.projects
  WHERE project_code = 'SEED334-PRJ-07'
    AND COALESCE(is_deleted, false) = false
  LIMIT 1;

  IF v_project_id IS NULL THEN
    RAISE NOTICE 'v874: Project SEED334-PRJ-07 not found — run portfolio seed first. Skipping.';
    RETURN;
  END IF;

  -- Prefer project owner, then any active membership, then any user
  SELECT owner_user_id INTO v_user_id
  FROM public.projects
  WHERE id = v_project_id;

  IF v_user_id IS NULL THEN
    SELECT pm.user_id INTO v_user_id
    FROM public.project_memberships pm
    WHERE pm.project_id = v_project_id
      AND COALESCE(pm.is_active, true) = true
    LIMIT 1;
  END IF;

  IF v_user_id IS NULL THEN
    SELECT id INTO v_user_id
    FROM public.users
    WHERE COALESCE(is_deleted, false) = false
    LIMIT 1;
  END IF;

  IF v_user_id IS NULL THEN
    RAISE NOTICE 'v874: No user available to attribute seed rows. Skipping.';
    RETURN;
  END IF;

  SELECT auth_user_id INTO v_auth_uid
  FROM public.users
  WHERE id = v_user_id
  LIMIT 1;

  IF v_auth_uid IS NOT NULL THEN
    PERFORM set_config(
      'request.jwt.claims',
      json_build_object('sub', v_auth_uid::text)::text,
      true
    );
  END IF;

  -- ---------------------------------------------------------------------------
  -- Change requests (parent rows required for Change Log list + filters)
  -- ---------------------------------------------------------------------------
  INSERT INTO public.change_requests (
    id, project_id,
    change_reference, change_title, change_description,
    change_category, change_type,
    reason_for_change, current_situation, proposed_solution,
    priority, urgency, business_criticality,
    status, submission_date,
    requestor_name, requestor_organization, notes,
    submitted_by, created_by,
    is_deleted, created_at, updated_at
  ) VALUES
    (v_cr1, v_project_id,
     NULL,
     'Extend SIS data sync window for exam results',
     'Request to extend nightly SIS→LMS grade sync from 02:00–03:00 to 01:00–04:00 during end-of-term exam result publication.',
     'schedule', 'enhancement',
     'Exam boards publish results in batches overnight; the current one-hour window leaves late batches unsynced until the next night.',
     'Grade sync job runs 02:00–03:00 only. Late-night publications miss the window and appear in LMS a day late.',
     'Widen the sync window to 01:00–04:00 for the final two weeks of each term, then revert to the baseline window.',
     'high', 'high', 'high',
     'approved', CURRENT_DATE - 28,
     'Naledi Moyo', 'Cedar Trust Academic Operations',
     'Approved by project Change Board with a temporary ops runbook.',
     v_user_id, v_user_id, false, NOW() - INTERVAL '28 days', NOW() - INTERVAL '20 days'),

    (v_cr2, v_project_id,
     NULL,
     'Add parent portal MFA for guardians with multiple learners',
     'Introduce mandatory MFA for parent/guardian accounts linked to more than one learner record.',
     'scope', 'enhancement',
     'Safeguarding review identified elevated risk for multi-learner guardian accounts accessing sensitive pastoral notes.',
     'Parent portal uses password-only login. Multi-learner accounts can view sibling data without a second factor.',
     'Enable TOTP MFA for multi-learner guardian accounts; single-learner accounts remain optional MFA.',
     'high', 'medium', 'critical',
     'under-assessment', CURRENT_DATE - 12,
     'Thabo Dlamini', 'Cedar Trust Safeguarding Office',
     'Impact assessment in progress with Identity vendor.',
     v_user_id, v_user_id, false, NOW() - INTERVAL '12 days', NOW() - INTERVAL '5 days'),

    (v_cr3, v_project_id,
     NULL,
     'Increase integration contingency by R 180,000',
     'Release additional contingency to cover LMS connector rework after SIS vendor schema changes.',
     'budget', 'corrective',
     'SIS vendor shipped a breaking schema change outside the contracted freeze window; remapping exceeds remaining contingency.',
     'Integration contingency is 82% consumed. Remaining funds cannot cover the remapping sprint plus regression testing.',
     'Release R 180,000 from programme contingency, with fortnightly finance reporting until Stage Gate.',
     'urgent', 'high', 'high',
     'pending-approval', CURRENT_DATE - 7,
     'Ayanda Nkosi', 'PMO Finance',
     'Awaiting Programme Board decision.',
     v_user_id, v_user_id, false, NOW() - INTERVAL '7 days', NOW() - INTERVAL '2 days'),

    (v_cr4, v_project_id,
     NULL,
     'Defer classroom roster live-edit feature to Phase 2',
     'Move interactive live roster editing out of Phase 1 go-live to protect the critical path.',
     'scope', 'descope',
     'UAT showed low teacher uptake for live edit versus nightly sync; keeping it in Phase 1 risks delaying SIS cutover.',
     'Live roster edit is in Phase 1 scope (~5 developer-weeks remaining). Teachers primarily use overnight sync today.',
     'Defer live edit to Phase 2 backlog. Redeploy capacity to SIS cutover rehearsal and data quality fixes.',
     'medium', 'medium', 'medium',
     'implemented', CURRENT_DATE - 40,
     'Project Manager', 'Cedar Trust Delivery',
     'Implemented; Phase 2 backlog updated.',
     v_user_id, v_user_id, false, NOW() - INTERVAL '40 days', NOW() - INTERVAL '25 days'),

    (v_cr5, v_project_id,
     NULL,
     'Reject third-party attendance kiosk integration',
     'Decline a late request to integrate a biometric attendance kiosk vendor before go-live.',
     'technical', 'enhancement',
     'Vendor approached mid-UAT; integration would add unplanned hardware dependency and security review.',
     'No kiosk integration in baseline. Existing badge/QR attendance meets go-live acceptance criteria.',
     'Reject for Phase 1. Invite vendor to Phase 2 RFI if the board prioritises biometric attendance.',
     'low', 'low', 'low',
     'rejected', CURRENT_DATE - 18,
     'IT Security Lead', 'Cedar Trust ICT',
     'Rejected — out of scope for Phase 1.',
     v_user_id, v_user_id, false, NOW() - INTERVAL '18 days', NOW() - INTERVAL '15 days')
  ON CONFLICT (id) DO NOTHING;

  -- ---------------------------------------------------------------------------
  -- Change log lifecycle entries (what the Change Log page lists)
  -- ---------------------------------------------------------------------------
  INSERT INTO public.change_log (
    id, change_request_id, project_id,
    log_date, log_type, action,
    performed_by, performed_by_role,
    old_value, new_value, description, comments,
    created_by, is_deleted, created_at
  ) VALUES
    -- CR1: submitted → assessed → approved
    ('874a0001-106e-4a01-9c01-534433340001', v_cr1, v_project_id,
     NOW() - INTERVAL '28 days', 'status-change', 'submitted',
     v_user_id, 'project_manager',
     NULL, 'submitted',
     'Change request submitted for extended SIS grade sync window.',
     'Raised after exam board overnight publishing schedule review.',
     v_user_id, false, NOW() - INTERVAL '28 days'),

    ('874a0001-106e-4a01-9c01-534433340002', v_cr1, v_project_id,
     NOW() - INTERVAL '24 days', 'assessment', 'assessed',
     v_user_id, 'technical_lead',
     'submitted', 'under-assessment',
     'Impact assessment completed: low technical risk; ops runbook required.',
     'DBA confirmed job window change is configuration-only.',
     v_user_id, false, NOW() - INTERVAL '24 days'),

    ('874a0001-106e-4a01-9c01-534433340003', v_cr1, v_project_id,
     NOW() - INTERVAL '20 days', 'approval', 'approved',
     v_user_id, 'project_sponsor',
     'under-assessment', 'approved',
     'Change Board approved temporary sync window for exam periods.',
     'Condition: revert to baseline window after each term ends.',
     v_user_id, false, NOW() - INTERVAL '20 days'),

    -- CR2: submitted → assessed (still open)
    ('874a0001-106e-4a01-9c01-534433340004', v_cr2, v_project_id,
     NOW() - INTERVAL '12 days', 'status-change', 'submitted',
     v_user_id, 'project_manager',
     NULL, 'submitted',
     'Safeguarding-driven MFA change submitted for parent portal.',
     NULL,
     v_user_id, false, NOW() - INTERVAL '12 days'),

    ('874a0001-106e-4a01-9c01-534433340005', v_cr2, v_project_id,
     NOW() - INTERVAL '8 days', 'assessment', 'assessed',
     v_user_id, 'security_lead',
     'submitted', 'under-assessment',
     'Security assessment started with identity provider team.',
     'Awaiting licence confirmation for TOTP seats.',
     v_user_id, false, NOW() - INTERVAL '8 days'),

    -- CR3: submitted → pending approval
    ('874a0001-106e-4a01-9c01-534433340006', v_cr3, v_project_id,
     NOW() - INTERVAL '7 days', 'status-change', 'submitted',
     v_user_id, 'pmo_admin',
     NULL, 'submitted',
     'Contingency uplift submitted after SIS schema change.',
     'Linked to vendor change notice CTS-VN-044.',
     v_user_id, false, NOW() - INTERVAL '7 days'),

    ('874a0001-106e-4a01-9c01-534433340007', v_cr3, v_project_id,
     NOW() - INTERVAL '3 days', 'comment', 'updated',
     v_user_id, 'project_manager',
     NULL, NULL,
     'Finance pack attached for Programme Board.',
     'Includes remapping estimate and regression test plan.',
     v_user_id, false, NOW() - INTERVAL '3 days'),

    -- CR4: full lifecycle through implemented
    ('874a0001-106e-4a01-9c01-534433340008', v_cr4, v_project_id,
     NOW() - INTERVAL '40 days', 'status-change', 'submitted',
     v_user_id, 'project_manager',
     NULL, 'submitted',
     'Descope request for live roster edit submitted.',
     NULL,
     v_user_id, false, NOW() - INTERVAL '40 days'),

    ('874a0001-106e-4a01-9c01-534433340009', v_cr4, v_project_id,
     NOW() - INTERVAL '35 days', 'approval', 'approved',
     v_user_id, 'project_board_member',
     'submitted', 'approved',
     'Board approved deferral to Phase 2.',
     NULL,
     v_user_id, false, NOW() - INTERVAL '35 days'),

    ('874a0001-106e-4a01-9c01-53443334000a', v_cr4, v_project_id,
     NOW() - INTERVAL '25 days', 'implementation', 'implemented',
     v_user_id, 'project_manager',
     'approved', 'implemented',
     'Scope baseline and backlog updated; capacity redeployed to cutover rehearsal.',
     'Phase 2 epic CTS-P2-ROSTER created.',
     v_user_id, false, NOW() - INTERVAL '25 days'),

    -- CR5: submitted → rejected
    ('874a0001-106e-4a01-9c01-53443334000b', v_cr5, v_project_id,
     NOW() - INTERVAL '18 days', 'status-change', 'submitted',
     v_user_id, 'it_security',
     NULL, 'submitted',
     'Kiosk integration change submitted for review.',
     NULL,
     v_user_id, false, NOW() - INTERVAL '18 days'),

    ('874a0001-106e-4a01-9c01-53443334000c', v_cr5, v_project_id,
     NOW() - INTERVAL '15 days', 'approval', 'rejected',
     v_user_id, 'project_sponsor',
     'submitted', 'rejected',
     'Rejected for Phase 1 — out of baseline scope and critical path.',
     'Vendor invited to Phase 2 RFI if prioritised later.',
     v_user_id, false, NOW() - INTERVAL '15 days')
  ON CONFLICT (id) DO NOTHING;

  RAISE NOTICE 'v874: Change Log seed complete for SEED334-PRJ-07 (project %).', v_project_id;

END $$;
