/**
 * Data migration runbook — order and checkpoint warnings (v1337, PRD D7: warn, don't block).
 *
 * Runbook Steps (register behaviour { type: 'runbook_steps' }) use these field keys:
 *   runbook (record reference to the runbook), sequence (run order), batch, step_type, can_run_in_parallel,
 *   checkpoint_decision, sequence_override_reason. Status keys: not_started, in_progress, done, failed,
 *   blocked, skipped.
 * When a step is started or finished, earlier steps in the same batch that are not Done / Skipped and
 * earlier checkpoints that have not been passed are reported; the user may go on after giving a reason,
 * which is appended to sequence_override_reason.
 */
import { refIds } from './registerRecordRef.js'

export const STEP_ACTIVE_STATUSES = ['in_progress', 'done']
const FINISHED = ['done', 'skipped']
const PASSED_DECISIONS = ['proceed', 'proceed_with_conditions']

const fv = (step) => step?.field_values || {}
const seq = (step) => Number(fv(step).sequence)

/** Same runbook (by the step's runbook reference). */
export function sameRunbook(a, b) {
  const ra = refIds(fv(a).runbook)[0]
  return Boolean(ra) && ra === refIds(fv(b).runbook)[0]
}

/** Does saving this status change need a sequence check? */
export function needsSequenceCheck(previousStatus, nextStatus) {
  return STEP_ACTIVE_STATUSES.includes(nextStatus) && !STEP_ACTIVE_STATUSES.includes(previousStatus || 'not_started')
}

/**
 * Warnings for starting / finishing `step` among its runbook's `steps`.
 * @returns {{ kind: 'order'|'checkpoint', stepId: string, text: string }[]}
 */
export function sequenceWarnings(step, steps) {
  const n = seq(step)
  if (!Number.isFinite(n)) return []
  const earlier = (steps || [])
    .filter((s) => s.id !== step.id && sameRunbook(s, step) && Number.isFinite(seq(s)) && seq(s) < n)
    .sort((a, b) => seq(a) - seq(b))
  const warnings = []
  if (!fv(step).can_run_in_parallel) {
    for (const s of earlier) {
      if (fv(s).batch !== fv(step).batch || fv(s).can_run_in_parallel || fv(s).step_type === 'checkpoint') continue
      if (!FINISHED.includes(s.status)) {
        warnings.push({ kind: 'order', stepId: s.id, text: `Step ${seq(s)} – ${s.title} is not done yet` })
      }
    }
  }
  for (const s of earlier) {
    if (fv(s).step_type !== 'checkpoint') continue
    const passed = s.status === 'done' && PASSED_DECISIONS.includes(fv(s).checkpoint_decision)
    if (!passed && s.status !== 'skipped') {
      warnings.push({ kind: 'checkpoint', stepId: s.id, text: `Checkpoint ${seq(s)} – ${s.title} has not been passed` })
    }
  }
  return warnings
}

/**
 * Reason appended to the step's override log (newest last). The field is a table (v1383):
 * one row per line, cells separated by tabs — When (UTC) | By | Reason.
 */
export function appendOverrideReason(existing, reason, { at = new Date(), by = '' } = {}) {
  const stamp = at.toISOString().slice(0, 16).replace('T', ' ')
  const clean = (v) => String(v || '').replace(/[\t\r\n]+/g, ' ').trim()
  const line = `${stamp} UTC\t${clean(by)}\t${clean(reason)}`
  return existing ? `${existing}\n${line}` : line
}
