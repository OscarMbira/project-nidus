const STYLES = {
  new: 'bg-slate-700 text-slate-100',
  open: 'bg-blue-900/60 text-blue-200',
  in_progress: 'bg-amber-900/50 text-amber-200',
  resolved: 'bg-emerald-900/50 text-emerald-200',
  closed: 'bg-gray-700 text-gray-300',
  reopened: 'bg-orange-900/50 text-orange-200',
  deferred: 'bg-purple-900/40 text-purple-200',
  duplicate: 'bg-gray-800 text-gray-400',
}

export default function DefectStatusBadge({ status }) {
  const s = (status || '').toLowerCase().replace(/\s+/g, '_')
  const cls = STYLES[s] || 'bg-gray-800 text-gray-300'
  return (
    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium capitalize ${cls}`}>
      {(status || '—').replace(/_/g, ' ')}
    </span>
  )
}
