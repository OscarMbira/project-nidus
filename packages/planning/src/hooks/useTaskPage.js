/**
 * Open the task form as its own page (rule 65): `tasks/new[?parent=…]`, `tasks/:taskKey`,
 * `tasks/:taskKey/edit`, relative to the schedule mount. The page's Back control returns to the
 * schedule view the user came from.
 */
import { useCallback, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useScheduleLinks } from './useSchedule.js'

const keyOf = (taskOrKey) =>
  typeof taskOrKey === 'string' ? taskOrKey : taskOrKey?.task_code || taskOrKey?.id || null

const withParam = (to, name, value) =>
  value ? `${to}${to.includes('?') ? '&' : '?'}${name}=${encodeURIComponent(value)}` : to

/** Path of a task page: mode 'view' | 'edit'; `null` key = new task. */
export function taskPagePath(link, taskOrKey, mode = 'view', parent = null) {
  const key = keyOf(taskOrKey)
  if (!key) return withParam(link('tasks/new'), 'parent', keyOf(parent))
  return link(`tasks/${encodeURIComponent(key)}${mode === 'edit' ? '/edit' : ''}`)
}

export function useTaskPage() {
  const navigate = useNavigate()
  const link = useScheduleLinks()

  /** Open a task (row or key) to view or edit. */
  const openTask = useCallback((taskOrKey, mode = 'view') => {
    if (keyOf(taskOrKey)) navigate(taskPagePath(link, taskOrKey, mode))
  }, [navigate, link])

  /** New task, or a sub-task when a parent (row or key) is given. */
  const newTask = useCallback((parent = null) => {
    navigate(taskPagePath(link, null, 'view', parent))
  }, [navigate, link])

  return { openTask, newTask }
}

/** Links saved while the form was a modal (`?task=TSK-1[&taskMode=edit]`, `?task=new[&parent=…]`) open the task page. */
export function useLegacyTaskLinkRedirect() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const link = useScheduleLinks()
  const task = searchParams.get('task')
  const taskMode = searchParams.get('taskMode')
  const parent = searchParams.get('parent')
  useEffect(() => {
    if (!task) return
    const to = task === 'new'
      ? taskPagePath(link, null, 'view', parent)
      : taskPagePath(link, task, taskMode === 'edit' ? 'edit' : 'view')
    navigate(to, { replace: true })
  }, [task, taskMode, parent, link, navigate])
}
