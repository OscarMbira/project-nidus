-- ============================================================================
-- v1436: Core PM wave 1 — sample data for Project Setup (SEED334-PRJ-08)
-- ============================================================================
-- Core PM audit wave 1 (Documentation/Core_PM_Fields_and_Sample_Data_Audit.md): pages that had no
-- sample records for the demo project "Velocity Freight - Dynamic Route Optimization Pilot"
-- (Harare depots, January – June 2026), matching the existing stakeholder, cost and closure seeds.
--   Project Mandate (+ 6 deliverables, 4 dependencies)      Project Brief / Charter (same record)
--   Business Case (+ 3 options, 5 benefits)                 Contact Directory (10 contacts)
--   Governance Structure (bodies, reporting lines, escalation)   Steering Committee + Project Board (10 members)
-- Columns, allowed values and keys checked against the live tables (v1435 structure query).
-- Reference columns (mandate_reference, brief_reference, case_reference) are inserted blank so
-- Admin ID Generation assigns them (rule 16.2): one row per statement, because the column is unique.
-- People: the project owner (projects.owner_user_id) is the user behind created_by / author fields.
-- Fixed hex-only ids c1436…, checked free. ON CONFLICT DO NOTHING, nothing inserted if the project
-- or its owner is missing. Platform only: these tables are not in the sim schema, or the Simulator
-- uses its own practice projects (same scope as the v1144 / v1213 seeds). Prerequisites: v334.
-- ============================================================================

-- ── Project Mandate ──
INSERT INTO public.project_mandates (
  id, project_id, mandate_reference, mandate_title, document_status, version_number, created_date,
  purpose, authority_responsible, background, is_standalone, project_objectives, scope, scope_exclusions,
  constraints, interfaces, quality_expectations, quality_priority, outline_business_case,
  proposed_executive_id, proposed_executive_name, proposed_pm_id, initiated_by_role, primary_author_role,
  governance_owner, lifecycle_stage, project_code, project_name, created_by, updated_by)
SELECT 'c1436001-0000-4000-8000-000000000001', p.id, '', 'Dynamic route optimisation pilot for the Harare depots',
  'approved', '1.0', '2025-11-17',
  'Test whether planning delivery routes from live orders and fleet capacity cuts fuel, overtime and late deliveries before rolling it out to every depot.',
  'Network Operations Director (Lindiwe Moyo), under the delegated authority of the Operations Executive Committee.',
  'Routes are planned by hand each evening from fixed run sheets. Order volumes grew 30% in 2025, so vehicles run part-empty on some runs and late on others. Fuel and overtime are the two fastest-growing costs.',
  TRUE,
  'Cut fuel cost per delivery by 10% on pilot routes' || chr(10) || 'Raise on-time deliveries from 82% to 92%' || chr(10) || 'Reduce driver overtime by 15%' || chr(10) || 'Decide by July 2026 whether to roll out to all depots',
  'Route optimisation engine for two Harare depots' || chr(10) || 'Dispatcher screen and driver app for the new routes' || chr(10) || 'Links to the order system and vehicle trackers' || chr(10) || 'Training for dispatchers and night-shift drivers',
  'Depots outside Harare' || chr(10) || 'Replacing the order system' || chr(10) || 'Buying new vehicles',
  'Budget of 420,000' || chr(10) || 'Pilot must finish by 30 June 2026' || chr(10) || 'Night routes must keep legal driver rest windows',
  'Order management system' || chr(10) || 'Vehicle tracking service' || chr(10) || 'Fuel card provider' || chr(10) || 'Regional Roads Authority permit process',
  'Routes must be ready by 05:30 every day. Dispatchers must be able to override any route. No loss of delivery data.',
  'balanced',
  'Fuel and overtime savings of about 380,000 a year across both depots, with payback in about 14 months if the pilot results hold at full rollout.',
  p.owner_user_id, 'Lindiwe Moyo', p.owner_user_id, 'PMO', 'PM', 'PM', 'approved',
  'SEED334-PRJ-08', 'Velocity Freight - Dynamic Route Optimization Pilot', p.owner_user_id, p.owner_user_id
