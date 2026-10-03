import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Calendar as CalendarIcon, Plus, Search } from 'lucide-react'
import { format, startOfMonth, endOfMonth } from 'date-fns'
import { supabase } from '../services/supabaseClient'
import { RowActionButton } from '@nidus/ui'
import { TableRowNumberHeader, TableRowNumberCell } from '@nidus/ui/Table'
import { getDisplayRowNumber } from '@nidus/shared/utils/tableRowNumberUtils'

/**
 * Org-wide resource availability directory — one row per active resource, summarising the
 * selected month's unavailable/partial days. "View calendar" opens the existing per-resource
 * ResourceCalendar modal (full create/edit/delete), reused as-is rather than duplicated.
 */
export default function ResourceCalendarOverviewPage() {
  const [resources, setResources] = useState([])
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const navigate = useNavigate()

  const load = async () => {
    setLoading(true)
    try {
      const { data: resData } = await supabase
        .from('resources')
        .select('id, resource_name, resource_type')
        .eq('is_deleted', false)
        .eq('is_active', true)
        .order('resource_name')
      setResources(resData || [])

      const ids = (resData || []).map((r) => r.id)
      if (ids.length > 0) {
        const monthStart = format(startOfMonth(currentMonth), 'yyyy-MM-dd')
        const monthEnd = format(endOfMonth(currentMonth), 'yyyy-MM-dd')
        const { data: calData } = await supabase
          .from('resource_calendar')
          .select('resource_id, calendar_date, availability_type')
          .in('resource_id', ids)
          .gte('calendar_date', monthStart)
          .lte('calendar_date', monthEnd)
          .eq('is_deleted', false)
        setEntries(calData || [])
      } else {
        setEntries([])
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentMonth])

  const summaryByResource = useMemo(() => {
    const map = new Map()
    for (const e of entries) {
      const cur = map.get(e.resource_id) || { unavailable: 0, partial: 0 }
      if (e.availability_type === 'unavailable') cur.unavailable += 1
      else if (e.availability_type === 'partial') cur.partial += 1
      map.set(e.resource_id, cur)
    }
    return map
  }, [entries])

  const filtered = resources.filter(
    (r) => !search.trim() || r.resource_name?.toLowerCase().includes(search.trim().toLowerCase())
  )

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <CalendarIcon className="h-8 w-8 text-blue-600 dark:text-blue-400" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Resource Calendar</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Availability across all resources — open a resource to view or edit their calendar.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="relative max-w-xs w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="search"
            placeholder="Search resources…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm"
          />
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            ← Previous
          </button>
          <span className="text-sm font-medium text-gray-900 dark:text-white min-w-[110px] text-center">
            {format(currentMonth, 'MMMM yyyy')}
          </span>
          <button
            type="button"
            onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            Next →
          </button>
        </div>
      </div>

      {loading ? (
        <p className="text-gray-500 dark:text-gray-400">Loading…</p>
      ) : (
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-left">
              <tr>
                <TableRowNumberHeader className="!normal-case" />
                <th className="p-3">Resource</th>
                <th className="p-3">Type</th>
                <th className="p-3">This Month</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r, index) => {
                const summary = summaryByResource.get(r.id)
                return (
                  <tr key={r.id} className="border-t border-gray-100 dark:border-gray-800">
                    <TableRowNumberCell number={getDisplayRowNumber(index)} />
                    <td className="p-3 text-gray-900 dark:text-white font-medium">{r.resource_name}</td>
                    <td className="p-3 text-gray-500 dark:text-gray-400">{r.resource_type || '—'}</td>
                    <td className="p-3">
                      {summary ? (
                        <div className="flex items-center gap-2">
                          {summary.unavailable > 0 && (
                            <span className="px-2 py-0.5 text-xs rounded bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">
                              {summary.unavailable} unavailable
                            </span>
                          )}
                          {summary.partial > 0 && (
                            <span className="px-2 py-0.5 text-xs rounded bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">
                              {summary.partial} partial
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400 dark:text-gray-500">Fully available</span>
                      )}
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-3">
                        <RowActionButton variant="view" label="View calendar" onClick={() => navigate(`/platform/resources/${r.id}/calendar`)} />
                        <button
                          type="button"
                          onClick={() => navigate(`/platform/resources/${r.id}/calendar/entry/new?date=${format(new Date(), 'yyyy-MM-dd')}`)}
                          className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline dark:text-blue-400"
                        >
                          <Plus className="h-4 w-4" />
                          Add entry
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <p className="p-4 text-gray-500 dark:text-gray-400 text-sm">No resources found.</p>
          )}
        </div>
      )}

    </div>
  )
}
