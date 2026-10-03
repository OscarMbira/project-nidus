-- =============================================================================
-- v972: Seed Data — Governance group (Core PM sidebar).
-- Covers: Decision Log (project_decisions — 150 rows exist system-wide but 0 for
--         the anchor seed projects), Meetings (comm_meetings + participants — 0
--         rows system-wide).
-- NOT seeded here (computed/rollup, no dedicated table to seed):
--   - Actions -> public "Governance Action Register" (v966 Phase 12) is an
--     explicitly read-only rollup view with no create route — nothing to seed.
--   - Pending My Approval / My Submitted Records / Approval Chains -> driven by
--     the unified approvals view (v964a/v964b) over already-governed records
--     (e.g. change_requests record_status) — the v967/v969 seed data already
--     written feeds this view; no separate table.
-- Prerequisites: v305 (anchor projects), v628d (project_decisions),
--                v409 (comm_meetings/comm_meeting_participants).
-- Idempotent: fixed hex-only UUIDs + ON CONFLICT (id) DO NOTHING. Safe to re-run.
-- Display IDs: project_decisions.decision_reference is a plain optional text
--   field with no admin display-id trigger wired — left NULL.
-- Note: comm_meetings.account_id is NOT NULL, but the anchor seed projects
--   (SQL/v305) have project.account_id = NULL (pre-dates account scoping) — an
--   existing accounts row is used instead so the FK is satisfiable; this does
--   not change the anchor projects themselves.
-- =============================================================================

DO $$
DECLARE
  v_proj_dw  UUID; -- SEED-PP-01 Digital Workspace Rollout
  v_proj_bi  UUID; -- SEED-PP-02 BI Platform Implementation
  v_proj_erp UUID; -- SEED-PP-03 ERP Phase 1
  v_user_id  UUID;
  v_auth_uid UUID;
  v_account_id UUID;

  v_mtg1 UUID := '97200002-3701-4a01-9c01-534433340001';
  v_mtg2 UUID := '97200002-3701-4a01-9c01-534433340002';
