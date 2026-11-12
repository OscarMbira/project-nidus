-- ============================================================================
-- v1437: Core PM wave 1 — sample data for Scope & Deliverables and Planning (SEED334-PRJ-08)
-- ============================================================================
-- Core PM audit wave 1 (Documentation/Core_PM_Fields_and_Sample_Data_Audit.md), same story as
-- v1436: Velocity Freight route optimisation pilot, Harare depots, January – June 2026.
--   Scope Statement (1)                 Work Breakdown Structure (12 nodes, 3 levels)
--   Control Accounts (4)                Deliverable Register (10)
--   Constraints Register (10)           Milestones (10)
--   Schedule Management Plan (1)
-- Not seeded on purpose: baselines and WBS dictionary entries are snapshots built from the plan's
-- tasks by the app, so hand-written rows could break the compare screens (one baseline exists).
-- Columns, allowed values and keys checked against the live tables (v1435). display_id columns
-- are left blank for Admin ID Generation (rule 16.2). Fixed hex-only ids c1437…, checked free.
-- ON CONFLICT DO NOTHING. Platform only (Simulator uses its own practice projects).
-- ============================================================================

-- ── Scope Statement (one per project) ──
INSERT INTO public.scope_statements (id, project_id, project_description, product_scope_description, in_scope, out_of_scope, key_deliverables, acceptance_criteria, constraints, assumptions, exclusions, status, version, created_by, updated_by)
SELECT 'c1437001-0000-4000-8000-000000000001', p.id,
  'A 10-week pilot of dynamic route optimisation at the Msasa and Workington depots in Harare, to decide whether to roll it out to all eight depots.',
  'A route optimisation service that plans costed routes from live orders and vehicle capacity, with a dispatcher screen, a driver app and links to the order system and vehicle trackers.',
  ARRAY['Msasa and Workington depots (64 vehicles)', 'Route engine configuration', 'Dispatcher planning screen', 'Driver route app', 'Order system and tracker interfaces', 'Training for dispatchers and drivers', 'Pilot results report'],
  ARRAY['Other six depots', 'Order system replacement', 'New vehicles', 'Customer-facing tracking portal'],
  ARRAY['Route optimisation engine', 'Dispatcher planning screen', 'Driver route app', 'Order and tracker interfaces', 'Pilot results report', 'Training pack'],
  ARRAY['Routes ready by 05:30 on 45 of 50 pilot days', 'Fuel cost per delivery down 10% on pilot routes', 'On-time deliveries at 92% or more', 'Dispatchers rate the screen 4 of 5 or better'],
  ARRAY['Budget 420,000', 'Finish by 30 June 2026', 'Legal driver rest windows on night routes'],
  ARRAY['Order data complete by 21:00 each day', 'Tracker feed available 99% of the time', 'Supervisors release staff for training'],
  ARRAY['Cross-border routes', 'Refrigerated loads'],
  'approved', '1.1', p.owner_user_id, p.owner_user_id
FROM public.projects p
WHERE p.project_code = 'SEED334-PRJ-08'
  AND NOT EXISTS (SELECT 1 FROM public.scope_statements s WHERE s.project_id = p.id AND COALESCE(s.is_deleted, FALSE) = FALSE)
ON CONFLICT (id) DO NOTHING;

