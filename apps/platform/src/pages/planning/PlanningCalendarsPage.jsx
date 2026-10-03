/**
 * Planning > Calendars (taxonomy §3, Planning > Calendars: Project Calendar, Working Days,
 * Holidays, Exceptions). Reuses the existing project_calendars / project_calendar_exceptions
 * tables (projectCalendarService.js) — flat, usePlatformProjectId()-based route for sidebar
 * access from /pm/* (the existing project-path-scoped calendar pages stay as-is elsewhere).
 */
import { useState, useEffect, useCallback, useMemo } from 'react'
import { CalendarDays, Plus } from 'lucide-react'
import toast from 'react-hot-toast'
import { platformDb } from '@nidus/supabase'
import { usePlatformProjectId } from '@nidus/shared/hooks/usePlatformProjectId.js'
import { useSuccessModal } from '@nidus/shared/hooks/useSuccessModal'
import {
  getProjectCalendar,
  saveProjectCalendar,
  listCalendarExceptions,
  createCalendarException,
  deleteCalendarException,
} from '../../services/projectCalendarService'

const DAYS = [
  ['monday', 'Mon'], ['tuesday', 'Tue'], ['wednesday', 'Wed'], ['thursday', 'Thu'],
  ['friday', 'Fri'], ['saturday', 'Sat'], ['sunday', 'Sun'],
]

const EMPTY_CALENDAR = { monday: true, tuesday: true, wednesday: true, thursday: true, friday: true, saturday: false, sunday: false, hours_per_day: 8, timezone: '', notes: '' }
const EMPTY_EXCEPTION = { exception_date: '', exception_type: 'holiday', is_working_day: false, description: '' }

