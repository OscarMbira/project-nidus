/**
 * Lessons Report Measures Section
 * Review of Six Variables: Time, Cost, Quality, Scope, Risk, Benefits
 */

export default function LessonsReportMeasuresSection({
  formData,
  onChange,
  errors = {},
  readOnly = false
}) {
  const measures = [
    {
      key: 'time_performance_review',
      label: 'Time / Schedule Performance',
      description: 'Review of time/schedule performance and lessons learned'
    },
    {
      key: 'cost_performance_review',
      label: 'Cost / Budget Performance',
      description: 'Review of cost/budget performance and lessons learned'
    },
    {
      key: 'quality_performance_review',
      label: 'Quality Performance',
      description: 'Review of quality performance and lessons learned'
    },
    {
      key: 'scope_performance_review',
      label: 'Scope Performance',
      description: 'Review of scope management and lessons learned'
    },
    {
      key: 'risk_performance_review',
      label: 'Risk Management Performance',
      description: 'Review of risk management effectiveness and lessons learned'
    },
    {
      key: 'benefits_performance_review',
      label: 'Benefits Realization Performance',
      description: 'Review of benefits realization and lessons learned'
    }
  ]

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Review of Measures (Six Variables)
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          Review performance across the six project management variables and identify lessons
        </p>
      </div>

      {/* Six Variables Review */}
      <div className="space-y-6">
        {measures.map((measure) => (
          <div key={measure.key} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
              {measure.label}
            </label>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">{measure.description}</p>
            {readOnly ? (
              <p className="text-gray-900 dark:text-white whitespace-pre-wrap">
                {formData[measure.key] || 'Not specified'}
              </p>
            ) : (
              <textarea
                value={formData[measure.key] || ''}
                onChange={(e) => onChange(measure.key, e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder={`Describe ${measure.label.toLowerCase()} and lessons learned...`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Baseline vs Actual Analysis */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Baseline vs Actual Analysis
        </label>
        {readOnly ? (
          <p className="text-gray-900 dark:text-white whitespace-pre-wrap">
            {formData.baseline_vs_actual_analysis || 'Not specified'}
          </p>
        ) : (
          <textarea
            value={formData.baseline_vs_actual_analysis || ''}
            onChange={(e) => onChange('baseline_vs_actual_analysis', e.target.value)}
            rows={5}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="Overall comparison of baseline vs actual performance across all variables..."
          />
        )}
      </div>

      {/* Variance Analysis */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Variance Analysis
        </label>
        {readOnly ? (
          <p className="text-gray-900 dark:text-white whitespace-pre-wrap">
            {formData.variance_analysis || 'Not specified'}
          </p>
        ) : (
          <textarea
            value={formData.variance_analysis || ''}
            onChange={(e) => onChange('variance_analysis', e.target.value)}
            rows={5}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="Analysis of variances and lessons learned in estimation and planning..."
          />
        )}
      </div>

      {errors.measures_review && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            {errors.measures_review}
          </p>
        </div>
      )}
    </div>
  )
}
