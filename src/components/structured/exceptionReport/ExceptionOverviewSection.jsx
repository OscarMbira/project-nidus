import { AlertTriangle, TrendingDown, TrendingUp } from 'lucide-react'

export default function ExceptionOverviewSection({ formData, onChange, errors, mode, exceptionData }) {
  return (
    <div className="space-y-6">
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <AlertTriangle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
          <div>
            <h3 className="text-sm font-medium text-blue-900 dark:text-blue-100">Section 3: Exception Overview</h3>
            <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
              Provide an overview of the exception and tolerance breach details
            </p>
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Exception Title *
        </label>
        <input
          type="text"
          value={formData.exception_title || ''}
          onChange={(e) => onChange('exception_title', e.target.value)}
          required
          disabled={mode === 'view'}
          placeholder="Brief title describing the exception"
          className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${
            errors.exception_title ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
          }`}
        />
        {errors.exception_title && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.exception_title}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Exception Summary
        </label>
        <textarea
          value={formData.exception_summary || ''}
          onChange={(e) => onChange('exception_summary', e.target.value)}
          disabled={mode === 'view'}
          rows={4}
          placeholder="Provide a brief summary of the exception..."
          className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Tolerance Type *
          </label>
          <select
            value={formData.tolerance_type || ''}
            onChange={(e) => onChange('tolerance_type', e.target.value || null)}
            required
            disabled={mode === 'view'}
            className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${
              errors.tolerance_type ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
            }`}
          >
            <option value="">Select Tolerance Type</option>
            <option value="time">Time</option>
            <option value="cost">Cost</option>
            <option value="scope">Scope</option>
            <option value="quality">Quality</option>
            <option value="risk">Risk</option>
            <option value="benefit">Benefit</option>
            <option value="combined">Combined</option>
          </select>
          {errors.tolerance_type && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.tolerance_type}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Is Forecast Breach?
          </label>
          <div className="flex items-center space-x-4 mt-2">
            <label className="flex items-center">
              <input
                type="radio"
                name="is_forecast_breach"
                checked={formData.is_forecast_breach === true}
                onChange={() => onChange('is_forecast_breach', true)}
                disabled={mode === 'view'}
                className="mr-2"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Forecast</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name="is_forecast_breach"
                checked={formData.is_forecast_breach === false}
                onChange={() => onChange('is_forecast_breach', false)}
                disabled={mode === 'view'}
                className="mr-2"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Actual</span>
            </label>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Tolerance Threshold
          </label>
          <input
            type="text"
            value={formData.tolerance_threshold || ''}
            onChange={(e) => onChange('tolerance_threshold', e.target.value)}
            disabled={mode === 'view'}
            placeholder="What was the allowed tolerance"
            className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Actual Value
          </label>
          <input
            type="text"
            value={formData.actual_value || ''}
            onChange={(e) => onChange('actual_value', e.target.value)}
            disabled={mode === 'view'}
            placeholder="What is the actual value"
            className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Variance Amount
          </label>
          <input
            type="text"
            value={formData.variance_amount || ''}
            onChange={(e) => onChange('variance_amount', e.target.value)}
            disabled={mode === 'view'}
            placeholder="Amount of variance"
            className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Variance Percentage (%)
          </label>
          <div className="relative">
            {formData.variance_percentage !== null && formData.variance_percentage !== undefined && (
              formData.variance_percentage >= 0 ? (
                <TrendingUp className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-red-500" />
              ) : (
                <TrendingDown className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-green-500" />
              )
            )}
            <input
              type="number"
              step="0.01"
              value={formData.variance_percentage || ''}
              onChange={(e) => onChange('variance_percentage', e.target.value ? parseFloat(e.target.value) : null)}
              disabled={mode === 'view'}
              placeholder="0.00"
              className={`w-full ${formData.variance_percentage !== null ? 'pl-10' : 'pl-3'} pr-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600`}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