FROM public.projects p
WHERE p.project_code = 'SEED334-PRJ-08' AND p.owner_user_id IS NOT NULL
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.mandate_deliverables (id, mandate_id, deliverable_name, deliverable_description, is_in_scope, is_major_deliverable, estimated_completion, display_order, created_by)
SELECT v.id::uuid, 'c1436001-0000-4000-8000-000000000001'::uuid, v.name, v.descr, TRUE, v.major, v.done, v.ord, p.owner_user_id
FROM (VALUES
  ('c1436002-0000-4000-8000-000000000001', 'Route optimisation engine', 'Plans costed routes from live orders, vehicle capacity and time windows.', TRUE, 'April 2026', 1),
  ('c1436002-0000-4000-8000-000000000002', 'Dispatcher planning screen', 'Shows the proposed routes and lets dispatchers override them.', TRUE, 'April 2026', 2),
  ('c1436002-0000-4000-8000-000000000003', 'Driver route app', 'Turn-by-turn stops and proof of delivery on the driver phone.', TRUE, 'May 2026', 3),
  ('c1436002-0000-4000-8000-000000000004', 'Order and tracker interfaces', 'Feeds from the order system and vehicle trackers.', TRUE, 'March 2026', 4),
  ('c1436002-0000-4000-8000-000000000005', 'Pilot results report', 'Fuel, overtime and on-time results against the baseline.', TRUE, 'June 2026', 5),
  ('c1436002-0000-4000-8000-000000000006', 'Training pack', 'Guides and sessions for dispatchers and drivers.', FALSE, 'April 2026', 6)
) AS v(id, name, descr, major, done, ord)
CROSS JOIN public.projects p
WHERE p.project_code = 'SEED334-PRJ-08' AND EXISTS (SELECT 1 FROM public.project_mandates m WHERE m.id = 'c1436001-0000-4000-8000-000000000001')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.mandate_dependencies (id, mandate_id, dependency_type, dependency_description, impact_during_project, impact_after_implementation, dependency_status, display_order, created_by)
SELECT v.id::uuid, 'c1436001-0000-4000-8000-000000000001'::uuid, v.kind, v.descr, v.during, v.after, v.status, v.ord, p.owner_user_id
FROM (VALUES
  ('c1436003-0000-4000-8000-000000000001', 'internal', 'Order system API upgrade by the IT team, needed to read live orders.', TRUE, FALSE, 'managed', 1),
  ('c1436003-0000-4000-8000-000000000002', 'external', 'Vehicle tracking provider must open its location feed to the new engine.', TRUE, TRUE, 'managed', 2),
  ('c1436003-0000-4000-8000-000000000003', 'external', 'Regional Roads Authority approval for changed night routes on restricted corridors.', TRUE, TRUE, 'analysed', 3),
  ('c1436003-0000-4000-8000-000000000004', 'interdependency', 'Fuel contract renewal: new routes may move fill-up locations.', FALSE, TRUE, 'identified', 4)
) AS v(id, kind, descr, during, after, status, ord)
CROSS JOIN public.projects p
WHERE p.project_code = 'SEED334-PRJ-08' AND EXISTS (SELECT 1 FROM public.project_mandates m WHERE m.id = 'c1436001-0000-4000-8000-000000000001')
ON CONFLICT (id) DO NOTHING;

-- ── Project Brief (also shown as the Project Charter) — one per project ──
INSERT INTO public.project_briefs (
  id, project_id, mandate_id, brief_reference, version_number, author_id, owner_id, owner_name, document_status,
  created_date, approved_date, approved_by, background, project_objectives, desired_outcomes, project_scope,
  scope_exclusions, constraints, assumptions, project_tolerances, users_and_interested_parties, interfaces,
  outline_business_case_summary, business_option_selected, product_description, customer_quality_expectations,
  user_acceptance_criteria, operations_maintenance_criteria, project_approach_description, solution_type,
  delivery_approach, development_approach, operational_environment, approach_justification,
  team_structure_description, lessons_learned_reviewed, lessons_review_summary, initiated_by_role,
  primary_author_role, governance_owner, lifecycle_stage, dis_benefits_included, dis_benefits_description, created_by, updated_by)
