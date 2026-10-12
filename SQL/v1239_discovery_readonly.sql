-- ============================================================================
-- v1239 Slice 0 — read-only discovery (run BEFORE v1242–v1244; changes nothing)
-- ============================================================================

-- 1. activity_list rows with no schedule activity yet (what v1244 will backfill), per account.
--    (Before v1243 there is no activity_list.task_id; this counts all non-deleted activities.)
SELECT p.account_id, COUNT(*) AS activities, COUNT(DISTINCT a.project_id) AS projects
FROM public.activity_list a
JOIN public.projects p ON p.id = a.project_id
WHERE COALESCE(a.is_deleted, FALSE) = FALSE
GROUP BY p.account_id
ORDER BY activities DESC;

SELECT COUNT(*) AS sim_activities, COUNT(DISTINCT practice_project_id) AS practice_projects
FROM sim.activity_list WHERE COALESCE(is_deleted, FALSE) = FALSE;

-- 2. Do timesheet entries point at tasks? (open question Q3; there is no FK today)
SELECT
  COUNT(*) FILTER (WHERE te.task_id IS NULL)                 AS entries_without_task,
  COUNT(*) FILTER (WHERE te.task_id IS NOT NULL AND t.id IS NOT NULL) AS entries_matching_tasks,
  COUNT(*) FILTER (WHERE te.task_id IS NOT NULL AND t.id IS NULL AND al.id IS NOT NULL) AS entries_matching_activity_list,
  COUNT(*) FILTER (WHERE te.task_id IS NOT NULL AND t.id IS NULL AND al.id IS NULL)     AS entries_matching_nothing
FROM public.timesheet_entries te
LEFT JOIN public.tasks t ON t.id = te.task_id
LEFT JOIN public.activity_list al ON al.id = te.task_id;

-- 3. Projects that already have tasks AND activity_list rows (would gain duplicates if both
--    describe the same work — review before running v1244).
SELECT a.project_id, COUNT(DISTINCT a.id) AS activities, COUNT(DISTINCT t.id) AS tasks
FROM public.activity_list a
JOIN public.tasks t ON t.project_id = a.project_id AND COALESCE(t.is_deleted, FALSE) = FALSE
WHERE COALESCE(a.is_deleted, FALSE) = FALSE
GROUP BY a.project_id
ORDER BY activities DESC
LIMIT 50;
