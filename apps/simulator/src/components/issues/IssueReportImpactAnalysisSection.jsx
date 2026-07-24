import { AlertTriangle, DollarSign, Clock, Target, Package, TrendingUp } from 'lucide-react'

const IMPACT_VARIABLES = [
  { id: 'time', label: 'Time', icon: Clock, description: 'Impact on schedule/timeline' },
  { id: 'cost', label: 'Cost', icon: DollarSign, description: 'Impact on budget/financial' },
  { id: 'quality', label: 'Quality', icon: Target, description: 'Impact on quality standards' },
  { id: 'scope', label: 'Scope', icon: Package, description: 'Impact on project scope' },
  { id: 'benefits', label: 'Benefits', icon: TrendingUp, description: 'Impact on expected benefits' },
  { id: 'risk', label: 'Risk', icon: AlertTriangle, description: 'Impact on risk exposure' },
]

export default function IssueReportImpactAnalysisSection({
  formData,
  onChange,
  errors = {},
  readOnly = false
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <AlertTriangle className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Impact Analysis</h3>
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
        <p className="text-sm text-blue-800 dark:text-blue-200">
          <strong>PRINCE2 Six Variables:</strong> Analyze the impact of this issue across all six variables of project management.
        </p>
      </div>

      {/* Impact Variables */}
      <div className="grid grid-cols-1 gap-6">
        {IMPACT_VARIABLES.map((variable) => {
          const Icon = variable.icon
          const fieldKey = `impact_${variable.id}`
          
          return (
            <div key={variable.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Icon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                <label className="text-sm font-medium text-gray-900 dark:text-white">
                  {variable.label} Impact
                </label>
                <span className="text-xs text-gray-500 dark:text-gray-400">({variable.description})</span>
              </div>
              <textarea
                value={formData[fieldKey] || ''}
                onChange={(e) => onChange(fieldKey, e.target.value)}
                readOnly={readOnly}
                rows={4}
                className={`w-full px-3 py-2 border rounded-lg ${
                  readOnly
                    ? 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                    : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white'
                } ${errors[fieldKey] ? 'border-red-500' : ''}`}
                placeholder={`Describe the impact on ${variable.label.toLowerCase()}...`}
              />
              {errors[fieldKey] && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors[fieldKey]}</p>
              )}
            </div>
          )
        })}
      </div>

      {/* Tolerance Impact */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
        <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-4">
          Tolerance Impact
        </h4>

        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.affects_stage_tolerances || false}
                onChange={(e) => onChange('affects_stage_tolerances', e.target.checked)}
                disabled={readOnly}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                Affects Stage Tolerances
              </span>
            </label>
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.affects_project_tolerances || false}
                onChange={(e) => onChange('affects_project_tolerances', e.target.checked)}
                disabled={readOnly}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                Affects Project Tolerances
              </span>
            </label>
          </div>

          {(formData.affects_stage_tolerances || formData.affects_project_tolerances) && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Tolerance Impact Details <span className="text-red-500">*</span>
              </label>
              <textarea
                value={formData.tolerance_impact_details || ''}
                onChange={(e) => onChange('tolerance_impact_details', e.target.value)}
                readOnly={readOnly}
                rows={6}
                className={`w-full px-3 py-2 border rounded-lg ${
                  readOnly
                    ? 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                    : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white'
                } ${errors.tolerance_impact_details ? 'border-red-500' : ''}`}
                placeholder="Describe how this issue affects stage or project tolerances..."
              />
              {errors.tolerance_impact_details && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.tolerance_impact_details}</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
