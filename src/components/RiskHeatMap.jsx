import { AlertTriangle } from 'lucide-react'

export default function RiskHeatMap({ risks }) {
  // Create a 5x5 grid for probability (rows) x impact (columns)
  const grid = Array(5).fill(null).map(() => Array(5).fill([]))

  // Populate grid with risks
  risks.forEach(risk => {
    const probIndex = risk.probability - 1 // Convert 1-5 to 0-4
    const impactIndex = risk.impact - 1 // Convert 1-5 to 0-4
    if (probIndex >= 0 && probIndex < 5 && impactIndex >= 0 && impactIndex < 5) {
      grid[probIndex][impactIndex] = [...grid[probIndex][impactIndex], risk]
    }
  })

  const getCellColor = (prob, impact) => {
    const score = prob * impact
    if (score >= 20) return 'bg-red-600 dark:bg-red-700'
    if (score >= 12) return 'bg-orange-500 dark:bg-orange-600'
    if (score >= 6) return 'bg-yellow-400 dark:bg-yellow-500'
    if (score >= 3) return 'bg-yellow-200 dark:bg-yellow-300'
    return 'bg-green-200 dark:bg-green-300'
  }

  const getTextColor = (prob, impact) => {
    const score = prob * impact
    if (score >= 6) return 'text-white'
    return 'text-gray-900 dark:text-gray-100'
  }

  const probabilityLabels = ['Very Low (1)', 'Low (2)', 'Medium (3)', 'High (4)', 'Very High (5)']
  const impactLabels = ['Very Low (1)', 'Low (2)', 'Medium (3)', 'High (4)', 'Very High (5)']

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Risk Heat Map (Probability × Impact)
      </h3>
      <div className="overflow-x-auto">
        <div className="inline-block min-w-full">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="border border-gray-300 dark:border-gray-600 p-2 text-xs text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700">
                  Probability →
                  <br />
                  Impact ↓
                </th>
                {impactLabels.map((label, idx) => (
                  <th
                    key={idx}
                    className="border border-gray-300 dark:border-gray-600 p-2 text-xs text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700"
                  >
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {grid.map((row, probIdx) => (
                <tr key={probIdx}>
                  <td className="border border-gray-300 dark:border-gray-600 p-2 text-xs text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 font-medium">
                    {probabilityLabels[probIdx]}
                  </td>
                  {row.map((cellRisks, impactIdx) => {
                    const prob = probIdx + 1
                    const impact = impactIdx + 1
                    const score = prob * impact
                    return (
                      <td
                        key={impactIdx}
                        className={`border border-gray-300 dark:border-gray-600 p-2 min-w-[120px] min-h-[80px] ${getCellColor(prob, impact)} ${getTextColor(prob, impact)}`}
                      >
                        <div className="text-center">
                          <div className="text-xs font-semibold mb-1">
                            Score: {score}
                          </div>
                          <div className="text-xs">
                            {cellRisks.length} {cellRisks.length === 1 ? 'risk' : 'risks'}
                          </div>
                          {cellRisks.length > 0 && (
                            <div className="mt-2 space-y-1">
                              {cellRisks.slice(0, 2).map((risk) => (
                                <div
                                  key={risk.id}
                                  className="text-xs truncate"
                                  title={risk.risk_title}
                                >
                                  {risk.risk_code || risk.risk_title.substring(0, 10)}
                                </div>
                              ))}
                              {cellRisks.length > 2 && (
                                <div className="text-xs">+{cellRisks.length - 2} more</div>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="mt-4 flex items-center gap-4 text-xs text-gray-600 dark:text-gray-400">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-red-600 dark:bg-red-700 rounded"></div>
          <span>Critical (20-25)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-orange-500 dark:bg-orange-600 rounded"></div>
          <span>High (12-19)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-yellow-400 dark:bg-yellow-500 rounded"></div>
          <span>Medium (6-11)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-yellow-200 dark:bg-yellow-300 rounded"></div>
          <span>Low (3-5)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-200 dark:bg-green-300 rounded"></div>
          <span>Very Low (1-2)</span>
        </div>
      </div>
    </div>
  )
}

