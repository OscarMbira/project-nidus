import { Target, TrendingUp, TrendingDown, DollarSign, CheckCircle, Package, AlertTriangle, Gift } from 'lucide-react'

const SIX_VARIABLES = [
  { id: 'time', label: 'Time', icon: TrendingUp, color: 'blue' },
  { id: 'cost', label: 'Cost', icon: DollarSign, color: 'green' },
  { id: 'quality', label: 'Quality', icon: CheckCircle, color: 'purple' },
  { id: 'scope', label: 'Scope', icon: Package, color: 'orange' },
  { id: 'risk', label: 'Risk', icon: AlertTriangle, color: 'red' },
  { id: 'benefits', label: 'Benefits', icon: Gift, color: 'yellow' }
]

export default function EndStageReportProjectReviewSection({ formData, onChange, errors, mode }) {
  const getVariableValue = (variableId, type) => {
    return formData[`project_${variableId}_${type}`] || ''
  }

  const setVariableValue = (variableId, type, value) => {
    onChange(`project_${variableId}_${type}`, value)
  }

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">Project-Level Review (Six Variables)</h3>
        <p className="text-sm text-blue-700 dark:text-blue-300">
          Review project performance across the six variables: Time, Cost, Quality, Scope, Risk, and Benefits.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {SIX_VARIABLES.map((variable) => {
          const Icon = variable.icon
          const colorClasses = {
            blue: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
            green: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
            purple: 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800',
            orange: 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800',
            red: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
            yellow: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
          }

          return (
            <div key={variable.id} className={`${colorClasses[variable.color]} border rounded-lg p-4`}>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Icon className={`h-5 w-5 text-${variable.color}-600 dark:text-${variable.color}-400`} />
                {variable.label}
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Actual Performance
                  </label>
                  <textarea
                    value={getVariableValue(variable.id, 'actual')}
                    onChange={(e) => setVariableValue(variable.id, 'actual', e.target.value)}
                    disabled={mode === 'view'}
                    rows={3}
                    placeholder={`Describe actual ${variable.label.toLowerCase()} performance...`}
                    className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${
                      'border-gray-300 dark:border-gray-600'
                    } ${mode === 'view' ? 'opacity-50 cursor-not-allowed' : ''}`}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Forecast
                  </label>
                  <textarea
                    value={getVariableValue(variable.id, 'forecast')}
                    onChange={(e) => setVariableValue(variable.id, 'forecast', e.target.value)}
                    disabled={mode === 'view'}
                    rows={3}
                    placeholder={`Forecast for ${variable.label.toLowerCase()}...`}
                    className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${
                      'border-gray-300 dark:border-gray-600'
                    } ${mode === 'view' ? 'opacity-50 cursor-not-allowed' : ''}`}
                  />
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
