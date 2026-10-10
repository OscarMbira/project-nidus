-- v1224: extra completion-status rows on a project handover.
-- The three built-in flags stay on their own columns. Anything the user adds
-- is stored here as [{ "item": "...", "completed": true }].
-- Safe to run more than once.

ALTER TABLE public.project_handover
  ADD COLUMN IF NOT EXISTS completion_status_items JSONB;

COMMENT ON COLUMN public.project_handover.completion_status_items IS
  'Extra completion-status items added on the handover form. Array of {item, completed}.';

SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'project_handover'
  AND column_name = 'completion_status_items';