SELECT 'c1436004-0000-4000-8000-000000000001', p.id, 'c1436001-0000-4000-8000-000000000001', '', '1.1', p.owner_user_id, p.owner_user_id, 'Lindiwe Moyo', 'approved',
  '2025-12-08', '2026-01-09', p.owner_user_id,
  'Evening route planning is manual. Volumes grew 30% in 2025, causing part-empty runs, late deliveries and rising fuel and overtime costs.',
  'Cut fuel cost per delivery by 10%' || chr(10) || 'Raise on-time deliveries to 92%' || chr(10) || 'Reduce driver overtime by 15%',
  'Dispatchers plan the next day in under 30 minutes' || chr(10) || 'Drivers finish within their shift' || chr(10) || 'A clear go / no-go decision for full rollout',
  'Two Harare depots (Msasa and Workington)' || chr(10) || 'Route engine, dispatcher screen and driver app' || chr(10) || 'Order and tracker interfaces' || chr(10) || 'Training and a 10-week live pilot',
  'Other depots' || chr(10) || 'Order system replacement' || chr(10) || 'New vehicles',
  'Budget 420,000' || chr(10) || 'Finish by 30 June 2026' || chr(10) || 'Legal driver rest windows on night routes',
  'Order data is complete by 21:00 each day' || chr(10) || 'Tracker feed is available 99% of the time' || chr(10) || 'Depot supervisors release staff for training',
  'Time: plus or minus 2 weeks' || chr(10) || 'Cost: plus or minus 10%' || chr(10) || 'Scope: driver app features may move to rollout',
  'Depot supervisors, dispatchers, night-shift drivers, fuel contract manager, Regional Roads Authority',
  'Order management system, vehicle tracking service, fuel card provider',
  'Expected savings of about 380,000 a year at full rollout, payback about 14 months.',
  'Pilot at two depots, then decide on rollout',
  'A working route optimisation service for two depots, with dispatcher and driver tools and a results report.',
  'Routes ready by 05:30 daily, dispatchers can override any route, no lost delivery data.',
  'Routes ready by 05:30 on 45 of 50 pilot days' || chr(10) || 'Dispatchers rate the screen 4 out of 5 or better' || chr(10) || 'No missed deliveries caused by the engine',
  'Support handed to the IT service desk with a runbook' || chr(10) || 'Engine settings documented for each depot',
  'Configure a commercial route optimisation service, integrate it with the order system and trackers, and build a thin dispatcher screen and driver app around it.',
  'hybrid', 'hybrid', 'integration',
  'Two depots operating 05:00–23:00, 64 vehicles, drivers using company phones.',
  'Buying a proven route engine is faster and cheaper than building one. Integration and screens are built in-house for control over the depot workflow.',
  'Project board chaired by Lindiwe Moyo. Project manager with a delivery team of six: integration, backend, frontend, operations analyst and two depot champions.',
  TRUE, 'Lessons from the 2024 tracker rollout: train night shifts separately and keep a manual fallback for the first month.',
  'PMO', 'PM', 'PM', 'approved', TRUE,
  'Some drivers may lose overtime income. Handled through the driver relations plan.',
  p.owner_user_id, p.owner_user_id
FROM public.projects p
WHERE p.project_code = 'SEED334-PRJ-08' AND p.owner_user_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- ── Business Case ──
INSERT INTO public.business_cases (
  id, project_id, case_reference, case_title, document_status, version_number, created_date, executive_summary,
  strategic_alignment, reasons_for_project, problem_statement, recommended_option, option_justification,
  timescale_description, start_date, end_date, key_milestones, estimated_development_cost, estimated_ongoing_cost,
  funding_source, cost_assumptions, npv, roi_percentage, payback_period_months, discount_rate,
  investment_appraisal_notes, major_risks, overall_risk_rating, budget_currency, budget_type,
  budget_approval_status, dis_benefits_included, dis_benefits_description, created_by, updated_by)
