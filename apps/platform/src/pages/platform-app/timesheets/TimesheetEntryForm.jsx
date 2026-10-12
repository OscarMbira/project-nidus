import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Save, CheckCircle, Clock } from 'lucide-react'
import toast from 'react-hot-toast'
import { platformDb } from '@nidus/supabase'
import { getTimesheetEntry, createTimesheetEntry, updateTimesheetEntry, computeHoursFromTimeRange } from '../../../services/timesheetService'
import { getWorkCategories } from '../../../services/timesheetWorkCategoryService'
import { getOvertimeTypes } from '../../../services/timesheetOvertimeTypeService'
import { getTasksByProject } from '../../../services/taskService'
import { resolveTimesheetSettings } from '../../../services/timesheetSettingsService'
import { getCurrentUserAccountId } from '@nidus/shared/utils/accountResolution'
import DetailAuditTabList from '@nidus/ui/DetailAuditTabList'
import AuditDetailsPanel from '@nidus/ui/AuditDetailsPanel'
import AuditCard from '@nidus/ui/AuditCard'
import AuditField from '@nidus/ui/AuditField'
import AuditTimestampPair from '@nidus/ui/AuditTimestampPair'
import { humanizeAuditToken } from '@nidus/shared/utils/auditDisplayUtils'
import { looksLikeProjectUuid } from '@nidus/shared/utils/projectRouteParam'

const EMPTY = {
  entry_date: new Date().toISOString().slice(0, 10),
  hours_worked: '',
  start_time: '',
  end_time: '',
  work_category: 'general',
  activity: '',
  work_location: 'onsite',
  overtime_type_code: '',
  status: 'draft',
}

function parseHours(raw) {
  const s = String(raw || '').trim().replace(/h$/i, '')
  const n = parseFloat(s)
  return isNaN(n) ? '' : String(Math.round(n * 4) / 4)
}

const DAY_NAME_TO_INDEX = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 }
const DEFAULT_WORKING_DAYS = ['mon', 'tue', 'wed', 'thu', 'fri']

