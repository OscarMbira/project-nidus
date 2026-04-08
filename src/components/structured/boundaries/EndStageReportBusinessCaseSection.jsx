import { useState, useEffect } from 'react'
import { Target, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import { syncBusinessCaseReview } from '../../../services/endStageReportService'
import { getBusinessCaseForReview } from '../../../services/endStageReportService'

export default function EndStageReportBusinessCaseSection({ reportId, formData, onChange, errors, mode, projectId }) {
  const [businessCase, setBusinessCase] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (projectId) {
      loadBusinessCase()
    }
  }, [projectId])

  const loadBusinessCase = async () => {
    try {
      setLoading(true)
      const bc = await getBusinessCaseForReview(projectId)
      setBusinessCase(bc)
    } catch (error) {
      console.error('Error loading business case:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSyncBusinessCase = async () => {
    if (!businessCase?.business_case_id) {
      alert('No business case found for this project')
      return
    }

    try {
      setLoading(true)
      await syncBusinessCaseReview(reportId, businessCase.business_case_id)
      alert('Business case review synced successfully')
      // Reload business case
      await loadBusinessCase()
    } catch (error) {
      console.error('Error syncing business case:', error)
      alert('Error syncing business case: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">Business Case Review</h3>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              Review the business case validity and benefits realization status.
            </p>
          </div>
          {businessCase?.business_case_id && mode !== 'view' && (
            <button
              onClick={handleSyncBusinessCase}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm disabled:opacity-50"
            >
              {loading ? 'Syncing...' : 'Sync from Business Case'}
            </button>
          )}
        </div>
      </div>

      {businessCase && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-4">
            <Target className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <h4 className="font-semibold text-gray-900 dark:text-white">Business Case Information</h4>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500 dark:text-gray-400">Business Case ID:</span>
              <p className="font-medium text-gray-900 dark:text-white">{businessCase.business_case_id || 'N/A'}</p>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400">Total Expected Benefits:</span>
              <p className="font-medium text-gray-900 dark:text-white">
                {businessCase.total_expected_benefits ? `$${businessCase.total_expected_benefits.toLocaleString()}` : 'N/A'}
              </p>
            </div>
          </div>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Business Case Review Summary *
        </label>
        <textarea
          value={formData.business_case_review_summary || ''}
          onChange={(e) => onChange('business_case_review_summary', e.target.value)}
          required
          disabled={mode === 'view'}
          rows={4}
          placeholder="Summarize the business case review, including any changes to assumptions, benefits status, and overall validity..."
          className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${
            errors.business_case_review_summary
              ? 'border-red-500'
              : 'border-gray-300 dark:border-gray-600'
          } ${mode === 'view' ? 'opacity-50 cursor-not-allowed' : ''}`}
        />
        {errors.business_case_review_summary && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.business_case_review_summary}</p>
        )}
      </div>

      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          id="business_case_still_valid"
          checked={formData.business_case_still_valid ?? true}
          onChange={(e) => onChange('business_case_still_valid', e.target.checked)}
          disabled={mode === 'view'}
          className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
        />
        <label htmlFor="business_case_still_valid" className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
          {formData.business_case_still_valid ? (
            <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
          ) : (
            <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
          )}
          Business Case Still Valid
        </label>
      </div>

      {!formData.business_case_still_valid && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Changes to Business Case Assumptions
          </label>
          <textarea
            value={formData.business_case_changes_summary || ''}
            onChange={(e) => onChange('business_case_changes_summary', e.target.value)}
            disabled={mode === 'view'}
            rows={3}
            placeholder="Describe changes to business case assumptions..."
            className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${
              'border-gray-300 dark:border-gray-600'
            } ${mode === 'view' ? 'opacity-50 cursor-not-allowed' : ''}`}
          />
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Benefits Realized Summary
        </label>
        <textarea
          value={formData.benefits_realized_summary || ''}
          onChange={(e) => onChange('benefits_realized_summary', e.target.value)}
          disabled={mode === 'view'}
          rows={3}
          placeholder="Summarize benefits realized to date..."
          className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${
            'border-gray-300 dark:border-gray-600'
          } ${mode === 'view' ? 'opacity-50 cursor-not-allowed' : ''}`}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Benefits Review Status
        </label>
        <select
          value={formData.benefits_review_status || 'on-track'}
          onChange={(e) => onChange('benefits_review_status', e.target.value)}
          disabled={mode === 'view'}
          className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${
            'border-gray-300 dark:border-gray-600'
          } ${mode === 'view' ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <option value="on-track">On Track</option>
          <option value="at-risk">At Risk</option>
          <option value="not-achievable">Not Achievable</option>
        </select>
      </div>

      {formData.updated_business_case_id && (
        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 text-sm">
          <span className="text-gray-500 dark:text-gray-400">Linked Business Case ID:</span>
          <p className="font-medium text-gray-900 dark:text-white">{formData.updated_business_case_id}</p>
        </div>
      )}
    </div>
  )
}
