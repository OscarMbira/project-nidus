/**
 * v1239 Slice 3 — project working calendar: which weekdays are worked, hours per day, and the
 * exception dates (holidays, or extra working days). The recalculate RPC (SQL v1245) reads the
 * same rows, so what is saved here is what the dates are worked out from.
 * Exceptions open their own routed page (rule 65).
 */
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Save } from 'lucide-react'
import { RowActionButton } from '@nidus/ui'
import { useSuccessModal } from '@nidus/shared/hooks/useSuccessModal'
import { useUnsavedChangesGuard } from '@nidus/shared/context/UnsavedChangesContext'
import PlanningTable from '../../components/PlanningTable.jsx'
import ScheduleLayout, { ChooseProject, Loading } from '../../components/ScheduleLayout.jsx'
import { useSchedule, useScheduleLinks, useScheduleProjectId } from '../../hooks/useSchedule.js'

export const WEEKDAYS = [
  ['monday', 'Mon'], ['tuesday', 'Tue'], ['wednesday', 'Wed'], ['thursday', 'Thu'],
  ['friday', 'Fri'], ['saturday', 'Sat'], ['sunday', 'Sun'],
]
const DEFAULT_WEEK = { monday: true, tuesday: true, wednesday: true, thursday: true, friday: true, saturday: false, sunday: false, hours_per_day: 8, notes: '' }

export default function ScheduleCalendarScreen() {
  const navigate = useNavigate()
  const link = useScheduleLinks()
  const { projectId, loading: projectLoading } = useScheduleProjectId()
  const schedule = useSchedule(projectId)
  const { showSuccess, modal } = useSuccessModal()
  const [week, setWeek] = useState(DEFAULT_WEEK)
  const [snapshot, setSnapshot] = useState(JSON.stringify(DEFAULT_WEEK))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    const w = { ...DEFAULT_WEEK }
    if (schedule.calendar) for (const k of Object.keys(DEFAULT_WEEK)) w[k] = schedule.calendar[k] ?? DEFAULT_WEEK[k]
    setWeek(w)
    setSnapshot(JSON.stringify(w))
  }, [schedule.calendar])

  useUnsavedChangesGuard(JSON.stringify(week) !== snapshot, 'You have unsaved calendar changes. Leave without saving?')

  const save = async () => {
    setSaving(true)
    setError(null)
    try {
      const { operation } = await schedule.data.saveCalendar(projectId, week, schedule.calendar)
      setSnapshot(JSON.stringify(week))
      showSuccess({ recordId: 'Project calendar', operation, message: 'Working week saved. Press Recalculate to move the dates.' })
      schedule.reload()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const removeException = async (e) => {
    if (!window.confirm(`Delete the exception on ${e.exception_date}?`)) return
    try {
      await schedule.data.deleteCalendarException(e.id)
      showSuccess({ recordId: e.exception_date, operation: 'deleted', message: 'Exception deleted.' })
      schedule.reload()
    } catch (err) {
      setError(err.message)
    }
  }

  const excPath = (e, edit = false) => link(`calendar/exceptions/${e.id}${edit ? '/edit' : ''}`)

  return (
    <ScheduleLayout title="Project calendar" description="Working days, hours and holidays used to work out every date." schedule={projectId ? schedule : null}>
      {!projectId ? (projectLoading ? <Loading /> : <ChooseProject />) : schedule.loading ? <Loading /> : (
        <>
          <section className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-4">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">Working week</h2>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Working days">
              {WEEKDAYS.map(([key, label]) => (
                <label key={key} className={`px-3 py-2 rounded-lg border text-sm cursor-pointer ${week[key] ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200'}`}>
                  <input type="checkbox" className="sr-only" checked={!!week[key]} onChange={(e) => setWeek({ ...week, [key]: e.target.checked })} />
                  {label}
                </label>
              ))}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <label className="text-xs text-gray-600 dark:text-gray-400">Hours per day
                <input type="number" min={1} max={24} step="0.5" value={week.hours_per_day} onChange={(e) => setWeek({ ...week, hours_per_day: e.target.value })}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
              </label>
              <label className="sm:col-span-2 text-xs text-gray-600 dark:text-gray-400">Notes
                <input value={week.notes || ''} onChange={(e) => setWeek({ ...week, notes: e.target.value })}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
              </label>
            </div>
            <div className="flex items-center gap-3">
              <button type="button" onClick={save} disabled={saving} className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm disabled:opacity-50">
                <Save className="h-4 w-4" /> {saving ? 'Saving…' : 'Save working week'}
              </button>
              {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}
            </div>
          </section>

          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">Exceptions</h2>
              <button type="button" onClick={() => navigate(link('calendar/exceptions/create'))} className="inline-flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm">
                <Plus className="h-4 w-4" /> New exception
              </button>
            </div>
            <PlanningTable
              pageId="schedule-calendar-exceptions"
              keepOrder
              columns={[
                { key: 'exception_date', label: 'Date' },
                { key: 'exception_type', label: 'Type', value: (e) => (e.exception_type === 'holiday' ? 'Holiday' : 'Other') },
                { key: 'is_working_day', label: 'Working day?', value: (e) => (e.is_working_day ? 'Yes — extra working day' : 'No — day off') },
                { key: 'description', label: 'Description' },
              ]}
              rows={schedule.exceptions}
              exportName="CalendarExceptions"
              emptyText="No holidays or exceptions yet."
              actions={(e) => (
                <>
                  <RowActionButton variant="view" label="View exception" onClick={() => navigate(excPath(e))} />
                  <RowActionButton variant="edit" label="Edit exception" onClick={() => navigate(excPath(e, true))} />
                  <RowActionButton variant="delete" label="Delete exception" onClick={() => removeException(e)} />
                </>
              )}
            />
          </section>
        </>
      )}
      {modal}
    </ScheduleLayout>
  )
}
