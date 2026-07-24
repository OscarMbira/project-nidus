/**
 * Platform rows use project_id (public.projects); Simulator uses practice_project_id (sim.practice_projects).
 */

export function projectColumn(ctx) {
  if (ctx?.practiceProjectId) return 'practice_project_id'
  return 'project_id'
}

export function projectIdForQuery(ctx) {
  return ctx?.practiceProjectId ?? ctx?.projectId
}
