/**
 * Project Calendar — working-days settings (Simulator, v963 PMIS Core Gap Closure — Phase 4).
 * Mirrors apps/platform/src/pages/schedule/ProjectCalendarSettings.jsx against the sim schema
 * (practice_project_id), matching this folder's existing ScheduleManagementPlan.jsx pattern
 * (useSimPracticeOwner, simDb).
 */
import { useState, useEffect, useCallback } from 'react'
import { Link, useParams } from 'react-router-dom'
import { CalendarDays } from 'lucide-react'
import { useSimPracticeOwner } from '../../../hooks/useSimPracticeOwner'
import { useSuccessModal } from '@nidus/shared/hooks/useSuccessModal'
import DetailAuditTabList from '@nidus/ui/DetailAuditTabList'
import AuditDetailsPanel from '@nidus/ui/AuditDetailsPanel'
import AuditCard from '@nidus/ui/AuditCard'
import AuditField from '@nidus/ui/AuditField'
import AuditTimestampPair from '@nidus/ui/AuditTimestampPair'
import { getProjectCalendar, saveProjectCalendar } from '../../../services/projectCalendarService'

const DAYS = [
  ['monday', 'Mon'],
  ['tuesday', 'Tue'],
  ['wednesday', 'Wed'],
  ['thursday', 'Thu'],
  ['friday', 'Fri'],
  ['saturday', 'Sat'],
  ['sunday', 'Sun'],
]

export default function ProjectCalendarSettings() {
  const { projectId } = useParams()
  const { canEdit } = useSimPracticeOwner(projectId)
  const { showSuccess, modal } = useSuccessModal()
  const [activeTab, setActiveTab] = useState('details')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [calendar, setCalendar] = useState(null)
  const [form, setForm] = useState({
    monday: true, tuesday: true, wednesday: true, thursday: true, friday: true,
    saturday: false, sunday: false,
    hours_per_day: 8, timezone: '', notes: '',
  })

  const load = useCallback(async () => {
    if (!projectId) return
    setLoading(true)
    const res = await getProjectCalendar(projectId)
    if (res.success) {
      setCalendar(res.data)
      if (res.data) {
        setForm({
          monday: res.data.monday, tuesday: res.data.tuesday, wednesday: res.data.wednesday,
          thursday: res.data.thursday, friday: res.data.friday, saturday: res.data.saturday,
          sunday: res.data.sunday, hours_per_day: res.data.hours_per_day ?? 8,
          timezone: res.data.timezone || '', notes: res.data.notes || '',
        })
      }
    }
    setLoading(false)
  }, [projectId])

  useEffect(() => { load() }, [load])

  const toggleDay = (key) => setForm((f) => ({ ...f, [key]: !f[key] }))

  const handleSave = async (e) => {
    e.preventDefault()
    if (!projectId || !canEdit) return
    setSaving(true)
    const res = await saveProjectCalendar(projectId, form)
    setSaving(false)
    if (!res.success) return
    setCalendar(res.data)
    showSuccess({
      recordId: projectId,
      operation: res.operation === 'created' ? 'created' : 'updated',
      message: `Working days ${res.operation === 'created' ? 'saved' : 'updated'} successfully.`,
    })
  }

  if (!projectId) return <p className="p-6 text-gray-500 dark:text-gray-400">Missing practice project.</p>
  if (loading) return <div className="flex min-h-[40vh] items-center justify-center text-gray-500 dark:text-gray-400">Loading…</div>

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <nav className="mb-4 text-sm text-gray-500 dark:text-gray-400">
        <Link to={`/simulator/practice-projects/${projectId}`} className="hover:underline">Practice project</Link>
        <span className="mx-2">/</span>
        <span>Working Days & Holidays</span>
      </nav>

      <div className="mb-6 flex items-center gap-2">
        <CalendarDays className="h-6 w-6 text-blue-600 dark:text-blue-400" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Working Days & Holidays</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Set which weekdays are working days (unticked days are weekends / non-working). Manage public holidays separately as exceptions.
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="px-4 pt-4">
          <DetailAuditTabList activeTab={activeTab} onChange={setActiveTab} ariaLabel="Working days and holidays sections" />
        </div>

        {activeTab === 'details' ? (
          <form onSubmit={handleSave} className="p-6 space-y-5">
            <fieldset disabled={!canEdit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Working days</label>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                  Ticked = working day. Unticked = weekend or rest day (non-working).
                </p>
                <div className="flex flex-wrap gap-2">
                  {DAYS.map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => toggleDay(key)}
                      disabled={!canEdit}
                      aria-pressed={form[key]}
                      className={`px-4 py-2 rounded-lg text-sm font-medium border min-w-[4.5rem] ${
                        form[key]
                          ? 'bg-blue-600 border-blue-600 text-white'
                          : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300'
                      } disabled:opacity-60`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Hours per day</label>
                  <input
                    type="number"
                    min="1"
                    max="24"
                    step="0.5"
                    value={form.hours_per_day}
                    onChange={(e) => setForm((f) => ({ ...f, hours_per_day: e.target.value === '' ? '' : Number(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Timezone</label>
                  <input
                    type="text"
                    value={form.timezone}
                    onChange={(e) => setForm((f) => ({ ...f, timezone: e.target.value }))}
                    placeholder="e.g. Africa/Harare"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                />
              </div>
            </fieldset>

            {canEdit && (
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium disabled:opacity-50"
                >
                  {saving ? 'Saving…' : 'Save'}
                </button>
                <Link
                  to={`/simulator/practice-projects/${projectId}/schedule/calendar/exceptions`}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Public holidays & exceptions
                </Link>
              </div>
            )}
          </form>
        ) : (
          <div className="p-6">
            {!calendar ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">Audit details appear after this calendar is saved.</p>
            ) : (
              <AuditDetailsPanel description="Who created or changed this practice project's calendar configuration.">
                <AuditCard title="Identity" description="How this calendar is labelled and tracked.">
                  <AuditField label="Hours per day" value={calendar.hours_per_day} />
                  <AuditField label="Timezone" value={calendar.timezone || '—'} />
                </AuditCard>
                <AuditCard title="Classification" description="Working-days pattern.">
                  <AuditField
                    label="Working days"
                    value={DAYS.filter(([key]) => calendar[key]).map(([, label]) => label).join(', ') || '—'}
                  />
                </AuditCard>
                <AuditCard title="Record history" description="When this calendar was created and last changed.">
                  <AuditTimestampPair dateLabel="Created at" value={calendar.created_at} />
                  <AuditTimestampPair dateLabel="Last updated" value={calendar.updated_at} />
                </AuditCard>
              </AuditDetailsPanel>
            )}
          </div>
        )}
      </div>
      {modal}
    </div>
  )
}
