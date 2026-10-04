import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { Plus, Building2, Home, Send, X } from 'lucide-react'
import {
  createTimesheetEntry,
  updateTimesheetEntry,
  deleteTimesheetEntry,
  submitTimesheetEntriesForWeek,
  computeHoursFromTimeRange,
} from '../../services/timesheetService'
import { getWorkCategories } from '../../services/timesheetWorkCategoryService'
import { resolveTimesheetSettings } from '../../services/timesheetSettingsService'
import { getTasksByProject } from '../../services/taskService'
import { getCurrentUserAccountId } from '../../utils/accountResolution'
import SelectField from '@nidus/ui/SelectField'
import OvertimeGrid from './OvertimeGrid'
import ReviewDecisionBadge from './ReviewDecisionBadge'
import WorkPlanGrid from './WorkPlanGrid'
import { getProjectBillingType } from '../../services/projectWorkPlanService'

const STATUS_ROW_CLASSES = {
  draft:     '',
  submitted: 'bg-yellow-50 dark:bg-yellow-900/20',
  approved:  'bg-emerald-50 dark:bg-emerald-900/20',
  rejected:  'bg-red-50 dark:bg-red-900/20',
}

const STATUS_BADGE_CLASSES = {
  draft:     'bg-gray-100 text-gray-700 border-gray-300 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600',
  submitted: 'bg-yellow-50 text-yellow-700 border-yellow-300 dark:bg-yellow-900/40 dark:text-yellow-300 dark:border-yellow-700',
  approved:  'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-700',
  rejected:  'bg-red-50 text-red-700 border-red-300 dark:bg-red-900/40 dark:text-red-300 dark:border-red-700',
}