SELECT 'c1436005-0000-4000-8000-000000000001', p.id, '', 'Dynamic route optimisation – pilot business case', 'approved', '1.2', '2025-12-01',
  'A 10-week pilot at two Harare depots to prove that optimised routes cut fuel, overtime and late deliveries, before a decision on rolling out to all eight depots.',
  'Supports the 2026 strategy goals of lower cost to serve and on-time delivery above 90%.',
  'Manual route planning cannot keep up with 30% volume growth. Fuel and overtime are the fastest-growing costs.',
  'Vehicles run part-empty on some routes and late on others because routes are fixed and planned by hand.',
  'do_something',
  'Pilot first: it limits spend to 420,000 and gives real results before committing to the full rollout.',
  'January – June 2026 pilot, rollout decision July 2026.',
  '2026-01-05', '2026-06-30',
  'Interfaces live – 13 March 2026' || chr(10) || 'Pilot start – 6 April 2026' || chr(10) || 'Pilot results – 12 June 2026' || chr(10) || 'Rollout decision – 7 July 2026',
  420000, 96000, 'Operations capital budget 2026',
  'Licence priced per vehicle per month. Internal staff time charged at standard rates.',
  612000, 38.5, 14, 0.1000,
  'NPV over 3 years at a 10% discount rate, assuming savings at full rollout from October 2026.',
  'Drivers resist new routes' || chr(10) || 'Order data arrives late' || chr(10) || 'Tracker feed gaps',
  'medium', 'USD', 'mixed', 'approved', TRUE,
  'Lower overtime income for some drivers.', p.owner_user_id, p.owner_user_id
FROM public.projects p
WHERE p.project_code = 'SEED334-PRJ-08' AND p.owner_user_id IS NOT NULL
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.business_case_options (id, business_case_id, option_number, option_type, option_title, description, estimated_cost, estimated_benefits, advantages, disadvantages, risks_summary, is_recommended, display_order, created_by)
SELECT v.id::uuid, 'c1436005-0000-4000-8000-000000000001'::uuid, v.num, v.kind, v.title, v.descr, v.cost, v.benefits, v.pros, v.cons, v.risks, v.rec, v.num, p.owner_user_id
FROM (VALUES
  ('c1436006-0000-4000-8000-000000000001', 1, 'do_nothing', 'Keep manual planning', 'Continue planning routes by hand.', 0::numeric, 'None', 'No spend', 'Costs keep rising with volume', 'On-time rate keeps falling', FALSE),
  ('c1436006-0000-4000-8000-000000000002', 2, 'do_minimum', 'Planning spreadsheet with fixed zones', 'Improve the spreadsheet and rebalance zones twice a year.', 60000, 'About 4% fuel saving', 'Cheap and quick', 'Does not react to daily volume changes', 'Savings fade as volumes grow', FALSE),
  ('c1436006-0000-4000-8000-000000000003', 3, 'do_something', 'Route optimisation pilot at two depots', 'Pilot a route optimisation service, then decide on rollout.', 420000, 'About 10% fuel and 15% overtime saving', 'Proven results before full spend', 'Ten weeks of change for two depots', 'Driver resistance and data quality', TRUE)
) AS v(id, num, kind, title, descr, cost, benefits, pros, cons, risks, rec)
CROSS JOIN public.projects p
WHERE p.project_code = 'SEED334-PRJ-08' AND EXISTS (SELECT 1 FROM public.business_cases b WHERE b.id = 'c1436005-0000-4000-8000-000000000001')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.business_case_benefits (id, business_case_id, benefit_description, benefit_type, measurement_method, target_value, target_date, benefit_owner, realization_timing, display_order, created_by)
SELECT v.id::uuid, 'c1436005-0000-4000-8000-000000000001'::uuid, v.descr, v.kind, v.how, v.target, v.due::date, v.owner, v.timing, v.ord, p.owner_user_id
FROM (VALUES
  ('c1436007-0000-4000-8000-000000000001', 'Lower fuel cost per delivery', 'financial', 'Fuel card spend divided by deliveries, pilot routes against baseline', '10% lower', '2026-06-30', 'Fleet Operations Lead', 'During the pilot', 1),
  ('c1436007-0000-4000-8000-000000000002', 'Less driver overtime', 'financial', 'Overtime hours from the timesheet system', '15% lower', '2026-06-30', 'Depot managers', 'During the pilot', 2),
  ('c1436007-0000-4000-8000-000000000003', 'More on-time deliveries', 'operational', 'Proof-of-delivery time against the promised window', '92%', '2026-06-30', 'Network Operations Director', 'During the pilot', 3),
  ('c1436007-0000-4000-8000-000000000004', 'Faster evening planning', 'operational', 'Time from order cut-off to routes released', 'Under 30 minutes', '2026-05-29', 'Dispatch Coordinator', 'From pilot week 3', 4),
  ('c1436007-0000-4000-8000-000000000005', 'Customer complaints about late deliveries fall', 'reputational', 'Complaints logged by customer service', '25% fewer', '2026-09-30', 'Customer Service Manager', 'After rollout', 5)
) AS v(id, descr, kind, how, target, due, owner, timing, ord)
CROSS JOIN public.projects p
WHERE p.project_code = 'SEED334-PRJ-08' AND EXISTS (SELECT 1 FROM public.business_cases b WHERE b.id = 'c1436005-0000-4000-8000-000000000001')
ON CONFLICT (id) DO NOTHING;

