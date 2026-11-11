/**
 * Data migration runbook — live run summary (v1337, PRD D4 / story 18). Totals a runbook's steps:
 * progress by status, records received / loaded / failed and overall % success, and time taken
 * against budget per window. Steps use the Runbook Steps field keys (see runbookSequencing.js).
 */
const n = (v) => (v === null || v === undefined || v === '' || !Number.isFinite(Number(v)) ? 0 : Number(v))

/** Steps of a runbook in run order. */
export function orderSteps(steps) {
  return [...(steps || [])].sort((a, b) => n(a.field_values?.sequence) - n(b.field_values?.sequence))
}

/**
 * @param {object[]} steps  Runbook Steps records of one runbook
 * @param {{ windowLabels?: Record<string,string> }} [options]
 */
export function summariseRunbook(steps, { windowLabels = {} } = {}) {
  const list = orderSteps(steps)
  const count = (status) => list.filter((s) => s.status === status).length
  const loads = list.filter((s) => ['load', 'transformation'].includes(s.field_values?.step_type))
  const received = loads.reduce((t, s) => t + n(s.field_values?.records_received), 0)
  const loaded = loads.reduce((t, s) => t + n(s.field_values?.records_loaded), 0)
  const overBudget = list.filter((s) => n(s.field_values?.budget_variance_minutes) > 0)

  const windows = []
  for (const s of list) {
    const key = s.field_values?.window || 'unassigned'
    let w = windows.find((x) => x.key === key)
    if (!w) {
      w = { key, label: windowLabels[key] || key, steps: 0, done: 0, budgetMinutes: 0, takenMinutes: 0 }
      windows.push(w)
    }
    w.steps += 1
    if (s.status === 'done' || s.status === 'skipped') w.done += 1
    w.budgetMinutes += n(s.field_values?.budget_minutes)
    w.takenMinutes += n(s.field_values?.time_taken_minutes)
  }
  // Over / under budget per window: time taken − budget (+ over, − under); null when no budget.
  for (const w of windows) w.varianceMinutes = w.budgetMinutes ? w.takenMinutes - w.budgetMinutes : null

  return {
    total: list.length,
    done: count('done'),
    skipped: count('skipped'),
    inProgress: count('in_progress'),
    failed: count('failed'),
    blocked: count('blocked'),
    notStarted: count('not_started'),
    overBudget: overBudget.length,
    received,
    loaded,
    failedRecords: Math.max(received - loaded, 0),
    successPercent: received ? Math.round((loaded / received) * 10000) / 100 : null,
    windows,
  }
}

/** "64 / 113 steps done" style progress line. */
export function runbookProgressText(summary) {
  if (!summary || !summary.total) return 'No steps yet'
  const finished = summary.done + summary.skipped
  const extra = [summary.failed ? `${summary.failed} failed` : '', summary.blocked ? `${summary.blocked} blocked` : ''].filter(Boolean)
  return `${finished} / ${summary.total} steps done${extra.length ? ` · ${extra.join(' · ')}` : ''}`
}