-- ── Work Breakdown Structure (level 1 → 2 → 3) ──
INSERT INTO public.wbs_nodes (id, project_id, parent_id, wbs_code, title, description, level_num, sort_order)
SELECT v.id::uuid, p.id, v.parent::uuid, v.code, v.title, v.descr, v.lvl, v.ord
FROM (VALUES
  ('c1437002-0000-4000-8000-000000000001', NULL, '1', 'Route optimisation pilot', 'All pilot work', 1, 1),
  ('c1437002-0000-4000-8000-000000000002', 'c1437002-0000-4000-8000-000000000001', '1.1', 'Project management', 'Planning, reporting, governance', 2, 1),
  ('c1437002-0000-4000-8000-000000000003', 'c1437002-0000-4000-8000-000000000001', '1.2', 'Route engine', 'Configure the optimisation service', 2, 2),
  ('c1437002-0000-4000-8000-000000000004', 'c1437002-0000-4000-8000-000000000001', '1.3', 'Interfaces', 'Order system and tracker feeds', 2, 3),
  ('c1437002-0000-4000-8000-000000000005', 'c1437002-0000-4000-8000-000000000001', '1.4', 'Dispatcher and driver tools', 'Screens and app', 2, 4),
  ('c1437002-0000-4000-8000-000000000006', 'c1437002-0000-4000-8000-000000000001', '1.5', 'Pilot operation and results', 'Run, measure and report', 2, 5),
  ('c1437002-0000-4000-8000-000000000007', 'c1437002-0000-4000-8000-000000000003', '1.2.1', 'Depot and vehicle set-up', 'Depots, vehicles, shifts, time windows', 3, 1),
  ('c1437002-0000-4000-8000-000000000008', 'c1437002-0000-4000-8000-000000000003', '1.2.2', 'Routing rules', 'Rest windows, restricted corridors, load limits', 3, 2),
  ('c1437002-0000-4000-8000-000000000009', 'c1437002-0000-4000-8000-000000000004', '1.3.1', 'Order system feed', 'Read orders every 15 minutes', 3, 1),
  ('c1437002-0000-4000-8000-00000000000a', 'c1437002-0000-4000-8000-000000000004', '1.3.2', 'Vehicle tracker feed', 'Live locations and trip history', 3, 2),
  ('c1437002-0000-4000-8000-00000000000b', 'c1437002-0000-4000-8000-000000000005', '1.4.1', 'Dispatcher planning screen', 'Review and override routes', 3, 1),
  ('c1437002-0000-4000-8000-00000000000c', 'c1437002-0000-4000-8000-000000000005', '1.4.2', 'Driver route app', 'Stops, navigation, proof of delivery', 3, 2)
) AS v(id, parent, code, title, descr, lvl, ord)
CROSS JOIN public.projects p
WHERE p.project_code = 'SEED334-PRJ-08'
ON CONFLICT (id) DO NOTHING;

-- ── Control Accounts ──
INSERT INTO public.control_accounts (id, project_id, account_id, display_id, name, code, wbs_node_id, owner_user_id, budget_amount, currency_code, status, notes, created_by, updated_by)
SELECT v.id::uuid, p.id, p.account_id, '', v.name, v.code, v.wbs::uuid, p.owner_user_id, v.budget, 'USD', v.status, v.notes, p.owner_user_id, p.owner_user_id
FROM (VALUES
  ('c1437003-0000-4000-8000-000000000001', 'Route engine', 'CA-1.2', 'c1437002-0000-4000-8000-000000000003', 168000::numeric, 'active', 'Licence and configuration'),
  ('c1437003-0000-4000-8000-000000000002', 'Interfaces', 'CA-1.3', 'c1437002-0000-4000-8000-000000000004', 92000, 'closed', 'Interfaces live 13 March 2026'),
  ('c1437003-0000-4000-8000-000000000003', 'Dispatcher and driver tools', 'CA-1.4', 'c1437002-0000-4000-8000-000000000005', 104000, 'active', NULL),
  ('c1437003-0000-4000-8000-000000000004', 'Pilot operation and management', 'CA-1.5', 'c1437002-0000-4000-8000-000000000006', 56000, 'active', 'Includes training and results report')
) AS v(id, name, code, wbs, budget, status, notes)
CROSS JOIN public.projects p
WHERE p.project_code = 'SEED334-PRJ-08'
ON CONFLICT (id) DO NOTHING;

-- ── Deliverable Register ──
INSERT INTO public.deliverable_register (id, project_id, account_id, display_id, title, description, status, owner_user_id, due_date, submitted_at, accepted_at, notes, created_by, updated_by)
SELECT v.id::uuid, p.id, p.account_id, '', v.title, v.descr, v.status, p.owner_user_id, v.due::date, v.submitted::timestamptz, v.accepted::timestamptz, v.notes, p.owner_user_id, p.owner_user_id
FROM (VALUES
  ('c1437004-0000-4000-8000-000000000001', 'Project brief', 'Approved project brief and charter', 'accepted', '2026-01-09', '2026-01-07', '2026-01-09', NULL),
  ('c1437004-0000-4000-8000-000000000002', 'Depot and vehicle data set-up', 'Depots, 64 vehicles, shifts and time windows loaded', 'accepted', '2026-02-20', '2026-02-18', '2026-02-20', NULL),
  ('c1437004-0000-4000-8000-000000000003', 'Routing rules', 'Rest windows, restricted corridors and load limits configured', 'accepted', '2026-03-06', '2026-03-05', '2026-03-09', 'Accepted after the night-corridor fix'),
  ('c1437004-0000-4000-8000-000000000004', 'Order system interface', 'Orders read every 15 minutes', 'accepted', '2026-03-13', '2026-03-12', '2026-03-13', NULL),
  ('c1437004-0000-4000-8000-000000000005', 'Vehicle tracker interface', 'Live locations and trip history', 'accepted', '2026-03-13', '2026-03-11', '2026-03-16', NULL),
  ('c1437004-0000-4000-8000-000000000006', 'Dispatcher planning screen', 'Review and override routes', 'rework', '2026-03-27', '2026-03-25', NULL, 'Override button hidden on small screens'),
  ('c1437004-0000-4000-8000-000000000007', 'Driver route app', 'Stops, navigation and proof of delivery', 'accepted', '2026-04-03', '2026-04-01', '2026-04-03', NULL),
  ('c1437004-0000-4000-8000-000000000008', 'Training pack', 'Guides and sessions for dispatchers and drivers', 'accepted', '2026-04-03', '2026-03-31', '2026-04-02', NULL),
  ('c1437004-0000-4000-8000-000000000009', 'Mid-pilot review', 'Results after five weeks', 'submitted', '2026-05-15', '2026-05-14', NULL, NULL),
  ('c1437004-0000-4000-8000-00000000000a', 'Pilot results report', 'Fuel, overtime and on-time results against the baseline', 'planned', '2026-06-12', NULL, NULL, NULL)
) AS v(id, title, descr, status, due, submitted, accepted, notes)
CROSS JOIN public.projects p
WHERE p.project_code = 'SEED334-PRJ-08'
ON CONFLICT (id) DO NOTHING;

