-- =============================================================================
-- v976: Seed Data — remaining "Controls & Registers" (legacy/pre-v966 bucket)
-- leaves not yet re-parented into a v966 taxonomy group: Delay Register
-- (project_delays — 132 rows exist but 0 for anchor projects), Configuration
-- Item Register (configuration_items + its required configuration_management_
-- strategies parent — 0 rows system-wide), Requirements Register
-- (requirements_register — 151 rows exist but 0 for anchor projects).
-- EEF (public.enterprise_environment_factors) intentionally NOT seeded here —
-- it is organisation-level reference content (related_project_id mostly NULL,
-- 13 rows already exist) rather than a per-project register; treated as
-- already-populated reference data, same precedent as Template Library.
-- Prerequisites: v305 (anchor projects), v444 (project_delays), v192/v194
--                (configuration_management_strategies/configuration_items),
--                v357 (requirements_register).
-- Idempotent: fixed hex-only UUIDs + ON CONFLICT (id) DO NOTHING. Safe to re-run.
-- Display IDs: project_delays.delay_reference is left NULL/blank so the
--   existing local BEFORE INSERT trigger (trg_project_delays_set_org_and_ref,
--   v444) assigns DLY-NNN per project — matching the v877/v878 precedent.
--   requirements_register.requirement_code and configuration_management_
--   strategies.cms_reference / configuration_items.configuration_item_
--   identifier have no admin/local trigger wired — hand-assigned SEED-* codes.
-- Note: project_delays.organisation_id is NOT NULL and the trigger falls back
--   to projects.account_id, which is NULL on the anchor seed projects (v305
--   pre-dates account scoping) — an existing accounts row is supplied
--   explicitly instead, same approach as v972's comm_meetings.
-- =============================================================================

DO $$
DECLARE
  v_proj_dw  UUID; -- SEED-PP-01 Digital Workspace Rollout
  v_proj_bi  UUID; -- SEED-PP-02 BI Platform Implementation
  v_proj_erp UUID; -- SEED-PP-03 ERP Phase 1
  v_user_id  UUID;
  v_auth_uid UUID;
  v_account_id UUID;

  v_cms_dw UUID := '97600001-c301-4a01-9c01-534433340001';
  v_cms_bi UUID := '97600001-c301-4a01-9c01-534433340002';
