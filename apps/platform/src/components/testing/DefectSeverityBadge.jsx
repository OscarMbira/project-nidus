const STYLES = {
  critical: 'bg-red-900/70 text-red-100',
  high: 'bg-orange-900/60 text-orange-100',
  medium: 'bg-yellow-900/50 text-yellow-100',
  low: 'bg-blue-900/40 text-blue-100',
  trivial: 'bg-gray-700 text-gray-300',
}

export default function DefectSeverityBadge({ severity }) {
  const s = (severity || '').toLowerCase()
  const cls = STYLES[s] || 'bg-gray-800 text-gray-300'
  return (
    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium capitalize ${cls}`}>
      {severity || '—'}
    </span>
  )
}
