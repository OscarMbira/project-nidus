/**
 * RisksByCategoryChart Component
 * Displays risks grouped by category in a chart format
 */

import React from 'react'
import { PieChart } from 'lucide-react'

const RisksByCategoryChart = ({ risks = [], className = '' }) => {
  // Group risks by category
  const categories = risks.reduce((acc, risk) => {
    const category = risk.category || risk.risk_category || 'Uncategorized'
    acc[category] = (acc[category] || 0) + 1
    return acc
  }, {})

  const categoryData = Object.entries(categories).map(([name, count]) => ({
    name,
    count
  }))

  if (categoryData.length === 0) {
    return (
      <div className={`bg-gray-800 rounded-lg p-4 ${className}`}>
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <PieChart className="w-5 h-5 text-blue-500" />
          Risks by Category
        </h3>
        <p className="text-gray-400 text-sm text-center py-4">No data available</p>
      </div>
    )
  }

  return (
    <div className={`bg-gray-800 rounded-lg p-4 ${className}`}>
      <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
        <PieChart className="w-5 h-5 text-blue-500" />
        Risks by Category
      </h3>
      <div className="space-y-2">
        {categoryData.map((item, index) => (
          <div key={item.name} className="flex items-center justify-between">
            <span className="text-sm text-gray-300">{item.name}</span>
            <span className="text-sm font-medium text-white bg-gray-700 px-2 py-1 rounded">
              {item.count}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default RisksByCategoryChart
