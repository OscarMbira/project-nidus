-- =============================================================================
-- v967: Seed Data — Benefits Register + Change Control (Core PM sidebar leaves)
-- Purpose: Populate public.benefits (0 rows system-wide) and public.change_requests /
--          public.change_log (0 rows for the SEED-PP-*/SEED-IND-* anchor projects —
--          v702/v874 already seeded change data for other, unrelated demo projects)
--          so the Platform "Benefits" and "Change Control" sidebar leaves show sample
--          content when an anchor seed project is selected.
-- Scope: attaches to 3 existing anchor projects from SQL/v305
--        (SEED-PP-01 Digital Workspace Rollout, SEED-PP-02 BI Platform Implementation,
--         SEED-IND-01 Independent Research Project) — a handful of rows per table,
--         not exhaustive coverage across all 20 seed projects.
-- Idempotent: fixed hex-only UUIDs + ON CONFLICT (id) DO NOTHING. Safe to re-run.
-- Display IDs: change_requests.change_reference left NULL — a BEFORE INSERT trigger
--   (v526 platform entity code path) assigns CR-NNNN, matching the v874 precedent.
--   change_log.display_id left '' — admin.trg_apply_admin_display_id (v876) assigns
--   CL-XXXXXXXXX. benefits.benefit_code has NO admin/entity-code trigger wired (plain
--   VARCHAR, partial-unique per context) — hand-assigned SEED-BEN-nn codes, consistent
--   with how existing seed files (e.g. v305 portfolio/programme codes) hand-assign
--   codes for tables without a generation trigger.
-- =============================================================================

DO $$
DECLARE
  v_proj_dw   UUID; -- SEED-PP-01 Digital Workspace Rollout
  v_proj_bi   UUID; -- SEED-PP-02 BI Platform Implementation
  v_proj_ind  UUID; -- SEED-IND-01 Independent Research Project
  v_user_id   UUID;
  v_auth_uid  UUID;

  -- Fixed change_request ids
  v_cr1 UUID := '96700001-c7ed-4a01-9c01-534433340001';
  v_cr2 UUID := '96700001-c7ed-4a01-9c01-534433340002';
  v_cr3 UUID := '96700001-c7ed-4a01-9c01-534433340003';