BEGIN

  SELECT id INTO v_proj_dw  FROM public.projects WHERE project_code = 'SEED-PP-01' AND COALESCE(is_deleted, false) = false LIMIT 1;
  SELECT id INTO v_proj_bi  FROM public.projects WHERE project_code = 'SEED-PP-02' AND COALESCE(is_deleted, false) = false LIMIT 1;
  SELECT id INTO v_proj_erp FROM public.projects WHERE project_code = 'SEED-PP-03' AND COALESCE(is_deleted, false) = false LIMIT 1;

  IF v_proj_dw IS NULL OR v_proj_bi IS NULL OR v_proj_erp IS NULL THEN
    RAISE NOTICE 'v976: One or more anchor seed projects (SEED-PP-01/02/03) not found — run v305 first. Skipping.';
    RETURN;
  END IF;

  SELECT id INTO v_user_id FROM public.users WHERE COALESCE(is_deleted, false) = false LIMIT 1;
  IF v_user_id IS NULL THEN
    RAISE NOTICE 'v976: No user available to attribute seed rows. Skipping.';
    RETURN;
  END IF;

  SELECT auth_user_id INTO v_auth_uid FROM public.users WHERE id = v_user_id LIMIT 1;
  IF v_auth_uid IS NOT NULL THEN
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_auth_uid::text)::text, true);
  END IF;

  SELECT id INTO v_account_id FROM public.accounts LIMIT 1;

  -- ---------------------------------------------------------------------------
  -- DELAY REGISTER (public.project_delays)
  -- ---------------------------------------------------------------------------
  IF v_account_id IS NOT NULL THEN
    INSERT INTO public.project_delays (
      id, project_id, organisation_id, delay_reference, title, description,
      delay_category, delay_cause, responsible_party,
      impact_schedule_days, impact_cost, severity, status,
      identified_date, original_baseline_date, revised_forecast_date,
      resolution_plan, source_type, is_auto_linked, is_draft,
      created_by, is_deleted, created_at, updated_at
    ) VALUES
      ('97600002-d101-4a01-9c01-534433340001', v_proj_dw, v_account_id, NULL,
       'Hardware vendor delivery delay for wave 2 devices',
       'Pre-configured device delivery for the wave 2 rollout is running behind the vendor-committed schedule.',
       'external_dependency', 'Vendor manufacturing capacity constraint.', 'Hardware Vendor',
       10, 8000, 'high', 'under_review',
       CURRENT_DATE - 20, CURRENT_DATE + INTERVAL '10 days', CURRENT_DATE + INTERVAL '20 days',
       'Escalated to vendor account manager; evaluating partial delivery to protect go-live date.',
       'manual', false, false,
       v_user_id, false, NOW() - INTERVAL '20 days', NOW() - INTERVAL '2 days'),

      ('97600002-d101-4a01-9c01-534433340002', v_proj_bi, v_account_id, NULL,
       'Finance data extract delayed pending source system patch',
       'Source system vendor patch required before the finance data extract used for BI ingestion testing can be regenerated.',
       'technical', 'Third-party source system defect.', 'Finance Systems Team',
       5, NULL, 'medium', 'resolved',
       CURRENT_DATE - 35, CURRENT_DATE - 30, CURRENT_DATE - 28,
       'Vendor patch applied; extract regenerated and validated.',
       'manual', false, false,
       v_user_id, false, NOW() - INTERVAL '35 days', NOW() - INTERVAL '27 days')
    ON CONFLICT (id) DO NOTHING;
  ELSE
    RAISE NOTICE 'v976: No accounts row found — project_delays rows skipped (organisation_id is NOT NULL).';
  END IF;

  -- ---------------------------------------------------------------------------
  -- CONFIGURATION ITEM REGISTER (public.configuration_management_strategies
  -- + public.configuration_items)
  -- ---------------------------------------------------------------------------
  -- NOTE (2026-08-24): cms_reference is UNIQUE NOT NULL GLOBALLY (not scoped per-project,
  -- unlike configuration_items.configuration_item_identifier below, which IS project-scoped) —
  -- the original 'SEED-CMS-01' used for both rows would collide (ERROR 23505). Made distinct.
  INSERT INTO public.configuration_management_strategies (
    id, project_id, cms_reference, purpose, scope, status,
    created_by, created_at, updated_at
  ) VALUES
    (v_cms_dw, v_proj_dw, 'SEED-CMS-01',
     'Defines how digital workspace configuration items (device images, app packages, policy baselines) are identified, controlled, and tracked.',
     'All device images, application packages, and configuration policy baselines used in the workspace rollout.',
     'approved', v_user_id, NOW() - INTERVAL '90 days', NOW() - INTERVAL '90 days'),

    (v_cms_bi, v_proj_bi, 'SEED-CMS-02',
     'Defines how BI platform configuration items (data models, report definitions, refresh schedules) are identified, controlled, and tracked.',
     'BI semantic data models, published report definitions, and scheduled refresh configurations.',
     'approved', v_user_id, NOW() - INTERVAL '100 days', NOW() - INTERVAL '100 days')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.configuration_items (
    id, project_id, cfg_ms_id, configuration_item_identifier, item_name, item_description,
    current_version, is_in_baseline, storage_location,
    created_by, is_deleted, created_at, updated_at
  ) VALUES
    ('97600003-c101-4a01-9c01-534433340001', v_proj_dw, v_cms_dw, 'SEED-CI-01', 'Standard Workspace Device Image',
     'Master Windows 11 device image used for all wave 1 and wave 2 rollout devices.',
     '3.1', true, 'Device Image Repository',
     v_user_id, false, NOW() - INTERVAL '85 days', NOW() - INTERVAL '10 days'),

    ('97600003-c101-4a01-9c01-534433340002', v_proj_dw, v_cms_dw, 'SEED-CI-02', 'Workspace App Package Bundle',
     'Standard application package bundle deployed as part of the workspace client install.',
     '1.4', true, 'App Packaging Repository',
     v_user_id, false, NOW() - INTERVAL '80 days', NOW() - INTERVAL '20 days'),

    ('97600003-c101-4a01-9c01-534433340003', v_proj_bi, v_cms_bi, 'SEED-CI-01', 'Enterprise BI Semantic Model',
     'Core semantic data model used across all published BI reports.',
     '2.0', true, 'BI Platform Model Repository',
     v_user_id, false, NOW() - INTERVAL '95 days', NOW() - INTERVAL '5 days')
  ON CONFLICT (id) DO NOTHING;

  -- ---------------------------------------------------------------------------
  -- REQUIREMENTS REGISTER (public.requirements_register)
  -- ---------------------------------------------------------------------------
  INSERT INTO public.requirements_register (
    id, project_id, requirement_code, name, description, category, priority, status,
    acceptance_criteria, version, created_by, created_at, updated_at
  ) VALUES
    ('97600004-2901-4a01-9c01-534433340001', v_proj_dw, 'SEED-REQ-01',
     'Workspace client must support single sign-on', 'All users must be able to sign into the workspace client using existing corporate SSO credentials.',
     'functional', 'must', 'implemented',
     'User can sign in with corporate SSO without a secondary password prompt.', '1.0',
     v_user_id, NOW() - INTERVAL '95 days', NOW() - INTERVAL '30 days'),

    ('97600004-2901-4a01-9c01-534433340002', v_proj_dw, 'SEED-REQ-02',
     'Offline edits must sync automatically on reconnect', 'Files edited while offline must sync back to the cloud automatically once connectivity is restored, without user intervention.',
     'functional', 'should', 'approved',
     'Offline edits appear in the cloud copy within 2 minutes of reconnecting, with no manual sync action required.', '1.0',
     v_user_id, NOW() - INTERVAL '90 days', NOW() - INTERVAL '90 days'),

    ('97600004-2901-4a01-9c01-534433340003', v_proj_bi, 'SEED-REQ-01',
     'Report refresh must complete within the nightly batch window', 'All scheduled BI report refreshes must complete within the 4-hour nightly batch window.',
     'non_functional', 'must', 'approved',
     'End-to-end refresh of all scheduled reports completes in under 4 hours in the production environment.', '1.0',
     v_user_id, NOW() - INTERVAL '100 days', NOW() - INTERVAL '100 days')
  ON CONFLICT (id) DO NOTHING;

  RAISE NOTICE 'v976: Controls & Registers (legacy) seed complete (delays, configuration items, requirements) for SEED-PP-01/02.';

END $$;
