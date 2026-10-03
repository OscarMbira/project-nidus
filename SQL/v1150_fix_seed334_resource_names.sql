-- =============================================================================
-- v1150: Fix v1145's seeded resources all showing as "Oscar Mbira" on the
--        Resource Capacity dashboard's "Top Resources by Utilization" list.
-- =============================================================================
-- v1145 named each seeded resource via COALESCE(resolved team-member name,
-- role persona name) — intended to prefer a real name when one was available.
-- SEED334-PRJ-08 has fewer than 4 distinct active project_memberships, so the
-- member-resolution fallback chain collapsed all 4 slots to the same person
-- (the project owner), and all 4 resources ended up named after them instead
-- of 4 distinct people. Fix: resource_name is always the role persona now,
-- regardless of how many distinct real members exist — the linked user_id
-- (used only for the optional "linked person" reference, not shown as the
-- primary name) is untouched.
-- Idempotent: plain UPDATE by fixed id, safe to re-run.
-- =============================================================================

UPDATE public.resources SET resource_name = 'Route Planning Analyst'
  WHERE id = '11450001-a101-4a01-9c01-534433340001';
UPDATE public.resources SET resource_name = 'Dispatch Coordinator'
  WHERE id = '11450001-a101-4a01-9c01-534433340002';
UPDATE public.resources SET resource_name = 'Fleet Operations Lead'
  WHERE id = '11450001-a101-4a01-9c01-534433340003';
UPDATE public.resources SET resource_name = 'Driver Relations Officer'
  WHERE id = '11450001-a101-4a01-9c01-534433340004';

DO $$ BEGIN
  RAISE NOTICE 'v1150: SEED334-PRJ-08 resource names de-duplicated (4 distinct roles instead of 4x the same person).';
END $$;
