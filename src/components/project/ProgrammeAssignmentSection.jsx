import { useState, useEffect, useCallback, useMemo } from 'react'
import { Network, X, Search } from 'lucide-react'
import { getProgrammeList } from '../../services/programmeService'
import { useAssignmentDropdownPlacement } from '../../hooks/useAssignmentDropdownPlacement'

function formatLoadError(err) {
  if (err && typeof err === 'object' && 'message' in err && err.message != null) return String(err.message)
  if (typeof err === 'string') return err
  return 'Failed to load programmes.'
}

/**
 * ProgrammeAssignmentSection
 * Props:
 *   programmeId  {string|null}
 *   onChange       {(id, programme) => void}
 *   selection      {object|null} optional
 */
export default function ProgrammeAssignmentSection({ programmeId, onChange, selection = null }) {
  const [programmes, setProgrammes] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const [retryCount, setRetryCount] = useState(0)

  const listVisible = open && !loading && !error
  const { rootRef: dropdownAnchorRef, openUpward, maxHeight } = useAssignmentDropdownPlacement(
    open,
    listVisible
  )

  const selected = useMemo(() => {
    const fromList = programmes.find(p => p.id === programmeId)
    if (fromList) return fromList
    if (selection && selection.id === programmeId) return selection
    return null
  }, [programmes, programmeId, selection])

  useEffect(() => {
    if (!open) {
      setLoading(false)
      return
    }

    let cancelled = false

    const run = async () => {
      setLoading(true)
      setError(null)
      try {
        const data = await getProgrammeList()
        if (cancelled) return
        setProgrammes(Array.isArray(data) ? data : [])
      } catch (err) {
        if (cancelled) return
        setProgrammes([])
        setError(formatLoadError(err))
      } finally {
        setLoading(false)
      }
    }

    void run()

    return () => {
      cancelled = true
      setLoading(false)
    }
  }, [open, retryCount])

  const filtered = programmes.filter(
    p =>
      !search ||
      p.programme_name?.toLowerCase().includes(search.toLowerCase()) ||
      p.programme_code?.toLowerCase().includes(search.toLowerCase())
  )

  const handleRetry = useCallback(() => {
    setRetryCount(c => c + 1)
  }, [])

  const handleSelect = useCallback(
    p => {
      onChange(p.id, p)
      setOpen(false)
      setSearch('')
    },
    [onChange]
  )

  const handleClear = useCallback(() => {
    onChange(null, null)
    setOpen(false)
    setSearch('')
  }, [onChange])

  return (
    <div className="space-y-6">
      <div className="mb-4">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Programme Assignment</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Optionally link this project to an existing programme. Leave blank if not applicable.
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 space-y-4">
        {selected ? (
          <div className="flex items-center justify-between p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
            <div className="flex items-center gap-3">
              <Network className="h-5 w-5 text-purple-600 dark:text-purple-400 shrink-0" />
              <div>
                <p className="text-sm font-medium text-purple-900 dark:text-purple-100">{selected.programme_name}</p>
                <p className="text-xs text-purple-700 dark:text-purple-300 font-mono mt-0.5">{selected.programme_code}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleClear}
              className="flex items-center gap-1 px-3 py-1.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
            >
              <X className="h-4 w-4" />
              Remove
            </button>
          </div>
        ) : (
          <div className="text-center py-6 text-gray-500 dark:text-gray-400">
            <Network className="h-10 w-10 mx-auto mb-2 opacity-40" />
            <p className="text-sm">This project is not part of a programme.</p>
          </div>
        )}

        {selected && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Programme Code</label>
              <div className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300 font-mono text-sm">
                {selected.programme_code || '—'}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Programme Name</label>
              <div className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300 text-sm">
                {selected.programme_name || '—'}
              </div>
            </div>
          </div>
        )}

        <div ref={dropdownAnchorRef} className="relative">
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-3 sm:gap-y-2">
            <button
              type="button"
              onClick={() => setOpen(o => !o)}
              className="flex w-full shrink-0 items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors sm:w-auto"
            >
              <Search className="h-4 w-4" />
              {selected ? 'Change Programme' : 'Assign to Programme'}
            </button>
            {open && (
              <>
                <div className="relative min-w-0 flex-1 basis-full sm:basis-48 sm:min-w-[14rem]">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search programmes..."
                    autoFocus
                    className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-4 text-sm text-gray-900 focus:border-purple-500 focus:ring-2 focus:ring-purple-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  />
                </div>
                {loading && (
                  <span className="shrink-0 text-sm text-gray-500 dark:text-gray-400">Loading…</span>
                )}
                {error && !loading && (
                  <div className="flex min-w-0 max-w-full flex-1 basis-full items-center gap-2 sm:basis-auto sm:flex-initial lg:ml-auto">
                    <span className="min-w-0 truncate text-sm text-red-600 dark:text-red-400" title={error}>
                      {error}
                    </span>
                    <button
                      type="button"
                      onClick={handleRetry}
                      className="shrink-0 rounded-md px-2 py-1 text-sm font-medium text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/30"
                    >
                      Retry
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          {listVisible && (
            <div
              className={`absolute z-30 w-full overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-600 dark:bg-gray-800 dark:shadow-black/50 ${
                openUpward ? 'bottom-full mb-1' : 'top-full mt-1'
              }`}
            >
              <div className="overflow-y-auto overscroll-contain" style={{ maxHeight }}>
                {filtered.length === 0 ? (
                  <p className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">
                    {programmes.length === 0
                      ? 'No programmes found. Create a programme first.'
                      : 'No matches found.'}
                  </p>
                ) : (
                  filtered.map(p => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleSelect(p)}
                      className={`flex w-full items-center gap-3 border-b border-gray-100 px-4 py-3 text-left transition-colors last:border-0 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-700 ${
                        p.id === programmeId ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                      }`}
                    >
                      <Network className="h-4 w-4 shrink-0 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{p.programme_name}</p>
                        <p className="font-mono text-xs text-gray-500 dark:text-gray-400">{p.programme_code}</p>
                      </div>
                      {p.id === programmeId && (
                        <span className="ml-auto text-xs font-medium text-purple-600 dark:text-purple-400">
                          Selected
                        </span>
                      )}
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
