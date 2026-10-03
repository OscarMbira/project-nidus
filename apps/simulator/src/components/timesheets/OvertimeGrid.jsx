import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { AlertTriangle, Plus, X, Building2, Home } from 'lucide-react'
import { createTimesheetEntry, updateTimesheetEntry, deleteTimesheetEntry, computeHoursFromTimeRange } from '../../services/timesheetService'
import { getOvertimeTypes } from '../../services/timesheetOvertimeTypeService'

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

const DAY_INDEX_TO_NAME = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']
const DEFAULT_WORKING_DAYS = ['mon', 'tue', 'wed', 'thu', 'fri']
const DEFAULT_STANDARD_DAILY_HOURS = 8
const WEEKEND_CODE = 'weekend'
const MAX_ROWS_PER_DAY = 3

const canEditCell = (entry) => !entry || entry.status === 'draft' || entry.status === 'rejected'
const newRowKey = (date, i) => `${date}:new:${i}`
const isNewRowKey = (key) => key.includes(':new:')

/**
 * Always-7-day overtime grid (v1173/v1174) — up to 3 rows per day (Day/Date, Type, Activity/Task,
 * Overtime Hours), so a day's overtime can be split across different work items; a per-day
 * subtotal shows once a day has more than one row. Total at the bottom. Separate from the
 * configured-working-days regular grid above it but sharing the same week navigator. Writes
 * timesheet_entries rows with is_overtime: true, task_id/work_category null — reuses the exact
 * same approve/reject/history/notification/field-lock machinery as regular entries (see
 * timesheetService.js). Soft-warns (never blocks) when a day/week exceeds the resolved
 * max_overtime_per_day/week.
 *
 * Type is a DB-backed classification (After Hours, Public Holiday, etc. — v1174). A day outside
 * the resolved working_days set (the same setting the regular grid above uses to pick its 5
 * columns) is locked to the system 'weekend' type on every row for that day — not user-selectable.
 */