-- ── Contact Directory ──
INSERT INTO public.project_contacts (id, project_id, contact_name, role_title, organisation, contact_type, email, phone, primary_email, primary_phone, notes, created_by, updated_by)
SELECT v.id::uuid, p.id, v.name, v.role, v.org, v.kind, v.email, v.phone, v.email, v.phone, v.notes, p.owner_user_id, p.owner_user_id
FROM (VALUES
  ('c1436008-0000-4000-8000-000000000001', 'Lindiwe Moyo', 'Network Operations Director (sponsor)', 'Velocity Freight', 'internal', 'lindiwe.moyo@velocityfreight.example', '+263 77 200 1101', 'Chairs the project board.'),
  ('c1436008-0000-4000-8000-000000000002', 'Tendai Ncube', 'Night-route driver representative', 'Velocity Freight', 'internal', 'tendai.ncube@velocityfreight.example', '+263 77 400 4404', 'Driver voice on the steering committee.'),
  ('c1436008-0000-4000-8000-000000000003', 'Rudo Mapfumo', 'Msasa depot manager', 'Velocity Freight', 'internal', 'rudo.mapfumo@velocityfreight.example', '+263 77 210 1212', 'Pilot depot 1.'),
  ('c1436008-0000-4000-8000-000000000004', 'Blessing Chikwanha', 'Workington depot manager', 'Velocity Freight', 'internal', 'blessing.chikwanha@velocityfreight.example', '+263 77 210 1313', 'Pilot depot 2.'),
  ('c1436008-0000-4000-8000-000000000005', 'Kudzai Mutasa', 'Head of IT applications', 'Velocity Freight', 'internal', 'kudzai.mutasa@velocityfreight.example', '+263 77 220 1414', 'Owns the order system interface.'),
  ('c1436008-0000-4000-8000-000000000006', 'Account manager', 'Route engine supplier account manager', 'Route optimisation supplier', 'vendor', 'accounts@routeengine.example', '+27 11 555 0101', 'Licence and support contract.'),
  ('c1436008-0000-4000-8000-000000000007', 'Support desk', 'Vehicle tracking support', 'Vehicle tracking provider', 'vendor', 'support@trackers.example', '+263 24 700 1515', 'Location feed issues.'),
  ('c1436008-0000-4000-8000-000000000008', 'Permit liaison officer', 'Route permits', 'Regional Roads Authority', 'other', 'permits@roadsauthority.example', '+263 24 700 3303', 'Notify before night routes change.'),
  ('c1436008-0000-4000-8000-000000000009', 'Fuel Contract Manager', 'Fuel procurement lead', 'Velocity Freight', 'internal', 'fuel.contracts@velocityfreight.example', '+263 77 500 5505', 'Fill-up locations and volume bands.'),
  ('c1436008-0000-4000-8000-00000000000a', 'Key account – FreshMart Stores', 'Logistics manager', 'FreshMart Stores', 'client', 'logistics@freshmart.example', '+263 24 800 1616', 'Largest pilot customer, 14 delivery points.')
) AS v(id, name, role, org, kind, email, phone, notes)
CROSS JOIN public.projects p
WHERE p.project_code = 'SEED334-PRJ-08'
ON CONFLICT (id) DO NOTHING;

