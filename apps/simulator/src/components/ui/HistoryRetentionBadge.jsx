import { differenceInDays, parseISO } from 'date-fns'

export default function HistoryRetentionBadge({
  movedToHistoryAt,
  retentionDays,
  autoArchiveEnabled = false,
  className = '',
}) {
  if (!autoArchiveEnabled || !retentionDays || !movedToHistoryAt) {
    return (
      <span className={`text-xs text-gray-500 dark:text-gray-400 ${className}`}>
        No auto-archive
      </span>
    )
  }

  const moved = typeof movedToHistoryAt === 'string' ? parseISO(movedToHistoryAt) : movedToHistoryAt
  const daysLeft = retentionDays - differenceInDays(new Date(), moved)

  return (
    <span className={`inline-flex px-2 py-0.5 rounded text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 ${className}`}>
      {daysLeft > 0 ? `Auto-archives in ${daysLeft} day${daysLeft === 1 ? '' : 's'}` : 'Due for archive'}
    </span>
  )
}
