-- ============================================================================
-- v1441: Fix product description uniqueness (NULLS NOT DISTINCT) + link the demo product descriptions
-- ============================================================================
-- Bug found while seeding (Core PM wave 1, v1439): v207 created
--   uk_pd_product_deliverable UNIQUE NULLS NOT DISTINCT (product_deliverable_id)
--   uk_pd_ppd_composition     UNIQUE NULLS NOT DISTINCT (ppd_composition_item_id)
-- "NULLS NOT DISTINCT" treats every empty value as equal, so the whole database can hold only ONE
-- product description without a composition item and ONE without a product deliverable. The app
-- creates a description from either a product deliverable or a PPD composition item (never both),
-- so after the first one, every further description of that kind is rejected — for every customer.
-- The intended rule is "one description per deliverable / per composition item", which ignores empty
-- values: replaced with unique indexes on non-empty values only. No data changes in this part.
--
-- Then the demo data (SEED334-PRJ-08): v1439 added one description ("Route optimisation engine") and
-- the other nine were skipped by this bug. That one is linked to its product, and the other nine
-- products seeded in v1219 get their own description, each linked to its product. pd_reference stays
-- blank for Admin ID Generation (one statement per row, skipped if a blank reference is waiting).
-- Fixed hex-only ids c1441…, checked free. Platform only (the sim schema has no product_descriptions).
-- ============================================================================

-- ── 1. Fix the uniqueness rule ──
ALTER TABLE public.product_descriptions DROP CONSTRAINT IF EXISTS uk_pd_product_deliverable;
ALTER TABLE public.product_descriptions DROP CONSTRAINT IF EXISTS uk_pd_ppd_composition;

CREATE UNIQUE INDEX IF NOT EXISTS uk_pd_product_deliverable
  ON public.product_descriptions (product_deliverable_id)
  WHERE product_deliverable_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uk_pd_ppd_composition
  ON public.product_descriptions (ppd_composition_item_id)
  WHERE ppd_composition_item_id IS NOT NULL;

-- ── 2. Link the v1439 description to its product ──
UPDATE public.product_descriptions
SET product_deliverable_id = 'c1219001-5d01-4a01-9c01-534433340801', updated_at = NOW()
WHERE id = 'c1439002-0000-4000-8000-000000000001'
  AND product_deliverable_id IS NULL
  AND EXISTS (SELECT 1 FROM public.product_deliverables d WHERE d.id = 'c1219001-5d01-4a01-9c01-534433340801')
  AND NOT EXISTS (SELECT 1 FROM public.product_descriptions x WHERE x.product_deliverable_id = 'c1219001-5d01-4a01-9c01-534433340801');

-- ── 3. One description for each of the other nine products ──
INSERT INTO public.product_descriptions (id, project_id, pd_reference, product_deliverable_id, version_number, author_id, owner_id, owner_name, product_title, purpose, composition, development_skills_required, customer_quality_expectations, quality_characteristics, acceptance_method, acceptance_responsibilities, handover_arrangements, status, approved_date, approved_by, created_by, updated_by)
SELECT 'c1441002-0000-4000-8000-000000000001', p.id, '', 'c1219001-5d01-4a01-9c01-534433340802', '1.0', p.owner_user_id, p.owner_user_id, 'Lindiwe Moyo', 'Driver mobile application', 'Gives drivers their stops, navigation and proof of delivery on the company phone.', 'Stop list, navigation link, photo and signature capture, offline mode', 'Delivery team with depot champions', 'Works on the company phones, under 40 MB, offline on night routes', 'Reliable, simple to use, documented', 'Acceptance test in the pilot environment, then sign-off by the senior user', 'Senior users (depot managers) accept, senior supplier confirms', 'Handed to the IT service desk with the operations handover guide', 'approved'::pd_status_enum, '2026-04-03', p.owner_user_id, p.owner_user_id, p.owner_user_id
FROM public.projects p
WHERE p.project_code = 'SEED334-PRJ-08' AND p.owner_user_id IS NOT NULL
  AND EXISTS (SELECT 1 FROM public.product_deliverables d WHERE d.id = 'c1219001-5d01-4a01-9c01-534433340802')
  AND NOT EXISTS (SELECT 1 FROM public.product_descriptions x WHERE x.pd_reference = '')
ON CONFLICT DO NOTHING;

