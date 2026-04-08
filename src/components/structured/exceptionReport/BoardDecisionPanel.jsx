import { useState } from 'react'
import { CheckCircle, Calendar, FileText } from 'lucide-react'
import { recordBoardDecision } from '../../../services/exceptionReportApprovalService'

export default function BoardDecisionPanel({ reportId, onDecisionRecorded, mode = 'view' }) {
  const [formData, setFormData] = useState({
    board_decision: '',
    board_decision_date: new Date().toISOString().split('T')[0],
    decision_reference: ''
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!reportId) return

    try {
      setSaving(true)
      setError(null)
      await recordBoardDecision(
        reportId,
        formData.board_decision,
        formData.board_decision_date,
        formData.decision_reference || null
      )
      if (onDecisionRecorded) {
        onDecisionRecorded()
      }
      alert('Board decision recorded successfully')
    } catch (err) {
      setError(err.message)
      alert('Error recording board decision: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  if (mode === 'view') {
    return null // Don't show in view mode, decision should be displayed in report view
  }

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2 flex items-center gap-2">
          <CheckCircle className="h-5 w-5" />
          Record Board Decision
        </h3>
        <p className="text-sm text-blue-700 dark:text-blue-300">
          Record the Project Board's decision on this exception report.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Board Decision *
          </label>
          <textarea
            value={formData.board_decision}
            onChange={(e) => setFormData(prev => ({ ...prev, board_decision: e.target.value }))}
            required
            rows={6}
            placeholder="Record the Project Board's decision..."
            className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Decision Date *
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="date"
                value={formData.board_decision_date}
                onChange={(e) => setFormData(prev => ({ ...prev, board_decision_date: e.target.value }))}
                required
                className="w-full pl-10 pr-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Decision Reference
            </label>
            <div className="relative">
              <FileText className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={formData.decision_reference}
                onChange={(e) => setFormData(prev => ({ ...prev, decision_reference: e.target.value }))}
                placeholder="Reference to formal decision document"
                className="w-full pl-10 pr-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600"
              />
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {saving ? 'Recording...' : 'Record Decision'}
          </button>
        </div>
      </form>
    </div>
  )
}
