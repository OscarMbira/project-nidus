import { useId } from 'react'

/**
 * Simple dependency preview (successor to the right of predecessor).
 */
export default function ActivityNetworkDiagram({ dependencies, activityNameById }) {
  const uid = useId().replace(/:/g, '')
  const markerId = `arrowhead-${uid}`

  if (!dependencies?.length) {
    return <p className="text-sm text-gray-500 dark:text-gray-400">No dependencies to display.</p>
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900/40">
      <svg width={Math.max(400, dependencies.length * 160)} height={dependencies.length * 56 + 40} className="text-gray-800 dark:text-gray-200">
        <defs>
          <marker id={markerId} markerWidth={6} markerHeight={6} refX={5} refY={3} orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" className="fill-gray-500 dark:fill-gray-400" />
          </marker>
        </defs>
        {dependencies.map((d, i) => {
          const y = 24 + i * 52
          const pred = activityNameById?.[d.predecessor_activity_id] || 'Pred'
          const succ = activityNameById?.[d.successor_activity_id] || 'Succ'
          return (
            <g key={d.id || i}>
              <rect x={20} y={y - 18} width={120} height={36} rx={8} className="fill-gray-200 stroke-gray-300 dark:fill-gray-800 dark:stroke-gray-600" />
              <text x={80} y={y + 2} textAnchor="middle" className="fill-gray-800 text-xs dark:fill-gray-200">
                {pred.slice(0, 18)}
              </text>
              <line x1={140} y1={y} x2={200} y2={y} stroke="currentColor" strokeWidth={2} markerEnd={`url(#${markerId})`} className="text-gray-500 dark:text-gray-400" />
              <text x={170} y={y - 8} textAnchor="middle" className="fill-gray-500 text-[10px] dark:fill-gray-400">
                {d.dependency_type || 'FS'}
                {d.lag_days ? ` ${d.lag_days}d` : ''}
              </text>
              <rect x={200} y={y - 18} width={120} height={36} rx={8} className="fill-gray-200 stroke-gray-300 dark:fill-gray-800 dark:stroke-gray-600" />
              <text x={260} y={y + 2} textAnchor="middle" className="fill-gray-800 text-xs dark:fill-gray-200">
                {succ.slice(0, 18)}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}
