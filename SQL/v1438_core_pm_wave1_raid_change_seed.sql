-- ============================================================================
-- v1438: Core PM wave 1 — more sample data for RAID, Change Control and Governance (SEED334-PRJ-08)
-- ============================================================================
-- Core PM audit wave 1 (Documentation/Core_PM_Fields_and_Sample_Data_Audit.md), same story as
-- v1436/v1437: Velocity Freight route optimisation pilot, Harare depots, January – June 2026.
-- Brings each list to at least 10 records for the demo project (existing rows are kept):
--   Assumptions 3 → 10      Change Requests 1 → 10      Delay Register 4 → 10
--   Decision Log 5 → 10     Stage Gate Reviews 4 → 10
-- Columns, allowed values and keys checked against the live tables (v1435) and the app's own
-- dropdowns. References (assumption code, change reference, delay reference, decision reference)
-- are left for the app / Admin ID Generation triggers to assign (rule 16.2) — assumption_code as NULL,
-- because a partial unique index (project_id, assumption_code) rejects several blanks. Fixed hex-only ids
-- c1438…, checked free. ON CONFLICT DO NOTHING (any unique key). Platform only.
-- ============================================================================

-- ── Assumptions (+7) ──
INSERT INTO public.assumptions (id, project_id, assumption_title, assumption_description, assumption_code, assumption_category, status, validation_date, validation_notes, impact_if_invalid, impact_severity, identified_by_user_id, owner_user_id, identified_date, next_review_date, created_by, updated_by)
SELECT v.id::uuid, p.id, v.title, v.descr, NULL, v.cat, v.status, v.validated::date, v.vnotes, v.impact, v.sev, p.owner_user_id, p.owner_user_id, v.found::date, v.review::date, p.owner_user_id, p.owner_user_id
FROM (VALUES
  ('c1438001-0000-4000-8000-000000000001', 'Order data complete by 21:00', 'All next-day orders are in the order system by 21:00 so routes can be planned overnight.', 'data', 'validated', '2026-03-20', 'True on 47 of 50 test nights.', 'Routes planned on incomplete orders, missed deliveries.', 'high', '2026-01-12', '2026-05-15'),
  ('c1438001-0000-4000-8000-000000000002', 'Tracker feed available 99% of the time', 'The vehicle tracking provider keeps the location feed up 99% of the time.', 'technical', 'validated', '2026-03-27', 'Measured 99.4% over four weeks.', 'Live re-routing stops working.', 'medium', '2026-01-12', '2026-05-15'),
  ('c1438001-0000-4000-8000-000000000003', 'Drivers accept app-based routes', 'Night-shift drivers will follow the routes in the app after training.', 'people', 'active', NULL, NULL, 'Drivers keep old runs and savings are lost.', 'high', '2026-01-19', '2026-04-24'),
  ('c1438001-0000-4000-8000-000000000004', 'Fuel price stays within 10% of January', 'Fuel price changes do not distort the savings comparison.', 'financial', 'active', NULL, NULL, 'Savings figures need price adjustment.', 'medium', '2026-01-19', '2026-06-05'),
  ('c1438001-0000-4000-8000-000000000005', 'Depot supervisors release staff for training', 'Each depot releases dispatchers for two half-day sessions.', 'people', 'validated', '2026-03-31', 'All sessions held.', 'Training slips and so does the pilot start.', 'medium', '2026-01-26', NULL),
  ('c1438001-0000-4000-8000-000000000006', 'Customer time windows are accurate', 'Delivery time windows in the order system reflect what customers actually accept.', 'data', 'invalidated', '2026-03-18', 'About 12% of windows were out of date.', 'Engine plans to the wrong windows.', 'high', '2026-02-02', NULL),
  ('c1438001-0000-4000-8000-000000000007', 'No new depots open during the pilot', 'The network stays the same during the 10-week pilot.', 'scope', 'active', NULL, NULL, 'Baseline no longer comparable.', 'low', '2026-02-02', '2026-06-12')
) AS v(id, title, descr, cat, status, validated, vnotes, impact, sev, found, review)
CROSS JOIN public.projects p
WHERE p.project_code = 'SEED334-PRJ-08' AND p.owner_user_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- ── Change Requests (+9) ──
INSERT INTO public.change_requests (id, project_id, change_title, change_description, change_category, change_type, submitted_by, submission_date, requestor_name, requestor_organization, reason_for_change, current_situation, proposed_solution, alternative_solutions, priority, urgency, business_criticality, status, status_reason, impact_summary, owner_user_id, business_rationale, notes, created_by, updated_by)
SELECT v.id::uuid, p.id, v.title, v.descr, v.cat, v.kind, p.owner_user_id, v.submitted::date, v.who, 'Velocity Freight', v.reason, v.now_, v.solution, v.alt, v.pri, v.urg, v.crit, v.status, v.sreason, v.impact, p.owner_user_id, v.why, NULL, p.owner_user_id, p.owner_user_id
FROM (VALUES
  ('c1438002-0000-4000-8000-000000000001', 'Add a third pilot depot (Graniteside)', 'Extend the pilot to the Graniteside depot for the last four weeks.', 'scope', 'enhancement', '2026-04-20', 'Lindiwe Moyo', 'More data before the rollout decision.', 'Two depots in the pilot.', 'Add Graniteside from 18 May with 22 vehicles.', 'Keep two depots and extend the pilot by two weeks.', 'medium', 'medium', 'medium', 'rejected', 'Too close to the end of the pilot. Revisit at rollout.', 'Adds 38,000 and two weeks of set-up.', 'Larger sample.'),
  ('c1438002-0000-4000-8000-000000000002', 'Fix out-of-date customer time windows', 'Clean 12% of customer time windows found to be wrong.', 'quality', 'corrective', '2026-03-20', 'Rudo Mapfumo', 'Assumption on time windows proved invalid.', 'Engine plans to wrong windows for about 1 in 8 customers.', 'Customer service confirms windows for the top 300 customers before go-live.', 'Let the engine learn from proof-of-delivery data.', 'high', 'high', 'high', 'implemented', NULL, 'Five days of customer service time.', 'Pilot results would be distorted.'),
  ('c1438002-0000-4000-8000-000000000003', 'Driver app offline mode', 'Let drivers keep their route when the phone loses signal.', 'technical', 'enhancement', '2026-04-14', 'Tendai Ncube', 'Signal drops on two night routes.', 'Drivers lose stops until signal returns.', 'Cache the day''s route on the phone.', NULL, 'high', 'high', 'medium', 'approved', NULL, '4 developer days, no cost change.', 'Safety and driver trust.'),
  ('c1438002-0000-4000-8000-000000000004', 'Move dispatcher override button', 'Make the override button visible on small dispatcher screens.', 'quality', 'corrective', '2026-03-26', 'Blessing Chikwanha', 'Acceptance test failed on small screens.', 'Button hidden below the fold.', 'Move it to the top bar.', NULL, 'medium', 'high', 'medium', 'implemented', NULL, '1 developer day.', 'Dispatchers must be able to override.'),
  ('c1438002-0000-4000-8000-000000000005', 'Add fuel stop planning', 'Plan fuel stops inside the contracted volume bands.', 'scope', 'enhancement', '2026-04-27', 'Fuel Contract Manager', 'New routes moved fill-ups outside the contract bands.', 'Drivers fill up wherever convenient.', 'Add preferred fuel stations as route constraints.', NULL, 'medium', 'medium', 'high', 'approved', NULL, '6 developer days, 9,000 extra licence cost.', 'Avoids contract penalties.'),
  ('c1438002-0000-4000-8000-000000000006', 'Extend pilot by one week', 'Run the pilot to 19 June to cover the month-end peak.', 'schedule', 'enhancement', '2026-05-15', 'Lindiwe Moyo', 'Month-end volumes were missing from the results.', 'Pilot ends 12 June.', 'Run one more week, report on 19 June.', NULL, 'medium', 'medium', 'medium', 'rejected', 'Board kept the 12 June date and used May month-end data.', 'One week and about 6,000.', NULL),
  ('c1438002-0000-4000-8000-000000000007', 'Night corridor restriction rule', 'Add the Regional Roads Authority night restriction to the routing rules.', 'risk', 'regulatory', '2026-03-04', 'Permit liaison officer', 'New night restriction on two urban corridors.', 'Rule missing from the engine.', 'Add the corridors as time-restricted roads.', NULL, 'critical', 'high', 'high', 'implemented', NULL, '2 developer days.', 'Legal requirement.'),
  ('c1438002-0000-4000-8000-000000000008', 'Weekly results dashboard for depot managers', 'Give depot managers a weekly view of fuel, overtime and on-time results.', 'scope', 'enhancement', '2026-04-21', 'Rudo Mapfumo', 'Depot managers ask for progress every week.', 'Results only in the monthly report.', 'Add a simple weekly dashboard page.', 'Email a weekly spreadsheet.', 'low', 'low', 'medium', 'submitted', NULL, '3 developer days.', 'Keeps depots engaged.'),
  ('c1438002-0000-4000-8000-000000000009', 'Add a training session for relief drivers', 'Train the 12 relief drivers who cover sickness and leave.', 'resource', 'preventive', '2026-04-10', 'Tendai Ncube', 'Relief drivers were not in the training plan.', 'Relief drivers use the app untrained.', 'One extra half-day session.', NULL, 'medium', 'medium', 'low', 'implemented', NULL, 'Half a day of trainer time.', NULL)
) AS v(id, title, descr, cat, kind, submitted, who, reason, now_, solution, alt, pri, urg, crit, status, sreason, impact, why)
CROSS JOIN public.projects p
WHERE p.project_code = 'SEED334-PRJ-08' AND p.owner_user_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- ── Delay Register (+6) ──
INSERT INTO public.project_delays (id, project_id, organisation_id, title, description, delay_category, delay_cause, responsible_party, impact_schedule_days, impact_cost, severity, status, identified_date, original_baseline_date, revised_forecast_date, resolution_plan, resolution_owner_id, resolution_target_date, resolved_date, source_type, created_by)
SELECT v.id::uuid, p.id, p.account_id, v.title, v.descr, v.cat, v.cause, v.party, v.days, v.cost, v.sev, v.status, v.found::date, v.base::date, v.fc::date, v.plan, p.owner_user_id, v.target::date, v.resolved::date, 'manual', p.owner_user_id
FROM (VALUES
  ('c1438003-0000-4000-8000-000000000001', 'Route engine contract signed late', 'Legal review of the licence terms took longer than planned.', 'external_dependency', 'Supplier legal review', 'Route engine supplier', 4, 0::numeric, 'low', 'closed', '2026-01-28', '2026-01-30', '2026-02-03', 'Escalated to the supplier account manager.', '2026-02-03', '2026-02-03'),
  ('c1438003-0000-4000-8000-000000000002', 'Tracker feed access delayed', 'Provider needed a signed data agreement before opening the feed.', 'external_dependency', 'Data agreement', 'Vehicle tracking provider', 3, 0, 'medium', 'resolved', '2026-03-06', '2026-03-13', '2026-03-16', 'Data agreement signed 12 March.', '2026-03-16', '2026-03-16'),
  ('c1438003-0000-4000-8000-000000000003', 'Dispatcher screen rework', 'Override button hidden on small screens failed acceptance.', 'technical', 'Layout not tested on small screens', 'Internal IT', 14, 2400, 'low', 'resolved', '2026-03-26', '2026-04-24', '2026-05-08', 'Move the button to the top bar (change request).', '2026-05-08', '2026-05-08'),
  ('c1438003-0000-4000-8000-000000000004', 'Customer time windows cleanup', 'Out-of-date windows had to be confirmed before go-live.', 'risk_materialised', 'Invalid assumption on data quality', 'Customer service', 0, 3200, 'medium', 'closed', '2026-03-18', '2026-04-06', '2026-04-06', 'Customer service confirmed the top 300 customers in five days.', '2026-04-03', '2026-04-03'),
  ('c1438003-0000-4000-8000-000000000005', 'Heavy rain closed two roads', 'Flooding closed two roads on the Workington routes for three days.', 'weather', 'Flooding', 'None', 0, 1800, 'low', 'closed', '2026-04-22', NULL, NULL, 'Engine re-planned around the closures. Logged for the results report.', '2026-04-25', '2026-04-25'),
  ('c1438003-0000-4000-8000-000000000006', 'Fuel stop planning added mid-pilot', 'Approved change needed a new release during the pilot.', 'change_request', 'Fuel contract bands', 'Project team', 2, 9000, 'low', 'approved', '2026-04-27', '2026-05-15', '2026-05-19', 'Release on 19 May outside depot hours.', '2026-05-19', NULL)
) AS v(id, title, descr, cat, cause, party, days, cost, sev, status, found, base, fc, plan, target, resolved)
CROSS JOIN public.projects p
WHERE p.project_code = 'SEED334-PRJ-08' AND p.owner_user_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- ── Decision Log (+5) — decided_by / created_by / updated_by reference auth.users, so the owner’s login id is used ──
INSERT INTO public.project_decisions (id, project_id, decision_title, description, decision_date, decided_by, decided_by_name, category, status, priority, rationale, impact, alternatives_considered, review_date, created_by, updated_by)
SELECT v.id::uuid, p.id, v.title, v.descr, v.decided::date, u.auth_user_id, v.who, v.cat, v.status, v.pri, v.why, v.impact, v.alt, v.review::date, u.auth_user_id, u.auth_user_id
FROM (VALUES
  ('c1438004-0000-4000-8000-000000000001', 'Buy a route engine rather than build one', 'Licence a commercial route optimisation service.', '2025-12-15', 'Steering committee', 'technical', 'approved', 'high', 'Faster and cheaper than building, proven at similar fleets.', 'Licence cost of about 7,000 a month.', 'Build in-house, extend the spreadsheet.', NULL),
  ('c1438004-0000-4000-8000-000000000002', 'Pilot at Msasa and Workington', 'Choose the two pilot depots.', '2026-01-09', 'Project board', 'scope', 'approved', 'medium', 'Mixed day and night routes, supportive managers.', 'Covers 64 of 210 vehicles.', 'Graniteside, a single depot.', NULL),
  ('c1438004-0000-4000-8000-000000000003', 'Reject adding a third depot', 'Do not add Graniteside during the pilot.', '2026-04-24', 'Project board', 'scope', 'rejected', 'medium', 'Too late to set up without risking the results.', 'Graniteside joins at rollout.', 'Add it for four weeks.', '2026-07-07'),
  ('c1438004-0000-4000-8000-000000000004', 'Keep the 12 June results date', 'Do not extend the pilot to 19 June.', '2026-05-18', 'Project board', 'schedule', 'approved', 'medium', 'May month-end data is enough for the decision.', 'Results report on time for the July committee.', 'One-week extension.', NULL),
  ('c1438004-0000-4000-8000-000000000005', 'Recommend rollout to all depots', 'Board recommendation to the steering committee.', '2026-06-19', 'Project board', 'general', 'proposed', 'high', 'Pilot met fuel and on-time targets, overtime target nearly met.', 'Rollout budget of about 1.1 million over 9 months.', 'Roll out to Harare depots only.', '2026-07-07')
) AS v(id, title, descr, decided, who, cat, status, pri, why, impact, alt, review)
CROSS JOIN public.projects p
JOIN public.users u ON u.id = p.owner_user_id
WHERE p.project_code = 'SEED334-PRJ-08' AND u.auth_user_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- ── Stage Gate Reviews (+6, between the existing Initiation / Planning / Execution / Closing gates) ──
INSERT INTO public.stage_gate_reviews (id, gate_name, project_id, stage, status, decision_date, outcome, notes, created_by, updated_by)
SELECT v.id::uuid, v.name, p.id, v.stage, v.status, v.decided::date, v.outcome, v.notes, p.owner_user_id, p.owner_user_id
FROM (VALUES
  ('c1438005-0000-4000-8000-000000000001', 'Design gate', 'Design', 'approved', '2026-02-13', 'Go. Routing rules and screen designs accepted.', NULL),
  ('c1438005-0000-4000-8000-000000000002', 'Interfaces ready gate', 'Build', 'approved', '2026-03-16', 'Go. Order and tracker feeds live.', 'Tracker feed three days late.'),
  ('c1438005-0000-4000-8000-000000000003', 'Pilot go-live gate', 'Execution', 'approved', '2026-04-03', 'Go. Training done, fallback to manual routes agreed.', NULL),
  ('c1438005-0000-4000-8000-000000000004', 'Mid-pilot review gate', 'Execution', 'approved', '2026-05-14', 'Continue. Results on track, fuel stop planning approved.', NULL),
  ('c1438005-0000-4000-8000-000000000005', 'Pilot results gate', 'Closing', 'pending', '2026-06-19', NULL, 'Board reviews the results report.'),
  ('c1438005-0000-4000-8000-000000000006', 'Rollout decision gate', 'Closing', 'draft', NULL, NULL, 'Steering committee decides on all depots on 7 July.')
) AS v(id, name, stage, status, decided, outcome, notes)
CROSS JOIN public.projects p
WHERE p.project_code = 'SEED334-PRJ-08' AND p.owner_user_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- Check: rows now held for the demo project (target 10 each).
SELECT 'assumptions' AS table_name, count(*) AS rows FROM public.assumptions s JOIN public.projects p ON p.id = s.project_id WHERE p.project_code = 'SEED334-PRJ-08' AND COALESCE(s.is_deleted, FALSE) = FALSE
UNION ALL SELECT 'change_requests', count(*) FROM public.change_requests s JOIN public.projects p ON p.id = s.project_id WHERE p.project_code = 'SEED334-PRJ-08' AND COALESCE(s.is_deleted, FALSE) = FALSE
UNION ALL SELECT 'project_delays', count(*) FROM public.project_delays s JOIN public.projects p ON p.id = s.project_id WHERE p.project_code = 'SEED334-PRJ-08' AND COALESCE(s.is_deleted, FALSE) = FALSE
UNION ALL SELECT 'project_decisions', count(*) FROM public.project_decisions s JOIN public.projects p ON p.id = s.project_id WHERE p.project_code = 'SEED334-PRJ-08' AND COALESCE(s.is_deleted, FALSE) = FALSE
UNION ALL SELECT 'stage_gate_reviews', count(*) FROM public.stage_gate_reviews s JOIN public.projects p ON p.id = s.project_id WHERE p.project_code = 'SEED334-PRJ-08' AND COALESCE(s.is_deleted, FALSE) = FALSE;
