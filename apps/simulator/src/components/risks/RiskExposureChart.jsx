/**
 * Risk Exposure Chart Component
 * Display total risk exposure (expected value) and breakdown
 */

import { useState, useEffect } from 'react'
import { TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react'
import { getRiskExposure } from '../../services/riskAnalyticsService'

export default function RiskExposureChart({ projectId }) {
  const [exposure, setExposure] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (projectId) {
      loadExposure()
    }
  }, [projectId])

  const loadExposure = async () => {
    setLoading(true)
    try {
      const result = await getRiskExposure(projectId)
      if (result.success) {
        setExposure(result.data)
      }
    } catch (error) {
      console.error('Error loading risk exposure:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!exposure) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Risk Exposure
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">No exposure data available</p>
      </div>
    )
  }

  const totalExposure = exposure.total_exposure || 0
  const threatsExposure = exposure.threats_exposure || 0
  const opportunitiesExposure = exposure.opportunities_exposure || 0

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Risk Exposure
      </h3>

      <div className="space-y-4">
        {/* Total Exposure */}
        <div className="bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 rounded-lg p-4 border border-red-200 dark:border-red-800">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Total Risk Exposure
              </span>
            </div>
            <span className="text-2xl font-bold text-red-600 dark:text-red-400">
              {totalExposure.toFixed(2)}
            </span>
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400">
            Sum of all risk expected values (Probability × Impact)
          </p>
        </div>

        {/* Breakdown */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 border border-red-200 dark:border-red-800">
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown className="h-4 w-4 text-red-600" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Threats
              </span>
            </div>
            <p className="text-xl font-bold text-red-600 dark:text-red-400">
              {threatsExposure.toFixed(2)}
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              {totalExposure > 0 ? ((threatsExposure / totalExposure) * 100).toFixed(1) : 0}% of total
            </p>
          </div>

          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Opportunities
              </span>
            </div>
            <p className="text-xl font-bold text-green-600 dark:text-green-400">
              {opportunitiesExposure.toFixed(2)}
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              {totalExposure > 0 ? ((opportunitiesExposure / totalExposure) * 100).toFixed(1) : 0}% of total
            </p>
          </div>
        </div>

        {/* Visual Breakdown */}
        {totalExposure > 0 && (
          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex h-6 rounded-full overflow-hidden border border-gray-300 dark:border-gray-600">
              {threatsExposure > 0 && (
                <div
                  className="bg-red-600 flex items-center justify-center text-xs text-white font-medium"
                  style={{ width: `${(threatsExposure / totalExposure) * 100}%` }}
                  title={`Threats: ${threatsExposure.toFixed(2)}`}
                >
                  {((threatsExposure / totalExposure) * 100) > 10 && (
                    <span>Threats: {((threatsExposure / totalExposure) * 100).toFixed(0)}%</span>
                  )}
                </div>
              )}
              {opportunitiesExposure > 0 && (
                <div
                  className="bg-green-600 flex items-center justify-center text-xs text-white font-medium"
                  style={{ width: `${(opportunitiesExposure / totalExposure) * 100}%` }}
                  title={`Opportunities: ${opportunitiesExposure.toFixed(2)}`}
                >
                  {((opportunitiesExposure / totalExposure) * 100) > 10 && (
                    <span>Opportunities: {((opportunitiesExposure / totalExposure) * 100).toFixed(0)}%</span>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
