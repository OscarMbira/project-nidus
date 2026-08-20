import { useEffect, useState } from 'react'
import {
  canApproveFormInstance,
  canArchiveFormInstance,
  canRejectFormInstance,
  canSubmitFormInstance,
  formInstanceStatusLabel,
  isNonEmptyJustification,
} from '@nidus/shared/utils/formInstanceRegisterUtils.js'

/**
 * Form instance status actions (v860) — Submit / Approve / Reject / Archive.
 * Approve & Reject require a non-empty justification.
 */
export default function ApprovalWorkflowPanel({
  status,
  busy = false,
  onSubmit,
  onApprove,
  onReject,
  onArchive,
}) {
  const [comments, setComments] = useState('')
  const [localError, setLocalError] = useState(null)

  useEffect(() => {
    setComments('')
    setLocalError(null)
  }, [status])

  const canSubmit = canSubmitFormInstance(status)
  const canApprove = canApproveFormInstance(status)
  const canReject = canRejectFormInstance(status)
  const canArchive = canArchiveFormInstance(status)
  const needsJustification = canApprove || canReject
  const justificationOk = isNonEmptyJustification(comments)

  const run = async (fn, { requireComments = false } = {}) => {
    setLocalError(null)
    if (requireComments && !justificationOk) {
      setLocalError('Justification is required')
      return
    }
    try {
      await fn(String(comments || '').trim())
    } catch (e) {
      setLocalError(e?.message || 'Action failed')
    }
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
      <p className="mb-3 text-xs text-gray-600 dark:text-gray-300">
        Status:{' '}
        <span className="font-semibold text-gray-900 dark:text-gray-100">
          {formInstanceStatusLabel(status)}
        </span>
      </p>

      {needsJustification && (
        <label className="mb-3 block">
          <span className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
            Justification (required for Approve / Reject)
          </span>
          <textarea
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            rows={3}
            disabled={busy}
            placeholder="Explain the decision…"
            className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
          />
        </label>
      )}

      {localError && (
        <p className="mb-2 text-xs text-red-600 dark:text-red-400" role="alert">
          {localError}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={!canSubmit || busy || !onSubmit}
          onClick={() => run(() => onSubmit?.())}
          className="rounded bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Submit
        </button>
        <button
          type="button"
          disabled={!canApprove || busy || !onApprove || !justificationOk}
          onClick={() => run((c) => onApprove?.(c), { requireComments: true })}
          className="rounded bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-500 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Approve
        </button>
        <button
          type="button"
          disabled={!canReject || busy || !onReject || !justificationOk}
          onClick={() => run((c) => onReject?.(c), { requireComments: true })}
          className="rounded bg-amber-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-500 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Reject
        </button>
        <button
          type="button"
          disabled={!canArchive || busy || !onArchive}
          onClick={() => run(() => onArchive?.())}
          className="rounded bg-gray-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-500 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-gray-700 dark:hover:bg-gray-600"
        >
          Archive
        </button>
      </div>
    </div>
  )
}