-- ── Constraints Register ──
INSERT INTO public.constraints_register (id, project_id, constraint_text, category, status, owner_user_id, due_date, impact_severity, notes, created_by, updated_by)
SELECT v.id::uuid, p.id, v.txt, v.cat, v.status, p.owner_user_id, v.due::date, v.sev, v.notes, p.owner_user_id, p.owner_user_id
FROM (VALUES
  ('c1437005-0000-4000-8000-000000000001', 'Total pilot budget is 420,000', 'budget', 'managed', '2026-06-30', 'high', 'Tracked monthly in the cost report'),
  ('c1437005-0000-4000-8000-000000000002', 'Pilot must finish by 30 June 2026 for the July rollout decision', 'schedule', 'managed', '2026-06-30', 'high', NULL),
  ('c1437005-0000-4000-8000-000000000003', 'Night routes must keep the legal 11-hour driver rest window', 'regulatory', 'managed', '2026-03-06', 'critical', 'Built in to the routing rules'),
  ('c1437005-0000-4000-8000-000000000004', 'Restricted urban corridors closed to trucks 07:00–09:00', 'regulatory', 'managed', '2026-03-06', 'high', NULL),
  ('c1437005-0000-4000-8000-000000000005', 'Only two developers available until April', 'resource', 'resolved', '2026-04-03', 'medium', 'Third developer joined 6 April'),
  ('c1437005-0000-4000-8000-000000000006', 'Order system can only be read, not changed', 'technical', 'open', NULL, 'medium', 'Route results stored in the new service'),
  ('c1437005-0000-4000-8000-000000000007', 'Driver phones are older models with limited memory', 'technical', 'managed', '2026-04-03', 'medium', 'App kept under 40 MB'),
  ('c1437005-0000-4000-8000-000000000008', 'Training only outside peak hours (10:00–14:00)', 'resource', 'resolved', '2026-04-03', 'low', NULL),
  ('c1437005-0000-4000-8000-000000000009', 'Fuel contract volume bands cannot change before October', 'other', 'open', '2026-10-01', 'medium', 'Fill-up locations must stay inside the bands'),
  ('c1437005-0000-4000-8000-00000000000a', 'Route engine licence limited to 80 vehicles', 'technical', 'open', NULL, 'low', 'Enough for the pilot (64 vehicles)')
) AS v(id, txt, cat, status, due, sev, notes)
CROSS JOIN public.projects p
WHERE p.project_code = 'SEED334-PRJ-08'
ON CONFLICT (id) DO NOTHING;

