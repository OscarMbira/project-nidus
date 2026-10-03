-- =============================================================================
-- v969: Seed Data — RAID group: Assumptions Register + Dependency Register.
-- public.risks (154 rows) and public.issues (72 rows) already cover the anchor
-- seed projects — skipped, matching the "Template Library was already
-- populated" precedent. public.assumptions and public.dependencies_register
-- were 0 rows system-wide.
-- Prerequisites: v305 (anchor projects), v26 (assumptions / dependencies_register).
-- Idempotent: fixed hex-only UUIDs + ON CONFLICT (id) DO NOTHING. Safe to re-run.
-- Display IDs: assumption_code / dependency_code are plain optional VARCHAR
--   fields with no admin display-id trigger wired (confirmed — no ID Generation
--   rule targets these tables); hand-assigned SEED-* codes, unique per project.
-- =============================================================================

DO $$
DECLARE
  v_proj_dw  UUID; -- SEED-PP-01 Digital Workspace Rollout
  v_proj_bi  UUID; -- SEED-PP-02 BI Platform Implementation
  v_proj_int UUID; -- SEED-PP-09 Integration Hub
  v_user_id  UUID;
  v_auth_uid UUID;
BEGIN

  SELECT id INTO v_proj_dw  FROM public.projects WHERE project_code = 'SEED-PP-01' AND COALESCE(is_deleted, false) = false LIMIT 1;
  SELECT id INTO v_proj_bi  FROM public.projects WHERE project_code = 'SEED-PP-02' AND COALESCE(is_deleted, false) = false LIMIT 1;
  SELECT id INTO v_proj_int FROM public.projects WHERE project_code = 'SEED-PP-09' AND COALESCE(is_deleted, false) = false LIMIT 1;

  IF v_proj_dw IS NULL OR v_proj_bi IS NULL OR v_proj_int IS NULL THEN
    RAISE NOTICE 'v969: One or more anchor seed projects (SEED-PP-01/02/09) not found — run v305 first. Skipping.';
    RETURN;
  END IF;

  SELECT id INTO v_user_id FROM public.users WHERE COALESCE(is_deleted, false) = false LIMIT 1;
  IF v_user_id IS NULL THEN
    RAISE NOTICE 'v969: No user available to attribute seed rows. Skipping.';
    RETURN;
  END IF;

  SELECT auth_user_id INTO v_auth_uid FROM public.users WHERE id = v_user_id LIMIT 1;
  IF v_auth_uid IS NOT NULL THEN
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_auth_uid::text)::text, true);
  END IF;

  -- ---------------------------------------------------------------------------
  -- ASSUMPTIONS REGISTER (public.assumptions) — 4 rows across 3 anchor projects
  -- ---------------------------------------------------------------------------
  INSERT INTO public.assumptions (
    id, project_id, assumption_title, assumption_description, assumption_code,
    assumption_category, status, impact_if_invalid, impact_severity,
    identified_by_user_id, owner_user_id, identified_date, next_review_date,
    is_deleted, created_at, created_by
  ) VALUES
    ('96900001-a501-4a01-9c01-534433340001', v_proj_dw,
     'Existing device fleet meets minimum OS requirements',
     'The workspace rollout plan assumes 95% of existing staff laptops already meet the minimum OS version needed for the new workspace client without a hardware refresh.',
     'SEED-ASM-01', 'technical', 'active',
     'If devices do not meet requirements, a hardware refresh workstream and budget line would be needed, delaying rollout by an estimated 6-8 weeks.',
     'high', v_user_id, v_user_id, CURRENT_DATE - 50, CURRENT_DATE + INTERVAL '30 days',
     false, NOW() - INTERVAL '50 days', v_user_id),

    ('96900001-a501-4a01-9c01-534433340002', v_proj_dw,
     'Regional IT teams can support wave 2 rollout without extra headcount',
     'Wave 2 rollout planning assumes regional IT support teams can absorb the additional rollout workload within business-as-usual capacity.',
     'SEED-ASM-02', 'resource', 'active',
     'If regional teams cannot absorb the load, temporary contractor support would be required, adding cost and onboarding lead time.',
     'medium', v_user_id, v_user_id, CURRENT_DATE - 35, CURRENT_DATE + INTERVAL '45 days',
     false, NOW() - INTERVAL '35 days', v_user_id),

    ('96900001-a501-4a01-9c01-534433340003', v_proj_bi,
     'Source system data quality is sufficient for BI ingestion without a cleansing phase',
     'The BI platform build plan assumes source system extracts are clean enough to load directly, without a dedicated data cleansing project phase.',
     'SEED-ASM-01', 'business', 'validated',
     'If data quality is insufficient, a cleansing phase would need to be added to the plan, extending the timeline by several weeks.',
     'high', v_user_id, v_user_id, CURRENT_DATE - 70, CURRENT_DATE + INTERVAL '20 days',
     false, NOW() - INTERVAL '70 days', v_user_id),

    ('96900001-a501-4a01-9c01-534433340004', v_proj_int,
     'Partner APIs remain stable during integration build',
     'The integration hub build assumes the three external partner APIs being integrated will not introduce breaking changes during the build window.',
     'SEED-ASM-01', 'external', 'active',
     'A breaking partner API change during build would require rework of the affected connector and re-testing.',
     'medium', v_user_id, v_user_id, CURRENT_DATE - 15, CURRENT_DATE + INTERVAL '60 days',
     false, NOW() - INTERVAL '15 days', v_user_id)
  ON CONFLICT (id) DO NOTHING;

  -- ---------------------------------------------------------------------------
  -- DEPENDENCY REGISTER (public.dependencies_register) — 4 rows across 3 anchors
  -- ---------------------------------------------------------------------------
  INSERT INTO public.dependencies_register (
    id, project_id, dependency_title, dependency_description, dependency_code,
    dependency_type, dependency_direction, status,
    dependency_source, dependency_target, criticality,
    identified_date, expected_fulfillment_date,
    impact_if_not_met, identified_by_user_id, owner_user_id,
    is_deleted, created_at, created_by
  ) VALUES
    ('96900002-d901-4a01-9c01-534433340001', v_proj_dw,
     'Network team to complete Wi-Fi capacity upgrade before wave 2',
     'Wave 2 rollout depends on the Network team completing the Wi-Fi access point capacity upgrade in the Manchester and Leeds offices.',
     'SEED-DEP-01', 'internal', 'incoming', 'confirmed',
     'Network Infrastructure Team', 'Digital Workspace Rollout', 'high',
     CURRENT_DATE - 40, CURRENT_DATE + INTERVAL '25 days',
     'Without the upgrade, wave 2 offices will experience connectivity issues during and after rollout.',
     v_user_id, v_user_id, false, NOW() - INTERVAL '40 days', v_user_id),

    ('96900002-d901-4a01-9c01-534433340002', v_proj_dw,
     'Vendor hardware delivery for wave 2 devices',
     'Wave 2 rollout depends on the hardware vendor delivering 180 pre-configured devices to the regional offices.',
     'SEED-DEP-02', 'external', 'incoming', 'at_risk',
     'Hardware Vendor', 'Digital Workspace Rollout', 'high',
     CURRENT_DATE - 20, CURRENT_DATE + INTERVAL '10 days',
     'A delayed delivery would push the wave 2 go-live date back by the same number of days.',
     v_user_id, v_user_id, false, NOW() - INTERVAL '20 days', v_user_id),

    ('96900002-d901-4a01-9c01-534433340003', v_proj_bi,
     'Finance data warehouse schema freeze',
     'BI platform ingestion build depends on the Finance team freezing the source data warehouse schema for the duration of the build phase.',
     'SEED-DEP-01', 'internal', 'incoming', 'fulfilled',
     'Finance Systems Team', 'BI Platform Implementation', 'critical',
     CURRENT_DATE - 90, CURRENT_DATE - 60,
     'Schema changes mid-build would require rework of ETL mappings already completed.',
     v_user_id, v_user_id, false, NOW() - INTERVAL '90 days', v_user_id),

    ('96900002-d901-4a01-9c01-534433340004', v_proj_int,
     'Partner B sandbox environment access',
     'Integration build for Partner B connector depends on receiving sandbox API credentials and rate-limit approval from Partner B.',
     'SEED-DEP-01', 'external', 'incoming', 'identified',
     'Partner B', 'Integration Hub', 'medium',
     CURRENT_DATE - 5, CURRENT_DATE + INTERVAL '15 days',
     'Without sandbox access, the Partner B connector build cannot start and will slip the integration timeline.',
     v_user_id, v_user_id, false, NOW() - INTERVAL '5 days', v_user_id)
  ON CONFLICT (id) DO NOTHING;

  RAISE NOTICE 'v969: RAID (Assumptions + Dependencies) seed complete for SEED-PP-01/02/09.';

END $$;
