-- ============================================================================
-- v1439: Core PM wave 1 — sample data for Stakeholders, Products, Environments, Vendors and Costs (SEED334-PRJ-08)
-- ============================================================================
-- Core PM audit wave 1 (Documentation/Core_PM_Fields_and_Sample_Data_Audit.md), same story as
-- v1436–v1438: Velocity Freight route optimisation pilot, Harare depots, January – June 2026.
--   Stakeholder Register 5 → 10            Product Descriptions 0 → 10 (one per product)
--   Environments 7 → 10                    Vendors 1 → 10 (organisation list) + 10 vendor ratings
--   Cost Actuals 6 → 10
-- Product descriptions: pd_reference is unique and assigned by Admin ID Generation, so each row is
-- its own statement and is skipped (not failed) if a blank reference is still waiting.
-- Columns, allowed values and keys checked against the live tables (v1435). References left blank
-- for Admin ID Generation (rule 16.2). Fixed hex-only ids c1439…, checked free.
-- ON CONFLICT (id) DO NOTHING. Platform only.
-- ============================================================================

-- ── Stakeholder Register (+5, matching the Contact Directory) ──
INSERT INTO public.stakeholders (id, project_id, stakeholder_reference, stakeholder_name, stakeholder_title, stakeholder_organization, stakeholder_type, stakeholder_category, stakeholder_role, project_role, email, phone, preferred_contact_method, interest_level, is_decision_maker, is_influencer, is_affected_by_project, is_powerful, stakeholder_status, expectations, identification_source, identification_date, notes, created_by, updated_by)
SELECT v.id::uuid, p.id, '', v.name, v.title, v.org, v.kind, v.cat, v.role, v.prole, v.email, v.phone, v.contact, v.interest, v.decides, v.influences, v.affected, v.powerful, 'active', v.expects, v.source, v.found::date, v.notes, p.owner_user_id, p.owner_user_id
FROM (VALUES
  ('c1439001-0000-4000-8000-000000000001', 'Rudo Mapfumo', 'Msasa depot manager', 'Velocity Freight', 'internal', 'individual', 'Senior user', 'Pilot depot lead', 'rudo.mapfumo@velocityfreight.example', '+263 77 210 1212', 'in-person', 'high', TRUE, TRUE, TRUE, TRUE, 'Routes that drivers can actually finish within a shift.', 'project-charter', '2026-01-05', 'Runs pilot depot 1.'),
  ('c1439001-0000-4000-8000-000000000002', 'Blessing Chikwanha', 'Workington depot manager', 'Velocity Freight', 'internal', 'individual', 'Senior user', 'Pilot depot lead', 'blessing.chikwanha@velocityfreight.example', '+263 77 210 1313', 'in-person', 'high', TRUE, TRUE, TRUE, TRUE, 'Fewer late deliveries to the industrial area.', 'project-charter', '2026-01-05', 'Runs pilot depot 2.'),
  ('c1439001-0000-4000-8000-000000000003', 'Kudzai Mutasa', 'Head of IT applications', 'Velocity Freight', 'internal', 'individual', 'Senior supplier', 'Interfaces and support', 'kudzai.mutasa@velocityfreight.example', '+263 77 220 1414', 'email', 'medium', TRUE, TRUE, FALSE, TRUE, 'No changes to the order system core.', 'workshop', '2026-01-12', NULL),
  ('c1439001-0000-4000-8000-000000000004', 'FreshMart Stores', 'Logistics manager', 'FreshMart Stores', 'external', 'organization', 'Key customer', 'Largest pilot customer', 'logistics@freshmart.example', '+263 24 800 1616', 'email', 'high', FALSE, TRUE, TRUE, FALSE, 'Deliveries inside the agreed time windows.', 'interview', '2026-01-26', '14 delivery points on pilot routes.'),
  ('c1439001-0000-4000-8000-000000000005', 'Route optimisation supplier', 'Account manager', 'Route optimisation supplier', 'external', 'organization', 'Supplier', 'Route engine provider', 'accounts@routeengine.example', '+27 11 555 0101', 'email', 'medium', FALSE, FALSE, FALSE, FALSE, 'Pilot success leads to a full licence.', 'procurement-docs', '2026-01-12', NULL)
) AS v(id, name, title, org, kind, cat, role, prole, email, phone, contact, interest, decides, influences, affected, powerful, expects, source, found, notes)
CROSS JOIN public.projects p
WHERE p.project_code = 'SEED334-PRJ-08' AND p.owner_user_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- ── Environments (+3) ──
INSERT INTO public.test_environments (id, project_id, name, description, is_active, created_by, updated_by)
SELECT v.id::uuid, p.id, v.name, v.descr, v.active, p.owner_user_id, p.owner_user_id
FROM (VALUES
  ('c1439003-0000-4000-8000-000000000001', 'Pilot – Msasa depot', 'Live pilot set-up for the Msasa depot (36 vehicles).', TRUE),
  ('c1439003-0000-4000-8000-000000000002', 'Pilot – Workington depot', 'Live pilot set-up for the Workington depot (28 vehicles).', TRUE),
  ('c1439003-0000-4000-8000-000000000003', 'Training sandbox', 'Copy of the pilot data for dispatcher and driver training. Retired after go-live.', FALSE)
) AS v(id, name, descr, active)
CROSS JOIN public.projects p
WHERE p.project_code = 'SEED334-PRJ-08'
ON CONFLICT DO NOTHING;

