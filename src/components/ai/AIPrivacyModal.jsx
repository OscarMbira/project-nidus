/**
 * First-time privacy disclosure modal (Phase 4.2).
 * Shown when org admin enables Claude or Gemini mode and has not accepted before.
 */

import { AlertCircle } from 'lucide-react'

export default function AIPrivacyModal({ open, mode, onConfirm, onCancel }) {
  if (!open) return null
  const provider = mode === 'claude' ? 'Anthropic (Claude)' : 'Google (Gemini)'
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 dark:bg-black/70" role="dialog" aria-modal="true" aria-labelledby="ai-privacy-title">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-6 border border-gray-200 dark:border-gray-700">
        <div className="flex items-start gap-3 mb-4">
          <AlertCircle className="w-6 h-6 text-amber-500 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <h2 id="ai-privacy-title" className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Data privacy disclosure
            </h2>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              When you use AI-generated summaries for data answers, a snippet of your retrieved data will be sent to {provider} to generate the response. Your data is not stored by the provider after the request. You can switch to &quot;Template only&quot; at any time so that no data leaves your database.
            </p>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
          >
            I accept
          </button>
        </div>
      </div>
    </div>
  )
}