-- ── Milestones ──
INSERT INTO public.milestones (id, project_id, milestone_name, description, target_date, forecast_date, actual_date, status, owner_user_id, sequence_order, notes, created_by, updated_by)
SELECT v.id::uuid, p.id, v.name, v.descr, v.target::date, v.fc::date, v.actual::date, v.status, p.owner_user_id, v.ord, v.notes, p.owner_user_id, p.owner_user_id
FROM (VALUES
  ('c1437006-0000-4000-8000-000000000001', 'Project brief approved', 'Board approves the brief and charter', '2026-01-09', '2026-01-09', '2026-01-09', 'achieved', 1, NULL),
  ('c1437006-0000-4000-8000-000000000002', 'Route engine contract signed', NULL, '2026-01-30', '2026-01-30', '2026-02-03', 'achieved', 2, 'Signed four days late'),
  ('c1437006-0000-4000-8000-000000000003', 'Depot data loaded', 'Depots, vehicles and shifts in the engine', '2026-02-20', '2026-02-20', '2026-02-18', 'achieved', 3, NULL),
  ('c1437006-0000-4000-8000-000000000004', 'Interfaces live', 'Order and tracker feeds running', '2026-03-13', '2026-03-13', '2026-03-16', 'achieved', 4, NULL),
  ('c1437006-0000-4000-8000-000000000005', 'Training complete', 'All dispatchers and pilot drivers trained', '2026-04-03', '2026-04-03', '2026-04-02', 'achieved', 5, NULL),
  ('c1437006-0000-4000-8000-000000000006', 'Pilot start', 'First live routes at both depots', '2026-04-06', '2026-04-06', '2026-04-06', 'achieved', 6, NULL),
  ('c1437006-0000-4000-8000-000000000007', 'Mid-pilot review', 'Board reviews five weeks of results', '2026-05-15', '2026-05-15', '2026-05-14', 'achieved', 7, NULL),
  ('c1437006-0000-4000-8000-000000000008', 'Dispatcher screen rework accepted', 'Override button fix', '2026-04-24', '2026-05-08', '2026-05-08', 'slipped', 8, 'Two weeks late, no effect on the pilot'),
  ('c1437006-0000-4000-8000-000000000009', 'Pilot results report', 'Results against the baseline', '2026-06-12', '2026-06-12', '2026-06-12', 'achieved', 9, NULL),
  ('c1437006-0000-4000-8000-00000000000a', 'Rollout decision', 'Steering committee decides on all depots', '2026-07-07', '2026-07-07', NULL, 'planned', 10, NULL)
) AS v(id, name, descr, target, fc, actual, status, ord, notes)
CROSS JOIN public.projects p
WHERE p.project_code = 'SEED334-PRJ-08'
ON CONFLICT (id) DO NOTHING;

-- ── Schedule Management Plan (one per project) ──
INSERT INTO public.schedule_management_plans (id, project_id, scheduling_methodology, scheduling_tool, level_of_accuracy, units_of_measure, control_thresholds, reporting_formats, schedule_model_maintenance, variance_thresholds, status, version, created_by, updated_by)
SELECT 'c1437007-0000-4000-8000-000000000001', p.id,
  'Rolling-wave planning: detailed for the next 4 weeks, milestones for the rest. Critical path reviewed weekly.',
  'Project Nidus plan sheet', 'Plus or minus 5 working days at milestone level',
  'Working days for tasks, hours for effort',
  '{"schedule_variance_percent": 10, "milestone_slip_days": 5}'::jsonb,
  'Fortnightly highlight report to the board, monthly report to the steering committee.',
  'Project manager updates progress every Friday. Re-baseline only with a board-approved change.',
  '{"green": "0-5%", "amber": "5-10%", "red": "over 10%"}'::jsonb,
  'approved', '1.0', p.owner_user_id, p.owner_user_id
FROM public.projects p
WHERE p.project_code = 'SEED334-PRJ-08'
  AND NOT EXISTS (SELECT 1 FROM public.schedule_management_plans s WHERE s.project_id = p.id AND COALESCE(s.is_deleted, FALSE) = FALSE)
ON CONFLICT (id) DO NOTHING;

-- Check: rows now held for the demo project.
SELECT 'scope_statements' AS table_name, count(*) AS rows FROM public.scope_statements s JOIN public.projects p ON p.id = s.project_id WHERE p.project_code = 'SEED334-PRJ-08'
UNION ALL SELECT 'wbs_nodes', count(*) FROM public.wbs_nodes s JOIN public.projects p ON p.id = s.project_id WHERE p.project_code = 'SEED334-PRJ-08'
UNION ALL SELECT 'control_accounts', count(*) FROM public.control_accounts s JOIN public.projects p ON p.id = s.project_id WHERE p.project_code = 'SEED334-PRJ-08'
UNION ALL SELECT 'deliverable_register', count(*) FROM public.deliverable_register s JOIN public.projects p ON p.id = s.project_id WHERE p.project_code = 'SEED334-PRJ-08'
UNION ALL SELECT 'constraints_register', count(*) FROM public.constraints_register s JOIN public.projects p ON p.id = s.project_id WHERE p.project_code = 'SEED334-PRJ-08'
UNION ALL SELECT 'milestones', count(*) FROM public.milestones s JOIN public.projects p ON p.id = s.project_id WHERE p.project_code = 'SEED334-PRJ-08'
UNION ALL SELECT 'schedule_management_plans', count(*) FROM public.schedule_management_plans s JOIN public.projects p ON p.id = s.project_id WHERE p.project_code = 'SEED334-PRJ-08';
