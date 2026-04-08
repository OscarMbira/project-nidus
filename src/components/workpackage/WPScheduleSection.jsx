/**
 * Work Package Schedule Section Component
 * Displays and manages Work Package schedule tracking
 */

import { Calendar, Clock, TrendingUp, TrendingDown, AlertCircle } from 'lucide-react'

export default function WPScheduleSection({ workPackage, mode = 'view', onUpdate }) {
  const calculateVariance = (planned, actual) => {
    if (!planned || !actual) return null
    const plannedDate = new Date(planned)
    const actualDate = new Date(actual)
    const diffTime = actualDate - plannedDate
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  const startVariance = workPackage.planned_start_date && workPackage.actual_start_date
    ? calculateVariance(workPackage.planned_start_date, workPackage.actual_start_date)
    : null

  const endVariance = workPackage.planned_end_date && workPackage.actual_end_date
    ? calculateVariance(workPackage.planned_end_date, workPackage.actual_end_date)
    : null

  const forecastVariance = workPackage.planned_end_date && workPackage.forecast_end_date
    ? calculateVariance(workPackage.planned_end_date, workPackage.forecast_end_date)
    : null

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Schedule Tracking</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          Track planned, forecast, and actual dates for the work package
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Planned Dates */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="h-5 w-5 text-blue-600" />
            <h4 className="font-semibold text-gray-900 dark:text-white">Planned Dates</h4>
          </div>
          <div className="space-y-3">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Start Date</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {workPackage.planned_start_date
                  ? new Date(workPackage.planned_start_date).toLocaleDateString()
                  : 'Not set'}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">End Date</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {workPackage.planned_end_date
                  ? new Date(workPackage.planned_end_date).toLocaleDateString()
                  : 'Not set'}
              </p>
            </div>
            {workPackage.planned_start_date && workPackage.planned_end_date && (
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Duration</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {Math.ceil((new Date(workPackage.planned_end_date) - new Date(workPackage.planned_start_date)) / (1000 * 60 * 60 * 24))} days
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Forecast Dates */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-5 w-5 text-yellow-600" />
            <h4 className="font-semibold text-gray-900 dark:text-white">Forecast Dates</h4>
          </div>
          <div className="space-y-3">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Forecast Start</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {workPackage.forecast_start_date
                  ? new Date(workPackage.forecast_start_date).toLocaleDateString()
                  : 'Not set'}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Forecast End</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {workPackage.forecast_end_date
                  ? new Date(workPackage.forecast_end_date).toLocaleDateString()
                  : 'Not set'}
              </p>
            </div>
            {forecastVariance !== null && (
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Variance</p>
                <div className="flex items-center gap-2">
                  {forecastVariance > 0 ? (
                    <>
                      <TrendingDown className="h-4 w-4 text-red-600" />
                      <p className="text-sm font-medium text-red-600">
                        {forecastVariance} days behind
                      </p>
                    </>
                  ) : forecastVariance < 0 ? (
                    <>
                      <TrendingUp className="h-4 w-4 text-green-600" />
                      <p className="text-sm font-medium text-green-600">
                        {Math.abs(forecastVariance)} days ahead
                      </p>
                    </>
                  ) : (
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">On schedule</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Actual Dates */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="h-5 w-5 text-green-600" />
            <h4 className="font-semibold text-gray-900 dark:text-white">Actual Dates</h4>
          </div>
          <div className="space-y-3">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Actual Start</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {workPackage.actual_start_date
                  ? new Date(workPackage.actual_start_date).toLocaleDateString()
                  : 'Not started'}
              </p>
              {startVariance !== null && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {startVariance > 0 ? `${startVariance} days late` : startVariance < 0 ? `${Math.abs(startVariance)} days early` : 'On time'}
                </p>
              )}
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Actual End</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {workPackage.actual_end_date
                  ? new Date(workPackage.actual_end_date).toLocaleDateString()
                  : 'Not completed'}
              </p>
              {endVariance !== null && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {endVariance > 0 ? `${endVariance} days late` : endVariance < 0 ? `${Math.abs(endVariance)} days early` : 'On time'}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Effort Tracking */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h4 className="font-semibold text-gray-900 dark:text-white mb-4">Effort Tracking</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Estimated Effort</p>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">
              {workPackage.effort_estimate
                ? `${workPackage.effort_estimate} ${workPackage.effort_estimate >= 8 ? 'days' : 'hours'}`
                : 'Not estimated'}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Actual Effort</p>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">
              {workPackage.effort_actual
                ? `${workPackage.effort_actual} ${workPackage.effort_actual >= 8 ? 'days' : 'hours'}`
                : 'Not tracked'}
            </p>
            {workPackage.effort_estimate && workPackage.effort_actual && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {((workPackage.effort_actual / workPackage.effort_estimate) * 100).toFixed(1)}% of estimate
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Progress Indicator */}
      {workPackage.progress_indicator && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="h-5 w-5 text-yellow-600" />
            <h4 className="font-semibold text-gray-900 dark:text-white">Progress Status</h4>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 capitalize">
            {workPackage.progress_indicator.replace('_', ' ')}
          </p>
          {workPackage.last_progress_update && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              Last updated: {new Date(workPackage.last_progress_update).toLocaleDateString()}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
