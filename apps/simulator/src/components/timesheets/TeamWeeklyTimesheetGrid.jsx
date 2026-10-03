import { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Building2, Home, X } from 'lucide-react'
import { platformDb } from '@nidus/supabase'
import { getWorkCategories } from '../../services/timesheetWorkCategoryService'
import { getDayLocationsForProject } from '../../services/timesheetDayLocationService'
import { getTasksByProject } from '../../services/taskService'
import TimesheetReviewPanel from './TimesheetReviewPanel'

const STATUS_CELL_CLASSES = {
  draft:     '',
  submitted: 'bg-yellow-50 dark:bg-yellow-900/20 cursor-pointer hover:ring-1 hover:ring-yellow-400',
  approved:  'bg-emerald-50 dark:bg-emerald-900/20',
  rejected:  'bg-red-50 dark:bg-red-900/20',
}

function toDateOnly(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()) }
function mondayOf(d) { const c = new Date(d); c.setDate(c.getDate() - ((c.getDay() + 6) % 7)); return toDateOnly(c) }
// Local calendar date, NOT toISOString() — see WeeklyTimesheetGrid.jsx's comment for why.
function isoDate(d) { const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), day = String(d.getDate()).padStart(2, '0'); return `${y}-${m}-${day}` }

function rowKeyFor(entry) {
  if (entry.is_overtime) return 'overtime'
  return entry.task_id ? `task:${entry.task_id}` : `desc:${(entry.description || '').trim()}`
}

/**
 * Read-mostly consolidated weekly grid for Team Timesheets (v1170) — every project member's
 * week stacked in one view, matching the spreadsheet layout that prompted this feature.
 * Clicking a submitted cell opens the same Approve/Reject review panel used on the Entries tab,
 * via a small modal (keeps the user on this tab instead of navigating away).
 */
