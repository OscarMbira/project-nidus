const STATUS_CONFIG = {
  unauthorised: {
    label: 'Unauthorised',
    bg: 'bg-amber-100 dark:bg-amber-900/30',
    text: 'text-amber-800 dark:text-amber-200',
  },
  live: {
    label: 'Live',
    bg: 'bg-green-100 dark:bg-green-900/30',
    text: 'text-green-800 dark:text-green-200',
  },
  history: {
    label: 'History',
    bg: 'bg-slate-200 dark:bg-slate-700/50',
    text: 'text-slate-700 dark:text-slate-200',
  },
  archived: {
    label: 'Archived',
    bg: 'bg-gray-200 dark:bg-gray-800',
    text: 'text-gray-700 dark:text-gray-300',
  },
}

export default function RecordStatusBadge({ status = 'live', className = '' }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.live
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cfg.bg} ${cfg.text} ${className}`}>
      {cfg.label}
    </span>
  )
}

export { STATUS_CONFIG }
