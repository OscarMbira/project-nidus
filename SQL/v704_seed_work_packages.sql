-- =============================================================================
-- v704: Seed Data â€“ Work Packages (5 work packages for EDP-2024)
-- Prerequisites: v696 (demo project must exist).
-- Column mapping from v23_structured_pm_cs.sql schema:
--   title          â†’ work_package_name
--   description    â†’ work_package_description
--   wp_code        â†’ work_package_code
--   budget_alloc   â†’ estimated_cost
--   created_by_uid â†’ created_by
--   (purpose/constraints/dependencies/interfaces do not exist in this table)
-- =============================================================================

DO $$
DECLARE
  v_project_id UUID;
  v_user_id    UUID;
BEGIN

  SELECT id INTO v_project_id
  FROM public.projects
  WHERE project_code = 'EDP-2024' AND COALESCE(is_deleted, false) = false LIMIT 1;

  IF v_project_id IS NULL THEN
    RAISE NOTICE 'v704: Demo project not found â€“ run v696 first. Skipping.';
    RETURN;
  END IF;

  SELECT id INTO v_user_id
  FROM public.users WHERE COALESCE(is_deleted, false) = false LIMIT 1;

  -- Set auth.uid() so audit triggers get a real user ID
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', (
      SELECT auth_user_id::text FROM public.users WHERE id = v_user_id AND auth_user_id IS NOT NULL LIMIT 1
    ))::text, true);


  INSERT INTO public.work_packages (
    id, project_id,
    work_package_code, work_package_name, work_package_description, work_description,
    objectives, acceptance_criteria, notes,
    status,
    assigned_to_user_id, created_by,
    planned_start_date, planned_end_date,
    estimated_cost,
    is_deleted, created_at, updated_at
  )
  SELECT
    gen_random_uuid(), v_project_id,
    w.wp_code, w.name, w.description, w.description,
    w.objectives, w.acceptance_criteria, w.notes,
    w.status,
    v_user_id, v_user_id,
    CURRENT_DATE + (w.start_offset || ' days')::interval,
    CURRENT_DATE + (w.end_offset   || ' days')::interval,
    w.budget,
    false, NOW(), NOW()
  FROM (VALUES
    ('WP-001',
     'ERP Core Configuration & Data Migration',
     'Configuration of the new ERP system core modules (Finance, Procurement, HR) and migration of all live data from the legacy finance system. Includes parallel run period and cutover plan execution.',
     'Deliver a fully configured and data-verified ERP system ready for production cutover. All 48 ERP configuration items signed off by module owners. Data migration rehearsal completed with <0.1% error rate. Parallel run completed successfully for 2 full accounting periods.',
     'Cutover must occur within a 72-hour maintenance window. No ERP changes permitted in final 4 weeks before cutover. Parallel run cannot be shortened below 2 accounting periods. Finance Director sign-off on chart of accounts mapping required before cutover.',
     'Dependent on legacy system data extract scripts (WP-002) and cloud infrastructure provisioning. Finance Director sign-off on chart of accounts mapping required.',
     'in_progress', -30, 60, 580000),

    ('WP-002',
     'Data Cleansing & Legacy Extract Pipeline',
     'End-to-end data quality remediation across the legacy finance and CRM systems, followed by build and testing of the automated extract pipeline to feed the new ERP and data warehouse.',
     'Deliver clean, validated source data and reliable automated extract pipelines for all target systems. Data quality score above 99.5% completeness. Duplicate customer records below 0.1%. Automated extract pipeline runs successfully for 10 consecutive nights without error.',
     'Access to production legacy system limited to read-only. All cleansing must be performed on isolated copy. GDPR anonymisation required for test datasets. Data Architect and Data Steward sign-off required.',
     'No predecessor. This workstream is the critical path enabler for WP-001 and WP-003. Must complete data cleansing before WP-001 migration rehearsal.',
     'in_progress', -45, 30, 320000),

    ('WP-003',
     'Customer Self-Service Portal â€“ Build & UAT',
     'Full-stack build, integration, and user acceptance testing of the customer self-service portal. Covers account management, transaction history, payment initiation, document download, and live chat.',
     'Deliver a production-ready customer portal passing all security, performance, and UAT acceptance criteria. All 47 user stories implemented. Security pen test passed with zero Critical/High findings. UAT acceptance rate above 90% across 89 acceptance criteria. Performance under 3 seconds at 500 concurrent users.',
     'Must not go live before FCA approval received. UI component library must be used for all new components. Mobile responsiveness required for all screens. GDPR data processing agreement must be in place before UAT.',
     'Requires ERP API endpoints stable from WP-001 and customer data available from WP-002.',
     'in_progress', -15, 55, 840000),

    ('WP-004',
     'Data Warehouse & Business Intelligence Platform',
     'Build and test of the new cloud data warehouse and Power BI business intelligence platform. Covers schema design, ETL pipeline build, dashboard development, and user onboarding for 45 BI users.',
     'Deliver a reliable, performant data warehouse and BI platform replacing all Excel-based management reporting. All 12 operational dashboards built and accepted. ETL pipeline runs nightly with less than 5-minute latency. 45 BI users onboarded and trained.',
     'Data warehouse schema cannot be changed after UAT commencement without a formal change request. All Power BI reports must use certified dataset. Row-level security required for all financial data.',
     'Requires source data from WP-002, ERP real-time feeds from WP-001, and customer portal metrics from WP-003.',
     'in_progress', -20, 45, 390000),

    ('WP-005',
     'Mobile Workforce Platform â€“ Field Operations Enablement',
     'Configuration, integration, and rollout of the mobile workforce management platform for 60 field operatives. Covers job scheduling, time recording, photo evidence capture, signature capture, and offline synchronisation.',
     'Enable field operatives to manage their full workflow digitally with reliable offline capability. Mobile app available on iOS 16+ and Android 13+. Offline mode supports full job completion without connectivity for 8 hours. UAT acceptance rate above 90%. Timesheet compliance target of 85% achieved within 4 weeks of go-live.',
     'App must function without connectivity for minimum 8 hours. Battery usage must not exceed 20% per 8-hour shift. Device compatibility list frozen 6 weeks before UAT. Vendor offline sync module must be delivered and tested before field UAT commences.',
     'Vendor offline sync module dependency and ERP integration for job data feed from WP-001.',
     'todo', 10, 80, 210000)

  ) AS w(wp_code, name, description, objectives, acceptance_criteria, notes,
         status, start_offset, end_offset, budget)
  WHERE NOT EXISTS (
    SELECT 1 FROM public.work_packages
    WHERE project_id = v_project_id AND work_package_code = w.wp_code
  );

  RAISE NOTICE 'v704: Work packages seed complete for project %.', v_project_id;

END $$;
