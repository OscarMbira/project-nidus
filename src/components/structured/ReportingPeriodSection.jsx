import { Calendar } from 'lucide-react'

export default function ReportingPeriodSection({ formData, onChange, errors, mode }) {
  return (
    <div className="space-y-6">
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">Reporting Period</h3>
        <p className="text-sm text-blue-700 dark:text-blue-300">
          Define the reporting period covered by this checkpoint report.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            <Calendar className="h-4 w-4 inline mr-1" />
            Period Start Date *
          </label>
          <input
            type="date"
            value={formData.period_start_date || ''}
            onChange={(e) => onChange('period_start_date', e.target.value || null)}
            required
            disabled={mode === 'view'}
            className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${
              errors.period_start_date
                ? 'border-red-500'
                : 'border-gray-300 dark:border-gray-600'
            } ${mode === 'view' ? 'opacity-50 cursor-not-allowed' : ''}`}
          />
          {errors.period_start_date && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.period_start_date}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Period End Date *
          </label>
          <input
            type="date"
            value={formData.period_end_date || ''}
            onChange={(e) => onChange('period_end_date', e.target.value || null)}
            required
            disabled={mode === 'view'}
            min={formData.period_start_date || undefined}
            className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${
              errors.period_end_date
                ? 'border-red-500'
                : 'border-gray-300 dark:border-gray-600'
            } ${mode === 'view' ? 'opacity-50 cursor-not-allowed' : ''}`}
          />
          {errors.period_end_date && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.period_end_date}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Date of Next Revision
          </label>
          <input
            type="date"
            value={formData.date_of_next_revision || ''}
            onChange={(e) => onChange('date_of_next_revision', e.target.value || null)}
            disabled={mode === 'view'}
            min={formData.period_end_date || undefined}
            className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${
              'border-gray-300 dark:border-gray-600'
            } ${mode === 'view' ? 'opacity-50 cursor-not-allowed' : ''}`}
          />
        </div>
      </div>

      {formData.period_start_date && formData.period_end_date && (
        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            This report covers the period from{' '}
            <span className="font-medium text-gray-900 dark:text-white">
              {new Date(formData.period_start_date).toLocaleDateString()}
            </span>{' '}
            to{' '}
            <span className="font-medium text-gray-900 dark:text-white">
              {new Date(formData.period_end_date).toLocaleDateString()}
            </span>
          </p>
        </div>
      )}
    </div>
  )
}