INSERT INTO public.product_descriptions (id, project_id, pd_reference, product_deliverable_id, version_number, author_id, owner_id, owner_name, product_title, purpose, composition, development_skills_required, customer_quality_expectations, quality_characteristics, acceptance_method, acceptance_responsibilities, handover_arrangements, status, approved_date, approved_by, created_by, updated_by)
SELECT 'c1441002-0000-4000-8000-000000000002', p.id, '', 'c1219001-5d01-4a01-9c01-534433340803', '1.0', p.owner_user_id, p.owner_user_id, 'Lindiwe Moyo', 'Dispatch console', 'Lets dispatchers review, compare and override proposed routes before release.', 'Route list, map view, override and release actions', 'Delivery team with depot champions', 'Dispatchers rate it 4 of 5 or better, override in 2 clicks', 'Reliable, simple to use, documented', 'Acceptance test in the pilot environment, then sign-off by the senior user', 'Senior users (depot managers) accept, senior supplier confirms', 'Handed to the IT service desk with the operations handover guide', 'approved'::pd_status_enum, '2026-04-03', p.owner_user_id, p.owner_user_id, p.owner_user_id
FROM public.projects p
WHERE p.project_code = 'SEED334-PRJ-08' AND p.owner_user_id IS NOT NULL
  AND EXISTS (SELECT 1 FROM public.product_deliverables d WHERE d.id = 'c1219001-5d01-4a01-9c01-534433340803')
  AND NOT EXISTS (SELECT 1 FROM public.product_descriptions x WHERE x.pd_reference = '')
ON CONFLICT DO NOTHING;

INSERT INTO public.product_descriptions (id, project_id, pd_reference, product_deliverable_id, version_number, author_id, owner_id, owner_name, product_title, purpose, composition, development_skills_required, customer_quality_expectations, quality_characteristics, acceptance_method, acceptance_responsibilities, handover_arrangements, status, approved_date, approved_by, created_by, updated_by)
SELECT 'c1441002-0000-4000-8000-000000000003', p.id, '', 'c1219001-5d01-4a01-9c01-534433340804', '1.0', p.owner_user_id, p.owner_user_id, 'Lindiwe Moyo', 'Customer tracking portal', 'Shows customers where their delivery is and the expected arrival window.', 'Tracking page, arrival window, delivery confirmation', 'Delivery team with depot champions', 'Arrival window accurate within 30 minutes on 90% of deliveries', 'Reliable, simple to use, documented', 'Acceptance test in the pilot environment, then sign-off by the senior user', 'Senior users (depot managers) accept, senior supplier confirms', 'Handed to the IT service desk with the operations handover guide', 'under_review'::pd_status_enum, NULL, NULL, p.owner_user_id, p.owner_user_id
FROM public.projects p
WHERE p.project_code = 'SEED334-PRJ-08' AND p.owner_user_id IS NOT NULL
  AND EXISTS (SELECT 1 FROM public.product_deliverables d WHERE d.id = 'c1219001-5d01-4a01-9c01-534433340804')
  AND NOT EXISTS (SELECT 1 FROM public.product_descriptions x WHERE x.pd_reference = '')
ON CONFLICT DO NOTHING;

INSERT INTO public.product_descriptions (id, project_id, pd_reference, product_deliverable_id, version_number, author_id, owner_id, owner_name, product_title, purpose, composition, development_skills_required, customer_quality_expectations, quality_characteristics, acceptance_method, acceptance_responsibilities, handover_arrangements, status, approved_date, approved_by, created_by, updated_by)
SELECT 'c1441002-0000-4000-8000-000000000004', p.id, '', 'c1219001-5d01-4a01-9c01-534433340805', '1.0', p.owner_user_id, p.owner_user_id, 'Lindiwe Moyo', 'Freight rate calculator', 'Works out the cost of each planned route for the savings comparison.', 'Fuel, driver time and distance cost model by vehicle type', 'Delivery team with depot champions', 'Within 3% of finance cost figures', 'Reliable, simple to use, documented', 'Acceptance test in the pilot environment, then sign-off by the senior user', 'Senior users (depot managers) accept, senior supplier confirms', 'Handed to the IT service desk with the operations handover guide', 'approved'::pd_status_enum, '2026-04-03', p.owner_user_id, p.owner_user_id, p.owner_user_id
FROM public.projects p
WHERE p.project_code = 'SEED334-PRJ-08' AND p.owner_user_id IS NOT NULL
  AND EXISTS (SELECT 1 FROM public.product_deliverables d WHERE d.id = 'c1219001-5d01-4a01-9c01-534433340805')
  AND NOT EXISTS (SELECT 1 FROM public.product_descriptions x WHERE x.pd_reference = '')
