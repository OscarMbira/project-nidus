/**
 * Organisation Timesheet Settings (v1173)
 * Standard daily hours, overtime maximums (soft warning only), and which 5 weekdays count as
 * the standard work week. Project Managers can override any of these per-project at
 * /platform/project-setup/timesheet-settings.
 * Route: /platform/pmo-admin/timesheet-settings
 */
import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Save } from 'lucide-react'
import toast from 'react-hot-toast'
import { useSuccessModal } from '@nidus/shared/hooks/useSuccessModal'
import { useUnsavedChangesGuard } from '@nidus/shared/context/UnsavedChangesContext'
import { getCurrentUserAccountId } from '@nidus/shared/utils/accountResolution'
import {
  TIMESHEET_SETTINGS_DEFAULTS,
  getOrganisationTimesheetSettings,
  upsertOrganisationTimesheetSettings,
  userHasPmoOrOwner,
} from '../../services/timesheetSettingsService'

const DAY_OPTIONS = [
  { value: 'sun', label: 'Sun' }, { value: 'mon', label: 'Mon' }, { value: 'tue', label: 'Tue' },
  { value: 'wed', label: 'Wed' }, { value: 'thu', label: 'Thu' }, { value: 'fri', label: 'Fri' },
  { value: 'sat', label: 'Sat' },
]

export default function TimesheetSettings() {
  const navigate = useNavigate()
  const { showSuccess, modal } = useSuccessModal()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [canManage, setCanManage] = useState(false)
  const [accountId, setAccountId] = useState(null)
  const [row, setRow] = useState(null)
  const [form, setForm] = useState({ ...TIMESHEET_SETTINGS_DEFAULTS })
  const [snapshot, setSnapshot] = useState('')
  const [error, setError] = useState(null)

  const isDirty = snapshot !== '' && JSON.stringify(form) !== snapshot
  useUnsavedChangesGuard(isDirty && canManage)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    const accId = await getCurrentUserAccountId()
    if (!accId) {
      setError('Could not resolve your organisation')
      setLoading(false)
      return
    }
    setAccountId(accId)
    const [manage, existing] = await Promise.all([
      userHasPmoOrOwner(accId),
      getOrganisationTimesheetSettings(accId),
    ])
    setCanManage(manage)
    const next = { ...TIMESHEET_SETTINGS_DEFAULTS, ...(existing || {}) }
    setRow(existing)
    setForm(next)
    setSnapshot(JSON.stringify(next))
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const toggleDay = (day) => {
    setForm((f) => {
      const has = f.working_days.includes(day)
      if (has) return { ...f, working_days: f.working_days.filter((d) => d !== day) }
      if (f.working_days.length >= 5) { toast.error('Pick exactly 5 working days'); return f }
      return { ...f, working_days: [...f.working_days, day] }
    })
  }

  const handleSave = async (e) => {
    e.preventDefault()
    if (!accountId || !canManage) return
    if (form.working_days.length !== 5) { toast.error('Pick exactly 5 working days'); return }
    setSaving(true)
    try {
      const saved = await upsertOrganisationTimesheetSettings(accountId, {
        standard_daily_hours: form.standard_daily_hours,
        max_overtime_per_day: form.max_overtime_per_day,
        max_overtime_per_week: form.max_overtime_per_week,
        working_days: form.working_days,
      })
      setRow(saved)
      const next = { ...TIMESHEET_SETTINGS_DEFAULTS, ...saved }
      setForm(next)
      setSnapshot(JSON.stringify(next))
      showSuccess({
        recordId: accountId,
        operation: row ? 'updated' : 'created',
        message: 'Organisation timesheet settings saved.',
      })
    } catch (err) {
      toast.error(err?.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300 mb-4">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Timesheet Settings</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400 mb-6">
          Organisation defaults for standard daily hours, overtime maximums, and which 5 weekdays count as the standard work week. Project Managers can override these per project.
        </p>

        {error && <p className="text-sm text-red-600 dark:text-red-400 mb-4">{error}</p>}

        {!canManage && !error && (
          <div className="mb-6 rounded-lg border border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-900/20 px-4 py-3 text-sm text-amber-700 dark:text-amber-300">
            You can view these settings, but only a PMO Admin or the account owner can change them.
          </div>
        )}

        <form onSubmit={handleSave} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 space-y-5">
          <fieldset disabled={!canManage} className="space-y-5 disabled:opacity-60">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Standard daily hours</label>
                <input type="number" step="0.5" min="0.5" max="24" value={form.standard_daily_hours}
                  onChange={(e) => setForm((f) => ({ ...f, standard_daily_hours: parseFloat(e.target.value) || 0 }))}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Max overtime / day</label>
                <input type="number" step="0.5" min="0" max="24" value={form.max_overtime_per_day}
                  onChange={(e) => setForm((f) => ({ ...f, max_overtime_per_day: parseFloat(e.target.value) || 0 }))}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Max overtime / week</label>
                <input type="number" step="0.5" min="0" max="168" value={form.max_overtime_per_week}
                  onChange={(e) => setForm((f) => ({ ...f, max_overtime_per_week: parseFloat(e.target.value) || 0 }))}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
              </div>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Overtime maximums are a soft warning only — they never block saving or submitting a timesheet.</p>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Standard working days (pick exactly 5)</label>
              <div className="flex flex-wrap gap-2">
                {DAY_OPTIONS.map((d) => {
                  const checked = form.working_days.includes(d.value)
                  return (
                    <button key={d.value} type="button" onClick={() => toggleDay(d.value)}
                      className={`px-3 py-1.5 rounded-lg border text-sm font-medium ${checked
                        ? 'border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-500 dark:bg-blue-900/30 dark:text-blue-300'
                        : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>
                      {d.label}
                    </button>
                  )
                })}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                e.g. Mon–Fri for most calendars, Sun–Thu for a different regional working week.
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button type="submit" disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50">
                <Save className="h-4 w-4" /> {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </fieldset>
        </form>
      </div>
      {modal}
    </div>
  )
}
