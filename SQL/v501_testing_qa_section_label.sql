-- v501 — Sidebar parent label: "Testing and QA"
-- Run after v346 / v500. Idempotent.

UPDATE public.menu_items
SET
  menu_label = 'Testing and QA',
  updated_at = NOW()
WHERE menu_code = 'testing_qa_section'
  AND (is_deleted = FALSE OR is_deleted IS NULL);