-- ── Governance Structure (one per project) ──
INSERT INTO public.project_governance_structure (id, project_id, structure_notes, governance_bodies, reporting_lines, decision_flow, escalation_path, pmo_oversight_notes, escalation_steps, reporting_entries, created_by, updated_by)
SELECT 'c1436009-0000-4000-8000-000000000001', p.id,
  'Small pilot governance: a monthly steering committee for direction and a fortnightly project board for decisions within tolerance.',
  'Steering Committee' || chr(10) || 'Project Board' || chr(10) || 'Project Management Team' || chr(10) || 'Depot change champions',
  'Project manager reports to the project board fortnightly' || chr(10) || 'Project board reports to the steering committee monthly',
  'Routine route rule changes – project manager' || chr(10) || 'Changes within tolerance – project board' || chr(10) || 'Changes beyond tolerance – steering committee',
  'Team lead → project manager → project board → steering committee',
  'PMO checks the monthly highlight report and the RAID log.',
  '[{"level":1,"whom":"Project manager","timeframe":"Same day"},{"level":2,"whom":"Project board (Lindiwe Moyo)","timeframe":"2 working days"},{"level":3,"whom":"Steering committee","timeframe":"Next meeting or emergency call within 5 days"}]'::jsonb,
  '[{"from_party":"Project manager","to_party":"Project board","cadence":"Fortnightly"},{"from_party":"Project board","to_party":"Steering committee","cadence":"Monthly"},{"from_party":"Project manager","to_party":"PMO","cadence":"Monthly highlight report"}]'::jsonb,
  p.owner_user_id, p.owner_user_id
FROM public.projects p
WHERE p.project_code = 'SEED334-PRJ-08'
ON CONFLICT DO NOTHING;

