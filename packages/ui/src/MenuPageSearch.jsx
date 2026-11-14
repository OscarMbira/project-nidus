/**
 * v1341 (D22) — "Go to page" search at the top of the consolidated sidebar.
 * Lists only the pages in the user's current sidebar (switched-off and hidden items are never
 * in the index). Results show the section and, for industry pages, the industry name (D6).
 * Keyboard: type to filter, ↑ / ↓ to move, Enter to open, Esc to clear.
 * Renders nothing when the organisation's consolidated sidebar is off.
 */
import { useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Search, X } from 'lucide-react'
import { useConsolidatedMenu } from '@nidus/shared/hooks/useConsolidatedMenu'
import { searchConsolidatedPages } from '@nidus/config/consolidatedMenu'
import { resolveMenuRoutePathForLayout } from '@nidus/shared/utils/sidebarRouteUtils'

/** Presentational search box over a page index. */
export function MenuPageSearchView({ pageIndex = [], packNames = [], onOpen }) {
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const names = useMemo(() => new Map(packNames || []), [packNames])
  const results = useMemo(() => searchConsolidatedPages(pageIndex, query, names, 12), [pageIndex, query, names])

  const open = (page) => {
    if (!page) return
    setQuery('')
    setActive(0)
    onOpen(page)
  }

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((i) => Math.min(i + 1, Math.max(results.length - 1, 0))) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => Math.max(i - 1, 0)) }
    else if (e.key === 'Enter') { e.preventDefault(); open(results[active]) }
    else if (e.key === 'Escape') { setQuery(''); setActive(0) }
  }

  return (
    <div className="relative mb-3">
      <label htmlFor="sidebar-page-search" className="sr-only">Go to page</label>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-gray-500" aria-hidden="true" />
      <input
        id="sidebar-page-search"
        type="search"
        role="combobox"
        aria-expanded={results.length > 0}
        aria-controls="sidebar-page-search-results"
        aria-autocomplete="list"
        autoComplete="off"
        value={query}
        onChange={(e) => { setQuery(e.target.value); setActive(0) }}
        onKeyDown={onKeyDown}
        placeholder="Go to page…"
        className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 py-2 pl-9 pr-8 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      {query && (
        <button
          type="button"
          onClick={() => { setQuery(''); setActive(0) }}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          aria-label="Clear search"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
      {query.trim() && (
        <ul
          id="sidebar-page-search-results"
          role="listbox"
          className="absolute z-50 mt-1 max-h-80 w-full overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg"
        >
          {results.length === 0 && (
            <li className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">No pages match “{query.trim()}”.</li>
          )}
          {results.map((page, i) => (
            <li key={page.route} role="option" aria-selected={i === active}>
              <button
                type="button"
                onMouseEnter={() => setActive(i)}
                onClick={() => open(page)}
                className={`w-full px-3 py-2 text-left ${i === active ? 'bg-blue-50 dark:bg-blue-900/30' : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}
              >
                <span className="block text-sm font-medium text-gray-900 dark:text-gray-100">{page.label}</span>
                <span className="block text-xs text-gray-500 dark:text-gray-400">
                  {page.section}{page.industry ? ` · ${page.industry}` : ''}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/** Connected search for the app sidebars. */
export default function MenuPageSearch({ onNavigate }) {
  const consolidated = useConsolidatedMenu()
  const location = useLocation()
  const navigate = useNavigate()
  if (!consolidated || !consolidated.pageIndex?.length) return null
  const openPage = (page) => {
    const target = resolveMenuRoutePathForLayout(page.route, location.pathname, null, consolidated.projectId || null) || page.route
    navigate(target)
    onNavigate?.(target)
  }
  return <MenuPageSearchView pageIndex={consolidated.pageIndex} packNames={consolidated.packNames} onOpen={openPage} />
}
