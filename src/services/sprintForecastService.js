/**
 * Sprint forecasting from completed sprint velocities + remaining backlog (v350).
 * Uses platformDb — no mock data.
 */
import { platformDb } from './supabase/supabaseClient'

/**
 * @param {string} projectId
 * @param {{ lastNSprints?: number }} [opts]
 * @returns {Promise<{
 *   avgVelocity: number,
 *   minVelocity: number,
 *   maxVelocity: number,
 *   remainingPoints: number,
 *   sprintsRemaining: number | null,
 *   sprintCount: number
 * }>}
 */
export async function computeSprintForecast(projectId, opts = {}) {
  const n = Math.max(1, Math.min(opts.lastNSprints ?? 3, 12))

  const { data: sprints, error: sErr } = await platformDb
    .from('sprints')
    .select('id, completed_story_points, velocity, status, sprint_end_date')
    .eq('project_id', projectId)
    .eq('is_deleted', false)
    .order('sprint_end_date', { ascending: false })

  if (sErr) throw sErr

  const completed = (sprints || []).filter((s) => s.status === 'completed' && Number(s.completed_story_points) >= 0)
  const slice = completed.slice(0, n)
  const velocities = slice.map((s) => Number(s.velocity ?? s.completed_story_points) || 0).filter((v) => v >= 0)

  const avgVelocity = velocities.length ? velocities.reduce((a, b) => a + b, 0) / velocities.length : 0
  const minVelocity = velocities.length ? Math.min(...velocities) : 0
  const maxVelocity = velocities.length ? Math.max(...velocities) : 0

  const { data: stories, error: uErr } = await platformDb
    .from('user_stories')
    .select('story_points')
    .eq('project_id', projectId)
    .eq('is_deleted', false)
    .neq('status', 'done')
    .neq('status', 'cancelled')

  if (uErr) throw uErr

  const remainingPoints = (stories || []).reduce((sum, r) => sum + (Number(r.story_points) || 0), 0)

  let sprintsRemaining = null
  if (avgVelocity > 0 && remainingPoints > 0) {
    sprintsRemaining = Math.ceil(remainingPoints / avgVelocity)
  } else if (remainingPoints === 0) {
    sprintsRemaining = 0
  }

  return {
    avgVelocity: Math.round(avgVelocity * 100) / 100,
    minVelocity,
    maxVelocity,
    remainingPoints,
    sprintsRemaining,
    sprintCount: velocities.length,
  }
}
