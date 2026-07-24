import { useState, useEffect } from 'react'
import { TrendingUp, AlertCircle, CheckCircle } from 'lucide-react'
import { getToleranceStatus, calculateVariance } from '../../services/checkpointReportService'

export default function ToleranceStatusSection({ reportId, formData, onChange, workPackageId, mode }) {
  const [toleranceData, setToleranceData] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (workPackageId) {
      loadToleranceStatus()
    }
  }, [workPackageId])

  useEffect(() => {
    if (reportId) {
      loadVariance()
    }
  }, [reportId])

  const loadToleranceStatus = async () => {
    try {
      setLoading(true)
      const data = await getToleranceStatus(workPackageId)
      setToleranceData(data)
    } catch (error) {
      console.error('Error loading tolerance status:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadVariance = async () => {
    try {
      const variance = await calculateVariance(reportId)
      // Update form data with variance values
      onChange('time_actual', variance.time.actual)
      onChange('time_forecast', variance.time.forecast)
      onChange('tolerance_time_status', variance.time.status)
      onChange('cost_actual', variance.cost.actual)
      onChange('cost_forecast', variance.cost.forecast)
      onChange('tolerance_cost_status', variance.cost.status)
      onChange('scope_actual_percentage', variance.scope.actual)
      onChange('scope_forecast_percentage', variance.scope.forecast)
      onChange('tolerance_scope_status', variance.scope.status)
    } catch (error) {
      console.error('Error loading variance:', error)
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'within':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'approaching':
        return <AlertCircle className="h-5 w-5 text-yellow-500" />
      case 'exceeded':
        return <AlertCircle className="h-5 w-5 text-red-500" />
      default:
        return <TrendingUp className="h-5 w-5 text-gray-400" />
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'within':
        return 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
      case 'approaching':
        return 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200'
      case 'exceeded':
        return 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
      default:
        return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
    }
  }

  if (loading) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        Loading tolerance status...
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">Tolerance Status</h3>
        <p className="text-sm text-blue-700 dark:text-blue-300">
          Current tolerance status for time, cost, and scope based on work package actuals and forecasts.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Time Tolerance */}
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-800">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold text-gray-900 dark:text-white">Time</h4>
            {getStatusIcon(formData.tolerance_time_status || 'within')}
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Actual:</span>
              <span className="font-medium">{formData.time_actual || 0} days</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Forecast:</span>
              <span className="font-medium">{formData.time_forecast || 0} days</span>
            </div>
            <div className="mt-2">
              <span className={`px-2 py-1 rounded text-xs ${getStatusColor(formData.tolerance_time_status || 'within')}`}>
                {formData.tolerance_time_status || 'within'}
              </span>
            </div>
          </div>
        </div>

        {/* Cost Tolerance */}
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-800">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold text-gray-900 dark:text-white">Cost</h4>
            {getStatusIcon(formData.tolerance_cost_status || 'within')}
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Actual:</span>
              <span className="font-medium">${(formData.cost_actual || 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Forecast:</span>
              <span className="font-medium">${(formData.cost_forecast || 0).toLocaleString()}</span>
            </div>
            <div className="mt-2">
              <span className={`px-2 py-1 rounded text-xs ${getStatusColor(formData.tolerance_cost_status || 'within')}`}>
                {formData.tolerance_cost_status || 'within'}
              </span>
            </div>
          </div>
        </div>

        {/* Scope Tolerance */}
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-800">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold text-gray-900 dark:text-white">Scope</h4>
            {getStatusIcon(formData.tolerance_scope_status || 'within')}
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Actual:</span>
              <span className="font-medium">{(formData.scope_actual_percentage || 0).toFixed(1)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Forecast:</span>
              <span className="font-medium">{(formData.scope_forecast_percentage || 0).toFixed(1)}%</span>
            </div>
            <div className="mt-2">
              <span className={`px-2 py-1 rounded text-xs ${getStatusColor(formData.tolerance_scope_status || 'within')}`}>
                {formData.tolerance_scope_status || 'within'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {toleranceData.length > 0 && (
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-900">
          <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Detailed Tolerance Data</h4>
          <div className="space-y-2">
            {toleranceData.map((tolerance, idx) => (
              <div key={idx} className="text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400 capitalize">{tolerance.tolerance_type}:</span>
                  <span className={`px-2 py-1 rounded text-xs ${getStatusColor(tolerance.status)}`}>
                    {tolerance.status}
                  </span>
                </div>
                {tolerance.variance_percentage && (
                  <div className="text-xs text-gray-500 dark:text-gray-400 ml-4">
                    Variance: {tolerance.variance_percentage.toFixed(1)}%
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