-- ── Vendors (+9, organisation list) and vendor ratings for this project ──
INSERT INTO public.vendors (id, account_id, vendor_name, category, contact_email, contact_phone, rating_avg, is_active)
SELECT v.id::uuid, p.account_id, v.name, v.cat, v.email, v.phone, v.rating, v.active
FROM (VALUES
  ('c1439004-0000-4000-8000-000000000001', 'Route optimisation supplier', 'Software', 'accounts@routeengine.example', '+27 11 555 0101', 4.5::numeric, TRUE),
  ('c1439004-0000-4000-8000-000000000002', 'Vehicle tracking provider', 'Telematics', 'support@trackers.example', '+263 24 700 1515', 3.5, TRUE),
  ('c1439004-0000-4000-8000-000000000003', 'Mobile data network', 'Telecoms', 'business@mobilenet.example', '+263 24 700 1717', 3.0, TRUE),
  ('c1439004-0000-4000-8000-000000000004', 'Phone and device supplier', 'Hardware', 'sales@devices.example', '+263 24 700 1818', 4.0, TRUE),
  ('c1439004-0000-4000-8000-000000000005', 'Fuel card provider', 'Fuel', 'fleet@fuelcards.example', '+263 24 700 1919', 4.0, TRUE),
  ('c1439004-0000-4000-8000-000000000006', 'Mapping data provider', 'Data', 'licensing@maps.example', '+27 21 555 0202', 4.5, TRUE),
  ('c1439004-0000-4000-8000-000000000007', 'Cloud hosting provider', 'Hosting', 'support@cloudhost.example', '+27 11 555 0303', 5.0, TRUE),
  ('c1439004-0000-4000-8000-000000000008', 'Training venue', 'Facilities', 'bookings@venue.example', '+263 24 700 2020', 4.0, TRUE),
  ('c1439004-0000-4000-8000-000000000009', 'Logistics consultancy', 'Consulting', 'hello@logisticsadvisory.example', '+263 24 700 2121', 2.5, FALSE)
) AS v(id, name, cat, email, phone, rating, active)
CROSS JOIN public.projects p
WHERE p.project_code = 'SEED334-PRJ-08' AND p.account_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- rated_by references auth.users, so the owner’s login id is used.
INSERT INTO public.vendor_ratings (id, vendor_id, project_id, rating_score, rating_notes, rated_by)
SELECT v.id::uuid, v.vendor::uuid, p.id, v.score, v.notes, u.auth_user_id
FROM (VALUES
  ('c1439005-0000-4000-8000-000000000001', 'c1439004-0000-4000-8000-000000000001', 5, 'Configuration support fast and knowledgeable.'),
  ('c1439005-0000-4000-8000-000000000002', 'c1439004-0000-4000-8000-000000000001', 4, 'Contract signed four days late after legal review.'),
  ('c1439005-0000-4000-8000-000000000003', 'c1439004-0000-4000-8000-000000000002', 3, 'Feed opened three days late, needed a data agreement.'),
  ('c1439005-0000-4000-8000-000000000004', 'c1439004-0000-4000-8000-000000000002', 4, 'Feed available 99.4% of the time in the pilot.'),
  ('c1439005-0000-4000-8000-000000000005', 'c1439004-0000-4000-8000-000000000003', 3, 'Signal gaps on two night routes.'),
  ('c1439005-0000-4000-8000-000000000006', 'c1439004-0000-4000-8000-000000000004', 4, 'Phones delivered on time, two faulty units replaced.'),
  ('c1439005-0000-4000-8000-000000000007', 'c1439004-0000-4000-8000-000000000005', 4, 'Helped map preferred fuel stations.'),
  ('c1439005-0000-4000-8000-000000000008', 'c1439004-0000-4000-8000-000000000006', 5, 'Restricted corridor data accurate.'),
  ('c1439005-0000-4000-8000-000000000009', 'c1439004-0000-4000-8000-000000000007', 5, 'No outages during the pilot.'),
  ('c1439005-0000-4000-8000-00000000000a', 'c1439004-0000-4000-8000-000000000008', 4, 'Good rooms, projector failed once.')
) AS v(id, vendor, score, notes)
CROSS JOIN public.projects p
LEFT JOIN public.users u ON u.id = p.owner_user_id
WHERE p.project_code = 'SEED334-PRJ-08' AND EXISTS (SELECT 1 FROM public.vendors x WHERE x.id = v.vendor::uuid)
ON CONFLICT DO NOTHING;