export default function PlanningCalendarsPage() {
  const { projectId } = usePlatformProjectId()
  const { showSuccess, modal } = useSuccessModal()
  const [tab, setTab] = useState('working-days')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uid, setUid] = useState(null)
  const [form, setForm] = useState(EMPTY_CALENDAR)
  const [exceptions, setExceptions] = useState([])
  const [exceptionFormOpen, setExceptionFormOpen] = useState(false)
  const [exceptionForm, setExceptionForm] = useState(EMPTY_EXCEPTION)

  const load = useCallback(async () => {
    if (!projectId) { setLoading(false); return }
    setLoading(true)
    try {
      const [cal, exc, { data: { user } }] = await Promise.all([
        getProjectCalendar(projectId),
        listCalendarExceptions(projectId),
        platformDb.auth.getUser(),
      ])
      if (cal) setForm({ ...EMPTY_CALENDAR, ...cal })
      setExceptions(exc)
      if (user) {
        const { data: u } = await platformDb.from('users').select('id').eq('auth_user_id', user.id).maybeSingle()
        setUid(u?.id || null)
      }
    } catch (e) {
      toast.error(e?.message || 'Failed to load calendar')
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => { load() }, [load])

  const holidays = useMemo(() => exceptions.filter((e) => e.exception_type === 'holiday'), [exceptions])
  const otherExceptions = useMemo(() => exceptions.filter((e) => e.exception_type === 'other'), [exceptions])

  const handleSaveCalendar = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await saveProjectCalendar(projectId, form, uid)
      showSuccess({ recordId: projectId, operation: 'updated', message: 'Working days saved.' })
    } catch (e2) {
      toast.error(e2?.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const handleAddException = async (e) => {
    e.preventDefault()
    if (!exceptionForm.exception_date) { toast.error('Date is required'); return }
    setSaving(true)
    try {
      await createCalendarException(projectId, exceptionForm, uid)
      showSuccess({ recordId: exceptionForm.exception_date, operation: 'created', message: 'Calendar exception added.' })
      setExceptionFormOpen(false)
      setExceptionForm(EMPTY_EXCEPTION)
      await load()
    } catch (e2) {
      toast.error(e2?.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteException = async (exc) => {
    if (!window.confirm(`Remove ${exc.exception_date} from the calendar?`)) return
    try {
      await deleteCalendarException(exc.id, uid)
      setExceptions((prev) => prev.filter((x) => x.id !== exc.id))
      toast.success('Exception removed')
    } catch (e) {
      toast.error(e?.message || 'Remove failed')
    }
  }

  const ExceptionTable = ({ rows, type }) => (
    <div className="space-y-3">
      <div className="flex justify-end">
        <button type="button" onClick={() => { setExceptionForm({ ...EMPTY_EXCEPTION, exception_type: type }); setExceptionFormOpen(true) }}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium">
          <Plus className="h-4 w-4" /> Add {type === 'holiday' ? 'holiday' : 'exception'}
        </button>
      </div>
      {rows.length === 0 ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400 rounded-xl border border-gray-200 dark:border-gray-800">
          <p>No {type === 'holiday' ? 'holidays' : 'exceptions'} recorded yet.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-100 dark:bg-gray-800">
              <tr>
                <th className="px-4 py-2 text-left">Date</th>
                <th className="px-4 py-2 text-left">Working day?</th>
                <th className="px-4 py-2 text-left">Description</th>
                <th className="px-4 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="px-4 py-2">{new Date(r.exception_date).toLocaleDateString()}</td>
                  <td className="px-4 py-2">{r.is_working_day ? 'Yes' : 'No'}</td>
                  <td className="px-4 py-2 text-gray-600 dark:text-gray-400">{r.description || '—'}</td>
                  <td className="px-4 py-2 text-right">
                    <button type="button" onClick={() => handleDeleteException(r)} className="text-red-600 dark:text-red-400 text-xs hover:underline">Remove</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 p-4 md:p-6">
      <div className="max-w-4xl mx-auto space-y-4">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-blue-600 dark:text-blue-400" /> Calendars
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Project working days, holidays, and other calendar exceptions</p>
        </div>

        <div className="flex flex-wrap gap-1 p-1 rounded-lg bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 w-fit">
          {[
            { key: 'working-days', label: 'Working Days' },
            { key: 'holidays', label: `Holidays${holidays.length ? ` (${holidays.length})` : ''}` },
            { key: 'exceptions', label: `Exceptions${otherExceptions.length ? ` (${otherExceptions.length})` : ''}` },
          ].map((t) => (
            <button key={t.key} type="button" onClick={() => setTab(t.key)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === t.key ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {exceptionFormOpen && (
          <form onSubmit={handleAddException} className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
            <input type="date" value={exceptionForm.exception_date} onChange={(e) => setExceptionForm({ ...exceptionForm, exception_date: e.target.value })}
              className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-950 px-3 py-2 text-sm" />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={exceptionForm.is_working_day} onChange={(e) => setExceptionForm({ ...exceptionForm, is_working_day: e.target.checked })} />
              Working day (despite exception)
            </label>
            <textarea placeholder="Description" value={exceptionForm.description} onChange={(e) => setExceptionForm({ ...exceptionForm, description: e.target.value })}
              className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-950 px-3 py-2 text-sm md:col-span-2" rows={2} />
            <div className="md:col-span-2 flex justify-end gap-2">
              <button type="button" onClick={() => setExceptionFormOpen(false)} className="px-4 py-2 rounded-lg text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800">Cancel</button>
              <button type="submit" disabled={saving} className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium disabled:opacity-50">Add</button>
            </div>
          </form>
        )}

        {loading ? (
          <p className="text-gray-500 dark:text-gray-400">Loading…</p>
        ) : tab === 'working-days' ? (
          <form onSubmit={handleSaveCalendar} className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {DAYS.map(([key, label]) => (
                <label key={key} className="flex items-center gap-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2">
                  <input type="checkbox" checked={!!form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.checked })} />
                  {label}
                </label>
              ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Hours per day</label>
                <input type="number" step="0.5" value={form.hours_per_day} onChange={(e) => setForm({ ...form, hours_per_day: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-950 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Timezone</label>
                <input type="text" value={form.timezone || ''} onChange={(e) => setForm({ ...form, timezone: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-950 px-3 py-2 text-sm" />
              </div>
            </div>
            <div className="flex justify-end">
              <button type="submit" disabled={saving} className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium disabled:opacity-50">Save</button>
            </div>
          </form>
        ) : tab === 'holidays' ? (
          <ExceptionTable rows={holidays} type="holiday" />
        ) : (
          <ExceptionTable rows={otherExceptions} type="other" />
        )}
      </div>
      {modal}
    </div>
  )
}
