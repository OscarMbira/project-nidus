-- ============================================================================
-- v1442: Product description uniqueness fix, take 2 — drop the NULLS NOT DISTINCT rules by definition
-- ============================================================================
-- v1441 dropped the two v207 rules by name (uk_pd_product_deliverable / uk_pd_ppd_composition), but the
-- live table holds them under different names, so "DROP CONSTRAINT IF EXISTS" silently did nothing and
-- the nine product description inserts were skipped again by the old rule. This file finds every unique
-- constraint on product_descriptions whose definition contains NULLS NOT DISTINCT and drops it, whatever
-- its name, then keeps the intended rule (one description per deliverable / per composition item, empty
-- values allowed) with the v1441 partial unique indexes. Then it re-adds the nine linked descriptions.
-- The first query shows the constraints before the change, the last one the result.
-- ============================================================================

-- Before: unique constraints on product_descriptions.
SELECT conname, pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'public.product_descriptions'::regclass AND contype = 'u';

-- ── 1. Drop the NULLS NOT DISTINCT rules, whatever their names ──
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'public.product_descriptions'::regclass AND contype = 'u'
      AND pg_get_constraintdef(oid) ILIKE '%NULLS NOT DISTINCT%'
  LOOP
    EXECUTE format('ALTER TABLE public.product_descriptions DROP CONSTRAINT %I', r.conname);
    RAISE NOTICE 'v1442: dropped %', r.conname;
  END LOOP;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS uk_pd_product_deliverable
  ON public.product_descriptions (product_deliverable_id)
  WHERE product_deliverable_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uk_pd_ppd_composition
  ON public.product_descriptions (ppd_composition_item_id)
  WHERE ppd_composition_item_id IS NOT NULL;

-- ── 2. The nine linked descriptions (same rows as v1441, which were skipped) ──
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

-- After: unique rules left on the table, and the demo descriptions (target 10, each linked).
SELECT conname, pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'public.product_descriptions'::regclass AND contype = 'u';

SELECT d.product_name, pd.product_title, pd.pd_reference, pd.status
FROM public.product_descriptions pd
JOIN public.projects p ON p.id = pd.project_id
LEFT JOIN public.product_deliverables d ON d.id = pd.product_deliverable_id
WHERE p.project_code = 'SEED334-PRJ-08' AND COALESCE(pd.is_deleted, FALSE) = FALSE
ORDER BY d.product_name NULLS LAST;
