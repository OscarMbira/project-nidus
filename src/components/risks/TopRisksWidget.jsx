/**
 * TopRisksWidget Component
 * Displays top/critical risks in a widget format
 */

import React from 'react'
import { AlertTriangle } from 'lucide-react'

const TopRisksWidget = ({ risks = [], limit = 5, className = '' }) => {
  const topRisks = risks.slice(0, limit)

  if (topRisks.length === 0) {
    return (
      <div className={`bg-gray-800 rounded-lg p-4 ${className}`}>
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-yellow-500" />
          Top Risks
        </h3>
        <p className="text-gray-400 text-sm text-center py-4">No risks to display</p>
      </div>
    )
  }

  return (
    <div className={`bg-gray-800 rounded-lg p-4 ${className}`}>
      <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
        <AlertTriangle className="w-5 h-5 text-yellow-500" />
        Top Risks
      </h3>
      <div className="space-y-3">
        {topRisks.map((risk, index) => (
          <div
            key={risk.id || index}
            className="flex items-start gap-3 p-3 bg-gray-700/50 rounded-lg"
          >
            <span className="text-sm font-medium text-gray-400 min-w-[24px]">
              {index + 1}.
            </span>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-medium text-white truncate">
                {risk.title || risk.risk_title || risk.name || 'Untitled Risk'}
              </h4>
              {risk.description && (
                <p className="text-xs text-gray-400 mt-1 line-clamp-2">
                  {risk.description}
                </p>
              )}
            </div>
            {risk.severity && (
              <span className={`px-2 py-1 text-xs rounded ${
                risk.severity === 'high' || risk.severity === 'critical'
                  ? 'bg-red-500/20 text-red-400'
                  : risk.severity === 'medium'
                  ? 'bg-yellow-500/20 text-yellow-400'
                  : 'bg-green-500/20 text-green-400'
              }`}>
                {risk.severity}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export default TopRisksWidget
