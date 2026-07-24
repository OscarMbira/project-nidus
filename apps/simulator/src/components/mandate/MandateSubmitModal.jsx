/**
 * MandateSubmitModal
 * Confirmation dialog shown before submitting a mandate for approval.
 */

import { FileText, X } from 'lucide-react'

export default function MandateSubmitModal({ mandate, onConfirm, onCancel, submitting }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md mx-4 p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 dark:bg-amber-900 rounded-lg">
              <FileText className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Submit for Approval
            </h2>
          </div>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="mb-6 space-y-3">
          <p className="text-gray-700 dark:text-gray-300 text-sm">
            You are about to submit this mandate for approval:
          </p>
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg px-4 py-3 space-y-1">
            <p className="font-semibold text-gray-900 dark:text-white">{mandate?.mandate_title}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Reference: {mandate?.mandate_reference}
            </p>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Once submitted, the mandate will be locked for editing until it is approved or rejected by a PMO Administrator.
          </p>
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
            onClick={onConfirm}
            disabled={submitting}
            className="px-4 py-2 text-sm rounded-lg bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50 flex items-center gap-2"
          >
            <FileText className="w-4 h-4" />
            {submitting ? 'Submitting...' : 'Submit for Approval'}
          </button>
        </div>
      </div>
    </div>
  )
}
