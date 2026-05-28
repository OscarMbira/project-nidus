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

  const handlePrimary = () => {
    if (mode === 'submit') onSubmit?.(notes)
    else onDecision?.('approve', notes)
  }

  return (
    <Modal isOpen={open} onClose={onClose} title={mode === 'submit' ? 'Submit for Authorisation' : 'Review Authorisation'}>
      <div className="space-y-4">
        <p className="text-sm text-gray-600 dark:text-gray-300">
          {mode === 'submit'
            ? 'Review the approval chain before submitting.'
            : 'Approve or reject this record.'}
        </p>
        <ApprovalChainDisplay chain={chain} progress={progress} />
        <textarea
          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 p-3 text-sm"
          rows={3}
          placeholder="Notes (optional)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          {mode === 'decide' && (
            <Button variant="danger" disabled={loading} onClick={() => onDecision?.('reject', notes)}>
              Reject
            </Button>
          )}
          <Button variant="primary" disabled={loading} onClick={handlePrimary}>
            {mode === 'submit' ? 'Submit' : 'Approve'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