-- ── Steering Committee and Project Board members ──
INSERT INTO public.project_governance_members (id, project_id, body_type, member_name, role_title, organisation, email, is_chair, appointed_date, notes, created_by, updated_by)
SELECT v.id::uuid, p.id, v.body, v.name, v.role, v.org, v.email, v.chair, v.appointed::date, v.notes, p.owner_user_id, p.owner_user_id
FROM (VALUES
  ('c1436010-0000-4000-8000-000000000001', 'steering_committee', 'Chief Operating Officer', 'Chair', 'Velocity Freight', 'coo@velocityfreight.example', TRUE, '2026-01-05', 'Decides on rollout.'),
  ('c1436010-0000-4000-8000-000000000002', 'steering_committee', 'Lindiwe Moyo', 'Network Operations Director', 'Velocity Freight', 'lindiwe.moyo@velocityfreight.example', FALSE, '2026-01-05', NULL),
  ('c1436010-0000-4000-8000-000000000003', 'steering_committee', 'Finance Director', 'Finance', 'Velocity Freight', 'finance.director@velocityfreight.example', FALSE, '2026-01-05', 'Owns the savings case.'),
  ('c1436010-0000-4000-8000-000000000004', 'steering_committee', 'Kudzai Mutasa', 'Head of IT applications', 'Velocity Freight', 'kudzai.mutasa@velocityfreight.example', FALSE, '2026-01-05', NULL),
  ('c1436010-0000-4000-8000-000000000005', 'steering_committee', 'Tendai Ncube', 'Driver representative', 'Velocity Freight', 'tendai.ncube@velocityfreight.example', FALSE, '2026-02-02', 'Added after the first driver workshop.'),
  ('c1436010-0000-4000-8000-000000000006', 'project_board', 'Lindiwe Moyo', 'Executive', 'Velocity Freight', 'lindiwe.moyo@velocityfreight.example', TRUE, '2026-01-05', NULL),
  ('c1436010-0000-4000-8000-000000000007', 'project_board', 'Rudo Mapfumo', 'Senior user – Msasa depot', 'Velocity Freight', 'rudo.mapfumo@velocityfreight.example', FALSE, '2026-01-05', NULL),
  ('c1436010-0000-4000-8000-000000000008', 'project_board', 'Blessing Chikwanha', 'Senior user – Workington depot', 'Velocity Freight', 'blessing.chikwanha@velocityfreight.example', FALSE, '2026-01-05', NULL),
  ('c1436010-0000-4000-8000-000000000009', 'project_board', 'Kudzai Mutasa', 'Senior supplier (internal IT)', 'Velocity Freight', 'kudzai.mutasa@velocityfreight.example', FALSE, '2026-01-05', NULL),
  ('c1436010-0000-4000-8000-00000000000a', 'project_board', 'Route engine supplier', 'Senior supplier (route engine)', 'Route optimisation supplier', 'accounts@routeengine.example', FALSE, '2026-01-12', NULL)
) AS v(id, body, name, role, org, email, chair, appointed, notes)
CROSS JOIN public.projects p
WHERE p.project_code = 'SEED334-PRJ-08'
ON CONFLICT (id) DO NOTHING;

-- Check: rows now held for the demo project.
SELECT 'project_mandates' AS table_name, count(*) AS rows FROM public.project_mandates WHERE id = 'c1436001-0000-4000-8000-000000000001'
UNION ALL SELECT 'mandate_deliverables', count(*) FROM public.mandate_deliverables WHERE mandate_id = 'c1436001-0000-4000-8000-000000000001'
UNION ALL SELECT 'mandate_dependencies', count(*) FROM public.mandate_dependencies WHERE mandate_id = 'c1436001-0000-4000-8000-000000000001'
UNION ALL SELECT 'project_briefs', count(*) FROM public.project_briefs b JOIN public.projects p ON p.id = b.project_id WHERE p.project_code = 'SEED334-PRJ-08'
UNION ALL SELECT 'business_cases', count(*) FROM public.business_cases WHERE id = 'c1436005-0000-4000-8000-000000000001'
UNION ALL SELECT 'business_case_options', count(*) FROM public.business_case_options WHERE business_case_id = 'c1436005-0000-4000-8000-000000000001'
UNION ALL SELECT 'business_case_benefits', count(*) FROM public.business_case_benefits WHERE business_case_id = 'c1436005-0000-4000-8000-000000000001'
UNION ALL SELECT 'project_contacts', count(*) FROM public.project_contacts c JOIN public.projects p ON p.id = c.project_id WHERE p.project_code = 'SEED334-PRJ-08'
UNION ALL SELECT 'project_governance_structure', count(*) FROM public.project_governance_structure g JOIN public.projects p ON p.id = g.project_id WHERE p.project_code = 'SEED334-PRJ-08'
UNION ALL SELECT 'project_governance_members', count(*) FROM public.project_governance_members g JOIN public.projects p ON p.id = g.project_id WHERE p.project_code = 'SEED334-PRJ-08';