BEGIN

  SELECT id INTO v_proj_dw FROM public.projects WHERE project_code = 'SEED-PP-01' AND COALESCE(is_deleted, false) = false LIMIT 1;
  SELECT id INTO v_proj_bi FROM public.projects WHERE project_code = 'SEED-PP-02' AND COALESCE(is_deleted, false) = false LIMIT 1;
  SELECT id INTO v_proj_ind FROM public.projects WHERE project_code = 'SEED-IND-01' AND COALESCE(is_deleted, false) = false LIMIT 1;

  IF v_proj_dw IS NULL OR v_proj_bi IS NULL OR v_proj_ind IS NULL THEN
    RAISE NOTICE 'v967: One or more anchor seed projects (SEED-PP-01/02, SEED-IND-01) not found — run v305 first. Skipping.';
    RETURN;
  END IF;

  SELECT id INTO v_user_id FROM public.users WHERE COALESCE(is_deleted, false) = false LIMIT 1;
  IF v_user_id IS NULL THEN
    RAISE NOTICE 'v967: No user available to attribute seed rows. Skipping.';
    RETURN;
  END IF;

  SELECT auth_user_id INTO v_auth_uid FROM public.users WHERE id = v_user_id LIMIT 1;
  IF v_auth_uid IS NOT NULL THEN
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_auth_uid::text)::text, true);
  END IF;

  -- ---------------------------------------------------------------------------
  -- BENEFITS REGISTER (public.benefits) — 4 rows across 3 anchor projects
  -- ---------------------------------------------------------------------------
  INSERT INTO public.benefits (
    id, benefit_code, benefit_name, benefit_description,
    project_id, benefit_category, benefit_type, benefit_owner_user_id,
    measurement_unit, baseline_value, target_value, current_value,
    benefit_status, expected_realization_date, tracking_frequency,
    estimated_value, value_currency, attribution_percentage,
    realization_probability, notes,
    is_deleted, created_at, created_by, updated_at
  ) VALUES
    ('96700002-b1a1-4a01-9c01-534433340001', 'SEED-BEN-01', 'Reduced IT helpdesk tickets from self-service workspace',
     'Rollout of the unified digital workspace is expected to cut routine access/reset tickets by giving staff self-service tools.',
     v_proj_dw, 'operational', 'quantifiable', v_user_id,
     'count', 850, 400, 620,
     'in_progress', CURRENT_DATE + INTERVAL '90 days', 'monthly',
     45000, 'USD', 100.00,
     75, 'Ticket volume tracked via helpdesk system monthly export.',
     false, NOW() - INTERVAL '60 days', v_user_id, NOW() - INTERVAL '5 days'),

    ('96700002-b1a1-4a01-9c01-534433340002', 'SEED-BEN-02', 'Faster new-starter onboarding time',
     'Standardised device/app provisioning through the new workspace should shorten new-starter time-to-productive from 5 days to 2 days.',
     v_proj_dw, 'employee', 'quantifiable', v_user_id,
     'hours', 40, 16, 28,
     'planned', CURRENT_DATE + INTERVAL '150 days', 'quarterly',
     18000, 'USD', 100.00,
     60, NULL,
     false, NOW() - INTERVAL '45 days', v_user_id, NOW() - INTERVAL '45 days'),

    ('96700002-b1a1-4a01-9c01-534433340003', 'SEED-BEN-01', 'Faster month-end reporting cycle',
     'Consolidated BI platform is expected to cut month-end financial reporting turnaround from 10 working days to 4.',
     v_proj_bi, 'operational', 'quantifiable', v_user_id,
     'days', 10, 4, 7,
     'in_progress', CURRENT_DATE + INTERVAL '60 days', 'monthly',
     60000, 'USD', 80.00,
     70, 'Attribution split 80/20 with the Finance Systems programme.',
     false, NOW() - INTERVAL '75 days', v_user_id, NOW() - INTERVAL '10 days'),

    ('96700002-b1a1-4a01-9c01-534433340004', 'SEED-BEN-01', 'Improved research data reuse across teams',
     'Independent research project outputs catalogued and made discoverable, reducing duplicate data-gathering effort across research teams.',
     v_proj_ind, 'strategic', 'qualitative', v_user_id,
     'score', 3, 8, 4,
     'identified', CURRENT_DATE + INTERVAL '180 days', 'quarterly',
     NULL, 'USD', 100.00,
     50, 'Qualitative benefit — tracked via quarterly researcher survey score (1-10).',
     false, NOW() - INTERVAL '20 days', v_user_id, NOW() - INTERVAL '20 days')
  ON CONFLICT (id) DO NOTHING;

  -- ---------------------------------------------------------------------------
  -- CHANGE CONTROL (public.change_requests + public.change_log) — 3 CRs across
  -- 2 anchor projects, each with a short lifecycle log
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
    (v_cr1, v_proj_dw,
     NULL,
     'Extend workspace rollout to 2 additional regional offices',
     'Add the Manchester and Leeds regional offices to the digital workspace rollout wave 2, originally scoped for HQ and Birmingham only.',
     'scope', 'enhancement',
     'Regional office staff raised parity concerns after HQ rollout went live; leadership wants a single rollout wave rather than a follow-up project.',
     'Wave 2 scope currently covers HQ and Birmingham only (420 seats). Manchester and Leeds (180 seats) are unscheduled.',
     'Extend wave 2 hardware/licensing order to cover Manchester and Leeds; reuse the existing rollout runbook and training material.',
     'medium', 'medium', 'medium',
     'approved', CURRENT_DATE - 22,
     'Priya Adeyemi', 'Regional Operations',
     'Approved by project board; budget covered from wave 3 contingency.',
     v_user_id, v_user_id, false, NOW() - INTERVAL '22 days', NOW() - INTERVAL '14 days'),

    (v_cr2, v_proj_dw,
     NULL,
     'Delay legacy VPN client decommission by 4 weeks',
     'Push back the planned legacy VPN client retirement to allow the finance team to finish a dependent quarter-end reporting cycle.',
     'schedule', 'remediation',
     'Finance flagged that decommissioning during quarter-end would block access to a legacy reporting tool that has not yet been migrated.',
     'Legacy VPN client is scheduled for retirement in 2 weeks, ahead of the finance reporting tool migration.',
     'Move the VPN client retirement date 4 weeks later, immediately after quarter-end close.',
     'medium', 'high', 'medium',
     'under-assessment', CURRENT_DATE - 6,
     'Finance Systems Lead', 'Finance',
     'Awaiting confirmation from the legacy tool migration workstream.',
     v_user_id, v_user_id, false, NOW() - INTERVAL '6 days', NOW() - INTERVAL '2 days'),

    (v_cr3, v_proj_bi,
     NULL,
     'Reject ad-hoc Power BI Premium capacity request',
     'Decline a mid-project request from one business unit to procure a dedicated Power BI Premium capacity outside the agreed shared-capacity model.',
     'technical', 'enhancement',
     'One business unit requested dedicated capacity for faster refresh times, outside the shared-capacity licensing model agreed at project initiation.',
     'Shared Premium capacity is in place and meets agreed refresh SLAs for all onboarded business units so far.',
     'Reject the dedicated capacity request; revisit shared-capacity sizing at the next quarterly licensing review if refresh SLAs are missed.',
     'low', 'low', 'low',
     'rejected', CURRENT_DATE - 15,
     'BI Platform Architect', 'Enterprise BI',
     'Rejected — no SLA breach evidence; cost impact would exceed agreed licensing budget.',
     v_user_id, v_user_id, false, NOW() - INTERVAL '15 days', NOW() - INTERVAL '12 days')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.change_log (
    id, change_request_id, project_id,
    log_date, log_type, action,
    performed_by, performed_by_role,
    old_value, new_value, description, comments,
    created_by, is_deleted, created_at, display_id
  ) VALUES
    -- CR1: submitted -> assessed -> approved
    ('96700003-106e-4a01-9c01-534433340001', v_cr1, v_proj_dw,
     NOW() - INTERVAL '22 days', 'status-change', 'submitted',
     v_user_id, 'project_manager', NULL, 'submitted',
     'Change request submitted to extend rollout wave 2 scope.', 'Raised after regional parity feedback.',
     v_user_id, false, NOW() - INTERVAL '22 days', ''),

    ('96700003-106e-4a01-9c01-534433340002', v_cr1, v_proj_dw,
     NOW() - INTERVAL '18 days', 'assessment', 'assessed',
     v_user_id, 'technical_lead', 'submitted', 'under-assessment',
     'Hardware and licensing impact assessed as low risk; lead time confirmed with vendor.', NULL,
     v_user_id, false, NOW() - INTERVAL '18 days', ''),

    ('96700003-106e-4a01-9c01-534433340003', v_cr1, v_proj_dw,
     NOW() - INTERVAL '14 days', 'approval', 'approved',
     v_user_id, 'project_sponsor', 'under-assessment', 'approved',
     'Project board approved the scope extension.', 'Funded from wave 3 contingency.',
     v_user_id, false, NOW() - INTERVAL '14 days', ''),

    -- CR2: submitted -> assessed (still open)
    ('96700003-106e-4a01-9c01-534433340004', v_cr2, v_proj_dw,
     NOW() - INTERVAL '6 days', 'status-change', 'submitted',
     v_user_id, 'project_manager', NULL, 'submitted',
     'Change submitted to delay legacy VPN client decommission.', NULL,
     v_user_id, false, NOW() - INTERVAL '6 days', ''),

    ('96700003-106e-4a01-9c01-534433340005', v_cr2, v_proj_dw,
     NOW() - INTERVAL '2 days', 'assessment', 'assessed',
     v_user_id, 'technical_lead', 'submitted', 'under-assessment',
     'Confirmed dependency with the finance reporting tool migration workstream.', 'Awaiting formal sign-off.',
     v_user_id, false, NOW() - INTERVAL '2 days', ''),

    -- CR3: submitted -> rejected
    ('96700003-106e-4a01-9c01-534433340006', v_cr3, v_proj_bi,
     NOW() - INTERVAL '15 days', 'status-change', 'submitted',
     v_user_id, 'pmo_admin', NULL, 'submitted',
     'Dedicated Premium capacity request submitted for review.', NULL,
     v_user_id, false, NOW() - INTERVAL '15 days', ''),

    ('96700003-106e-4a01-9c01-534433340007', v_cr3, v_proj_bi,
     NOW() - INTERVAL '12 days', 'approval', 'rejected',
     v_user_id, 'project_sponsor', 'submitted', 'rejected',
     'Rejected — no SLA breach evidence to justify dedicated capacity cost.', 'Revisit at next licensing review.',
     v_user_id, false, NOW() - INTERVAL '12 days', '')
  ON CONFLICT (id) DO NOTHING;

  RAISE NOTICE 'v967: Benefits + Change Control seed complete for SEED-PP-01/02 and SEED-IND-01.';

END $$;
