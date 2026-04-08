/**
 * Risk Matrix Chart Component
 * Displays a 5x5 probability vs impact risk matrix
 */

import { useState, useEffect } from 'react'
import { supabase } from '../../services/supabaseClient'

const PROBABILITIES = ['very_low', 'low', 'medium', 'high', 'very_high']
const IMPACTS = ['very_low', 'low', 'medium', 'high', 'very_high']

export default function RiskMatrixChart({ projectId, risks = [] }) {
  const [matrixData, setMatrixData] = useState({})

  useEffect(() => {
    if (risks.length > 0) {
      buildMatrix(risks)
    } else if (projectId) {
      fetchAndBuildMatrix()
    }
  }, [projectId, risks])

  const fetchAndBuildMatrix = async () => {
    try {
      const { data, error } = await supabase
        .from('risks')
        .select('id, risk_title, probability, impact, risk_status')
        .eq('project_id', projectId)
        .eq('is_deleted', false)
        .neq('risk_status', 'closed')

      if (error) throw error
      buildMatrix(data || [])
    } catch (error) {
      console.error('Error fetching risks:', error)
    }
  }

  const buildMatrix = (riskData) => {
    const matrix = {}
    PROBABILITIES.forEach(prob => {
      matrix[prob] = {}
      IMPACTS.forEach(impact => {
        matrix[prob][impact] = []
      })
    })

    riskData.forEach(risk => {
      const prob = risk.probability || 'medium'
      const impact = risk.impact || 'medium'
      if (matrix[prob] && matrix[prob][impact]) {
        matrix[prob][impact].push(risk)
      }
    })

    setMatrixData(matrix)
  }

  const getRiskLevel = (probIndex, impactIndex) => {
    const score = (probIndex + 1) * (impactIndex + 1)
    if (score >= 20) return 'very_high'
    if (score >= 12) return 'high'
    if (score >= 6) return 'medium'
    if (score >= 3) return 'low'
    return 'very_low'
  }

  const getLevelColor = (level) => {
    switch (level) {
      case 'very_high': return 'bg-red-500 dark:bg-red-600'
      case 'high': return 'bg-orange-400 dark:bg-orange-500'
      case 'medium': return 'bg-yellow-400 dark:bg-yellow-500'
      case 'low': return 'bg-green-400 dark:bg-green-500'
      case 'very_low': return 'bg-green-300 dark:bg-green-400'
      default: return 'bg-gray-200 dark:bg-gray-700'
    }
  }

  const formatLabel = (value) => {
    return value.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Risk Matrix
      </h3>

      <div className="flex">
        {/* Y-axis label */}
        <div className="flex items-center justify-center w-8 -rotate-90">
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">
            PROBABILITY →
          </span>
        </div>

        <div className="flex-1">
          {/* Matrix Grid */}
          <div className="grid grid-cols-6 gap-1">
            {/* Header row */}
            <div></div>
            {IMPACTS.map((impact, idx) => (
              <div
                key={impact}
                className="text-center text-xs font-medium text-gray-500 dark:text-gray-400 py-1"
              >
                {formatLabel(impact)}
              </div>
            ))}

            {/* Matrix rows */}
            {PROBABILITIES.slice().reverse().map((prob, probIdx) => (
              <>
                <div
                  key={`label-${prob}`}
                  className="text-right text-xs font-medium text-gray-500 dark:text-gray-400 py-2 pr-2"
                >
                  {formatLabel(prob)}
                </div>
                {IMPACTS.map((impact, impactIdx) => {
                  const reversedProbIdx = PROBABILITIES.length - 1 - probIdx
                  const level = getRiskLevel(reversedProbIdx, impactIdx)
                  const risksInCell = matrixData[prob]?.[impact] || []

                  return (
                    <div
                      key={`${prob}-${impact}`}
                      className={`h-12 rounded flex items-center justify-center ${getLevelColor(level)} relative group cursor-pointer`}
                      title={risksInCell.length > 0 ? risksInCell.map(r => r.risk_title).join('\n') : 'No risks'}
                    >
                      {risksInCell.length > 0 && (
                        <span className="text-white text-sm font-bold">
                          {risksInCell.length}
                        </span>
                      )}
                    </div>
                  )
                })}
              </>
            ))}
          </div>

          {/* X-axis label */}
          <div className="text-center mt-2">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
              IMPACT →
            </span>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-4 flex items-center justify-center gap-4 text-xs">
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 rounded bg-green-300 dark:bg-green-400"></div>
          <span className="text-gray-600 dark:text-gray-400">Very Low</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 rounded bg-green-400 dark:bg-green-500"></div>
          <span className="text-gray-600 dark:text-gray-400">Low</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 rounded bg-yellow-400 dark:bg-yellow-500"></div>
          <span className="text-gray-600 dark:text-gray-400">Medium</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 rounded bg-orange-400 dark:bg-orange-500"></div>
          <span className="text-gray-600 dark:text-gray-400">High</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 rounded bg-red-500 dark:bg-red-600"></div>
          <span className="text-gray-600 dark:text-gray-400">Very High</span>
        </div>
      </div>
    </div>
  )
}
