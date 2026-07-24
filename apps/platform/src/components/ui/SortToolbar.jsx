/**
 * Compact sort controls for card / grid lists (same behaviour as sortable table headers).
 */
export default function SortToolbar({ columns, getSortDirection, onSort, className = '' }) {
  return (
    <div
      className={`flex flex-wrap items-center gap-2 min-h-[44px] ${className}`}
      role="toolbar"
      aria-label="Sort list"
    >
      <span className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mr-1">Sort by</span>
      {columns.map(({ key, label }) => {
        const dir = getSortDirection(key)
        return (
          <button
            key={key}
            type="button"
            onClick={() => onSort(key)}
            className={`inline-flex items-center gap-1.5 px-3 py-2 min-h-[44px] rounded-lg text-sm border transition-colors
              border-gray-600 dark:border-gray-600 bg-gray-800/80 hover:bg-gray-700/80 text-gray-200`}
            aria-pressed={dir != null}
          >
            <span>{label}</span>
            <span className="text-xs tabular-nums" aria-hidden="true">
              {dir === 'asc' && '↑'}
              {dir === 'desc' && '↓'}
              {!dir && '⇅'}
            </span>
          </button>
        )
      })}
    </div>
  )
}