-- ── Cost Actuals (+4) ──
INSERT INTO public.cost_actuals (id, project_id, transaction_type, amount, description, transaction_date, category, notes, created_by, updated_by)
SELECT v.id::uuid, p.id, v.kind, v.amount, v.descr, v.on_::date, v.cat, v.notes, p.owner_user_id, p.owner_user_id
FROM (VALUES
  ('c1439006-0000-4000-8000-000000000001', 'actual', 21000::numeric, 'Route engine licence – April', '2026-04-30', 'Software', NULL),
  ('c1439006-0000-4000-8000-000000000002', 'actual', 21000, 'Route engine licence – May', '2026-05-31', 'Software', NULL),
  ('c1439006-0000-4000-8000-000000000003', 'commitment', 9000, 'Fuel stop planning module (approved change)', '2026-05-04', 'Software', 'Change request: fuel stop planning'),
  ('c1439006-0000-4000-8000-000000000004', 'accrual', 6400, 'Driver overtime during training week', '2026-04-03', 'Labour', 'Accrued, paid with April payroll')
) AS v(id, kind, amount, descr, on_, cat, notes)
CROSS JOIN public.projects p
WHERE p.project_code = 'SEED334-PRJ-08'
ON CONFLICT DO NOTHING;

-- ── Product Descriptions (one statement each, see header) ──
INSERT INTO public.product_descriptions (id, project_id, pd_reference, version_number, author_id, owner_id, owner_name, product_title, purpose, composition, development_skills_required, customer_quality_expectations, quality_characteristics, acceptance_method, acceptance_responsibilities, handover_arrangements, status, approved_date, approved_by, created_by, updated_by)
SELECT 'c1439002-0000-4000-8000-000000000001', p.id, '', '1.0', p.owner_user_id, p.owner_user_id, 'Lindiwe Moyo', 'Route optimisation engine', 'Plans costed delivery routes from live orders, vehicle capacity and time windows.', 'Configured route engine, depot and vehicle data, routing rules', 'Supplier service configured by the integration specialist', 'Routes ready by 05:30, within legal rest windows', 'Reliable, simple to use, documented', 'Acceptance test in the pilot environment, then sign-off by the senior user', 'Senior users (depot managers) accept, senior supplier confirms', 'Handed to the IT service desk with the support runbook', 'approved'::pd_status_enum, '2026-04-03', p.owner_user_id, p.owner_user_id, p.owner_user_id
FROM public.projects p
WHERE p.project_code = 'SEED334-PRJ-08' AND p.owner_user_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.product_descriptions x WHERE x.pd_reference = '')
ON CONFLICT DO NOTHING;

