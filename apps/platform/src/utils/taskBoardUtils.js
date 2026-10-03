/**
 * Pure helpers for the task board (grouping, sort, drop target).
 * Column order follows the status list. Within a column, tasks stay in the
 * order they were sorted: name A→Z, then created_at oldest first.
 */

export function sortTasksForBoard(tasks) {
  if (!Array.isArray(tasks) || tasks.length < 2) return tasks || []
  return [...tasks].sort((a, b) => {
    const byName = String(a?.task_name || '').localeCompare(String(b?.task_name || ''), undefined, {
      sensitivity: 'base',
    })
    if (byName !== 0) return byName
    return String(a?.created_at || '').localeCompare(String(b?.created_at || ''))
  })
}

/**
 * @param {Array} tasks
 * @param {Array<{ id: string }>} statuses
 * @returns {Map<string, Array>}
 */
export function groupTasksByStatus(tasks, statuses) {
  const grouped = new Map()
  for (const status of statuses || []) {
    if (status?.id) grouped.set(status.id, [])
  }
  for (const task of tasks || []) {
    const bucket = grouped.get(task?.status_id)
    if (bucket) bucket.push(task)
  }
  return grouped
}

/**
 * A drop lands on a column id, or on a card inside a column.
 * @returns {string|null}
 */
export function resolveDropStatusId(overId, statuses, tasks) {
  if (!overId) return null
  if ((statuses || []).some((status) => status?.id === overId)) return overId
  const overTask = (tasks || []).find((task) => task?.id === overId)
  return overTask?.status_id || null
}
