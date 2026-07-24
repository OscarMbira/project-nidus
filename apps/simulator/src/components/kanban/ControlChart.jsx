import React from 'react'
import { format, parseISO } from 'date-fns'

/**
 * Enhanced control chart (scatter plot) for cycle or lead time with percentiles.
 *
 * Props:
 * - points: Array of { date: string, value: number }
 * - title: string
 * - unitLabel: string (e.g., 'days')
 * - percentiles: Object with p50, p85, p95 (optional)
 */
export default function ControlChart({ points, title, unitLabel = 'days', percentiles }) {
  if (!points || points.length === 0) {
    return (
      <div className="text-sm text-gray-500 dark:text-gray-400">
        Not enough data to display control chart.
      </div>
    )
  }

  const width = 600
  const height = 260
  const padding = 40

  const values = points.map(p => p.value)
  const maxValue = Math.max(...values, 1)

  const xScale = (index) =>
    padding + (index / Math.max(points.length - 1, 1)) * (width - 2 * padding)
  const yScale = (value) =>
    height - padding - (value / maxValue) * (height - 2 * padding)

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
        {title}
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

          {/* Points */}
          {points.map((p, idx) => {
            const x = xScale(idx)
            const y = yScale(p.value)
            return (
              <circle
                key={`${p.date}-${idx}`}
                cx={x}
                cy={y}
                r={4}
                fill="currentColor"
                className="text-sky-500"
              />
            )
          })}

          {/* Join line */}
          {points.length > 1 && (
            <path
              d={points
                .map((p, idx) => {
                  const x = xScale(idx)
                  const y = yScale(p.value)
                  return `${idx === 0 ? 'M' : 'L'} ${x} ${y}`
                })
                .join(' ')}
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className="text-sky-400"
            />
          )}

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

          {/* Percentile lines */}
          {percentiles && (
            <>
              {percentiles.p50 > 0 && (
                <line
                  x1={padding}
                  y1={yScale(percentiles.p50)}
                  x2={width - padding}
                  y2={yScale(percentiles.p50)}
                  stroke="currentColor"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                  className="text-green-500"
                />
              )}
              {percentiles.p85 > 0 && (
                <line
                  x1={padding}
                  y1={yScale(percentiles.p85)}
                  x2={width - padding}
                  y2={yScale(percentiles.p85)}
                  stroke="currentColor"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                  className="text-yellow-500"
                />
              )}
              {percentiles.p95 > 0 && (
                <line
                  x1={padding}
                  y1={yScale(percentiles.p95)}
                  x2={width - padding}
                  y2={yScale(percentiles.p95)}
                  stroke="currentColor"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                  className="text-red-500"
                />
              )}
            </>
          )}

          {/* Y labels (0 and max) */}
          <text
            x={padding - 8}
            y={height - padding + 4}
            fontSize="10"
            textAnchor="end"
            className="text-gray-500 dark:text-gray-400"
          >
            0 {unitLabel}
          </text>
          <text
            x={padding - 8}
            y={padding + 4}
            fontSize="10"
            textAnchor="end"
            className="text-gray-500 dark:text-gray-400"
          >
            {maxValue} {unitLabel}
          </text>
        </svg>
      </div>

      {/* Percentile legend */}
      {percentiles && (
        <div className="mt-3 flex flex-wrap gap-4 text-xs text-gray-600 dark:text-gray-300">
          {percentiles.p50 > 0 && (
            <div className="flex items-center gap-2">
              <div className="h-0.5 w-6 bg-green-500" style={{ borderTop: '1px dashed' }} />
              <span>50th percentile: {percentiles.p50} {unitLabel}</span>
            </div>
          )}
          {percentiles.p85 > 0 && (
            <div className="flex items-center gap-2">
              <div className="h-0.5 w-6 bg-yellow-500" style={{ borderTop: '1px dashed' }} />
              <span>85th percentile: {percentiles.p85} {unitLabel}</span>
            </div>
          )}
          {percentiles.p95 > 0 && (
            <div className="flex items-center gap-2">
              <div className="h-0.5 w-6 bg-red-500" style={{ borderTop: '1px dashed' }} />
              <span>95th percentile: {percentiles.p95} {unitLabel}</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}