INSERT INTO public.product_descriptions (id, project_id, pd_reference, version_number, author_id, owner_id, owner_name, product_title, purpose, composition, development_skills_required, customer_quality_expectations, quality_characteristics, acceptance_method, acceptance_responsibilities, handover_arrangements, status, approved_date, approved_by, created_by, updated_by)
SELECT 'c1439002-0000-4000-8000-000000000002', p.id, '', '1.0', p.owner_user_id, p.owner_user_id, 'Lindiwe Moyo', 'Dispatcher planning screen', 'Lets dispatchers review, compare and override proposed routes.', 'Route list, map view, override and release actions', 'Frontend developer, dispatchers in design sessions', 'Dispatchers rate it 4 of 5 or better, override in 2 clicks', 'Reliable, simple to use, documented', 'Acceptance test in the pilot environment, then sign-off by the senior user', 'Senior users (depot managers) accept, senior supplier confirms', 'Handed to the IT service desk with the support runbook', 'approved'::pd_status_enum, '2026-04-03', p.owner_user_id, p.owner_user_id, p.owner_user_id
FROM public.projects p
WHERE p.project_code = 'SEED334-PRJ-08' AND p.owner_user_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.product_descriptions x WHERE x.pd_reference = '')
ON CONFLICT DO NOTHING;

INSERT INTO public.product_descriptions (id, project_id, pd_reference, version_number, author_id, owner_id, owner_name, product_title, purpose, composition, development_skills_required, customer_quality_expectations, quality_characteristics, acceptance_method, acceptance_responsibilities, handover_arrangements, status, approved_date, approved_by, created_by, updated_by)
SELECT 'c1439002-0000-4000-8000-000000000003', p.id, '', '1.0', p.owner_user_id, p.owner_user_id, 'Lindiwe Moyo', 'Driver route app', 'Gives drivers their stops, navigation and proof of delivery.', 'Stop list, navigation link, photo and signature capture, offline mode', 'Frontend developer, driver representative', 'Works on the company phones, under 40 MB, offline on night routes', 'Reliable, simple to use, documented', 'Acceptance test in the pilot environment, then sign-off by the senior user', 'Senior users (depot managers) accept, senior supplier confirms', 'Handed to the IT service desk with the support runbook', 'approved'::pd_status_enum, '2026-04-03', p.owner_user_id, p.owner_user_id, p.owner_user_id
FROM public.projects p
WHERE p.project_code = 'SEED334-PRJ-08' AND p.owner_user_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.product_descriptions x WHERE x.pd_reference = '')
ON CONFLICT DO NOTHING;

INSERT INTO public.product_descriptions (id, project_id, pd_reference, version_number, author_id, owner_id, owner_name, product_title, purpose, composition, development_skills_required, customer_quality_expectations, quality_characteristics, acceptance_method, acceptance_responsibilities, handover_arrangements, status, approved_date, approved_by, created_by, updated_by)
SELECT 'c1439002-0000-4000-8000-000000000004', p.id, '', '1.0', p.owner_user_id, p.owner_user_id, 'Lindiwe Moyo', 'Order system interface', 'Feeds next-day and same-day orders to the route engine.', 'Order extract every 15 minutes, error queue', 'Integration specialist, order system team', 'No lost orders, alert within 15 minutes of a failure', 'Reliable, simple to use, documented', 'Acceptance test in the pilot environment, then sign-off by the senior user', 'Senior users (depot managers) accept, senior supplier confirms', 'Handed to the IT service desk with the support runbook', 'approved'::pd_status_enum, '2026-04-03', p.owner_user_id, p.owner_user_id, p.owner_user_id
FROM public.projects p
WHERE p.project_code = 'SEED334-PRJ-08' AND p.owner_user_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.product_descriptions x WHERE x.pd_reference = '')
ON CONFLICT DO NOTHING;

