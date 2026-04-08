import { AlertCircle } from 'lucide-react'

export default function IssuesRisksSection({ formData, onChange, errors, mode }) {
  return (
    <div className="space-y-6">
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">Issues & Risks Summary</h3>
        <p className="text-sm text-blue-700 dark:text-blue-300">
          Summary of issues and risks identified during this reporting period.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          <AlertCircle className="h-4 w-4 inline mr-1" />
          Issues Summary
        </label>
        <textarea
          value={formData.issues_summary || ''}
          onChange={(e) => onChange('issues_summary', e.target.value)}
          disabled={mode === 'view'}
          rows={5}
          placeholder="Summary of issues encountered during this reporting period..."
          className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${
            errors.issues_summary
              ? 'border-red-500'
              : 'border-gray-300 dark:border-gray-600'
          } ${mode === 'view' ? 'opacity-50 cursor-not-allowed' : ''}`}
        />
        {errors.issues_summary && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.issues_summary}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Risks Summary
        </label>
        <textarea
          value={formData.risks_summary || ''}
          onChange={(e) => onChange('risks_summary', e.target.value)}
          disabled={mode === 'view'}
          rows={5}
          placeholder="Summary of risks identified or materialized during this reporting period..."
          className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${
            errors.risks_summary
              ? 'border-red-500'
              : 'border-gray-300 dark:border-gray-600'
          } ${mode === 'view' ? 'opacity-50 cursor-not-allowed' : ''}`}
        />
        {errors.risks_summary && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.risks_summary}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Changes Summary
        </label>
        <textarea
          value={formData.changes_summary || ''}
          onChange={(e) => onChange('changes_summary', e.target.value)}
          disabled={mode === 'view'}
          rows={4}
          placeholder="Summary of changes requested or approved during this reporting period..."
          className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${
            errors.changes_summary
              ? 'border-red-500'
              : 'border-gray-300 dark:border-gray-600'
          } ${mode === 'view' ? 'opacity-50 cursor-not-allowed' : ''}`}
        />
        {errors.changes_summary && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.changes_summary}</p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Quality Status
          </label>
          <textarea
            value={formData.quality_status || ''}
            onChange={(e) => onChange('quality_status', e.target.value)}
            disabled={mode === 'view'}
            rows={3}
            placeholder="Overall quality status..."
            className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${
              'border-gray-300 dark:border-gray-600'
            } ${mode === 'view' ? 'opacity-50 cursor-not-allowed' : ''}`}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Quality Concerns
          </label>
          <textarea
            value={formData.quality_concerns || ''}
            onChange={(e) => onChange('quality_concerns', e.target.value)}
            disabled={mode === 'view'}
            rows={3}
            placeholder="Quality concerns or issues..."
            className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${
              'border-gray-300 dark:border-gray-600'
            } ${mode === 'view' ? 'opacity-50 cursor-not-allowed' : ''}`}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Budget Status
          </label>
          <textarea
            value={formData.budget_status || ''}
            onChange={(e) => onChange('budget_status', e.target.value)}
            disabled={mode === 'view'}
            rows={3}
            placeholder="Budget status summary..."
            className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${
              'border-gray-300 dark:border-gray-600'
            } ${mode === 'view' ? 'opacity-50 cursor-not-allowed' : ''}`}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Schedule Status
          </label>
          <textarea
            value={formData.schedule_status || ''}
            onChange={(e) => onChange('schedule_status', e.target.value)}
            disabled={mode === 'view'}
            rows={3}
            placeholder="Schedule status summary..."
            className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${
              'border-gray-300 dark:border-gray-600'
            } ${mode === 'view' ? 'opacity-50 cursor-not-allowed' : ''}`}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Variance Analysis
          </label>
          <textarea
            value={formData.variance_analysis || ''}
            onChange={(e) => onChange('variance_analysis', e.target.value)}
            disabled={mode === 'view'}
            rows={3}
            placeholder="Variance analysis..."
            className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${
              'border-gray-300 dark:border-gray-600'
            } ${mode === 'view' ? 'opacity-50 cursor-not-allowed' : ''}`}
          />
        </div>
      </div>
    </div>
  )
}
