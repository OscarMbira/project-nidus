export default function DelaySeverityBadge({ severity }) {
  const s = (severity || 'medium').toLowerCase()
  const map = {
    low: 'bg-slate-600/80 text-slate-100',
    medium: 'bg-amber-600/90 text-white',
    high: 'bg-orange-600 text-white',
    critical: 'bg-red-700 text-white',
  }
  return (
    <span
      className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium capitalize ${map[s] || map.medium}`}
    >
      {s}
    </span>
  )
}
