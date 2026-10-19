/**
 * v1265 — open the task form as a modal over the current schedule view (owner decision
 * 2026-10-12; rule 65 task-form exception). The task stays in the address so links can be
 * shared and Back closes it:
 *   ?task=TSK-0001             view
 *   ?task=TSK-0001&taskMode=edit
 *   ?task=new[&parent=TSK-0009] new task / sub-task
 * Other query parameters (projectId, view=full …) are kept.
 */
import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'

const KEYS = ['task', 'taskMode', 'parent']

export function useTaskModal() {
  const [searchParams, setSearchParams] = useSearchParams()

  const state = useMemo(() => {
    const task = searchParams.get('task')
    if (!task) return null
    const isNew = task === 'new'
    return {
      taskKey: isNew ? null : task,
      mode: isNew ? 'new' : searchParams.get('taskMode') === 'edit' ? 'edit' : 'view',
      parentKey: searchParams.get('parent'),
    }
  }, [searchParams])

  const update = useCallback((values, { replace = false } = {}) => {
    const next = new URLSearchParams(searchParams)
    for (const k of KEYS) next.delete(k)
    for (const [k, v] of Object.entries(values)) if (v) next.set(k, v)
    setSearchParams(next, { replace })
  }, [searchParams, setSearchParams])

  /** Open a task (row or key) to view or edit. */
  const openTask = useCallback((taskOrKey, mode = 'view') => {
    const key = typeof taskOrKey === 'string' ? taskOrKey : taskOrKey?.task_code || taskOrKey?.id
    if (key) update({ task: key, taskMode: mode === 'edit' ? 'edit' : null })
  }, [update])

  /** New task, or a sub-task when a parent (row or key) is given. */
  const newTask = useCallback((parent = null) => {
    const key = typeof parent === 'string' ? parent : parent?.task_code || parent?.id
    update({ task: 'new', parent: key || null })
  }, [update])

  const setMode = useCallback((mode, key) => update({ task: key, taskMode: mode === 'edit' ? 'edit' : null }, { replace: true }), [update])
  const close = useCallback(() => update({}, { replace: true }), [update])

  return { state, openTask, newTask, setMode, close }
}
