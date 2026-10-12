/**
 * v1239 Slice 4.1 — where the task board and task calendar read and write, per shell.
 *
 *   Platform / Planner → platformDb, tasks.project_id → projects
 *   Simulator          → simDb, tasks.practice_project_id → practice_projects
 *                        (task_statuses is a public read-only lookup in both modes)
 *
 * Task links: inside a schedule mount (`…/schedule/board`) they open the shared routed task page;
 * on the Platform's own Tasks area (`/platform/tasks/board`) they keep its existing task pages.
 */
import { useMemo } from 'react'
import { useLocation } from 'react-router-dom'
import { platformDb, simDb } from '@nidus/supabase'
import { usePlanning } from '@nidus/planning/context/PlanningContext.jsx'
import { scheduleLinkFor } from './useSchedule.js'

export function taskSourceFor(isSim) {
  const fk = isSim ? 'practice_project_id' : 'project_id'
  return {
    isSim,
    db: isSim ? simDb : platformDb,
    lookupDb: platformDb,
    fk,
    projectsTable: isSim ? 'practice_projects' : 'projects',
    // sim.tasks has no FK to users (LIKE copies no foreign keys), so no assignee embed there.
    projectEmbed: `projects:${fk} (id, project_name)`,
    assigneeEmbed: isSim ? '' : 'assigned_user:assigned_to_user_id (id, full_name, email)',
    // sim.tasks.status_id points at public.task_statuses, which PostgREST cannot embed across schemas.
    statusEmbed: isSim ? '' : 'task_statuses:status_id (status_name, status_color)',
  }
}

export function useTaskSource() {
  const { isSim } = usePlanning()
  const { pathname, search } = useLocation()
  return useMemo(() => {
    const src = taskSourceFor(isSim)
    const inSchedule = /\/schedule(\/|$)/.test(pathname)
    const projectQuery = new URLSearchParams(search).get('projectId')
    const keep = projectQuery ? `?projectId=${encodeURIComponent(projectQuery)}` : ''
    return {
      ...src,
      taskPath: (task) => (inSchedule
        ? scheduleLinkFor(pathname, keep, `tasks/${encodeURIComponent(task.task_code || task.id)}`)
        : `/platform/tasks/${task.id}`),
      createPath: () => (inSchedule ? scheduleLinkFor(pathname, keep, 'tasks/new') : '/platform/tasks/create'),
    }
  }, [isSim, pathname, search])
}
