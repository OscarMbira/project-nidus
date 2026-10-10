-- v1225: target date on each follow-on action description line.
-- Stored as [{ "description": "...", "target_date": "YYYY-MM-DD" }].
-- action_description stays the newline-joined text for existing lists.
-- Safe to run more than once.

ALTER TABLE public.follow_on_actions
  ADD COLUMN IF NOT EXISTS action_description_items JSONB;

COMMENT ON COLUMN public.follow_on_actions.action_description_items IS
  'Description lines for a follow-on action, each with its own target date. Array of {description, target_date}.';

SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'follow_on_actions'
  AND column_name = 'action_description_items';