ON CONFLICT DO NOTHING;

INSERT INTO public.product_descriptions (id, project_id, pd_reference, product_deliverable_id, version_number, author_id, owner_id, owner_name, product_title, purpose, composition, development_skills_required, customer_quality_expectations, quality_characteristics, acceptance_method, acceptance_responsibilities, handover_arrangements, status, approved_date, approved_by, created_by, updated_by)
SELECT 'c1441002-0000-4000-8000-000000000005', p.id, '', 'c1219001-5d01-4a01-9c01-534433340806', '1.0', p.owner_user_id, p.owner_user_id, 'Lindiwe Moyo', 'Proof of delivery pack', 'Captures signature, photo and time at each stop as evidence of delivery.', 'Signature, photo, timestamp and location per stop', 'Delivery team with depot champions', 'Every delivery has a complete record', 'Reliable, simple to use, documented', 'Acceptance test in the pilot environment, then sign-off by the senior user', 'Senior users (depot managers) accept, senior supplier confirms', 'Handed to the IT service desk with the operations handover guide', 'approved'::pd_status_enum, '2026-04-03', p.owner_user_id, p.owner_user_id, p.owner_user_id
FROM public.projects p
WHERE p.project_code = 'SEED334-PRJ-08' AND p.owner_user_id IS NOT NULL
  AND EXISTS (SELECT 1 FROM public.product_deliverables d WHERE d.id = 'c1219001-5d01-4a01-9c01-534433340806')
  AND NOT EXISTS (SELECT 1 FROM public.product_descriptions x WHERE x.pd_reference = '')
ON CONFLICT DO NOTHING;

INSERT INTO public.product_descriptions (id, project_id, pd_reference, product_deliverable_id, version_number, author_id, owner_id, owner_name, product_title, purpose, composition, development_skills_required, customer_quality_expectations, quality_characteristics, acceptance_method, acceptance_responsibilities, handover_arrangements, status, approved_date, approved_by, created_by, updated_by)
SELECT 'c1441002-0000-4000-8000-000000000006', p.id, '', 'c1219001-5d01-4a01-9c01-534433340807', '1.0', p.owner_user_id, p.owner_user_id, 'Lindiwe Moyo', 'Warehouse slotting rules', 'Orders loading so the first drop is loaded last.', 'Loading sequence rules per vehicle type', 'Delivery team with depot champions', 'No re-handling at the first three stops', 'Reliable, simple to use, documented', 'Acceptance test in the pilot environment, then sign-off by the senior user', 'Senior users (depot managers) accept, senior supplier confirms', 'Handed to the IT service desk with the operations handover guide', 'draft'::pd_status_enum, NULL, NULL, p.owner_user_id, p.owner_user_id
FROM public.projects p
WHERE p.project_code = 'SEED334-PRJ-08' AND p.owner_user_id IS NOT NULL
  AND EXISTS (SELECT 1 FROM public.product_deliverables d WHERE d.id = 'c1219001-5d01-4a01-9c01-534433340807')
  AND NOT EXISTS (SELECT 1 FROM public.product_descriptions x WHERE x.pd_reference = '')
ON CONFLICT DO NOTHING;

INSERT INTO public.product_descriptions (id, project_id, pd_reference, product_deliverable_id, version_number, author_id, owner_id, owner_name, product_title, purpose, composition, development_skills_required, customer_quality_expectations, quality_characteristics, acceptance_method, acceptance_responsibilities, handover_arrangements, status, approved_date, approved_by, created_by, updated_by)
SELECT 'c1441002-0000-4000-8000-000000000007', p.id, '', 'c1219001-5d01-4a01-9c01-534433340808', '1.0', p.owner_user_id, p.owner_user_id, 'Lindiwe Moyo', 'Exception alert service', 'Alerts dispatchers when a vehicle falls behind or a stop fails.', 'Late-vehicle, failed-stop and off-route alerts', 'Delivery team with depot champions', 'Alert within 5 minutes of the event', 'Reliable, simple to use, documented', 'Acceptance test in the pilot environment, then sign-off by the senior user', 'Senior users (depot managers) accept, senior supplier confirms', 'Handed to the IT service desk with the operations handover guide', 'approved'::pd_status_enum, '2026-04-03', p.owner_user_id, p.owner_user_id, p.owner_user_id
FROM public.projects p
WHERE p.project_code = 'SEED334-PRJ-08' AND p.owner_user_id IS NOT NULL
  AND EXISTS (SELECT 1 FROM public.product_deliverables d WHERE d.id = 'c1219001-5d01-4a01-9c01-534433340808')
  AND NOT EXISTS (SELECT 1 FROM public.product_descriptions x WHERE x.pd_reference = '')
