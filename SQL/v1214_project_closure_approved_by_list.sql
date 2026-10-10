-- =============================================================================
-- v1214: Allow more than one approver on a project closure.
-- approved_by stays the first approver (existing user link).
-- approved_by_list stores every approver user id, one per line.
-- Run this in the Supabase SQL editor before saving multiple approvers.
-- =============================================================================

ALTER TABLE public.project_closures
  ADD COLUMN IF NOT EXISTS approved_by_list TEXT;

COMMENT ON COLUMN public.project_closures.approved_by_list IS
  'Newline-joined user ids of everyone who approved the closure. approved_by remains the first id.';
