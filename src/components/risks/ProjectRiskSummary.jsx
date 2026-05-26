/**
 * Project Risk Summary Widget
 * Display risk summary on project dashboard/detail page
 */

import { useState, useEffect } from 'react'
import { AlertTriangle, TrendingUp, ArrowRight, LifeBuoy } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { platformProjectPath, platformRiskPath } from '../../utils/projectRouteParam'
import { getRiskSummary, getTopRisks } from '../../services/riskService'

export default function ProjectRiskSummary({ projectId, routeKey }) {
  const [summary, setSummary] = useState(null)
  const [topRisks, setTopRisks] = useState([])
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    if (projectId) {
      loadSummary()
    }
  }, [projectId])

  const loadSummary = async () => {
    setLoading(true)
    try {
      const [summaryResult, topRisksResult] = await Promise.all([
        getRiskSummary(projectId),
        getTopRisks(projectId, 3)
      ])

      if (summaryResult.success) {
        setSummary(summaryResult.data)
      }

      if (topRisksResult.success) {
        setTopRisks(topRisksResult.data || [])
      }
    } catch (error) {
      console.error('Error loading risk summary:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!summary) {
    return null
  }

  const projectRouteKey = String(routeKey || projectId || '').trim()

  const totalRisks = summary.total_risks || 0
  const activeRisks = summary.active_risks || 0
  const highRisks = summary.high_risks || 0
  const overdueResponses = summary.overdue_responses || 0

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-orange-500" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Risk Register
          </h3>
        </div>
        <button
          type="button"
          onClick={() => navigate(platformProjectPath(projectId || '', 'risks'))}
          className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1"
        >
          View Register
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total Risks</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalRisks}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Active</p>
          <p className="text-2xl font-bold text-blue-600">{activeRisks}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">High/Very High</p>
          <p className={`text-2xl font-bold ${highRisks > 0 ? 'text-red-600' : 'text-gray-600 dark:text-gray-400'}`}>
            {highRisks}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Overdue</p>
          <p className={`text-2xl font-bold ${overdueResponses > 0 ? 'text-orange-600' : 'text-gray-600 dark:text-gray-400'}`}>
            {overdueResponses}
          </p>
        </div>
      </div>

      {topRisks.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
            Top {topRisks.length} Risk{topRisks.length > 1 ? 's' : ''}:
          </p>
          <div className="space-y-2">
            {topRisks.map((risk, index) => (
              <div
                key={risk.risk_id || index}
                onClick={() =>                  navigate(
                    platformRiskPath(projectRouteKey, risk.risk_code || risk.risk_id),
                  )
                }
                className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-700 rounded hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer transition-colors"
              >
                {risk.risk_type === 'threat' ? (
                  <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0" />
                ) : (
                  <TrendingUp className="h-4 w-4 text-green-500 flex-shrink-0" />
                )}
                <span className="text-xs font-mono text-gray-500 dark:text-gray-400 flex-shrink-0">
                  {risk.risk_identifier || `R${index + 1}`}
                </span>
                <span className="text-xs text-gray-900 dark:text-white truncate flex-1">
                  {risk.title}
                </span>
                <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                  (risk.risk_score || '').includes('high') || (risk.risk_score || '').includes('very_high')
                    ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                    : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                }`}>
                  {risk.risk_score?.replace('_', ' ').toUpperCase() || ''}
                </span>
                <button
                  type="button"
                  title="Recovery planning"
                  onClick={(e) => {
                    e.stopPropagation()
                    navigate(
                      `/pm/planning/recovery?projectId=${encodeURIComponent(projectId)}&trigger=risk&sourceId=${encodeURIComponent(risk.risk_id || '')}`
                    )
                  }}
                  className="flex-shrink-0 rounded p-1 text-blue-600 hover:bg-gray-200 dark:text-blue-400 dark:hover:bg-gray-600"
                  aria-label="Open recovery planning for this risk"
                >
                  <LifeBuoy className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {totalRisks === 0 && (
        <div className="text-center py-4">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
            No risks registered yet
          </p>
          <button
            onClick={() => navigate(platformProjectPath(projectRouteKey, 'risks'))}
            className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
          >
            Add First Risk →
          </button>
        </div>
      )}
    </div>
  )
}