export default function TeamWeeklyTimesheetGrid({ projectId, entries, loading, approveReasons, rejectReasons, processing, onConfirmDecision }) {
  const [weekStart, setWeekStart] = useState(() => mondayOf(new Date()))
  const [tasks, setTasks] = useState([])
  const [categories, setCategories] = useState([])
  const [dayLocations, setDayLocations] = useState([])
  const [memberNames, setMemberNames] = useState({})
  const [reviewingEntry, setReviewingEntry] = useState(null)

  const weekDates = useMemo(() => {
    const out = []
    for (let i = 0; i < 7; i++) { const d = new Date(weekStart); d.setDate(d.getDate() + i); out.push(isoDate(d)) }
    return out
  }, [weekStart])
  const weekEnd = weekDates[6]

  useEffect(() => {
    // projectId can transiently be the literal string "null" (not JS null) before
    // usePlatformProjectId() resolves — see WeeklyTimesheetGrid.jsx's comment for why.
    if (!projectId || projectId === 'null') return
    getTasksByProject(projectId).then((r) => setTasks(r?.data || [])).catch(() => setTasks([]))
  }, [projectId])

  useEffect(() => {
    getWorkCategories().then((r) => setCategories(r.data || [])).catch(() => setCategories([]))
  }, [])

  useEffect(() => {
    if (!projectId) return
    getDayLocationsForProject(projectId, weekDates[0], weekEnd).then((r) => setDayLocations(r.data || []))
  }, [projectId, weekDates, weekEnd])

  const weekEntries = useMemo(
    () => (entries || []).filter((e) => weekDates.includes((e.entry_date || '').slice(0, 10))),
    [entries, weekDates]
  )

  const userIds = useMemo(() => [...new Set(weekEntries.map((e) => e.user_id).filter(Boolean))], [weekEntries])

  useEffect(() => {
    if (userIds.length === 0) return
    platformDb.from('users').select('auth_user_id, full_name, email').in('auth_user_id', userIds)
      .then(({ data }) => setMemberNames(Object.fromEntries((data || []).map((u) => [u.auth_user_id, u.full_name || u.email || 'Unknown member']))))
      .catch(() => {})
  }, [userIds])

  const byMember = useMemo(() => {
    const map = new Map()
    for (const e of weekEntries) {
      if (!map.has(e.user_id)) map.set(e.user_id, [])
      map.get(e.user_id).push(e)
    }
    return [...map.entries()].sort((a, b) => (memberNames[a[0]] || '').localeCompare(memberNames[b[0]] || ''))
  }, [weekEntries, memberNames])

  const locationByMemberDate = useMemo(() => {
    const map = {}
    for (const d of dayLocations) {
      map[d.user_id] = map[d.user_id] || {}
      map[d.user_id][d.entry_date] = d.work_location
    }
    return map
  }, [dayLocations])

  const weekLabel = `${new Date(`${weekDates[0]}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – ${new Date(`${weekEnd}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => setWeekStart((d) => { const n = new Date(d); n.setDate(n.getDate() - 7); return n })}
          className="p-1.5 rounded-lg border border-gray-300 dark:border-slate-600 text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-sm font-medium text-gray-900 dark:text-white min-w-[180px] text-center">{weekLabel}</span>
        <button type="button" onClick={() => setWeekStart((d) => { const n = new Date(d); n.setDate(n.getDate() + 7); return n })}
          className="p-1.5 rounded-lg border border-gray-300 dark:border-slate-600 text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800">
          <ChevronRight className="h-4 w-4" />
        </button>
        <button type="button" onClick={() => setWeekStart(mondayOf(new Date()))}
          className="text-xs text-blue-600 dark:text-blue-400 hover:underline ml-1">This week</button>
      </div>

      {byMember.length === 0 && (
        <div className="text-center py-16 text-gray-500 dark:text-slate-500">No entries logged by the team this week.</div>
      )}

      {byMember.map(([userId, memberEntries]) => {
        const rowsMap = new Map()
        for (const e of memberEntries) {
          const key = rowKeyFor(e)
          if (!rowsMap.has(key)) {
            rowsMap.set(key, {
              key,
              isOvertime: !!e.is_overtime,
              label: e.is_overtime ? 'Overtime' : e.task_id ? (tasks.find((t) => t.id === e.task_id)?.task_name || 'Task') : (e.description || '—'),
              categoryCode: e.work_category,
              cellsByDate: {},
            })
          }
          rowsMap.get(key).cellsByDate[(e.entry_date || '').slice(0, 10)] = e
        }
        const memberRows = [...rowsMap.values()]
        const dailyTotals = Object.fromEntries(weekDates.map((date) => [date, memberRows.reduce((s, r) => s + (parseFloat(r.cellsByDate[date]?.hours_worked) || 0), 0)]))
        const weekTotalHours = Object.values(dailyTotals).reduce((s, v) => s + v, 0)
        const weekTotalDays = Object.values(dailyTotals).filter((v) => v > 0).length
        const memberLocations = locationByMemberDate[userId] || {}
        const onsiteDays = weekDates.filter((d) => memberLocations[d] === 'onsite').length
        const offshoreDays = weekDates.filter((d) => memberLocations[d] === 'offshore').length

        return (
          <div key={userId} className="rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
            <div className="px-4 py-2.5 bg-gray-100 dark:bg-slate-800 font-semibold text-gray-900 dark:text-white text-sm flex items-center justify-between flex-wrap gap-2">
              <span>{memberNames[userId] || 'Unknown member'}</span>
              <span className="text-xs font-normal text-gray-500 dark:text-slate-400 flex items-center gap-3">
                <span>{weekTotalHours.toFixed(1)}h · {weekTotalDays}d</span>
                <span className="inline-flex items-center gap-1"><Building2 className="h-3 w-3" />{onsiteDays}</span>
                <span className="inline-flex items-center gap-1"><Home className="h-3 w-3" />{offshoreDays}</span>
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 dark:bg-slate-900 text-gray-500 dark:text-slate-400 text-xs uppercase">
                  <tr>
                    <th className="px-3 py-2 text-left min-w-[200px]">Activity</th>
                    <th className="px-3 py-2 text-left">Category</th>
                    {weekDates.map((date) => {
                      const d = new Date(`${date}T00:00:00`)
                      const isWeekend = d.getDay() === 0 || d.getDay() === 6
                      return (
                        <th key={date} className={`px-2 py-2 text-center min-w-[56px] ${isWeekend ? 'bg-gray-100 dark:bg-slate-900/60' : ''}`}>
                          {d.toLocaleDateString(undefined, { weekday: 'short' })}
                        </th>
                      )
                    })}
                    <th className="px-3 py-2 text-center">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-slate-800">
                  {memberRows.map((row) => {
                    const category = categories.find((c) => c.code === row.categoryCode)
                    const rowTotal = weekDates.reduce((s, date) => s + (parseFloat(row.cellsByDate[date]?.hours_worked) || 0), 0)
                    return (
                      <tr key={row.key} className="hover:bg-gray-50 dark:hover:bg-slate-800/50">
                        <td className="px-3 py-2 text-gray-900 dark:text-slate-100">
                          {row.isOvertime ? (
                            <span className="inline-flex items-center rounded-full border border-purple-300 bg-purple-50 text-purple-700 dark:border-purple-700 dark:bg-purple-900/30 dark:text-purple-300 px-2 py-0.5 text-xs font-medium">Overtime</span>
                          ) : row.label}
                        </td>
                        <td className="px-3 py-2 text-gray-500 dark:text-slate-400 text-xs">{row.isOvertime ? '—' : (category?.name || row.categoryCode)}</td>
                        {weekDates.map((date) => {
                          const entry = row.cellsByDate[date]
                          const clickable = entry?.status === 'submitted'
                          return (
                            <td key={date}
                              className={`px-2 py-2 text-center text-gray-700 dark:text-slate-300 ${STATUS_CELL_CLASSES[entry?.status] || ''}`}
                              onClick={() => clickable && setReviewingEntry(entry)}
                            >
                              {entry?.hours_worked ?? ''}
                            </td>
                          )
                        })}
                        <td className="px-3 py-2 text-center font-semibold text-blue-600 dark:text-blue-400">{rowTotal > 0 ? rowTotal.toFixed(2) : '—'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )
      })}

      {reviewingEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={() => setReviewingEntry(null)}>
          <div className="w-full max-w-lg rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                Review — {memberNames[reviewingEntry.user_id]} · {new Date(reviewingEntry.entry_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} · {reviewingEntry.hours_worked}h
              </h3>
              <button type="button" onClick={() => setReviewingEntry(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-200">
                <X className="h-4 w-4" />
              </button>
            </div>
            <TimesheetReviewPanel
              approveReasons={approveReasons}
              rejectReasons={rejectReasons}
              processing={processing}
              onConfirm={(decision, reasonIds, notes) => {
                onConfirmDecision(reviewingEntry.id, decision, reasonIds, notes)
                setReviewingEntry(null)
              }}
              onCancel={() => setReviewingEntry(null)}
            />
          </div>
        </div>
      )}
    </div>
  )
}
