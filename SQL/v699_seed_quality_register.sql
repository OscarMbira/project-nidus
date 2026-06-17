-- =============================================================================
-- v699: Seed Data – Quality Register (7 quality activities for EDP-2024)
-- Prerequisites: v696 (demo project must exist).
-- Column mapping from v32_quality_management.sql schema:
--   activity_identifier   → product_reference
--   product_title         → product_name (NOT NULL)
--   quality_tolerances    → quality_tolerance_description
--   planned_date          → quality_review_planned_date
--   actual_date           → quality_review_actual_date
--   reviewer_name/notes   → notes (combined)
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
    RAISE NOTICE 'v699: Demo project not found – run v696 first. Skipping.';
    RETURN;
  END IF;

  SELECT id INTO v_user_id
  FROM public.users WHERE COALESCE(is_deleted, false) = false LIMIT 1;

  -- Set auth.uid() so audit triggers get a real user ID
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', (
      SELECT auth_user_id::text FROM public.users WHERE id = v_user_id AND auth_user_id IS NOT NULL LIMIT 1
    ))::text, true);

  INSERT INTO public.quality_register (
    id, project_id,
    product_reference, product_name, product_description,
    product_type, quality_method,
    quality_criteria, quality_tolerance_description,
    quality_review_planned_date, quality_review_actual_date,
    quality_status,
    quality_owner_user_id, sign_off_by_user_id,
    notes,
    is_deleted, created_at, updated_at
  )
  SELECT
    gen_random_uuid(), v_project_id,
    q.act_id, q.product_name, q.product_desc,
    q.product_type, q.method,
    q.criteria, q.tolerances,
    CURRENT_DATE + (q.planned_offset || ' days')::interval,
    CASE WHEN q.status IN ('passed','approved','failed') THEN CURRENT_DATE - '3 days'::interval ELSE NULL END,
    q.status,
    v_user_id, v_user_id,
    q.notes,
    false, NOW(), NOW()
  FROM (VALUES
    ('QA-001',
     'Customer Portal – Functional Design Specification',
     'Functional design document covering all 47 user stories for the customer self-service portal including authentication flows, account management, and transaction history.',
     'document', 'peer-review',
     'All mandatory sections complete; traceability to requirements register confirmed; no TBD items remaining; reviewed by at least 2 senior developers and 1 business analyst',
     'Maximum 5 minor comments outstanding at sign-off; zero major defects permitted',
     -21, 'approved',
     'Reviewer: Sarah Mitchell – Principal BA. Approved with 3 minor formatting comments resolved before final sign-off. Document is fit for purpose.'),

    ('QA-002',
     'Data Migration – Cleansed Customer Records',
     'Full dataset of 480,000 customer records post-cleansing, ready for migration to new data warehouse. Includes resolution of duplicate records, missing mandatory fields, and invalid date formats.',
     'data_product', 'data-quality-inspection',
     'Duplicate rate below 0.1%; mandatory field completeness above 99.5%; date format consistency 100%; referential integrity to product table maintained',
     'Completeness tolerance ±0.5%; duplicate tolerance 0 for critical fields; all anomalies logged and signed off by Data Steward',
     7, 'in-review',
     'Reviewer: James O''Brien – Data Architect. Second pass of duplicate check in progress. Initial completeness score 99.3% – within tolerance.'),

    ('QA-003',
     'Integration Testing – Legacy ERP to Customer Portal',
     'End-to-end integration test execution across 156 test scenarios covering real-time account balance queries, payment initiation, and transaction status updates.',
     'test_output', 'testing',
     'All P1 and P2 test cases pass; P3 defect count does not exceed 10 at gate review; no regression against previously passed cases; load test at 500 concurrent users with sub-3-second response time',
     'P1 failures: 0 permitted; P2 failures: max 2 with approved workaround; P3 failures: max 10 with resolution plan',
     14, 'planned',
     'Reviewer: Dev Patel – Test Lead. Test execution scheduled to start in 14 days.'),

    ('QA-004',
     'Security Penetration Test – Customer Portal APIs',
     'OWASP Top 10 aligned penetration test of all customer-facing REST APIs. Covers authentication bypass, injection attacks, insecure direct object references, and rate limiting validation.',
     'test_output', 'security-review',
     'Zero Critical or High severity findings unresolved at report sign-off; all Medium findings have documented remediation plan with owner and target date; test covers all 23 external-facing endpoints',
     'Critical/High findings: 0 at go-live; Medium: max 3 with agreed plan; Low: no limit but must be logged',
     21, 'planned',
     'Reviewer: CyberSec Associates Ltd – External Pen Tester. Engagement confirmed for 3 weeks time.'),

    ('QA-005',
     'Mobile Workforce App – User Acceptance Testing',
     'UAT execution by 15 representative field operatives covering 89 acceptance criteria across job scheduling, time recording, photo capture, and offline mode functionality.',
     'test_output', 'user-acceptance-testing',
     'Minimum 90% of acceptance criteria passed without workaround; all critical workflows pass with no defects; user satisfaction score above 7/10',
     'Acceptance rate: min 90%; critical workflow defects: 0; feedback score: 7.0 minimum',
     35, 'planned',
     'Reviewer: Marcus Davies – Operations Manager (UAT Lead). Field team panel of 15 users confirmed.'),

    ('QA-006',
     'Data Warehouse – Business Intelligence Dashboard Set',
     'Suite of 12 operational dashboards covering project performance, financial actuals vs forecast, resource utilisation, and customer SLA compliance. Built in Power BI.',
     'deliverable', 'business-review',
     'All KPIs display correct values matching source system within defined refresh lag; dashboards load within 5 seconds; all drill-through paths functional; Finance and Operations sign-off obtained',
     'Data accuracy: ±1%; load time: max 5 seconds at 50 concurrent users; drill-through completeness: 100%',
     -7, 'failed',
     'Reviewer: Lisa Cheng – BI Analyst. Three dashboards returned null values for EU transactions due to column naming issue (see ISS-007). Failed inspection – remediation in progress. Re-inspection scheduled in 10 days.'),

    ('QA-007',
     'Project Initiation Document – Stage 2 Update',
     'Updated PID reflecting revised scope, resource plan, and financial baseline following Stage 1 completion. Includes updated risk and issue summary and stakeholder sign-off matrix.',
     'document', 'formal-review',
     'All mandatory PID sections populated; financial baseline reconciles with Finance system; risk register cross-reference up to date; all named approvers have signed the sign-off register',
     'Zero mandatory sections incomplete; financial variance explanation required for any figure differing from Stage 1 by more than 5%',
     -45, 'approved',
     'Reviewer: Programme Director. Approved at Stage 1 Closure Review. All mandatory sections complete. Financial baseline accepted by Finance Director.')

  ) AS q(act_id, product_name, product_desc, product_type, method,
         criteria, tolerances, planned_offset, status, notes)
  WHERE NOT EXISTS (
    SELECT 1 FROM public.quality_register
    WHERE project_id = v_project_id AND product_reference = q.act_id
  );

  RAISE NOTICE 'v699: Quality register seed complete for project %.', v_project_id;

END $$;
