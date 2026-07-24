/**
 * RisksByStatusChart Component
 * Displays risks grouped by status in a chart format
 */

import React from 'react'
import { BarChart } from 'lucide-react'

const RisksByStatusChart = ({ risks = [], className = '' }) => {
  // Group risks by status
  const statuses = risks.reduce((acc, risk) => {
    const status = risk.status || risk.risk_status || 'Unknown'
    acc[status] = (acc[status] || 0) + 1
    return acc
  }, {})

  const statusData = Object.entries(statuses).map(([name, count]) => ({
    name,
    count
  }))

  const getStatusColor = (status) => {
    const lower = status.toLowerCase()
    if (lower.includes('open') || lower.includes('active')) return 'bg-red-500'
    if (lower.includes('mitigating') || lower.includes('treating')) return 'bg-yellow-500'
    if (lower.includes('closed') || lower.includes('resolved')) return 'bg-green-500'
    return 'bg-gray-500'
  }

  if (statusData.length === 0) {
    return (
      <div className={`bg-gray-800 rounded-lg p-4 ${className}`}>
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <BarChart className="w-5 h-5 text-purple-500" />
          Risks by Status
        </h3>
        <p className="text-gray-400 text-sm text-center py-4">No data available</p>
      </div>
    )
  }

  const maxCount = Math.max(...statusData.map(d => d.count))

  return (
    <div className={`bg-gray-800 rounded-lg p-4 ${className}`}>
      <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
        <BarChart className="w-5 h-5 text-purple-500" />
        Risks by Status
      </h3>
      <div className="space-y-3">
        {statusData.map((item) => (
          <div key={item.name} className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-gray-300">{item.name}</span>
              <span className="text-white font-medium">{item.count}</span>
            </div>
            <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
              <div
                className={`h-full ${getStatusColor(item.name)} rounded-full transition-all`}
                style={{ width: `${(item.count / maxCount) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default RisksByStatusChart