BEGIN

  SELECT id INTO v_proj_dw  FROM public.projects WHERE project_code = 'SEED-PP-01' AND COALESCE(is_deleted, false) = false LIMIT 1;
  SELECT id INTO v_proj_bi  FROM public.projects WHERE project_code = 'SEED-PP-02' AND COALESCE(is_deleted, false) = false LIMIT 1;
  SELECT id INTO v_proj_erp FROM public.projects WHERE project_code = 'SEED-PP-03' AND COALESCE(is_deleted, false) = false LIMIT 1;

  IF v_proj_dw IS NULL OR v_proj_bi IS NULL OR v_proj_erp IS NULL THEN
    RAISE NOTICE 'v972: One or more anchor seed projects (SEED-PP-01/02/03) not found — run v305 first. Skipping.';
    RETURN;
  END IF;

  SELECT id INTO v_user_id FROM public.users WHERE COALESCE(is_deleted, false) = false LIMIT 1;
  IF v_user_id IS NULL THEN
    RAISE NOTICE 'v972: No user available to attribute seed rows. Skipping.';
    RETURN;
  END IF;

  SELECT auth_user_id INTO v_auth_uid FROM public.users WHERE id = v_user_id LIMIT 1;
  IF v_auth_uid IS NOT NULL THEN
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_auth_uid::text)::text, true);
  END IF;

  SELECT id INTO v_account_id FROM public.accounts LIMIT 1;

  -- ---------------------------------------------------------------------------
  -- DECISION LOG (public.project_decisions) — across 3 anchor projects
  -- ---------------------------------------------------------------------------
  INSERT INTO public.project_decisions (
    id, project_id, decision_title, description, decision_date,
    decided_by, decided_by_name, category, status, priority, rationale, impact,
    created_by, is_deleted, created_at, updated_at
  ) VALUES
    ('97200001-dc01-4a01-9c01-534433340001', v_proj_dw,
     'Adopt phased wave rollout instead of big-bang cutover',
     'Decision to roll out the digital workspace in 2 waves (HQ+Birmingham, then Manchester+Leeds) rather than a single simultaneous cutover.',
     CURRENT_DATE - 95, v_auth_uid, 'Project Board', 'delivery_approach', 'approved', 'high',
     'Phased rollout reduces helpdesk surge risk and allows lessons from wave 1 to inform wave 2.',
     'Extends overall rollout timeline by 3 weeks but significantly reduces support risk.',
     v_auth_uid, false, NOW() - INTERVAL '95 days', NOW() - INTERVAL '95 days'),

    ('97200001-dc01-4a01-9c01-534433340002', v_proj_dw,
     'Approve wave 2 scope extension to Manchester and Leeds',
     'Decision to formally extend wave 2 scope per change request SEED-CR (see change log).',
     CURRENT_DATE - 14, v_auth_uid, 'Project Sponsor', 'scope', 'approved', 'medium',
     'Regional parity concerns outweighed the modest budget impact.',
     'Wave 2 seat count increases from 420 to 600.',
     v_auth_uid, false, NOW() - INTERVAL '14 days', NOW() - INTERVAL '14 days'),

    ('97200001-dc01-4a01-9c01-534433340003', v_proj_bi,
     'Use shared Power BI Premium capacity instead of per-BU dedicated capacity',
     'Decision to standardise all business units onto one shared Premium capacity pool rather than provisioning dedicated capacity per unit.',
     CURRENT_DATE - 40, v_auth_uid, 'BI Platform Architect', 'technical', 'approved', 'medium',
     'Shared capacity meets current refresh SLAs at a fraction of the licensing cost of per-BU dedicated capacity.',
     'Revisit at quarterly licensing review if any business unit breaches refresh SLA.',
     v_auth_uid, false, NOW() - INTERVAL '40 days', NOW() - INTERVAL '40 days'),

    ('97200001-dc01-4a01-9c01-534433340004', v_proj_erp,
     'Defer non-critical custom reports to Phase 2',
     'Decision to defer 8 low-usage custom ERP reports out of Phase 1 scope to protect the go-live date.',
     CURRENT_DATE - 20, v_auth_uid, 'Programme Manager', 'scope', 'approved', 'low',
     'Usage analysis showed these reports would serve under 5% of users; deferring protects the critical path.',
     'Phase 2 backlog updated; business owners notified.',
     v_auth_uid, false, NOW() - INTERVAL '20 days', NOW() - INTERVAL '20 days')
  ON CONFLICT (id) DO NOTHING;

  -- ---------------------------------------------------------------------------
  -- MEETINGS (public.comm_meetings + public.comm_meeting_participants)
  -- ---------------------------------------------------------------------------
  IF v_account_id IS NOT NULL THEN
    INSERT INTO public.comm_meetings (
      id, project_id, account_id, title, description, meeting_type, status,
      scheduled_start, scheduled_end, organised_by, created_at, updated_at
    ) VALUES
      (v_mtg1, v_proj_dw, v_account_id, 'Wave 2 Rollout Readiness Review',
       'Review of wave 2 rollout readiness across Manchester and Leeds offices.',
       'video', 'ended',
       NOW() - INTERVAL '10 days', NOW() - INTERVAL '10 days' + INTERVAL '45 minutes',
       v_user_id, NOW() - INTERVAL '12 days', NOW() - INTERVAL '10 days'),

      (v_mtg2, v_proj_bi, v_account_id, 'BI Platform UAT Defect Triage',
       'Weekly triage of open UAT defects ahead of go-live decision.',
       'video', 'scheduled',
       NOW() + INTERVAL '2 days', NOW() + INTERVAL '2 days' + INTERVAL '30 minutes',
       v_user_id, NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days')
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.comm_meeting_participants (
      id, meeting_id, user_id, invite_status
    ) VALUES
      ('97200003-3901-4a01-9c01-534433340001', v_mtg1, v_user_id, 'accepted'),
      ('97200003-3901-4a01-9c01-534433340002', v_mtg2, v_user_id, 'invited')
    ON CONFLICT (id) DO NOTHING;
  ELSE
    RAISE NOTICE 'v972: No accounts row found — comm_meetings rows skipped (account_id is NOT NULL).';
  END IF;

  RAISE NOTICE 'v972: Governance seed complete (decision log, meetings) for SEED-PP-01/02/03.';

END $$;