INSERT INTO public.product_descriptions (id, project_id, pd_reference, version_number, author_id, owner_id, owner_name, product_title, purpose, composition, development_skills_required, customer_quality_expectations, quality_characteristics, acceptance_method, acceptance_responsibilities, handover_arrangements, status, approved_date, approved_by, created_by, updated_by)
SELECT 'c1439002-0000-4000-8000-000000000005', p.id, '', '1.0', p.owner_user_id, p.owner_user_id, 'Lindiwe Moyo', 'Vehicle tracker interface', 'Feeds live locations and trip history to the route engine.', 'Location feed, trip history import', 'Integration specialist, tracking provider', 'Feed available 99% of the time', 'Reliable, simple to use, documented', 'Acceptance test in the pilot environment, then sign-off by the senior user', 'Senior users (depot managers) accept, senior supplier confirms', 'Handed to the IT service desk with the support runbook', 'approved'::pd_status_enum, '2026-04-03', p.owner_user_id, p.owner_user_id, p.owner_user_id
FROM public.projects p
WHERE p.project_code = 'SEED334-PRJ-08' AND p.owner_user_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.product_descriptions x WHERE x.pd_reference = '')
ON CONFLICT DO NOTHING;

INSERT INTO public.product_descriptions (id, project_id, pd_reference, version_number, author_id, owner_id, owner_name, product_title, purpose, composition, development_skills_required, customer_quality_expectations, quality_characteristics, acceptance_method, acceptance_responsibilities, handover_arrangements, status, approved_date, approved_by, created_by, updated_by)
SELECT 'c1439002-0000-4000-8000-000000000006', p.id, '', '1.0', p.owner_user_id, p.owner_user_id, 'Lindiwe Moyo', 'Routing rules set', 'The rules the engine must respect on every route.', 'Rest windows, restricted corridors, load limits, fuel stops', 'Operations analyst, permit liaison officer', 'No route breaks a legal rule', 'Reliable, simple to use, documented', 'Acceptance test in the pilot environment, then sign-off by the senior user', 'Senior users (depot managers) accept, senior supplier confirms', 'Handed to the IT service desk with the support runbook', 'approved'::pd_status_enum, '2026-04-03', p.owner_user_id, p.owner_user_id, p.owner_user_id
FROM public.projects p
WHERE p.project_code = 'SEED334-PRJ-08' AND p.owner_user_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.product_descriptions x WHERE x.pd_reference = '')
ON CONFLICT DO NOTHING;

INSERT INTO public.product_descriptions (id, project_id, pd_reference, version_number, author_id, owner_id, owner_name, product_title, purpose, composition, development_skills_required, customer_quality_expectations, quality_characteristics, acceptance_method, acceptance_responsibilities, handover_arrangements, status, approved_date, approved_by, created_by, updated_by)
SELECT 'c1439002-0000-4000-8000-000000000007', p.id, '', '1.0', p.owner_user_id, p.owner_user_id, 'Lindiwe Moyo', 'Depot and vehicle data set', 'Master data for depots, vehicles, shifts and customer time windows.', 'Two depots, 64 vehicles, shift patterns, top 300 customer windows', 'Operations analyst, customer service', 'Data checked against depot records', 'Reliable, simple to use, documented', 'Acceptance test in the pilot environment, then sign-off by the senior user', 'Senior users (depot managers) accept, senior supplier confirms', 'Handed to the IT service desk with the support runbook', 'approved'::pd_status_enum, '2026-04-03', p.owner_user_id, p.owner_user_id, p.owner_user_id
FROM public.projects p
WHERE p.project_code = 'SEED334-PRJ-08' AND p.owner_user_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.product_descriptions x WHERE x.pd_reference = '')
ON CONFLICT DO NOTHING;

INSERT INTO public.product_descriptions (id, project_id, pd_reference, version_number, author_id, owner_id, owner_name, product_title, purpose, composition, development_skills_required, customer_quality_expectations, quality_characteristics, acceptance_method, acceptance_responsibilities, handover_arrangements, status, approved_date, approved_by, created_by, updated_by)
SELECT 'c1439002-0000-4000-8000-000000000008', p.id, '', '1.0', p.owner_user_id, p.owner_user_id, 'Lindiwe Moyo', 'Training pack', 'Guides and sessions for dispatchers and drivers.', 'Dispatcher guide, driver quick card, session plan', 'Trainer, depot champions', 'Every pilot dispatcher and driver trained', 'Reliable, simple to use, documented', 'Acceptance test in the pilot environment, then sign-off by the senior user', 'Senior users (depot managers) accept, senior supplier confirms', 'Handed to the IT service desk with the support runbook', 'approved'::pd_status_enum, '2026-04-03', p.owner_user_id, p.owner_user_id, p.owner_user_id
FROM public.projects p
WHERE p.project_code = 'SEED334-PRJ-08' AND p.owner_user_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.product_descriptions x WHERE x.pd_reference = '')
ON CONFLICT DO NOTHING;