ON CONFLICT DO NOTHING;

INSERT INTO public.product_descriptions (id, project_id, pd_reference, product_deliverable_id, version_number, author_id, owner_id, owner_name, product_title, purpose, composition, development_skills_required, customer_quality_expectations, quality_characteristics, acceptance_method, acceptance_responsibilities, handover_arrangements, status, approved_date, approved_by, created_by, updated_by)
SELECT 'c1441002-0000-4000-8000-000000000008', p.id, '', 'c1219001-5d01-4a01-9c01-534433340809', '1.0', p.owner_user_id, p.owner_user_id, 'Lindiwe Moyo', 'Carrier feed adapter', 'Sends route and load details to subcontracted carriers.', 'Daily route file and status updates to two carriers', 'Delivery team with depot champions', 'Carriers receive routes by 05:30', 'Reliable, simple to use, documented', 'Acceptance test in the pilot environment, then sign-off by the senior user', 'Senior users (depot managers) accept, senior supplier confirms', 'Handed to the IT service desk with the operations handover guide', 'under_review'::pd_status_enum, NULL, NULL, p.owner_user_id, p.owner_user_id
FROM public.projects p
WHERE p.project_code = 'SEED334-PRJ-08' AND p.owner_user_id IS NOT NULL
  AND EXISTS (SELECT 1 FROM public.product_deliverables d WHERE d.id = 'c1219001-5d01-4a01-9c01-534433340809')
  AND NOT EXISTS (SELECT 1 FROM public.product_descriptions x WHERE x.pd_reference = '')
ON CONFLICT DO NOTHING;

INSERT INTO public.product_descriptions (id, project_id, pd_reference, product_deliverable_id, version_number, author_id, owner_id, owner_name, product_title, purpose, composition, development_skills_required, customer_quality_expectations, quality_characteristics, acceptance_method, acceptance_responsibilities, handover_arrangements, status, approved_date, approved_by, created_by, updated_by)
SELECT 'c1441002-0000-4000-8000-000000000009', p.id, '', 'c1219001-5d01-4a01-9c01-53443334080a', '1.0', p.owner_user_id, p.owner_user_id, 'Lindiwe Moyo', 'Operations handover guide', 'How the depots and the IT service desk run the route service after the pilot.', 'Daily checks, common faults, escalation contacts', 'Delivery team with depot champions', 'Service desk can resolve the top 10 faults alone', 'Reliable, simple to use, documented', 'Acceptance test in the pilot environment, then sign-off by the senior user', 'Senior users (depot managers) accept, senior supplier confirms', 'Handed to the IT service desk with the operations handover guide', 'draft'::pd_status_enum, NULL, NULL, p.owner_user_id, p.owner_user_id
FROM public.projects p
WHERE p.project_code = 'SEED334-PRJ-08' AND p.owner_user_id IS NOT NULL
  AND EXISTS (SELECT 1 FROM public.product_deliverables d WHERE d.id = 'c1219001-5d01-4a01-9c01-53443334080a')
  AND NOT EXISTS (SELECT 1 FROM public.product_descriptions x WHERE x.pd_reference = '')
ON CONFLICT DO NOTHING;

-- Check: descriptions for the demo project and their products (target 10, each linked).
SELECT d.product_name, pd.product_title, pd.pd_reference, pd.status
FROM public.product_descriptions pd
JOIN public.projects p ON p.id = pd.project_id
LEFT JOIN public.product_deliverables d ON d.id = pd.product_deliverable_id
WHERE p.project_code = 'SEED334-PRJ-08' AND COALESCE(pd.is_deleted, FALSE) = FALSE
ORDER BY d.product_name NULLS LAST;
