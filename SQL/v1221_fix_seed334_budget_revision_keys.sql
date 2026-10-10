-- v1221: correct the SEED334-PRJ-08 budget revision snapshots written by v1220.
-- v1220 stored snapshot lines with "name" and "amount" keys; the app reads
-- category_name, budget_amount, funding_source_id and display_order, so the
-- revision history showed "undefined" lines. Rewrites only snapshots that still
-- use the old keys. Safe to run more than once.

UPDATE public.project_budget_revisions AS r
SET budget_categories = (
  SELECT jsonb_agg(
    jsonb_build_object(
      'category_name', e.elem->>'name',
      'budget_amount', (e.elem->>'amount')::numeric,
      'funding_source_id', NULL,
      'display_order', e.ord - 1
    )
    ORDER BY e.ord
  )
  FROM jsonb_array_elements(r.budget_categories) WITH ORDINALITY AS e(elem, ord)
)
WHERE r.project_id = (
    SELECT id FROM public.projects WHERE project_code = 'SEED334-PRJ-08' AND COALESCE(is_deleted, FALSE) = FALSE LIMIT 1
  )
  AND EXISTS (
    SELECT 1 FROM jsonb_array_elements(r.budget_categories) AS old(elem)
    WHERE old.elem ? 'name' AND NOT old.elem ? 'category_name'
  );

-- Verification: no SEED334-PRJ-08 snapshot should still use the old keys
SELECT r.revision_number
FROM public.project_budget_revisions r
JOIN public.projects p ON p.id = r.project_id
WHERE p.project_code = 'SEED334-PRJ-08'
  AND EXISTS (
    SELECT 1 FROM jsonb_array_elements(r.budget_categories) AS old(elem)
    WHERE old.elem ? 'name' AND NOT old.elem ? 'category_name'
  );