INSERT INTO public.product_descriptions (id, project_id, pd_reference, version_number, author_id, owner_id, owner_name, product_title, purpose, composition, development_skills_required, customer_quality_expectations, quality_characteristics, acceptance_method, acceptance_responsibilities, handover_arrangements, status, approved_date, approved_by, created_by, updated_by)
SELECT 'c1439002-0000-4000-8000-000000000009', p.id, '', '1.0', p.owner_user_id, p.owner_user_id, 'Lindiwe Moyo', 'Pilot results report', 'Shows fuel, overtime and on-time results against the baseline.', 'Method, results by depot, savings estimate, recommendation', 'Operations analyst, finance', 'Board accepts the figures for the rollout decision', 'Reliable, simple to use, documented', 'Acceptance test in the pilot environment, then sign-off by the senior user', 'Senior users (depot managers) accept, senior supplier confirms', 'Handed to the IT service desk with the support runbook', 'under_review'::pd_status_enum, NULL, NULL, p.owner_user_id, p.owner_user_id
FROM public.projects p
WHERE p.project_code = 'SEED334-PRJ-08' AND p.owner_user_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.product_descriptions x WHERE x.pd_reference = '')
ON CONFLICT DO NOTHING;

INSERT INTO public.product_descriptions (id, project_id, pd_reference, version_number, author_id, owner_id, owner_name, product_title, purpose, composition, development_skills_required, customer_quality_expectations, quality_characteristics, acceptance_method, acceptance_responsibilities, handover_arrangements, status, approved_date, approved_by, created_by, updated_by)
SELECT 'c1439002-0000-4000-8000-000000000010', p.id, '', '1.0', p.owner_user_id, p.owner_user_id, 'Lindiwe Moyo', 'Support runbook', 'How the IT service desk supports the route service after the pilot.', 'Daily checks, common faults, escalation contacts', 'Integration specialist, service desk', 'Service desk can resolve the top 10 faults alone', 'Reliable, simple to use, documented', 'Acceptance test in the pilot environment, then sign-off by the senior user', 'Senior users (depot managers) accept, senior supplier confirms', 'Handed to the IT service desk with the support runbook', 'draft'::pd_status_enum, NULL, NULL, p.owner_user_id, p.owner_user_id
FROM public.projects p
WHERE p.project_code = 'SEED334-PRJ-08' AND p.owner_user_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.product_descriptions x WHERE x.pd_reference = '')
ON CONFLICT DO NOTHING;

-- Check: rows now held for the demo project.
SELECT 'stakeholders' AS table_name, count(*) AS rows FROM public.stakeholders s JOIN public.projects p ON p.id = s.project_id WHERE p.project_code = 'SEED334-PRJ-08' AND COALESCE(s.is_deleted, FALSE) = FALSE
UNION ALL SELECT 'product_descriptions', count(*) FROM public.product_descriptions s JOIN public.projects p ON p.id = s.project_id WHERE p.project_code = 'SEED334-PRJ-08'
UNION ALL SELECT 'product_descriptions waiting for a reference', count(*) FROM public.product_descriptions WHERE pd_reference = ''
UNION ALL SELECT 'test_environments', count(*) FROM public.test_environments s JOIN public.projects p ON p.id = s.project_id WHERE p.project_code = 'SEED334-PRJ-08'
UNION ALL SELECT 'vendors (organisation)', count(*) FROM public.vendors s JOIN public.projects p ON p.account_id = s.account_id WHERE p.project_code = 'SEED334-PRJ-08'
UNION ALL SELECT 'vendor_ratings', count(*) FROM public.vendor_ratings s JOIN public.projects p ON p.id = s.project_id WHERE p.project_code = 'SEED334-PRJ-08'
UNION ALL SELECT 'cost_actuals', count(*) FROM public.cost_actuals s JOIN public.projects p ON p.id = s.project_id WHERE p.project_code = 'SEED334-PRJ-08';
