-- ============================================================================
-- v1486: Rich Benefits Review Plans for SEED334-PRJ-01…10 (v1344, slice 6 seed)
-- ============================================================================
-- PRD projectprd/v1344_project_setup_forms_fields_audit_seed_PRD.md D6, A6, A7.
-- v834 created one generic plan per project. For the ten demo projects the plan is enriched only
-- while its scope is still v834's generic text (a plan someone has worked on is left alone); a
-- project with no plan gets one. The plan is built from the project's business case benefits
-- (v1436 / v1484): scope lists the benefits, measurement uses their measures, baseline and
-- targets follow their target values. A three-review schedule (baseline, performance, final) is
-- added when the plan has none. Status mix (A7): approved, except 06 draft and 10
-- pending_approval. Fixed ids (prefix c1344e0…). Idempotent.
-- Prerequisites: v186, v1484.
-- ============================================================================

DO $$
DECLARE
  r RECORD;
  v_plan uuid;
BEGIN
  FOR r IN
    SELECT p.id AS project_id, p.project_name, p.project_code,
           substring(p.project_code from '([0-9]+)$')::int AS idx,
           COALESCE(p.project_manager_user_id, p.owner_user_id) AS author,
           bc.id AS case_id,
           (SELECT string_agg('- ' || x.benefit_description || COALESCE(' (target ' || x.target_value || ')', ''), chr(10) ORDER BY x.display_order)
              FROM public.business_case_benefits x WHERE x.business_case_id = bc.id) AS benefit_list,
           (SELECT string_agg(x.benefit_description || ': ' || COALESCE(x.measurement_method, 'measured against baseline'), chr(10) ORDER BY x.display_order)
              FROM public.business_case_benefits x WHERE x.business_case_id = bc.id) AS measures,
           (SELECT string_agg(DISTINCT x.benefit_owner, ', ') FROM public.business_case_benefits x WHERE x.business_case_id = bc.id) AS owners
    FROM public.projects p
    LEFT JOIN LATERAL (
      SELECT b.id FROM public.business_cases b
      WHERE b.project_id = p.id AND COALESCE(b.is_deleted, FALSE) = FALSE
      ORDER BY b.created_at LIMIT 1) bc ON TRUE
    WHERE p.project_code IN ('SEED334-PRJ-01', 'SEED334-PRJ-02', 'SEED334-PRJ-03', 'SEED334-PRJ-04', 'SEED334-PRJ-05',
                             'SEED334-PRJ-06', 'SEED334-PRJ-07', 'SEED334-PRJ-08', 'SEED334-PRJ-09', 'SEED334-PRJ-10')
      AND COALESCE(p.is_deleted, FALSE) = FALSE
  LOOP
    v_plan := (SELECT b.id FROM public.benefits_review_plans b WHERE b.project_id = r.project_id ORDER BY b.created_at LIMIT 1);

    IF v_plan IS NULL THEN
      v_plan := ('c1344e01-0000-4000-8000-' || lpad(r.idx::text, 12, '0'))::uuid;
      INSERT INTO public.benefits_review_plans (id, project_id, business_case_id, plan_title, author_user_id, owner_user_id, status)
      VALUES (v_plan, r.project_id, r.case_id, 'Benefits Review Plan — ' || r.project_name, r.author, r.author, 'draft')
      ON CONFLICT (id) DO NOTHING;
    END IF;

    UPDATE public.benefits_review_plans b SET
      business_case_id = COALESCE(r.case_id, b.business_case_id),
      scope_description = 'Benefits in scope of this review plan:' || chr(10) || COALESCE(r.benefit_list, '- Benefits listed in the Business Case'),
      accountability_description = 'Benefit owners (' || COALESCE(r.owners, 'named in the Business Case') || ') confirm results; the Project Executive is accountable overall, supported by the Project Manager until handover.',
      measurement_approach = COALESCE(r.measures, b.measurement_approach),
      measurement_timing_rationale = 'Measured after a bedding-in period so results reflect the new way of working, then at each quarterly review.',
      resources_description = 'Business analyst time for data collection; benefit owners for review meetings; finance for cost figures.',
      baseline_measures_description = 'Baseline taken from the last three months of operational data before go-live, agreed with each benefit owner.',
      baseline_recording_date = CURRENT_DATE - 45,
      performance_review_approach = 'Actual results are compared with baseline and target at each review; gaps get an owner and an action.',
      performance_review_frequency = 'quarterly',
      status = CASE r.idx WHEN 6 THEN 'draft' WHEN 10 THEN 'pending_approval' ELSE 'approved' END,
      updated_at = NOW()
    WHERE b.id = v_plan
      AND (b.scope_description IS NULL OR b.scope_description LIKE 'Covers measurement of the benefits identified in the Business Case for %');

    IF NOT EXISTS (SELECT 1 FROM public.benefits_review_schedule s WHERE s.review_plan_id = v_plan) THEN
      INSERT INTO public.benefits_review_schedule (id, review_plan_id, review_name, review_description, review_type, planned_date, actual_date, is_virtual)
      VALUES
        (('c1344e02-0000-4000-8000-' || lpad((r.idx * 10 + 1)::text, 12, '0'))::uuid, v_plan, 'Baseline review',
         'Agree baseline figures with benefit owners.', 'baseline_review', CURRENT_DATE - 45, CURRENT_DATE - 45, TRUE),
        (('c1344e02-0000-4000-8000-' || lpad((r.idx * 10 + 2)::text, 12, '0'))::uuid, v_plan, 'First performance review',
         'Compare results with baseline and target.', 'performance_review', CURRENT_DATE + 45, NULL, TRUE),
        (('c1344e02-0000-4000-8000-' || lpad((r.idx * 10 + 3)::text, 12, '0'))::uuid, v_plan, 'Final benefits review',
         'Confirm benefits realised and hand remaining measures to business as usual.', 'final_review', CURRENT_DATE + 270, NULL, FALSE)
      ON CONFLICT (id) DO NOTHING;
    END IF;
  END LOOP;
END $$;

-- Check
SELECT p.project_code, b.status, left(b.scope_description, 60) AS scope_start,
       (SELECT count(*) FROM public.benefits_review_schedule s WHERE s.review_plan_id = b.id) AS reviews
FROM public.projects p
LEFT JOIN public.benefits_review_plans b ON b.project_id = p.id
WHERE p.project_code LIKE 'SEED334-PRJ-%' AND p.project_code <= 'SEED334-PRJ-10'
ORDER BY p.project_code;