function toDateOnly(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

// Same week-boundary logic as WeeklyTimesheetGrid.jsx, so the period shown here always matches
// the grid's own week columns for the same date.
function startOfConfiguredWeek(d, workingDays) {
  const days = Array.isArray(workingDays) && workingDays.length === 5 ? workingDays : DEFAULT_WORKING_DAYS
  const startIdx = Math.min(...days.map((n) => DAY_NAME_TO_INDEX[n] ?? 1))
  const copy = toDateOnly(d)
  const diff = (copy.getDay() - startIdx + 7) % 7
  copy.setDate(copy.getDate() - diff)
  return copy
}

// Local calendar date, NOT toISOString() — that converts to UTC first, which silently shifts
// the date by one day in any positive-UTC-offset timezone.
function isoDate(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// Current month + 2 prior (3 total), matching WeeklyTimesheetGrid.jsx's retroactive window.
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

function weeksInMonth(monthOpt, workingDays) {
  const firstOfMonth = new Date(monthOpt.year, monthOpt.month, 1)
  const lastOfMonth = new Date(monthOpt.year, monthOpt.month + 1, 0)
  const seen = new Set()
  const weeks = []
  for (let d = new Date(firstOfMonth); d <= lastOfMonth; d.setDate(d.getDate() + 1)) {
    const start = startOfConfiguredWeek(d, workingDays)
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
}

export default function TimesheetEntryForm() {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const projectId = searchParams.get('projectId')
  const navigate = useNavigate()
  const isEdit = Boolean(id)

  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(isEdit)
  const [record, setRecord] = useState(null)
  const [formTab, setFormTab] = useState('details')
  const [categories, setCategories] = useState([])
  const [tasks, setTasks] = useState([])
  // Entries logged before Activity became free text were linked to a task by task_id with no
  // description; show that task's name in the text field so the user sees what it was.
  const [legacyTaskId, setLegacyTaskId] = useState(null)

  useEffect(() => {
    if (!legacyTaskId) return
    const match = tasks.find((t) => t.id === legacyTaskId)
    if (match) setForm((f) => (f.activity ? f : { ...f, activity: match.task_name }))
  }, [tasks, legacyTaskId])
  const [overtimeTypes, setOvertimeTypes] = useState([])
  const [projectLabel, setProjectLabel] = useState('')
  const [projectUuid, setProjectUuid] = useState(null)
  const [settings, setSettings] = useState(null)

  useEffect(() => {
    getCurrentUserAccountId()
      .then((accountId) => (accountId ? resolveTimesheetSettings(accountId, projectId) : null))
      .then((s) => s && setSettings(s))
      .catch(() => {})
  }, [projectId])

  // Timesheet period picker — lets the user change which week this entry falls into without
  // typing an exact date, same Month/Week dropdown pair as WeeklyTimesheetGrid.jsx's page-level
  // navigator. entry_date stays the single source of truth: picking a week sets entry_date to
  // that week's start date; picking a month snaps to the week containing today (or that month's
  // first week) so the Week dropdown's value always matches one of its own options.
  const [monthOptions] = useState(buildMonthOptions)
  const [selectedMonthKey, setSelectedMonthKey] = useState(null)

  const effectiveMonthKey = useMemo(() => {
    if (selectedMonthKey && monthOptions.some((m) => m.key === selectedMonthKey)) return selectedMonthKey
    if (form.entry_date) {
      const d = new Date(`${form.entry_date}T00:00:00`)
      const key = `${d.getFullYear()}-${d.getMonth()}`
      if (monthOptions.some((m) => m.key === key)) return key
    }
    return monthOptions[0].key
  }, [selectedMonthKey, monthOptions, form.entry_date])

  const weeksInSelectedMonth = useMemo(() => {
    const opt = monthOptions.find((m) => m.key === effectiveMonthKey) || monthOptions[0]
    return weeksInMonth(opt, settings?.working_days)
  }, [effectiveMonthKey, monthOptions, settings])

  const currentWeekIso = useMemo(() => {
    if (!form.entry_date) return ''
    return isoDate(startOfConfiguredWeek(new Date(`${form.entry_date}T00:00:00`), settings?.working_days))
  }, [form.entry_date, settings])

  const handlePeriodMonthChange = (key) => {
    setSelectedMonthKey(key)
    const opt = monthOptions.find((m) => m.key === key)
    if (!opt) return
    const weeks = weeksInMonth(opt, settings?.working_days)
    const todayIso = isoDate(toDateOnly(new Date()))
    const containingToday = weeks.find((w) => {
      const end = new Date(`${w.iso}T00:00:00`)
      end.setDate(end.getDate() + 6)
      return todayIso >= w.iso && todayIso <= isoDate(end)
    })
    const target = containingToday || weeks[0]
    if (target) setForm((f) => ({ ...f, entry_date: target.iso }))
  }

  const handlePeriodWeekChange = (iso) => {
    if (iso) setForm((f) => ({ ...f, entry_date: iso }))
  }

  const handlePeriodThisWeek = () => {
    setSelectedMonthKey(null)
    setForm((f) => ({ ...f, entry_date: isoDate(toDateOnly(new Date())) }))
  }

  useEffect(() => {
    getWorkCategories().then((r) => setCategories(r.data || []))
    if (projectId && projectId !== 'null') {
      // Read-only project context for the header — this form edits one entry already scoped to
      // its project via the URL, so (unlike the list page) there's no project switcher here,
      // just a label. projectId may be a friendly project_code or a UUID (rule 16.1).
      // tasks.project_id is a UUID column — getTasksByProject() must always be called with the
      // resolved UUID, never the friendly project_code, or PostgREST 400s on "invalid input
      // syntax for type uuid".
      const isUuid = looksLikeProjectUuid(projectId)
      const filter = isUuid ? { column: 'id' } : { column: 'project_code' }
      platformDb.from('projects').select('id, project_name, project_code').eq(filter.column, projectId).maybeSingle()
        .then(({ data }) => {
          setProjectLabel(data ? `${data.project_code} — ${data.project_name}` : '')
          const resolvedId = data?.id || (isUuid ? projectId : null)
          setProjectUuid(resolvedId)
          if (resolvedId) getTasksByProject(resolvedId).then((r) => setTasks(r?.data || [])).catch(() => setTasks([]))
        })
        .catch(() => setProjectLabel(''))
    }
    getOvertimeTypes().then((r) => setOvertimeTypes((r.data || []).filter((t) => !t.is_system))).catch(() => setOvertimeTypes([]))
  }, [projectId])

  useEffect(() => {
    if (!isEdit) return
    ;(async () => {
      setLoading(true)
      try {
        const data = await getTimesheetEntry(id)
        setRecord(data)
        setLegacyTaskId(!data.description && data.task_id ? data.task_id : null)
        setForm({
          entry_date: data.entry_date || '',
          hours_worked: String(data.hours_worked || ''),
          start_time: data.start_time ? data.start_time.slice(0, 5) : '',
          end_time: data.end_time ? data.end_time.slice(0, 5) : '',
          work_category: data.work_category || 'general',
          activity: data.description || '',
          work_location: data.work_location || 'onsite',
          overtime_type_code: data.overtime_type_code || '',
          status: data.status || 'draft',
        })
      } catch (e) {
        toast.error(e?.message || 'Failed to load entry')
      } finally {
        setLoading(false)
      }
    })()
  }, [id, isEdit])

  // v53/v1169 field lock — the submitter can't change a time entry while a PM decision is
  // pending on it. TimesheetEntryDetail.jsx already hides the Edit button for this state;
  // this re-asserts it at the form level in case the URL is reached directly.
  const isLocked = isEdit && record?.status === 'submitted'

  const handleChange = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const handleHoursBlur = () => {
    const parsed = parseHours(form.hours_worked)
    if (parsed !== '') setForm(f => ({ ...f, hours_worked: parsed }))
  }

  // v1175 — when both start and end time are set, hours is derived from the range (not typed);
  // clearing either time field returns hours to being manually editable.
  const timesAreSet = !!(form.start_time && form.end_time)

  const handleTimeChange = (e) => {
    const next = { ...form, [e.target.name]: e.target.value }
    if (next.start_time && next.end_time) {
      const hrs = computeHoursFromTimeRange(next.start_time, next.end_time)
      if (hrs !== null) next.hours_worked = String(hrs)
    }
    setForm(next)
  }

  const handleSave = async (submitAfter = false) => {
    if (isLocked) return
    if (!form.entry_date) { toast.error('Date is required'); return }
    const hrs = parseFloat(form.hours_worked)
    if (!hrs || hrs <= 0 || hrs > 24) { toast.error('Hours must be between 0 and 24'); return }
    if (!projectUuid) { toast.error('No project selected'); return }

    setSaving(true)
    try {
      const { data: { user } } = await platformDb.auth.getUser()
      const payload = {
        project_id: projectUuid,
        user_id: user?.id,
        entry_date: form.entry_date,
        hours_worked: hrs,
        start_time: form.start_time || null,
        end_time: form.end_time || null,
        work_category: form.work_category,
        task_id: null,
        description: form.activity.trim() || null,
        work_location: form.work_location || null,
        status: submitAfter ? 'submitted' : 'draft',
      }
      if (record?.is_overtime) payload.overtime_type_code = form.overtime_type_code || null

      if (isEdit) {
        await updateTimesheetEntry(id, { ...payload, status: form.status })
      } else {
        await createTimesheetEntry(payload)
      }

      setSaved(true)
      toast.success(isEdit ? 'Entry updated' : submitAfter ? 'Entry logged and submitted' : 'Entry saved as draft')
      setTimeout(() => navigate(`/platform/timesheets?projectId=${projectId}`), 1000)
    } catch (e) {
      toast.error(e?.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 text-gray-900 dark:text-slate-100 px-4 py-6">
      <div className="max-w-3xl mx-auto space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 min-h-[40px]">
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              Time Entry
            </h1>
            {projectLabel && <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">{projectLabel}</p>}
          </div>
        </div>

        {isLocked && (
          <div className="rounded-xl border border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-900/20 px-5 py-3">
            <p className="text-sm text-amber-700 dark:text-amber-300">Awaiting review — this entry can't be edited until a reviewer approves or rejects it.</p>
          </div>
        )}

        <DetailAuditTabList activeTab={formTab} onChange={setFormTab} />

        {formTab === 'audit' ? (
          <div className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800/40 p-5">
            {!record ? (
              <p className="text-sm text-gray-500 dark:text-slate-400">Audit details appear after this entry is saved.</p>
            ) : (
              <AuditDetailsPanel description="How this time entry is classified, and when it was created.">
                <AuditCard title="Identity" description="How this entry is labelled and tracked.">
                  <AuditField label="Date" value={record.entry_date} />
                  <AuditField label="Status" value={humanizeAuditToken(record.status)} />
                </AuditCard>
                <AuditCard title="Classification" description="How this entry is categorised.">
                  <AuditField label="Work category" value={humanizeAuditToken(record.work_category)} />
                  <AuditField label="Location" value={humanizeAuditToken(record.work_location)} />
                  {record.is_overtime && <AuditField label="Overtime type" value={humanizeAuditToken(record.overtime_type_code)} />}
                  <AuditField label="Hours worked" value={record.hours_worked} />
                  <AuditField label="Start time" value={record.start_time ? record.start_time.slice(0, 5) : null} />
                  <AuditField label="End time" value={record.end_time ? record.end_time.slice(0, 5) : null} />
                </AuditCard>
                <AuditCard title="Record history" description="When this entry was created and last changed.">
                  <AuditTimestampPair dateLabel="Created at" value={record.created_at} />
                  <AuditTimestampPair dateLabel="Last updated" value={record.updated_at} />
                </AuditCard>
              </AuditDetailsPanel>
            )}
          </div>
        ) : (
        <>
        {/* Timesheet period picker — sits above the form, outside the record's own fieldset, since
            it's a navigation aid (which week is this entry for) rather than a saved field. */}
        <div className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800/40 p-4 mb-4">
          <p className="text-xs text-gray-500 dark:text-slate-500 mb-1.5">Timesheet period</p>
          <div className="flex flex-wrap items-center gap-2">
            <select value={effectiveMonthKey} onChange={(e) => handlePeriodMonthChange(e.target.value)}
              disabled={isLocked}
              className="rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-2 py-1.5 text-xs text-gray-900 dark:text-slate-100 focus:border-blue-500 focus:outline-none disabled:opacity-60">
              {monthOptions.map((m) => (
                <option key={m.key} value={m.key}>{m.label}</option>
              ))}
            </select>
            <select value={currentWeekIso} onChange={(e) => handlePeriodWeekChange(e.target.value)}
              disabled={isLocked}
              className="rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-2 py-1.5 text-xs text-gray-900 dark:text-slate-100 focus:border-blue-500 focus:outline-none disabled:opacity-60">
              {!weeksInSelectedMonth.some((w) => w.iso === currentWeekIso) && currentWeekIso && (
                <option value={currentWeekIso}>
                  {(() => {
                    const start = new Date(`${currentWeekIso}T00:00:00`)
                    const end = new Date(start); end.setDate(end.getDate() + 6)
                    const fmt = (d) => d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
                    return `${fmt(start)} – ${fmt(end)}`
                  })()}
                </option>
              )}
              {weeksInSelectedMonth.map((w) => (
                <option key={w.iso} value={w.iso}>{w.label}</option>
              ))}
            </select>
            <button type="button" onClick={handlePeriodThisWeek} disabled={isLocked}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-60 disabled:no-underline">This week</button>
          </div>
        </div>
        {/* Form */}
        <fieldset disabled={isLocked} className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800/40 p-5 space-y-4 disabled:opacity-60">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Date *</label>
              <p aria-hidden="true" className="text-xs mb-1 invisible">&nbsp;</p>
              <input type="date" name="entry_date" value={form.entry_date} onChange={handleChange}
                className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2.5 text-sm text-gray-900 dark:text-slate-100 focus:border-blue-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Hours *</label>
              <p className="text-xs text-gray-500 dark:text-slate-500 mb-1">
                {timesAreSet ? 'Calculated from start/end time' : 'Enter hours (e.g. 1.5, 2h, 7.5h)'}
              </p>
              <input type="text" name="hours_worked" value={form.hours_worked} onChange={handleChange}
                onBlur={handleHoursBlur}
                readOnly={timesAreSet}
                placeholder="e.g. 7.5"
                className={`w-full rounded-lg border border-gray-300 dark:border-slate-600 px-3 py-2.5 text-sm text-gray-900 dark:text-slate-100 focus:border-blue-500 focus:outline-none ${timesAreSet ? 'bg-gray-100 dark:bg-slate-900 cursor-not-allowed' : 'bg-white dark:bg-slate-800'}`} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Start Time</label>
              <input type="time" name="start_time" value={form.start_time} onChange={handleTimeChange}
                className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2.5 text-sm text-gray-900 dark:text-slate-100 focus:border-blue-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">End Time</label>
              <input type="time" name="end_time" value={form.end_time} onChange={handleTimeChange}
                className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2.5 text-sm text-gray-900 dark:text-slate-100 focus:border-blue-500 focus:outline-none" />
              <p className="text-xs text-gray-500 dark:text-slate-500 mt-1">Earlier than start time = spans past midnight</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Work Category</label>
              <select name="work_category" value={form.work_category} onChange={handleChange}
                className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2.5 text-sm text-gray-900 dark:text-slate-100 focus:border-blue-500 focus:outline-none">
                {categories.map(c => (
                  <option key={c.code} value={c.code}>{c.name}</option>
                ))}
                {form.work_category && !categories.some(c => c.code === form.work_category) && (
                  <option value={form.work_category}>{form.work_category}</option>
                )}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Location</label>
              <select name="work_location" value={form.work_location} onChange={handleChange}
                className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2.5 text-sm text-gray-900 dark:text-slate-100 focus:border-blue-500 focus:outline-none">
                <option value="onsite">Onsite</option>
                <option value="offsite">Offsite</option>
              </select>
            </div>
          </div>

          {record?.is_overtime && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Type</label>
              <select name="overtime_type_code" value={form.overtime_type_code} onChange={handleChange}
                className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2.5 text-sm text-gray-900 dark:text-slate-100 focus:border-blue-500 focus:outline-none">
                <option value="">Select type…</option>
                {overtimeTypes.map((t) => <option key={t.code} value={t.code}>{t.name}</option>)}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Activity / Task</label>
            <input type="text" name="activity" value={form.activity}
              onChange={(e) => setForm((f) => ({ ...f, activity: e.target.value }))}
              placeholder="Describe the work done…"
              className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2.5 text-sm text-gray-900 dark:text-slate-100 focus:border-blue-500 focus:outline-none" />
          </div>

          {isEdit && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Status</label>
              <select name="status" value={form.status} onChange={handleChange}
                className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2.5 text-sm text-gray-900 dark:text-slate-100 focus:border-blue-500 focus:outline-none">
                <option value="draft">Draft</option>
                <option value="submitted">Submitted</option>
              </select>
            </div>
          )}
        </fieldset>
        </>
        )}

        {/* Action buttons */}
        {!isLocked && (
          <div className="flex flex-wrap items-center justify-end gap-3">
            {!isEdit && (
              <button type="button" onClick={() => handleSave(false)} disabled={saving}
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-60 px-4 py-2.5 text-sm text-gray-700 dark:text-slate-300">
                <Save className="h-4 w-4" />
                Save as Draft
              </button>
            )}
            <button type="button" onClick={() => handleSave(isEdit ? false : true)} disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-60 px-5 py-2.5 text-sm font-medium text-white min-h-[44px]">
              {saved ? <CheckCircle className="h-4 w-4" /> : <Save className="h-4 w-4" />}
              {saving ? 'Saving…' : isEdit ? 'Update Entry' : 'Submit for Approval'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
