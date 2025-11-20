import React from 'react'
import { format, parseISO } from 'date-fns'

/**
 * Simple Cumulative Flow Diagram (CFD) using SVG.
 *
 * Props:
 * - points: Array of { date: string, columns: { [columnName]: count } }
 * - columnOrder: ordered array of column names for stacking
 */
export default function CumulativeFlowDiagram({ points, columnOrder }) {
  if (!points || points.length === 0 || !columnOrder || columnOrder.length === 0) {
    return (
      <div className="text-sm text-gray-500 dark:text-gray-400">
        Not enough data to display Cumulative Flow Diagram.
      </div>
    )
  }

  const width = 600
  const height = 260
  const padding = 40

  const totalCounts = points.map(p =>
    columnOrder.reduce((sum, col) => sum + (p.columns[col] || 0), 0)
  )
  const maxTotal = Math.max(...totalCounts, 1)

  const xScale = (index) =>
    padding + (index / Math.max(points.length - 1, 1)) * (width - 2 * padding)
  const yScale = (value) =>
    height - padding - (value / maxTotal) * (height - 2 * padding)

  // Colors per column (fallback palette)
  const colors = [
    'text-sky-500',
    'text-indigo-500',
    'text-emerald-500',
    'text-amber-500',
    'text-rose-500',
  ]

  const getColorClass = (index) => colors[index % colors.length]

  // Build stacked areas: for each column, accumulate below previous columns
  const areas = columnOrder.map((column, colIndex) => {
    const pathParts = []
    const baseHeights = new Array(points.length).fill(0)

    // Accumulate previous columns into baseHeights
    for (let i = 0; i < colIndex; i++) {
      const prevCol = columnOrder[i]
      points.forEach((p, idx) => {
        baseHeights[idx] += p.columns[prevCol] || 0
      })
    }

    // Top edge
    points.forEach((p, idx) => {
      const base = baseHeights[idx]
      const value = base + (p.columns[column] || 0)
      const x = xScale(idx)
      const y = yScale(value)
      pathParts.push(`${idx === 0 ? 'M' : 'L'} ${x} ${y}`)
    })

    // Bottom edge (reverse)
    for (let idx = points.length - 1; idx >= 0; idx--) {
      const base = baseHeights[idx]
      const x = xScale(idx)
      const y = yScale(base)
      pathParts.push(`L ${x} ${y}`)
    }

    pathParts.push('Z')
    return {
      column,
      path: pathParts.join(' '),
      colorClass: getColorClass(colIndex),
    }
  })

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
        Cumulative Flow Diagram
      </h3>
      <div className="overflow-x-auto">
        <svg
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          className="text-gray-200 dark:text-gray-700"
        >
          {/* Axes */}
          <line
            x1={padding}
            y1={height - padding}
            x2={width - padding}
            y2={height - padding}
            stroke="currentColor"
            strokeWidth="1"
          />
          <line
            x1={padding}
            y1={padding}
            x2={padding}
            y2={height - padding}
            stroke="currentColor"
            strokeWidth="1"
          />

          {/* Areas */}
          {areas.map((area, index) => (
            <path
              key={area.column}
              d={area.path}
              fill="currentColor"
              className={area.colorClass}
              opacity={0.4}
            />
          ))}

          {/* Date labels */}
          {points.map((p, idx) => {
            const x = xScale(idx)
            const label = format(parseISO(p.date), 'MMM dd')
            return (
              <text
                key={p.date}
                x={x}
                y={height - padding + 14}
                fontSize="10"
                textAnchor="middle"
                className="text-gray-500 dark:text-gray-400"
              >
                {label}
              </text>
            )
          })}

          {/* Y labels (0 and max) */}
          <text
            x={padding - 8}
            y={height - padding + 4}
            fontSize="10"
            textAnchor="end"
            className="text-gray-500 dark:text-gray-400"
          >
            0
          </text>
          <text
            x={padding - 8}
            y={padding + 4}
            fontSize="10"
            textAnchor="end"
            className="text-gray-500 dark:text-gray-400"
          >
            {maxTotal}
          </text>
        </svg>
      </div>

      {/* Legend */}
      <div className="mt-3 flex flex-wrap gap-3 text-xs text-gray-600 dark:text-gray-300">
        {columnOrder.map((col, index) => (
          <div key={col} className="flex items-center gap-2">
            <span
              className={`inline-block h-3 w-3 rounded-sm bg-current ${getColorClass(
                index
              )}`}
            />
            <span>{col}</span>
          </div>
        ))}
      </div>
    </div>
  )
}


