import { useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import Modal from './Modal'

/**
 * Runbook step out of order (v1337, PRD D7: warn, don't block). Lists the earlier steps that are
 * not done and the checkpoints not yet passed; the user can go back, or carry on after giving a
 * reason — onConfirm(reason).
 */
export default function SequenceWarningDialog({ isOpen, warnings = [], busy = false, onCancel, onConfirm }) {
  const [reason, setReason] = useState('')
  const order = warnings.filter((w) => w.kind === 'order')
  const checkpoints = warnings.filter((w) => w.kind === 'checkpoint')

  return (
    <Modal
      isOpen={isOpen}
      onClose={onCancel}
      title="This step is out of order"
      size="md"
      footer={(
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onCancel} disabled={busy} className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700">
            Go back
          </button>
          <button
            type="button"
            onClick={() => onConfirm(reason.trim())}
            disabled={busy || !reason.trim()}
            className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
          >
            {busy ? 'Saving…' : 'Carry on and save'}
          </button>
        </div>
      )}
    >
      <div className="space-y-3 text-sm">
        <p className="flex items-start gap-2 text-gray-700 dark:text-gray-300">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" aria-hidden="true" />
          You can carry on, but say why. The reason is kept on the step.
        </p>
        {order.length > 0 && (
          <div>
            <p className="font-medium text-gray-900 dark:text-gray-100">Earlier steps in this batch</p>
            <ul className="mt-1 list-disc space-y-0.5 pl-5 text-gray-700 dark:text-gray-300">
              {order.map((w) => <li key={w.stepId}>{w.text}</li>)}
            </ul>
          </div>
        )}
        {checkpoints.length > 0 && (
          <div>
            <p className="font-medium text-gray-900 dark:text-gray-100">Checkpoints</p>
            <ul className="mt-1 list-disc space-y-0.5 pl-5 text-gray-700 dark:text-gray-300">
              {checkpoints.map((w) => <li key={w.stepId}>{w.text}</li>)}
            </ul>
          </div>
        )}
        <label className="block">
          <span className="mb-1 block font-medium text-gray-700 dark:text-gray-300">Reason *</span>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            aria-label="Reason"
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
          />
        </label>
      </div>
    </Modal>
  )
}
