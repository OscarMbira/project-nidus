/**
 * Compact row index badge for card/grid list views.
 */
export default function RowNumberBadge({ number, className = '' }) {
  if (number == null) return null
  return (
    <span
      className={`inline-flex items-center justify-center min-w-[1.75rem] h-7 px-1.5 rounded-md text-xs font-medium tabular-nums bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 ${className}`}
      aria-label={`Row ${number}`}
    >
      #{number}
    </span>
  )
}
