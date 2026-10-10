-- =============================================================================
-- v1219: Seed products for SEED334-PRJ-08 (Velocity Freight) only.
-- These rows fill the configuration item "Linked products" dropdown
-- (product_deliverables for the project).
-- Idempotent: fixed hex-only UUIDs, ON CONFLICT (id) DO NOTHING.
-- product_code is left blank; it is not an Admin display id.
-- =============================================================================

DO $$
DECLARE
  v_project_id UUID;
  v_user_id    UUID;
BEGIN
  SELECT id INTO v_project_id
  FROM public.projects
  WHERE project_code = 'SEED334-PRJ-08'
    AND COALESCE(is_deleted, FALSE) = FALSE
  LIMIT 1;

  IF v_project_id IS NULL THEN
    RAISE EXCEPTION 'v1219: project SEED334-PRJ-08 not found';
  END IF;

  SELECT owner_user_id INTO v_user_id FROM public.projects WHERE id = v_project_id;
  IF v_user_id IS NULL THEN
    SELECT id INTO v_user_id
    FROM public.users
    WHERE COALESCE(is_deleted, FALSE) = FALSE
    LIMIT 1;
  END IF;
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'v1219: no user available to own the seed products';
  END IF;

  INSERT INTO public.product_deliverables (
    id, project_id, product_name, product_description, product_type, status,
    created_by_user_id, created_by, updated_by
  ) VALUES
    ('c1219001-5d01-4a01-9c01-534433340801', v_project_id, 'Route optimisation engine', 'Calculates costed delivery routes from live orders and fleet capacity.', 'deliverable', 'in_progress', v_user_id, v_user_id, v_user_id),
    ('c1219001-5d01-4a01-9c01-534433340802', v_project_id, 'Driver mobile application', 'Gives drivers the assigned route, stops, and proof-of-delivery capture.', 'deliverable', 'in_progress', v_user_id, v_user_id, v_user_id),
    ('c1219001-5d01-4a01-9c01-534433340803', v_project_id, 'Dispatch console', 'Lets planners review, adjust, and release the daily route plan.', 'deliverable', 'in_progress', v_user_id, v_user_id, v_user_id),
    ('c1219001-5d01-4a01-9c01-534433340804', v_project_id, 'Customer tracking portal', 'Shows shippers the current status and estimated arrival of a consignment.', 'deliverable', 'not_started', v_user_id, v_user_id, v_user_id),
    ('c1219001-5d01-4a01-9c01-534433340805', v_project_id, 'Freight rate calculator', 'Prices a shipment from lane, weight, service level, and accessorials.', 'deliverable', 'not_started', v_user_id, v_user_id, v_user_id),
    ('c1219001-5d01-4a01-9c01-534433340806', v_project_id, 'Proof of delivery pack', 'Stores the signature, photo, and exception notes for a completed stop.', 'deliverable', 'not_started', v_user_id, v_user_id, v_user_id),
    ('c1219001-5d01-4a01-9c01-534433340807', v_project_id, 'Warehouse slotting rules', 'Defines how outbound freight is staged before it is loaded.', 'deliverable', 'not_started', v_user_id, v_user_id, v_user_id),
    ('c1219001-5d01-4a01-9c01-534433340808', v_project_id, 'Exception alert service', 'Notifies dispatch when a route misses its time or cost tolerance.', 'deliverable', 'not_started', v_user_id, v_user_id, v_user_id),
    ('c1219001-5d01-4a01-9c01-534433340809', v_project_id, 'Carrier feed adapter', 'Brings booking and tracking messages in from external carriers.', 'deliverable', 'not_started', v_user_id, v_user_id, v_user_id),
    ('c1219001-5d01-4a01-9c01-53443334080a', v_project_id, 'Operations handover guide', 'Explains how the control room runs the optimiser after go-live.', 'deliverable', 'not_started', v_user_id, v_user_id, v_user_id)
  ON CONFLICT (id) DO NOTHING;
END $$;

SELECT product_name, status
FROM public.product_deliverables
WHERE project_id = (SELECT id FROM public.projects WHERE project_code = 'SEED334-PRJ-08' LIMIT 1)
  AND COALESCE(is_deleted, FALSE) = FALSE
  AND id::text LIKE 'c1219001-%'
ORDER BY product_name;
