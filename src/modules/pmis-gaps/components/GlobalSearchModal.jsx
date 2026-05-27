import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Command, Search, Star, Clock, X } from 'lucide-react'
import { platformDb } from '../../../services/supabase/supabaseClient'
import {
  searchGlobal,
  getRecentItems,
  getFavourites,
  entityRoute,
  trackRecentItem,
} from '../services/globalSearchService'

const QUICK_ACTIONS = [
  { label: 'Create Task', path: '/platform/tasks/create' },
  { label: 'New Risk', path: '/platform/risks/create' },
  { label: 'Go to Dashboard', path: '/platform/dashboard' },
]

/**
 * Global command palette — Ctrl+K / Cmd+K (GAP-02)
 */
export default function GlobalSearchModal({ open, onClose, sim = false }) {
  const navigate = useNavigate()
  const inputRef = useRef(null)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [recent, setRecent] = useState([])
  const [favourites, setFavourites] = useState([])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [loading, setLoading] = useState(false)
  const [userId, setUserId] = useState(null)

  useEffect(() => {
    platformDb.auth.getUser().then(({ data }) => setUserId(data?.user?.id || null))
  }, [])

  useEffect(() => {
    if (!open) return
    setQuery('')
    setSelectedIndex(0)
    inputRef.current?.focus()
    if (userId) {
      getRecentItems(userId, { sim }).then(setRecent).catch(() => setRecent([]))
      getFavourites(userId, { sim }).then(setFavourites).catch(() => setFavourites([]))
    }
  }, [open, userId, sim])

  useEffect(() => {
    if (!open) return
    const t = setTimeout(async () => {
      if (!query.trim()) {
        setResults([])
        return
      }
      setLoading(true)
      try {
        const { results: r } = await searchGlobal(query, { sim })
        setResults(r)
        setSelectedIndex(0)
      } catch {
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 200)
    return () => clearTimeout(t)
  }, [query, open, sim])

  const flatItems = query.trim()
    ? results
    : [
        ...QUICK_ACTIONS.map((a) => ({ ...a, kind: 'action' })),
        ...favourites.map((f) => ({ ...f, kind: 'favourite' })),
        ...recent.map((r) => ({ ...r, kind: 'recent' })),
      ]

  const goTo = useCallback(
    async (item) => {
      let path = item.path || item.route_path
      if (!path && item.type && item.id) path = entityRoute(item.type, item.id)
      if (!path && item.entity_type && item.entity_id) {
        path = entityRoute(item.entity_type, item.entity_id)
      }
      if (!path) return
      if (userId) {
        trackRecentItem(
          userId,
          {
            entity_type: item.type || item.entity_type || 'link',
            entity_id: item.id || item.entity_id || path,
            title: item.title || item.label,
            route_path: path,
          },
          { sim }
        ).catch(() => {})
      }
      onClose()
      navigate(path)
    },
    [navigate, onClose, userId, sim]
  )

  useEffect(() => {
    if (!open) return
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex((i) => Math.min(i + 1, flatItems.length - 1))
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex((i) => Math.max(i - 1, 0))
      }
      if (e.key === 'Enter' && flatItems[selectedIndex]) {
        e.preventDefault()
        goTo(flatItems[selectedIndex])
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, flatItems, selectedIndex, goTo, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[10vh] px-4 bg-black/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Global search"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-xl bg-gray-900 border border-gray-700 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-700">
          <Search className="h-5 w-5 text-gray-400 shrink-0" />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search projects, tasks, risks, issues..."
            className="flex-1 bg-transparent text-gray-100 placeholder-gray-500 outline-none text-base"
            aria-label="Search query"
          />
          <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-1 text-xs text-gray-400 bg-gray-800 rounded border border-gray-600">
            <Command className="h-3 w-3" />K
          </kbd>
          <button type="button" onClick={onClose} className="p-1 text-gray-400 hover:text-gray-200" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto py-2">
          {loading && (
            <p className="px-4 py-6 text-center text-gray-500 text-sm">Searching...</p>
          )}
          {!loading && flatItems.length === 0 && (
            <p className="px-4 py-6 text-center text-gray-500 text-sm">
              {query.trim() ? 'No results found.' : 'Type to search or pick a quick action.'}
            </p>
          )}
          {flatItems.map((item, idx) => (
            <button
              key={`${item.kind || 'result'}-${item.id || item.path || item.title}-${idx}`}
              type="button"
              onClick={() => goTo(item)}
              className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                idx === selectedIndex ? 'bg-blue-600/20 text-white' : 'text-gray-300 hover:bg-gray-800'
              }`}
            >
              {item.kind === 'favourite' && <Star className="h-4 w-4 text-amber-400 shrink-0" />}
              {item.kind === 'recent' && <Clock className="h-4 w-4 text-gray-500 shrink-0" />}
              {!item.kind && <Search className="h-4 w-4 text-blue-400 shrink-0" />}
              {item.kind === 'action' && <Command className="h-4 w-4 text-green-400 shrink-0" />}
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{item.title || item.label}</div>
                {(item.subtitle || item.entity_type) && (
                  <div className="truncate text-xs text-gray-500">
                    {item.subtitle || item.entity_type}
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

/** Register Ctrl+K / Cmd+K globally */
export function useGlobalSearchShortcut(onOpen) {
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        onOpen()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onOpen])
}
