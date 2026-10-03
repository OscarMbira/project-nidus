-- Multiple related items on an issue.
-- The original single columns stay and keep the first id so existing reads still work.
-- Run this before saving an issue that links more than one task, work package, user story, or kanban card.

ALTER TABLE public.issues
  ADD COLUMN IF NOT EXISTS linked_task_ids UUID[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS linked_work_package_ids UUID[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS linked_user_story_ids UUID[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS linked_kanban_card_ids UUID[] NOT NULL DEFAULT '{}';

UPDATE public.issues
SET linked_task_ids = ARRAY[task_id]
WHERE task_id IS NOT NULL
  AND cardinality(linked_task_ids) = 0;

UPDATE public.issues
SET linked_work_package_ids = ARRAY[work_package_id]
WHERE work_package_id IS NOT NULL
  AND cardinality(linked_work_package_ids) = 0;

UPDATE public.issues
SET linked_user_story_ids = ARRAY[user_story_id]
WHERE user_story_id IS NOT NULL
  AND cardinality(linked_user_story_ids) = 0;

UPDATE public.issues
SET linked_kanban_card_ids = ARRAY[kanban_card_id]
WHERE kanban_card_id IS NOT NULL
  AND cardinality(linked_kanban_card_ids) = 0;

CREATE INDEX IF NOT EXISTS idx_issues_linked_task_ids
  ON public.issues USING GIN (linked_task_ids);
CREATE INDEX IF NOT EXISTS idx_issues_linked_work_package_ids
  ON public.issues USING GIN (linked_work_package_ids);
CREATE INDEX IF NOT EXISTS idx_issues_linked_user_story_ids
  ON public.issues USING GIN (linked_user_story_ids);
CREATE INDEX IF NOT EXISTS idx_issues_linked_kanban_card_ids
  ON public.issues USING GIN (linked_kanban_card_ids);

COMMENT ON COLUMN public.issues.linked_task_ids IS 'Tasks linked to this issue. task_id stores the first id.';
COMMENT ON COLUMN public.issues.linked_work_package_ids IS 'Work packages linked to this issue. work_package_id stores the first id.';
COMMENT ON COLUMN public.issues.linked_user_story_ids IS 'User stories linked to this issue. user_story_id stores the first id.';
COMMENT ON COLUMN public.issues.linked_kanban_card_ids IS 'Kanban cards linked to this issue. kanban_card_id stores the first id.';
