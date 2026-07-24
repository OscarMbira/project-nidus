import { useEffect, useState } from 'react'
import Modal from './Modal'
import Button from './Button'
import ApprovalChainDisplay from './ApprovalChainDisplay'

export default function AuthorisationRequestModal({
  open,
  onClose,
  onSubmit,
  chain = [],
  progress,
  mode = 'submit',
  onDecision,
  loading = false,
}) {
  const [notes, setNotes] = useState('')

  useEffect(() => {
    if (!open) setNotes('')
  }, [open])

  const justificationRequired = mode === 'decide'
  const canDecide = !justificationRequired || notes.trim().length > 0

  const handlePrimary = () => {
    if (mode === 'submit') onSubmit?.(notes)
    else onDecision?.('approve', notes.trim())
  }

  const handleReject = () => {
    if (!canDecide) return
    onDecision?.('reject', notes.trim())
  }

  return (
    <Modal isOpen={open} onClose={onClose} title={mode === 'submit' ? 'Submit for Authorisation' : 'Review Authorisation'}>
      <div className="space-y-4">
        <p className="text-sm text-gray-600 dark:text-gray-300">
          {mode === 'submit'
            ? 'Review the approval chain before submitting.'
            : 'Review the record, then approve or reject with a mandatory justification.'}
        </p>
        <ApprovalChainDisplay chain={chain} progress={progress} />
        <div>
          <label htmlFor="authorisation-notes" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">
            {justificationRequired ? 'Justification (required)' : 'Notes (optional)'}
          </label>
          <textarea
            id="authorisation-notes"
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 p-3 text-sm"
            rows={4}
            placeholder={justificationRequired
              ? 'Explain why you are approving or rejecting this submission…'
              : 'Optional notes for the authorisation request'}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          {mode === 'decide' && (
            <Button variant="danger" disabled={loading || !canDecide} onClick={handleReject}>
              Reject
            </Button>
          )}
          <Button variant="primary" disabled={loading || (justificationRequired && !canDecide)} onClick={handlePrimary}>
            {mode === 'submit' ? 'Submit' : 'Approve'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
