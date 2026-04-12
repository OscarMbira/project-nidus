import { ITTO_PROCESS_GROUPS } from '../../constants/ittoConstants'

const COLORS = {
  Initiating: 'bg-violet-900/80 text-violet-100 border-violet-600',
  Planning: 'bg-blue-900/80 text-blue-100 border-blue-600',
  Executing: 'bg-emerald-900/80 text-emerald-100 border-emerald-600',
  'Monitoring & Controlling': 'bg-amber-900/80 text-amber-100 border-amber-600',
  Closing: 'bg-slate-700 text-slate-100 border-slate-500',
}

export default function ITTOProcessGroupBadge({ processGroup, className = '' }) {
  const pg = ITTO_PROCESS_GROUPS.includes(processGroup) ? processGroup : 'Planning'
  const cls = COLORS[pg] || COLORS.Planning
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${cls} ${className}`}
    >
      {pg}
    </span>
  )
}