export default function OvertimeGrid({ projectId, userId, weekDates, entries, settings, onChanged }) {
  const [overtimeTypes, setOvertimeTypes] = useState([])

  useEffect(() => {
    getOvertimeTypes().then((r) => setOvertimeTypes(r.data || [])).catch(() => setOvertimeTypes([]))
  }, [])

  const selectableTypes = useMemo(() => overtimeTypes.filter((t) => !t.is_system), [overtimeTypes])
  const weekendType = useMemo(() => overtimeTypes.find((t) => t.code === WEEKEND_CODE), [overtimeTypes])

  const workingDays = Array.isArray(settings?.working_days) && settings.working_days.length === 5
    ? settings.working_days
    : DEFAULT_WORKING_DAYS
  const isWorkingDay = (date) => workingDays.includes(DAY_INDEX_TO_NAME[new Date(`${date}T00:00:00`).getDay()])
  const standardDailyHours = settings?.standard_daily_hours ?? DEFAULT_STANDARD_DAILY_HOURS

  // Every saved overtime entry for the visible week, grouped by date (now possibly >1 per day).
  const rowsByDate = useMemo(() => {
    const map = {}
    for (const date of weekDates) map[date] = []
    for (const e of entries || []) {
      if (!e.is_overtime) continue
      const date = (e.entry_date || '').slice(0, 10)
      if (map[date]) map[date].push(e)
    }
    for (const date of weekDates) {
      map[date].sort((a, b) => String(a.created_at || a.id).localeCompare(String(b.created_at || b.id)))
    }
    return map
  }, [entries, weekDates])

  // Regular (non-overtime) hours already logged per date, from the same week's entries — used to
  // gate overtime capture below (a day must hit its standard hours before overtime on top of it
  // makes sense). Weekends don't carry a "standard" expectation, so they're never gated.
  const regularHoursByDate = useMemo(() => {
    const map = {}
    for (const date of weekDates) map[date] = 0
    for (const e of entries || []) {
      if (e.is_overtime) continue
      const date = (e.entry_date || '').slice(0, 10)
      if (date in map) map[date] += parseFloat(e.hours_worked) || 0
    }
    return map
  }, [entries, weekDates])

  const standardHoursMet = (date) => !isWorkingDay(date) || (regularHoursByDate[date] || 0) >= standardDailyHours

  const [extraRows, setExtraRows] = useState({}) // date -> number of additional blank (unsaved) rows requested
  const [drafts, setDrafts] = useState({}) // rowKey -> { hours, description, typeCode }
  const [savingKey, setSavingKey] = useState(null)

  // Sync drafts for every SAVED entry (adds new ones, refreshes changed ones) without touching
  // in-progress blank-row drafts — those live under a separate synthetic key.
  useEffect(() => {
    setDrafts((prev) => {
      const next = { ...prev }
      for (const date of weekDates) {
        for (const e of rowsByDate[date] || []) {
          next[e.id] = {
            hours: e.hours_worked ? String(e.hours_worked) : '',
            description: e.description || '',
            typeCode: isWorkingDay(date) ? (e.overtime_type_code || '') : WEEKEND_CODE,
            startTime: e.start_time ? e.start_time.slice(0, 5) : '',
            endTime: e.end_time ? e.end_time.slice(0, 5) : '',
            workLocation: e.work_location || 'onsite',
          }
        }
      }
      return next
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rowsByDate, weekDates, settings])

  const dailyOvertimeMax = settings?.max_overtime_per_day ?? null
  const weeklyOvertimeMax = settings?.max_overtime_per_week ?? null

  const dayTotal = (date) => (rowsByDate[date] || []).reduce((s, e) => s + (parseFloat(e.hours_worked) || 0), 0)

  const weekTotalOvertime = useMemo(
    () => weekDates.reduce((s, date) => s + dayTotal(date), 0),
    [weekDates, rowsByDate]
  )
  const weekOverMax = weeklyOvertimeMax != null && weekTotalOvertime > weeklyOvertimeMax
  const weekOvertimeDays = useMemo(
    () => weekDates.filter((date) => dayTotal(date) > 0).length,
    [weekDates, rowsByDate]
  )
  const weekOvertimeEntries = useMemo(
    () => weekDates.flatMap((date) => rowsByDate[date] || []),
    [weekDates, rowsByDate]
  )
  const onsiteOvertimeEntries = useMemo(
    () => weekOvertimeEntries.filter((e) => e.work_location === 'onsite').length,
    [weekOvertimeEntries]
  )
  const offsiteOvertimeEntries = useMemo(
    () => weekOvertimeEntries.filter((e) => e.work_location === 'offsite').length,
    [weekOvertimeEntries]
  )

  // Every day always shows at least one row (existing or blank) so the grid never drops a day
  // that happens to have zero saved overtime entries yet. When a day has no saved entries, the
  // single guaranteed blank row is folded into the "extra rows" count so Split still adds a
  // genuinely second row on top of it, rather than being swallowed by the floor.
  const rowKeysForDate = (date) => {
    const existing = rowsByDate[date] || []
    const requestedBlanks = extraRows[date] || 0
    const baselineBlanks = existing.length === 0 ? 1 : 0
    const blankCount = Math.max(0, Math.min(baselineBlanks + requestedBlanks, MAX_ROWS_PER_DAY - existing.length))
    return [
      ...existing.map((e) => e.id),
      ...Array.from({ length: blankCount }, (_, i) => newRowKey(date, i)),
    ]
  }

  const handleAddRow = (date) => {
    if (rowKeysForDate(date).length >= MAX_ROWS_PER_DAY) return
    setExtraRows((prev) => ({ ...prev, [date]: (prev[date] || 0) + 1 }))
  }

  const handleCancelBlankRow = (date, rowKey) => {
    setExtraRows((prev) => ({ ...prev, [date]: Math.max(0, (prev[date] || 0) - 1) }))
    setDrafts((prev) => { const next = { ...prev }; delete next[rowKey]; return next })
  }

  const handleBlur = async (date, rowKey) => {
    const existing = (rowsByDate[date] || []).find((e) => e.id === rowKey) || null
    if (!canEditCell(existing)) return
    if (!standardHoursMet(date)) {
      toast.error(`Log ${standardDailyHours}h of standard time for this day before capturing overtime.`)
      return
    }
    const draft = drafts[rowKey] || { hours: '', description: '', typeCode: '', startTime: '', endTime: '', workLocation: 'onsite' }
    // v1178 — hours is never typed directly; it's always derived from Start/End time. Both times
    // are required before anything saves. If only one is filled in, wait for the other rather
    // than treating it as an error or silently deleting an already-saved row.
    const bothTimesSet = !!(draft.startTime && draft.endTime)
    const bothTimesEmpty = !draft.startTime && !draft.endTime
    if (!bothTimesSet && !bothTimesEmpty) return
    const parsed = bothTimesSet ? computeHoursFromTimeRange(draft.startTime, draft.endTime) : 0
    if (parsed === null) { toast.error('Enter a valid start and end time'); return }
    const typeCode = isWorkingDay(date) ? (draft.typeCode || null) : WEEKEND_CODE

    setSavingKey(rowKey)
    try {
      if (parsed === 0) {
        if (existing) await deleteTimesheetEntry(existing.id)
        // a still-empty blank row needs no action
      } else if (existing) {
        await updateTimesheetEntry(existing.id, { hours_worked: parsed, description: draft.description || null, overtime_type_code: typeCode, start_time: draft.startTime || null, end_time: draft.endTime || null, work_location: draft.workLocation || 'onsite' })
      } else {
        await createTimesheetEntry({
          project_id: projectId,
          user_id: userId,
          entry_date: date,
          hours_worked: parsed,
          work_category: null,
          task_id: null,
          description: draft.description || null,
          overtime_type_code: typeCode,
          start_time: draft.startTime || null,
          end_time: draft.endTime || null,
          work_location: draft.workLocation || 'onsite',
          status: 'draft',
          is_overtime: true,
        })
        // this blank slot is now a real saved entry — free up the slot and drop its temp draft
        setExtraRows((prev) => ({ ...prev, [date]: Math.max(0, (prev[date] || 0) - 1) }))
        setDrafts((prev) => { const next = { ...prev }; delete next[rowKey]; return next })
      }
      onChanged?.()
    } catch (e) {
      toast.error(e?.message || 'Failed to save overtime entry')
    } finally {
      setSavingKey(null)
    }
  }

  const updateDraft = (rowKey, field, value) => {
    setDrafts((prev) => ({ ...prev, [rowKey]: { ...(prev[rowKey] || { hours: '', description: '', typeCode: '', startTime: '', endTime: '', workLocation: 'onsite' }), [field]: value } }))
  }

  // v1175 — when both start and end time are set for a row, hours is derived from the range;
  // clearing either time field returns that row's hours to being manually editable.
  const updateTimeDraft = (rowKey, field, value) => {
    setDrafts((prev) => {
      const current = prev[rowKey] || { hours: '', description: '', typeCode: '', startTime: '', endTime: '', workLocation: 'onsite' }
      const nextRow = { ...current, [field]: value }
      if (nextRow.startTime && nextRow.endTime) {
        const hrs = computeHoursFromTimeRange(nextRow.startTime, nextRow.endTime)
        if (hrs !== null) nextRow.hours = String(hrs)
      }
      return { ...prev, [rowKey]: nextRow }
    })
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-700 dark:text-slate-300">Overtime</p>
        {weekOverMax && (
          <span className="inline-flex items-center gap-1 text-xs text-amber-700 dark:text-amber-300">
            <AlertTriangle className="h-3.5 w-3.5" /> Exceeds weekly max ({weeklyOvertimeMax}h)
          </span>
        )}
      </div>
      <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-slate-700">
        {/* table-fixed + colgroup: Activity/Task is the only column with no fixed width, so
            it absorbs 100% of whatever room is left over, instead of table-auto's default
            behaviour of spreading leftover space thinly across every column (the gaps this
            replaces). */}
        <table className="min-w-full text-sm table-fixed">
          <colgroup>
            <col className="w-[110px]" />
            <col className="w-[240px]" />
            <col className="w-[135px]" />
            <col />
            <col className="w-[90px]" />
            <col className="w-[90px]" />
            <col className="w-[110px]" />
            <col className="w-[110px]" />
          </colgroup>
          <thead className="bg-gray-50 dark:bg-slate-800 text-gray-500 dark:text-slate-400 text-xs uppercase">
            <tr>
              <th className="px-3 py-2 text-left whitespace-nowrap">Day / Date</th>
              <th className="px-3 py-2 text-left whitespace-nowrap">Type</th>
              <th className="px-3 py-2 text-left whitespace-nowrap">Location</th>
              <th className="px-3 py-2 text-left whitespace-nowrap">Activity/Task</th>
              <th className="px-3 py-2 text-left whitespace-nowrap">Start</th>
              <th className="px-3 py-2 text-left whitespace-nowrap">End</th>
              <th className="px-3 py-2 text-right whitespace-nowrap">Overtime Hours</th>
              <th className="px-3 py-2 text-left whitespace-nowrap">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-slate-800">
            {weekDates.map((date) => {
              const d = new Date(`${date}T00:00:00`)
              const workingDay = isWorkingDay(date)
              const rowKeys = rowKeysForDate(date)
              const total = dayTotal(date)
              const split = rowKeys.length > 1
              const dayOverMax = dailyOvertimeMax != null && total > dailyOvertimeMax
              const canAddMore = rowKeys.length < MAX_ROWS_PER_DAY
              const dayLocked = !standardHoursMet(date)
              const existingCount = (rowsByDate[date] || []).length

              return rowKeys.map((rowKey, i) => {
                const entry = (rowsByDate[date] || []).find((e) => e.id === rowKey) || null
                const editable = canEditCell(entry) && !dayLocked
                const draft = drafts[rowKey] || { hours: '', description: '', typeCode: workingDay ? '' : WEEKEND_CODE, startTime: '', endTime: '', workLocation: 'onsite' }
                const isLastRow = i === rowKeys.length - 1
                const isBlank = isNewRowKey(rowKey)
                // The one guaranteed blank row on a day with zero saved entries (the baseline floor
                // in rowKeysForDate) isn't a real split and can't be "removed" — only a blank row
                // genuinely added via +Split can be.
                const isBaselineBlank = isBlank && i === 0 && existingCount === 0
                return (
                  <tr key={rowKey} className={STATUS_ROW_CLASSES[entry?.status] || (!workingDay ? 'bg-gray-50/60 dark:bg-slate-900/40' : '')}>
                    {i === 0 && (
                      <td rowSpan={rowKeys.length} className="px-3 py-2 text-gray-700 dark:text-slate-300 whitespace-nowrap align-top border-r border-gray-100 dark:border-slate-800/60">
                        <div>{d.toLocaleDateString(undefined, { weekday: 'short' })} {d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</div>
                        {dayLocked && (
                          <div className="mt-1 text-xs font-medium text-amber-700 dark:text-amber-300" title={`Overtime is unavailable until ${standardDailyHours}h of standard time is logged for this day.`}>
                            Needs {standardDailyHours}h standard first
                          </div>
                        )}
                        {!dayLocked && split && (
                          <div className={`mt-1 text-xs font-medium ${dayOverMax ? 'text-amber-700 dark:text-amber-300' : 'text-gray-500 dark:text-slate-400'}`}>
                            {dayOverMax && <AlertTriangle className="inline h-3 w-3 mr-1 -mt-0.5" />}
                            {rowKeys.length} entries · {total.toFixed(2)}h
                          </div>
                        )}
                      </td>
                    )}
                    <td className="px-3 py-2">
                      {workingDay ? (
                        <select
                          value={draft.typeCode}
                          disabled={!editable || savingKey === rowKey}
                          onChange={(e) => updateDraft(rowKey, 'typeCode', e.target.value)}
                          onBlur={() => handleBlur(date, rowKey)}
                          className="w-full rounded border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1 text-sm text-gray-700 dark:text-slate-300 focus:border-blue-500 focus:outline-none disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                          <option value="">Select type…</option>
                          {selectableTypes.map((t) => (
                            <option key={t.code} value={t.code}>{t.name}</option>
                          ))}
                        </select>
                      ) : (
                        <span className="inline-flex items-center rounded-full border border-gray-300 dark:border-slate-600 bg-gray-100 dark:bg-slate-800 px-2 py-1 text-xs text-gray-500 dark:text-slate-400 cursor-not-allowed" title="Non-working day — type is fixed to Weekend">
                          {weekendType?.name || 'Weekend'}
                        </span>
                      )}
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
                      <div className="flex items-center gap-1">
                        <input
                          type="text"
                          value={draft.description}
                          disabled={!editable || savingKey === rowKey}
                          onChange={(e) => updateDraft(rowKey, 'description', e.target.value)}
                          onBlur={() => handleBlur(date, rowKey)}
                          placeholder="Describe the work performed"
                          className="w-full rounded border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1 text-sm text-gray-700 dark:text-slate-300 focus:border-blue-500 focus:outline-none disabled:opacity-70 disabled:cursor-not-allowed"
                        />
                        {/* Fixed-width action slot — keeps the Activity/Task input the same width
                            on every row regardless of which buttons are present, and keeps their
                            text the same size (text-sm) as the input itself. */}
                        <div className="shrink-0 w-[4.5rem] flex items-center justify-end gap-1">
                          {isBlank && !isBaselineBlank && (
                            <button type="button" title="Remove this split" onClick={() => handleCancelBlankRow(date, rowKey)}
                              className="shrink-0 p-1 text-gray-400 hover:text-red-500 dark:text-slate-500 dark:hover:text-red-400">
                              <X className="h-3.5 w-3.5" />
                            </button>
                          )}
                          {isLastRow && canAddMore && !dayLocked && (
                            <button type="button" title="Split this day's overtime into another work item" onClick={() => handleAddRow(date)}
                              className="shrink-0 inline-flex items-center gap-0.5 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 whitespace-nowrap">
                              <Plus className="h-3.5 w-3.5" /> Split
                            </button>
                          )}
                        </div>
                      </div>
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
                        value={draft.hours !== '' ? Number(draft.hours).toFixed(2) : ''}
                        disabled
                        readOnly
                        placeholder="0.00"
                        title="Calculated from Start/End time — fill in both to set the hours"
                        className="w-20 rounded border border-gray-200 dark:border-slate-700 text-right text-sm py-1 px-2 focus:outline-none disabled:cursor-not-allowed text-gray-900 dark:text-slate-100 bg-gray-100 dark:bg-slate-800 float-right"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <StatusBadge status={entry?.status} />
                    </td>
                  </tr>
                )
              })
            })}
          </tbody>
          <tfoot className="bg-gray-50 dark:bg-slate-800 font-semibold">
            <tr>
              <td className="px-3 py-2 text-gray-700 dark:text-slate-200" colSpan={6}>Total</td>
              <td className={`px-3 py-2 text-right ${weekOverMax ? 'text-amber-700 dark:text-amber-300' : 'text-blue-600 dark:text-blue-400'}`}>
                {weekTotalOvertime > 0 ? `${weekTotalOvertime.toFixed(2)}h` : '—'}
              </td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-slate-300">
        <span><strong className="text-gray-900 dark:text-white">{weekTotalOvertime.toFixed(1)}h</strong> total</span>
        <span><strong className="text-gray-900 dark:text-white">{weekOvertimeDays}</strong> days</span>
        <span className="inline-flex items-center gap-1"><Building2 className="h-3.5 w-3.5" /> <strong className="text-gray-900 dark:text-white">{onsiteOvertimeEntries}</strong> onsite entries</span>
        <span className="inline-flex items-center gap-1"><Home className="h-3.5 w-3.5" /> <strong className="text-gray-900 dark:text-white">{offsiteOvertimeEntries}</strong> offsite entries</span>
      </div>
    </div>
  )
}
