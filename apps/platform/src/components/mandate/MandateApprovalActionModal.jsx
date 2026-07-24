/**
 * MandateApprovalActionModal
 * Modal for PMO Admin to Approve or Reject a mandate with optional/required comments.
 * action: 'approve' | 'reject'
 */

import { useState } from 'react'
import { CheckCircle, XCircle, X } from 'lucide-react'

export default function MandateApprovalActionModal({ mandate, action, onConfirm, onCancel, processing }) {
  const [comments, setComments] = useState('')

  const isApprove = action === 'approve'
  const commentsRequired = !isApprove // rejection requires a reason

  const handleSubmit = () => {
    if (commentsRequired && !comments.trim()) return
    onConfirm(comments.trim())
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md mx-4 p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${isApprove ? 'bg-green-100 dark:bg-green-900' : 'bg-red-100 dark:bg-red-900'}`}>
              {isApprove
                ? <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                : <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
              }
            </div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {isApprove ? 'Approve Mandate' : 'Reject Mandate'}
            </h2>
          </div>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mandate info */}
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg px-4 py-3 mb-4 space-y-1">
          <p className="font-semibold text-gray-900 dark:text-white text-sm">{mandate?.mandate_title}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Reference: {mandate?.mandate_reference}
          </p>
        </div>

        {/* Description */}
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          {isApprove
            ? 'Approving this mandate will allow the project to be created. Add any approval notes below (optional).'
            : 'Rejecting this mandate will return it to draft status. Please provide a reason for rejection.'}
        </p>

        {/* Comments */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {isApprove ? 'Approval Notes' : 'Rejection Reason'}{commentsRequired && <span className="text-red-500 ml-1">*</span>}
          </label>
          <textarea
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            placeholder={isApprove ? 'Optional notes...' : 'Please state the reason for rejection...'}
            rows={3}
            className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {commentsRequired && !comments.trim() && (
            <p className="text-xs text-red-500 mt-1">A rejection reason is required.</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={processing || (commentsRequired && !comments.trim())}
            className={`px-4 py-2 text-sm rounded-lg text-white flex items-center gap-2 disabled:opacity-50
              ${isApprove ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}
          >
            {isApprove
              ? <CheckCircle className="w-4 h-4" />
              : <XCircle className="w-4 h-4" />
            }
            {processing
              ? (isApprove ? 'Approving...' : 'Rejecting...')
              : (isApprove ? 'Approve' : 'Reject')}
          </button>
        </div>
      </div>
    </div>
  )
}
