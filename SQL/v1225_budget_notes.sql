-- v1225: notes for the project budget.
-- project_budget_categories.notes: a note on each budget line.
-- projects.budget_notes: overall budget notes (the Notes tab on the Budget page).
-- Safe to run more than once.

ALTER TABLE public.project_budget_categories
  ADD COLUMN IF NOT EXISTS notes TEXT;

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS budget_notes TEXT;

-- Verification
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND ((table_name = 'project_budget_categories' AND column_name = 'notes')
    OR (table_name = 'projects' AND column_name = 'budget_notes'));
