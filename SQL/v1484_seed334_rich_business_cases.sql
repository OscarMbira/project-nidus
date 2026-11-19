-- ============================================================================
-- v1484: Rich Business Cases for SEED334-PRJ-01…10 (v1344, slice 4 seed)
-- ============================================================================
-- PRD projectprd/v1344_project_setup_forms_fields_audit_seed_PRD.md D6, A6, A7.
-- PRJ-08 already has a rich business case (v1436). For the other nine:
--   - v834 created one generic business case per project. It is enriched only while its
--     executive summary is still v834's generic text — a case someone has worked on is left alone;
--   - a project with no business case gets one (case_reference blank → reference trigger);
--   - three options (do nothing / do minimum / do something) and three benefits are added when
--     the case has none.
-- Status mix (A7): approved (01, 02, 03, 04, 05, 09), draft (06, 10), submitted (07).
-- Fixed ids for new options / benefits (prefix c1344c0…). Prerequisites: v260, v834 (optional).
-- ============================================================================

DO $$
DECLARE
  r RECORD;
  v_case uuid;
BEGIN
  FOR r IN
    SELECT v.*, p.id AS project_id, p.project_name, COALESCE(p.project_manager_user_id, p.owner_user_id) AS author
    FROM (VALUES
      (1, 'SEED334-PRJ-01', 'approved', 'PCI-DSS remediation wave 2',
       'Closes the 14 open QSA findings and shrinks the card environment so the bank keeps its acquiring licence.',
       'Supports the 2026 goal of zero regulatory breaches and protects card income.',
       'Open PCI findings expose the bank to scheme fines and restrictions on card acquiring.',
       610000, 85000, 1150000, 88.0, 9, 'high',
       'Tokenisation vendor delay|Logging gaps on legacy terminals|Change freeze over peak season',
       'Live remediation of findings one by one~120000|Tokenisation, segmentation and central logging~610000',
       'Avoided scheme fines~financial~Fines and assessments invoiced~Zero fines|Smaller audit scope~operational~Systems in card scope~40% fewer|Customer trust in card payments~reputational~Card fraud complaints~20% fewer'),
      (2, 'SEED334-PRJ-02', 'approved', 'Field technician app MVP',
       'An offline app lets technicians close jobs on site, record parts and capture sign-off.',
       'Supports the service-excellence goal of same-day job closure.',
       'Paper work orders delay billing and lose parts usage data.',
       380000, 60000, 720000, 64.0, 16, 'medium',
       'Sync conflicts|Rural coverage gaps|Device management delays',
       'Scan paper forms at depots~70000|Offline technician app with sync~380000',
       'Faster job closure~operational~Days from job end to closure~Same day|Parts usage recorded~financial~Parts billed against parts issued~95%|Technician time saved~financial~Re-keying hours per month~2,800 hours a year'),
      (3, 'SEED334-PRJ-03', 'approved', 'Solar edge analytics',
       'Edge analytics finds solar faults within a day and supports warranty claims with data.',
       'Supports the renewables strategy of maximising output from existing assets.',
       'Faults are found late, losing output and missing warranty claims.',
       520000, 70000, 1340000, 110.0, 11, 'medium',
       'Site connectivity|Model accuracy in rainy season|Vendor data access',
       'More frequent manual inspections~150000|Edge analytics with forecasting and alerts~520000',
       'Recovered output~financial~MWh recovered against baseline~2% of output|Warranty claims filed~financial~Eligible claims filed~100%|Faster fault detection~operational~Hours from fault to alert~Under 24 hours'),
      (4, 'SEED334-PRJ-04', 'approved', 'Ambulatory intake digitisation',
       'Tablet intake removes paper triage, shortens waits and gets records to clinicians quickly.',
       'Supports the patient-experience and digital-hospital goals.',
       'Paper triage causes long waits and late records.',
       450000, 55000, 860000, 72.0, 15, 'medium',
       'Clinician adoption|Record vendor interface delays|Clinic Wi-Fi',
       'Add triage staff at peak times~200000|Tablet intake with FHIR interface~450000',
       'Shorter waiting time~operational~Average minutes from arrival to triage~20 minutes less|Nurse time released~financial~Hours of re-keying per year~6,000 hours|Patient satisfaction~reputational~Clinic survey score~+15 points'),
      (5, 'SEED334-PRJ-05', 'approved', 'Finance ERP cutover',
       'Moves finance to a supported ERP and cuts the month-end close from eight days to five.',
       'Supports the finance transformation and audit-readiness goals.',
       'The current finance system leaves support next year and month-end is slow.',
       980000, 210000, 1450000, 41.0, 26, 'high',
       'Supplier data quality|Year-end clash|Partner availability',
       'Extended support on the old system~300000|ERP migration with parallel run~980000',
       'Faster month-end~operational~Working days to close~5 days|Lower support cost~financial~Annual support spend~300,000 lower|Clean audit~reputational~Audit findings on finance systems~Zero high findings'),
      (6, 'SEED334-PRJ-06', 'draft', 'API gateway and rate limiting',
       'One gateway secures and protects partner traffic and speeds up partner onboarding.',
       'Supports the open-banking and resilience goals.',
       'Direct partner calls caused an outage and slow onboarding.',
       340000, 48000, 610000, 58.0, 14, 'medium',
       'Partner migration pace|Certificate management',
       'Rate limits in each service~90000|Central gateway with developer portal~340000',
       'No outages from spikes~operational~Spike-related outages per year~Zero|Faster partner onboarding~operational~Days to onboard a partner~5 days|Lower integration effort~financial~Developer days per partner~50% fewer'),
      (7, 'SEED334-PRJ-07', 'submitted', 'LMS and SIS integration',
       'Single sign-on, grade sync and a parent portal across the trust.',
       'Supports the trust goal of digital learning and parent engagement.',
       'Teachers double-key marks and parents lack timely progress information.',
       260000, 40000, 480000, 52.0, 18, 'low',
       'Term-start load|Parent sign-up',
       'Weekly manual mark exports~30000|Integrated platforms with parent portal~260000',
       'Teacher time saved~financial~Hours per teacher per week~3 hours|Parent engagement~reputational~Parents active on portal~70%|Accurate records~operational~Mark mismatches between systems~Zero'),
      (9, 'SEED334-PRJ-09', 'approved', 'SOC playbook automation',
       'Automates tier-1 triage so analysts respond to real threats within the hour.',
       'Supports the national cyber-resilience obligations.',
       'Manual triage of 1,200 alerts a day slows response.',
       470000, 90000, 930000, 79.0, 13, 'high',
       'Wrong automated actions|Automation skills gap',
       'Hire six more tier-1 analysts~540000|SOAR platform with 20 playbooks~470000',
       'Faster response~operational~Mean time to respond~Under 1 hour|Analyst capacity~financial~Analyst hours freed per year~6 FTE|Fewer missed incidents~reputational~Incidents found by third parties~Zero'),
      (10, 'SEED334-PRJ-10', 'draft', 'Claims straight-through processing',
       'Pays low-value claims within a day with human review of fraud signals.',
       'Supports the customer-retention and efficiency goals.',
       'Manual handling makes small claims slow and drives complaints.',
       560000, 80000, 1700000, 140.0, 8, 'medium',
       'Fraud leakage|Regulator review',
       'Add claims handlers~400000|Rules engine with fraud scoring~560000',
       'Faster payment~operational~Share of small claims paid in 24 hours~70%|Lower handling cost~financial~Annual handling cost~1.1m lower|Fewer complaints~reputational~Complaints about claim delays~30% fewer')
    ) AS v(idx, project_code, status, title, summary, alignment, problem, dev_cost, ongoing_cost, npv, roi, payback, rating,
           risks, options, benefits)
    JOIN public.projects p ON p.project_code = v.project_code AND COALESCE(p.is_deleted, FALSE) = FALSE
  LOOP
    v_case := (SELECT b.id FROM public.business_cases b
               WHERE b.project_id = r.project_id AND COALESCE(b.is_deleted, FALSE) = FALSE
               ORDER BY b.created_at LIMIT 1);

    IF v_case IS NULL THEN
      v_case := ('c1344c01-0000-4000-8000-' || lpad(r.idx::text, 12, '0'))::uuid;
      INSERT INTO public.business_cases (id, project_id, case_reference, case_title, document_status, created_by, updated_by)
      VALUES (v_case, r.project_id, '', r.title, r.status, r.author, r.author)
      ON CONFLICT (id) DO NOTHING;
    END IF;

    UPDATE public.business_cases b SET
      case_title = r.title,
      executive_summary = r.summary,
      strategic_alignment = r.alignment,
      reasons_for_project = r.problem,
      problem_statement = r.problem,
      recommended_option = 'do_something',
      option_justification = 'The recommended option is the only one that meets the objectives within an acceptable cost and risk.',
      timescale_description = 'Delivered in stages over about nine months, with a go / no-go review at each stage.',
      start_date = CURRENT_DATE - 60, end_date = CURRENT_DATE + 210,
      estimated_development_cost = r.dev_cost, estimated_ongoing_cost = r.ongoing_cost,
      funding_source = 'Approved capital budget 2026',
      cost_assumptions = 'Costs include supplier fees, internal staff time at standard rates and three years of running cost.',
      npv = r.npv, roi_percentage = r.roi, payback_period_months = r.payback, discount_rate = 0.10,
      investment_appraisal_notes = 'Three-year appraisal at a 10% discount rate.',
      major_risks = replace(r.risks, '|', E'\n'),
      overall_risk_rating = r.rating,
      document_status = r.status,
      updated_at = NOW()
    WHERE b.id = v_case
      AND (b.executive_summary IS NULL OR b.executive_summary LIKE 'Summarises the justification for investing in %');

    IF NOT EXISTS (SELECT 1 FROM public.business_case_options o WHERE o.business_case_id = v_case) THEN
      INSERT INTO public.business_case_options (id, business_case_id, option_number, option_type, option_title, description, estimated_cost, estimated_benefits, advantages, disadvantages, risks_summary, is_recommended, display_order, created_by)
      VALUES
        (('c1344c02-0000-4000-8000-' || lpad((r.idx * 10 + 1)::text, 12, '0'))::uuid, v_case, 1, 'do_nothing', 'Do nothing',
         'Carry on as today.', 0, 'None', 'No spend', 'The problem continues and grows', 'Cost and risk keep rising', FALSE, 1, r.author),
        (('c1344c02-0000-4000-8000-' || lpad((r.idx * 10 + 2)::text, 12, '0'))::uuid, v_case, 2, 'do_minimum', split_part(split_part(r.options, '|', 1), '~', 1),
         'Smallest change that eases the problem.', split_part(split_part(r.options, '|', 1), '~', 2)::numeric, 'Partial benefits',
         'Lower cost', 'Does not fix the root cause', 'Benefits fade over time', FALSE, 2, r.author),
        (('c1344c02-0000-4000-8000-' || lpad((r.idx * 10 + 3)::text, 12, '0'))::uuid, v_case, 3, 'do_something', split_part(split_part(r.options, '|', 2), '~', 1),
         'The recommended solution.', split_part(split_part(r.options, '|', 2), '~', 2)::numeric, 'Full benefits in the business case',
         'Fixes the root cause', 'Higher up-front cost', 'Delivery and adoption risk', TRUE, 3, r.author)
      ON CONFLICT (id) DO NOTHING;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.business_case_benefits x WHERE x.business_case_id = v_case) THEN
      INSERT INTO public.business_case_benefits (id, business_case_id, benefit_description, benefit_type, measurement_method, target_value, target_date, benefit_owner, realization_timing, display_order, created_by)
      SELECT ('c1344c03-0000-4000-8000-' || lpad((r.idx * 10 + b.ord)::text, 12, '0'))::uuid, v_case,
             split_part(b.item, '~', 1), split_part(b.item, '~', 2), split_part(b.item, '~', 3), split_part(b.item, '~', 4),
             CURRENT_DATE + 270, 'Project Executive', CASE WHEN b.ord = 1 THEN 'At go-live' ELSE '6 months after go-live' END,
             b.ord::int, r.author
      FROM unnest(string_to_array(r.benefits, '|')) WITH ORDINALITY AS b(item, ord)
      ON CONFLICT (id) DO NOTHING;
    END IF;
  END LOOP;
END $$;

-- Check
SELECT p.project_code, b.case_reference, b.document_status, b.npv,
       (SELECT count(*) FROM public.business_case_options o WHERE o.business_case_id = b.id) AS options,
       (SELECT count(*) FROM public.business_case_benefits x WHERE x.business_case_id = b.id) AS benefits
FROM public.projects p
LEFT JOIN public.business_cases b ON b.project_id = p.id AND COALESCE(b.is_deleted, FALSE) = FALSE
WHERE p.project_code LIKE 'SEED334-PRJ-%' AND p.project_code <= 'SEED334-PRJ-10'
ORDER BY p.project_code;
