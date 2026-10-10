-- Remove repeated objective-area rows on the Velocity Freight end project report.
-- Each area (time, cost, quality, scope, benefits, risk) is kept once:
-- the earliest display order. Safe to run more than once.

DELETE FROM public.end_project_report_objectives_review AS extra
USING public.end_project_report_objectives_review AS keep
JOIN public.end_project_reports AS report
  ON report.id = keep.end_project_report_id
JOIN public.projects AS project
  ON project.id = report.project_id
WHERE project.project_code = 'SEED334-PRJ-08'
  AND COALESCE(report.is_deleted, FALSE) = FALSE
  AND extra.end_project_report_id = keep.end_project_report_id
  AND extra.objective_area = keep.objective_area
  AND extra.id <> keep.id
  AND (extra.display_order, extra.id::text) > (keep.display_order, keep.id::text);
