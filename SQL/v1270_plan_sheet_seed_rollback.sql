-- =============================================================================
-- v1270 seed rollback (feature v1265): remove the sample Plan Sheet tasks, links and the sample B0 baseline
-- added by v1270_plan_sheet_seed.sql (fixed ids a1265000-… public, b1265000-… sim).
-- Other tasks are not touched. Recalculate the schedule afterwards (Recalculate button).
-- =============================================================================

DELETE FROM public.task_dependencies WHERE id::text LIKE 'a1265000-%';
DELETE FROM sim.task_dependencies    WHERE id::text LIKE 'b1265000-%';
DELETE FROM public.project_baselines WHERE id::text LIKE 'a1265000-%';
DELETE FROM sim.project_baselines    WHERE id::text LIKE 'b1265000-%';
-- children first (parent_task_id ON DELETE SET NULL would otherwise keep them as top level)
DELETE FROM public.tasks WHERE id::text LIKE 'a1265000-%' AND parent_task_id IS NOT NULL;
DELETE FROM public.tasks WHERE id::text LIKE 'a1265000-%';
DELETE FROM sim.tasks WHERE id::text LIKE 'b1265000-%' AND parent_task_id IS NOT NULL;
DELETE FROM sim.tasks WHERE id::text LIKE 'b1265000-%';

SELECT 'rolled back' AS status;