function StatusBadge({ status }) {
  if (!status) return <span className="text-gray-400 dark:text-slate-600 text-xs">—</span>
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${STATUS_BADGE_CLASSES[status] || STATUS_BADGE_CLASSES.draft}`}>
      {status}
    </span>
  )
}

const DAY_NAME_TO_INDEX = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 }
const DEFAULT_WORKING_DAYS = ['mon', 'tue', 'wed', 'thu', 'fri']

function toDateOnly(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

function mondayOf(d) {
  const copy = new Date(d)
  copy.setDate(copy.getDate() - ((copy.getDay() + 6) % 7))
  return toDateOnly(copy)
}

/** First day (Sunday-relative) of the configured working-days block containing `d`. */
function startOfConfiguredWeek(d, workingDays) {
  const days = Array.isArray(workingDays) && workingDays.length === 5 ? workingDays : DEFAULT_WORKING_DAYS
  const startIdx = Math.min(...days.map((n) => DAY_NAME_TO_INDEX[n] ?? 1))
  const copy = toDateOnly(d)
  const diff = (copy.getDay() - startIdx + 7) % 7
  copy.setDate(copy.getDate() - diff)
  return copy
}

// Local calendar date, NOT toISOString() — that converts to UTC first, which silently shifts
// the date by one day in any positive-UTC-offset timezone (e.g. Central Africa Time), making a
// correctly-computed Monday render as "Sunday".
function isoDate(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function parseHours(raw) {
  const s = String(raw ?? '').trim().replace(/h$/i, '')
  if (s === '') return 0
  const n = parseFloat(s)
  return isNaN(n) ? null : Math.round(n * 4) / 4
}

const canEditCell = (entry) => !entry || entry.status === 'draft' || entry.status === 'rejected'
const newRowKey = (date, i) => `${date}:new:${i}`
const isNewRowKey = (key) => key.includes(':new:')
const blankDraft = () => ({ categoryCode: '', activityValue: '', workLocation: 'onsite', startTime: '', endTime: '', hours: '' })

/**
 * Weekly grid entry/view for My Timesheets (v1170/v1173, inverted to day-rows in v1179) — Day/Date
 * is the row axis (like OvertimeGrid below it), with Category, Activity, Location, Start, End and
 * Hours as per-row fields — a day can hold any number of activity rows, each independently
 * editable. Replaces the earlier Activity×Day pivot table: that shape couldn't fit per-entry
 * Location/Start/End without cramming extra pickers into a 5-day-wide cell, so each activity on a
 * given day is now its own row instead of a cell in a wide table. A pivot/editor over the same
 * timesheet_entries rows the Card/Table views use — no new "grid row" table. A separate 7-day
 * OvertimeGrid renders below, sharing this same week navigator. `entries` are this project/
 * user's already-fetched rows (passed down so the grid doesn't re-fetch what the parent already
 * has); `onChanged` tells the parent to reload after any mutation so Card/Table stay in sync.
 */
// v1178 — month/week picker. Current month + 2 prior (3 total) so users can retroactively
// amend a recent timesheet without being able to reach back indefinitely.
function buildMonthOptions() {
  const opts = []
  const now = new Date()
  for (let i = 0; i < 3; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    opts.push({
      key: `${d.getFullYear()}-${d.getMonth()}`,
      year: d.getFullYear(),
      month: d.getMonth(),
      label: d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' }),
    })
  }
  return opts
}

export default function WeeklyTimesheetGrid({ projectId, userId, entries, onChanged, onWeekStatsChange }) {
  const [weekAnchor, setWeekAnchor] = useState(() => mondayOf(new Date()))
  const [monthOptions] = useState(buildMonthOptions)
  const [selectedMonthKey, setSelectedMonthKey] = useState(() => monthOptions[0].key)
  const [selectedWeekIso, setSelectedWeekIso] = useState(null) // null = default week for the month
  const [tasks, setTasks] = useState([])
  const [categories, setCategories] = useState([])
  const [settings, setSettings] = useState(null)
  const [extraRows, setExtraRows] = useState({}) // date -> number of additional blank (unsaved) rows requested
  const [drafts, setDrafts] = useState({}) // rowKey -> { categoryCode, activityValue, workLocation, startTime, endTime, hours }
  const [savingKey, setSavingKey] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [gridTab, setGridTab] = useState('standard') // 'standard' | 'overtime'

  useEffect(() => {
    getCurrentUserAccountId().then((accountId) => {
      if (!accountId) return
      resolveTimesheetSettings(accountId, projectId).then(setSettings)
    })
  }, [projectId])

  // Every distinct working week (per the resolved working_days) that overlaps the selected month.
  const weeksInSelectedMonth = useMemo(() => {
    const opt = monthOptions.find((m) => m.key === selectedMonthKey) || monthOptions[0]
    const firstOfMonth = new Date(opt.year, opt.month, 1)
    const lastOfMonth = new Date(opt.year, opt.month + 1, 0)
    const seen = new Set()
    const weeks = []
    for (let d = new Date(firstOfMonth); d <= lastOfMonth; d.setDate(d.getDate() + 1)) {
      const start = startOfConfiguredWeek(d, settings?.working_days)
      const iso = isoDate(start)
      if (seen.has(iso)) continue
      seen.add(iso)
      const end = new Date(start)
      end.setDate(end.getDate() + 6)
      weeks.push({
        iso,
        label: `${start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`,
      })
    }
    return weeks
  }, [selectedMonthKey, monthOptions, settings])

  // Default week within the month: the one containing today (if the current month is selected),
  // otherwise the first week — unless the user has explicitly picked a different one.
  const effectiveSelectedWeekIso = useMemo(() => {
    if (selectedWeekIso && weeksInSelectedMonth.some((w) => w.iso === selectedWeekIso)) return selectedWeekIso
    const todayIso = isoDate(toDateOnly(new Date()))
    const containingToday = weeksInSelectedMonth.find((w) => {
      const end = new Date(`${w.iso}T00:00:00`)
      end.setDate(end.getDate() + 6)
      return todayIso >= w.iso && todayIso <= isoDate(end)
    })
    return (containingToday || weeksInSelectedMonth[0])?.iso
  }, [selectedWeekIso, weeksInSelectedMonth])

  useEffect(() => {
    if (effectiveSelectedWeekIso) setWeekAnchor(new Date(`${effectiveSelectedWeekIso}T00:00:00`))
  }, [effectiveSelectedWeekIso])

  const handleMonthChange = (key) => {
    setSelectedMonthKey(key)
    setSelectedWeekIso(null) // reset to that month's default week
  }

  const handleThisWeek = () => {
    setSelectedMonthKey(monthOptions[0].key)
    setSelectedWeekIso(null)
  }

  const effectiveWeekStart = useMemo(() => startOfConfiguredWeek(weekAnchor, settings?.working_days), [weekAnchor, settings])

  // The regular grid shows only the configured 5 standard working days.
  const weekDates = useMemo(() => {
    const out = []
    for (let i = 0; i < 5; i++) {
      const d = new Date(effectiveWeekStart)
      d.setDate(d.getDate() + i)
      out.push(isoDate(d))
    }
    return out
  }, [effectiveWeekStart])
  const weekEnd7 = useMemo(() => {
    const d = new Date(effectiveWeekStart)
    d.setDate(d.getDate() + 6)
    return isoDate(d)
  }, [effectiveWeekStart])
  // Overtime always covers the full 7 days from the same anchor, including weekends.
  const overtimeDates = useMemo(() => {
    const out = []
    for (let i = 0; i < 7; i++) {
      const d = new Date(effectiveWeekStart)
      d.setDate(d.getDate() + i)
      out.push(isoDate(d))
    }
    return out
  }, [effectiveWeekStart])

  // Work Plan period — weekly (same Mon-Sun anchor as the rest of this component) or monthly
  // (the whole selected month), per settings.work_plan_period_type (v1182). previousPeriodStart
  // feeds the opt-in carry-forward feature.
  const workPlanPeriodType = settings?.work_plan_period_type || 'weekly'
  const workPlanPeriodStart = workPlanPeriodType === 'monthly'
    ? isoDate(new Date((monthOptions.find((m) => m.key === selectedMonthKey) || monthOptions[0]).year, (monthOptions.find((m) => m.key === selectedMonthKey) || monthOptions[0]).month, 1))
    : isoDate(effectiveWeekStart)
  const workPlanPeriodEnd = workPlanPeriodType === 'monthly'
    ? isoDate(new Date((monthOptions.find((m) => m.key === selectedMonthKey) || monthOptions[0]).year, (monthOptions.find((m) => m.key === selectedMonthKey) || monthOptions[0]).month + 1, 0))
    : weekEnd7
  const previousWorkPlanPeriodStart = useMemo(() => {
    const start = new Date(`${workPlanPeriodStart}T00:00:00`)
    if (workPlanPeriodType === 'monthly') return isoDate(new Date(start.getFullYear(), start.getMonth() - 1, 1))
    const d = new Date(start)
    d.setDate(d.getDate() - 7)
    return isoDate(d)
  }, [workPlanPeriodStart, workPlanPeriodType])

  const [billingType, setBillingType] = useState(null)
  useEffect(() => {
    if (!projectId || projectId === 'null') return
    getProjectBillingType(projectId).then(setBillingType).catch(() => setBillingType(null))
  }, [projectId])

  useEffect(() => {
    // projectId can transiently be the literal string "null" (not JS null) before
    // usePlatformProjectId() resolves — guard it, since PostgREST 400s trying to parse
    // "null" as a UUID literal rather than treating it as an empty filter.
    if (projectId && projectId !== 'null') {
      getTasksByProject(projectId).then((r) => setTasks(r?.data || [])).catch(() => setTasks([]))
    }
    getWorkCategories().then((r) => setCategories(r.data || [])).catch(() => setCategories([]))
  }, [projectId])

  // Regular-grid entries within the visible working days, grouped by date (possibly many per
  // day). Overtime rows (is_overtime) are handled entirely by OvertimeGrid.
  const weekEntries = useMemo(
    () => (entries || []).filter((e) => !e.is_overtime && weekDates.includes((e.entry_date || '').slice(0, 10))),
    [entries, weekDates]
  )

  const rowsByDate = useMemo(() => {
    const map = {}
    for (const date of weekDates) map[date] = []
    for (const e of weekEntries) {
      const date = (e.entry_date || '').slice(0, 10)
      if (map[date]) map[date].push(e)
    }
    for (const date of weekDates) {
      map[date].sort((a, b) => String(a.created_at || a.id).localeCompare(String(b.created_at || b.id)))
    }
    return map
  }, [weekEntries, weekDates])

  // Sync drafts for every SAVED entry (adds new ones, refreshes changed ones) without touching
  // in-progress blank-row drafts — those live under a separate synthetic key.
  useEffect(() => {
    setDrafts((prev) => {
      const next = { ...prev }
      for (const date of weekDates) {
        for (const e of rowsByDate[date] || []) {
          next[e.id] = {
            categoryCode: e.work_category || '',
            activityValue: e.description || '',
            workLocation: e.work_location || 'onsite',
            startTime: e.start_time ? e.start_time.slice(0, 5) : '',
            endTime: e.end_time ? e.end_time.slice(0, 5) : '',
            hours: e.hours_worked ? String(e.hours_worked) : '',
          }
        }
      }
      return next
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rowsByDate, weekDates])

  // Entries logged before Activity became free text were linked to a task by task_id with no
  // description. Fill their draft with that task's name once the project's tasks have loaded,
  // without overwriting any draft the user has already changed.
  useEffect(() => {
    if (!tasks.length) return
    const rows = Object.values(rowsByDate).flat()
    setDrafts((prev) => {
      let changed = false
      const next = { ...prev }
      for (const [key, d] of Object.entries(prev)) {
        if (d.activityValue) continue
        const row = rows.find((e) => e.id === key)
        const name = row?.task_id ? tasks.find((t) => t.id === row.task_id)?.task_name : null
        if (name) {
          next[key] = { ...d, activityValue: name }
          changed = true
        }
      }
      return changed ? next : prev
    })
  }, [tasks, rowsByDate])

  const dayTotal = (date) => (rowsByDate[date] || []).reduce((s, e) => s + (parseFloat(e.hours_worked) || 0), 0)

  const dailyTotals = useMemo(() => {
    const totals = {}
    for (const date of weekDates) totals[date] = dayTotal(date)
    return totals
  }, [weekDates, rowsByDate])

  const weekTotalHours = useMemo(() => Object.values(dailyTotals).reduce((s, v) => s + v, 0), [dailyTotals])
  const weekTotalDays = useMemo(() => Object.values(dailyTotals).filter((v) => v > 0).length, [dailyTotals])
  const onsiteEntries = useMemo(() => weekEntries.filter((e) => e.work_location === 'onsite').length, [weekEntries])
  const offsiteEntries = useMemo(() => weekEntries.filter((e) => e.work_location === 'offsite').length, [weekEntries])

  // Reports the SELECTED week's combined (Standard + Overtime) entry count/hours up to the
  // parent page, so its header stat matches what's actually shown in the grid below it instead
  // of a lifetime total across every week the user has ever logged (the confusion this fixes).
  useEffect(() => {
    if (!onWeekStatsChange) return
    const overtimeWeekEntries = (entries || []).filter((e) => e.is_overtime && overtimeDates.includes((e.entry_date || '').slice(0, 10)))
    const overtimeHours = overtimeWeekEntries.reduce((s, e) => s + (parseFloat(e.hours_worked) || 0), 0)
    onWeekStatsChange({
      entryCount: weekEntries.length + overtimeWeekEntries.length,
      totalHours: weekTotalHours + overtimeHours,
    })
  }, [weekEntries, entries, overtimeDates, weekTotalHours, onWeekStatsChange])

  // "Submit Week" covers every draft entry (regular + overtime) across the full 7-day span, so
  // overtime logged on a non-standard-working day is still included.
  const draftEntryCount = useMemo(
    () => (entries || []).filter((e) => e.status === 'draft' && overtimeDates.includes((e.entry_date || '').slice(0, 10))).length,
    [entries, overtimeDates]
  )

  // Every day always shows at least one row (existing or blank) so the grid never drops a day
  // that happens to have zero entries yet. When a day has no entries, the single guaranteed blank
  // row is folded into the "extra rows" count so Add still adds a genuinely second row on top of
  // it, rather than being swallowed by the floor. Unlike OvertimeGrid there's no row cap — a work
  // day can reasonably hold many distinct activities.
  const rowKeysForDate = (date) => {
    const existing = rowsByDate[date] || []
    const requestedBlanks = extraRows[date] || 0
    const baselineBlanks = existing.length === 0 ? 1 : 0
    const blankCount = baselineBlanks + requestedBlanks
    return [
      ...existing.map((e) => e.id),
      ...Array.from({ length: blankCount }, (_, i) => newRowKey(date, i)),
    ]
  }

  const handleAddRow = (date) => {
    setExtraRows((prev) => ({ ...prev, [date]: (prev[date] || 0) + 1 }))
  }

  const handleCancelBlankRow = (date, rowKey) => {
    setExtraRows((prev) => ({ ...prev, [date]: Math.max(0, (prev[date] || 0) - 1) }))
    setDrafts((prev) => { const next = { ...prev }; delete next[rowKey]; return next })
  }

  const handleDeleteEntry = async (entry, rowKey) => {
    if (!canEditCell(entry)) return
    setSavingKey(rowKey)
    try {
      await deleteTimesheetEntry(entry.id)
      onChanged?.()
    } catch (e) {
      toast.error(e?.message || 'Failed to delete entry')
    } finally {
      setSavingKey(null)
    }
  }

  // `draftOverride` lets a field with no real onBlur event (the Category/Activity SelectFields)
  // save immediately on change, passing the freshly-computed draft directly rather than reading
  // back from state (which wouldn't yet reflect the just-made change due to React's batching).
  const handleBlur = async (date, rowKey, draftOverride) => {
    const existing = (rowsByDate[date] || []).find((e) => e.id === rowKey) || null
    if (!canEditCell(existing)) return
    const draft = draftOverride || drafts[rowKey] || blankDraft()
    const bothTimesSet = !!(draft.startTime && draft.endTime)
    const parsed = bothTimesSet ? computeHoursFromTimeRange(draft.startTime, draft.endTime) : parseHours(draft.hours)
    if (parsed === null) { toast.error('Enter a valid number of hours'); return }

    if (parsed === 0) {
      if (existing) await deleteTimesheetEntry(existing.id)
      return // a still-empty blank row needs no action
    }

    const activity = (draft.activityValue || '').trim()
    if (!activity || !draft.categoryCode) {
      toast.error('Enter an activity and category before logging hours')
      return
    }

    setSavingKey(rowKey)
    try {
      if (existing) {
        await updateTimesheetEntry(existing.id, {
          hours_worked: parsed,
          work_category: draft.categoryCode,
          task_id: null,
          description: activity,
          work_location: draft.workLocation || null,
          start_time: draft.startTime || null,
          end_time: draft.endTime || null,
        })
      } else {
        await createTimesheetEntry({
          project_id: projectId,
          user_id: userId,
          entry_date: date,
          hours_worked: parsed,
          work_category: draft.categoryCode,
          task_id: null,
          description: activity,
          work_location: draft.workLocation || null,
          start_time: draft.startTime || null,
          end_time: draft.endTime || null,
          status: 'draft',
        })
        // this blank slot is now a real saved entry — free up the slot and drop its temp draft
        setExtraRows((prev) => ({ ...prev, [date]: Math.max(0, (prev[date] || 0) - 1) }))
        setDrafts((prev) => { const next = { ...prev }; delete next[rowKey]; return next })
      }
      onChanged?.()
    } catch (e) {
      toast.error(e?.message || 'Failed to save entry')
    } finally {
      setSavingKey(null)
    }
  }

  const updateDraft = (rowKey, field, value) => {
    setDrafts((prev) => ({ ...prev, [rowKey]: { ...(prev[rowKey] || blankDraft()), [field]: value } }))
  }

  // Immediate-save variant for SelectField fields (Category/Activity), which have no onBlur.
  const handleSelectChange = (date, rowKey, field, value) => {
    const next = { ...(drafts[rowKey] || blankDraft()), [field]: value }
    setDrafts((prev) => ({ ...prev, [rowKey]: next }))
    handleBlur(date, rowKey, next)
  }

  // When both start and end time are set, hours is derived from the range but stays editable —
  // the user can still type a manual value afterward (unlike OvertimeGrid, times are optional
  // here and never force Hours read-only).
  const updateTimeDraft = (rowKey, field, value) => {
    setDrafts((prev) => {
      const current = prev[rowKey] || blankDraft()
      const nextRow = { ...current, [field]: value }
      if (nextRow.startTime && nextRow.endTime) {
        const hrs = computeHoursFromTimeRange(nextRow.startTime, nextRow.endTime)
        if (hrs !== null) nextRow.hours = String(hrs)
      }
      return { ...prev, [rowKey]: nextRow }
    })
  }

  const handleSubmitWeek = async () => {
    if (draftEntryCount === 0) { toast('No draft entries to submit this week', { icon: 'ℹ️' }); return }
    setSubmitting(true)
    try {
      const updated = await submitTimesheetEntriesForWeek(projectId, userId, overtimeDates[0], weekEnd7)
      toast.success(`${updated.length} entr${updated.length === 1 ? 'y' : 'ies'} submitted for approval`)
      onChanged?.()
    } catch (e) {
      toast.error(e?.message || 'Submit failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <select value={selectedMonthKey} onChange={(e) => handleMonthChange(e.target.value)}
            className="rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-1.5 text-sm text-gray-900 dark:text-slate-100 focus:border-blue-500 focus:outline-none">
            {monthOptions.map((m) => (
              <option key={m.key} value={m.key}>{m.label}</option>
            ))}
          </select>
          <select value={effectiveSelectedWeekIso || ''} onChange={(e) => setSelectedWeekIso(e.target.value)}
            className="rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-1.5 text-sm text-gray-900 dark:text-slate-100 focus:border-blue-500 focus:outline-none min-w-[160px]">
            {weeksInSelectedMonth.map((w) => (
              <option key={w.iso} value={w.iso}>{w.label}</option>
            ))}
          </select>
          <button type="button" onClick={handleThisWeek}
            className="text-xs text-blue-600 dark:text-blue-400 hover:underline ml-1">This week</button>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={handleSubmitWeek} disabled={submitting || draftEntryCount === 0}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-3 py-1.5 text-sm font-medium text-white">
            <Send className="h-4 w-4" /> {submitting ? 'Submitting…' : `Submit Week${draftEntryCount ? ` (${draftEntryCount})` : ''}`}
          </button>
        </div>
      </div>

      {/* Work Plan / Standard Time / Overtime tabs — Work Plan comes first since planning
          precedes time capture; same styling as the page-level Entries/Exceptions tabs. */}
      <div className="flex items-center gap-1 p-1 rounded-lg bg-gray-100 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 w-fit">
        <button type="button" onClick={() => setGridTab('work_plan')}
          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${gridTab === 'work_plan' ? 'bg-white text-gray-900 shadow-sm dark:bg-slate-700 dark:text-white dark:shadow-none' : 'text-gray-500 hover:text-gray-900 dark:text-slate-400 dark:hover:text-slate-200'}`}>
          Work Plan
        </button>
        <button type="button" onClick={() => setGridTab('standard')}
          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${gridTab === 'standard' ? 'bg-white text-gray-900 shadow-sm dark:bg-slate-700 dark:text-white dark:shadow-none' : 'text-gray-500 hover:text-gray-900 dark:text-slate-400 dark:hover:text-slate-200'}`}>
          Standard Time
        </button>
        <button type="button" onClick={() => setGridTab('overtime')}
          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${gridTab === 'overtime' ? 'bg-white text-gray-900 shadow-sm dark:bg-slate-700 dark:text-white dark:shadow-none' : 'text-gray-500 hover:text-gray-900 dark:text-slate-400 dark:hover:text-slate-200'}`}>
          Overtime
        </button>
      </div>

      {gridTab === 'standard' && (
      <>
      <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-slate-700">
        {/* table-fixed + colgroup: Activity is the only column with no fixed width, so it
            absorbs whatever room is left over, same approach as OvertimeGrid below. */}
        <table className="min-w-full text-sm table-fixed">
          <colgroup>
            <col className="w-[110px]" />
            <col className="w-[180px]" />
            <col />
            <col className="w-[110px]" />
            <col className="w-[90px]" />
            <col className="w-[90px]" />
            <col className="w-[90px]" />
            <col className="w-[110px]" />
          </colgroup>
          <thead className="bg-gray-50 dark:bg-slate-800 text-gray-500 dark:text-slate-400 text-xs uppercase">
            <tr>
              <th className="px-3 py-2 text-left whitespace-nowrap">Day / Date</th>
              <th className="px-3 py-2 text-left whitespace-nowrap">Category</th>
              <th className="px-3 py-2 text-left whitespace-nowrap">Activity / Task</th>
              <th className="px-3 py-2 text-left whitespace-nowrap">Location</th>
              <th className="px-3 py-2 text-left whitespace-nowrap">Start</th>
              <th className="px-3 py-2 text-left whitespace-nowrap">End</th>
              <th className="px-3 py-2 text-right whitespace-nowrap">Hours</th>
              <th className="px-3 py-2 text-left whitespace-nowrap">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-slate-800">
            {weekDates.map((date) => {
              const d = new Date(`${date}T00:00:00`)
              const rowKeys = rowKeysForDate(date)
              const total = dayTotal(date)
              const split = rowKeys.length > 1
              const existingCount = (rowsByDate[date] || []).length

              return rowKeys.map((rowKey, i) => {
                const entry = (rowsByDate[date] || []).find((e) => e.id === rowKey) || null
                const editable = canEditCell(entry)
                const draft = drafts[rowKey] || blankDraft()
                const isLastRow = i === rowKeys.length - 1
                const isBlank = isNewRowKey(rowKey)
                // The one guaranteed blank row on a day with zero saved entries isn't a real
                // added row and can't be "removed" — only a row genuinely added via +Add can be.
                const isBaselineBlank = isBlank && i === 0 && existingCount === 0
                return (
                  <tr key={rowKey} className={STATUS_ROW_CLASSES[entry?.status] || ''}>
                    {i === 0 && (
                      <td rowSpan={rowKeys.length} className="px-3 py-2 text-gray-700 dark:text-slate-300 whitespace-nowrap align-top border-r border-gray-100 dark:border-slate-800/60">
                        <div>{d.toLocaleDateString(undefined, { weekday: 'short' })} {d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</div>
                        <div className="mt-1 text-xs font-medium text-gray-500 dark:text-slate-400">
                          {split ? `${rowKeys.length} entries · ` : ''}{total > 0 ? `${total.toFixed(2)}h` : '—'}
                        </div>
                      </td>
                    )}
                    <td className="px-3 py-2">
                      <SelectField
                        value={draft.categoryCode}
                        onChange={(v) => handleSelectChange(date, rowKey, 'categoryCode', v)}
                        options={categories.map((c) => ({ value: c.code, label: c.name }))}
                        placeholder="Category…"
                        disabled={!editable || savingKey === rowKey}
                        forceSearchable
                      />
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1">
                        <div className="flex-1 min-w-0">
                          <input type="text" value={draft.activityValue}
                            onChange={(e) => updateDraft(rowKey, 'activityValue', e.target.value)}
                            onBlur={() => handleBlur(date, rowKey)}
                            disabled={!editable || savingKey === rowKey}
                            placeholder="Describe the work done…"
                            className="w-full rounded border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1 text-sm text-gray-700 dark:text-slate-300 focus:border-blue-500 focus:outline-none disabled:opacity-70 disabled:cursor-not-allowed" />
                        </div>
                        {/* Fixed-width action slot — same pattern as OvertimeGrid's Work
                            Description column. */}
                        <div className="shrink-0 w-[4.5rem] flex items-center justify-end gap-1">
                          {entry && editable && (
                            <button type="button" title="Delete this entry" onClick={() => handleDeleteEntry(entry, rowKey)}
                              disabled={savingKey === rowKey}
                              className="shrink-0 p-1 text-gray-400 hover:text-red-500 dark:text-slate-500 dark:hover:text-red-400 disabled:opacity-50">
                              <X className="h-3.5 w-3.5" />
                            </button>
                          )}
                          {isBlank && !isBaselineBlank && (
                            <button type="button" title="Remove this row" onClick={() => handleCancelBlankRow(date, rowKey)}
                              className="shrink-0 p-1 text-gray-400 hover:text-red-500 dark:text-slate-500 dark:hover:text-red-400">
                              <X className="h-3.5 w-3.5" />
                            </button>
                          )}
                          {isLastRow && (
                            <button type="button" title="Add another activity for this day" onClick={() => handleAddRow(date)}
                              className="shrink-0 inline-flex items-center gap-0.5 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 whitespace-nowrap">
                              <Plus className="h-3.5 w-3.5" /> Add
                            </button>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <select
                        value={draft.workLocation || 'onsite'}
                        disabled={!editable || savingKey === rowKey}
                        onChange={(e) => updateDraft(rowKey, 'workLocation', e.target.value)}
                        onBlur={() => handleBlur(date, rowKey)}
                        className="w-full rounded border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1 text-sm text-gray-700 dark:text-slate-300 focus:border-blue-500 focus:outline-none disabled:opacity-70 disabled:cursor-not-allowed"
                      >
                        <option value="onsite">Onsite</option>
                        <option value="offsite">Offsite</option>
                      </select>
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="time"
                        value={draft.startTime}
                        disabled={!editable || savingKey === rowKey}
                        onChange={(e) => updateTimeDraft(rowKey, 'startTime', e.target.value)}
                        onBlur={() => handleBlur(date, rowKey)}
                        className="w-full rounded border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1 text-sm text-gray-700 dark:text-slate-300 focus:border-blue-500 focus:outline-none disabled:opacity-70 disabled:cursor-not-allowed"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="time"
                        value={draft.endTime}
                        disabled={!editable || savingKey === rowKey}
                        onChange={(e) => updateTimeDraft(rowKey, 'endTime', e.target.value)}
                        onBlur={() => handleBlur(date, rowKey)}
                        className="w-full rounded border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1 text-sm text-gray-700 dark:text-slate-300 focus:border-blue-500 focus:outline-none disabled:opacity-70 disabled:cursor-not-allowed"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        value={draft.hours}
                        disabled={!editable || savingKey === rowKey}
                        onChange={(e) => updateDraft(rowKey, 'hours', e.target.value)}
                        onBlur={() => handleBlur(date, rowKey)}
                        placeholder="0"
                        title={entry?.status === 'submitted' ? 'Awaiting review' : entry?.status === 'approved' ? 'Approved' : entry?.status === 'rejected' ? 'Rejected — editable' : undefined}
                        className="w-20 rounded border border-gray-200 dark:border-slate-700 text-right text-sm py-1 px-2 focus:border-blue-500 focus:outline-none disabled:opacity-70 disabled:cursor-not-allowed text-gray-900 dark:text-slate-100 bg-white dark:bg-slate-900 float-right"
                      />
                    </td>
                    <td className="px-3 py-2">
                      {entry && (entry.status === 'approved' || entry.status === 'rejected') ? (
                        <ReviewDecisionBadge key={`${entry.id}-${entry.status}`} entryId={entry.id} status={entry.status} />
                      ) : (
                        <StatusBadge status={entry?.status} />
                      )}
                    </td>
                  </tr>
                )
              })
            })}
          </tbody>
          <tfoot className="bg-gray-50 dark:bg-slate-800 font-semibold">
            <tr>
              <td className="px-3 py-2 text-gray-700 dark:text-slate-200" colSpan={6}>Total</td>
              <td className="px-3 py-2 text-right text-blue-600 dark:text-blue-400">
                {weekTotalHours > 0 ? `${weekTotalHours.toFixed(2)}h` : '—'}
              </td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-slate-300">
        <span><strong className="text-gray-900 dark:text-white">{weekTotalHours.toFixed(1)}h</strong> total</span>
        <span><strong className="text-gray-900 dark:text-white">{weekTotalDays}</strong> days</span>
        <span className="inline-flex items-center gap-1"><Building2 className="h-3.5 w-3.5" /> <strong className="text-gray-900 dark:text-white">{onsiteEntries}</strong> onsite entries</span>
        <span className="inline-flex items-center gap-1"><Home className="h-3.5 w-3.5" /> <strong className="text-gray-900 dark:text-white">{offsiteEntries}</strong> offsite entries</span>
      </div>
      </>
      )}

      {gridTab === 'overtime' && (
      <OvertimeGrid
        projectId={projectId}
        userId={userId}
        weekDates={overtimeDates}
        entries={entries}
        settings={settings}
        onChanged={onChanged}
      />
      )}

      {gridTab === 'work_plan' && (
      <WorkPlanGrid
        projectId={projectId}
        userId={userId}
        periodType={workPlanPeriodType}
        periodStartDate={workPlanPeriodStart}
        periodEndDate={workPlanPeriodEnd}
        previousPeriodStartDate={previousWorkPlanPeriodStart}
        entries={entries}
        billingType={billingType}
        onChanged={onChanged}
      />
      )}
    </div>
  )
}
