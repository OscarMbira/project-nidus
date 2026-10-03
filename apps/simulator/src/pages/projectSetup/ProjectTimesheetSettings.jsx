/**
 * Project Timesheet Settings — per-field overrides (v1173)
 * Route: /platform/project-setup/timesheet-settings?projectId=…
 */
import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Save } from 'lucide-react'
import toast from 'react-hot-toast'
import { usePlatformProjectId } from '../../hooks/usePlatformProjectId'
import { useSuccessModal } from '@nidus/shared/hooks/useSuccessModal'
import { useUnsavedChangesGuard } from '@nidus/shared/context/UnsavedChangesContext'
import { getCurrentUserAccountId } from '../../utils/accountResolution'
import {
  TIMESHEET_SETTINGS_DEFAULTS,
  resolveTimesheetSettings,
  getProjectTimesheetSettings,
  upsertProjectTimesheetSettings,
  buildProjectTimesheetSettingsPayload,
  userCanManageProjectTimesheetSettings,
} from '../../services/timesheetSettingsService'

const DAY_OPTIONS = [
  { value: 'sun', label: 'Sun' }, { value: 'mon', label: 'Mon' }, { value: 'tue', label: 'Tue' },
  { value: 'wed', label: 'Wed' }, { value: 'thu', label: 'Thu' }, { value: 'fri', label: 'Fri' },
  { value: 'sat', label: 'Sat' },
]

export default function ProjectTimesheetSettings() {
  const navigate = useNavigate()
  const { projectId, routeKey, loading: projectIdLoading } = usePlatformProjectId()
  const { showSuccess, modal } = useSuccessModal()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [canManage, setCanManage] = useState(false)
  const [orgDefaults, setOrgDefaults] = useState({ ...TIMESHEET_SETTINGS_DEFAULTS })
  const [row, setRow] = useState(null)
  const [form, setForm] = useState({ ...TIMESHEET_SETTINGS_DEFAULTS })
  const [overrideFlags, setOverrideFlags] = useState({})
  const [snapshot, setSnapshot] = useState('')
  const [error, setError] = useState(null)

  const isDirty = snapshot !== '' && JSON.stringify({ form, overrideFlags }) !== snapshot
  useUnsavedChangesGuard(isDirty && canManage)

  const load = useCallback(async () => {
    if (projectIdLoading || !projectId) return
    setLoading(true)
    setError(null)
    const accountId = await getCurrentUserAccountId()
    if (!accountId) {
      setError('Could not resolve your organisation')
      setLoading(false)
      return
    }
    const [manage, resolved, existing] = await Promise.all([
      userCanManageProjectTimesheetSettings(projectId, accountId),
      resolveTimesheetSettings(accountId, projectId),
      getProjectTimesheetSettings(projectId),
    ])
    setCanManage(manage)
    setOrgDefaults({
      standard_daily_hours: resolved.overrides.standard_daily_hours ? TIMESHEET_SETTINGS_DEFAULTS.standard_daily_hours : resolved.standard_daily_hours,
      max_overtime_per_day: resolved.overrides.max_overtime_per_day ? TIMESHEET_SETTINGS_DEFAULTS.max_overtime_per_day : resolved.max_overtime_per_day,
      max_overtime_per_week: resolved.overrides.max_overtime_per_week ? TIMESHEET_SETTINGS_DEFAULTS.max_overtime_per_week : resolved.max_overtime_per_week,
      working_days: resolved.overrides.working_days ? TIMESHEET_SETTINGS_DEFAULTS.working_days : resolved.working_days,
    })
    const flags = {
      standard_daily_hours: !!resolved.overrides.standard_daily_hours,
      max_overtime_per_day: !!resolved.overrides.max_overtime_per_day,
      max_overtime_per_week: !!resolved.overrides.max_overtime_per_week,
      working_days: !!resolved.overrides.working_days,
    }
    const next = {
      standard_daily_hours: resolved.standard_daily_hours,
      max_overtime_per_day: resolved.max_overtime_per_day,
      max_overtime_per_week: resolved.max_overtime_per_week,
      working_days: resolved.working_days,
    }
    setRow(existing)
    setForm(next)
    setOverrideFlags(flags)
    setSnapshot(JSON.stringify({ form: next, overrideFlags: flags }))
    setLoading(false)
  }, [projectId, projectIdLoading])

  useEffect(() => { load() }, [load])

  const toggleOverride = (key, enabled) => {
    setOverrideFlags((f) => ({ ...f, [key]: enabled }))
    if (!enabled) setForm((f) => ({ ...f, [key]: orgDefaults[key] }))
  }

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
    if (!projectId || !canManage) return
    if (overrideFlags.working_days && form.working_days.length !== 5) { toast.error('Pick exactly 5 working days'); return }
    setSaving(true)
    try {
      const payload = buildProjectTimesheetSettingsPayload(overrideFlags, form)
      const saved = await upsertProjectTimesheetSettings(projectId, payload)
      setRow(saved)
      setSnapshot(JSON.stringify({ form, overrideFlags }))
      showSuccess({
        recordId: routeKey || projectId,
        operation: row ? 'updated' : 'created',
        message: 'Project timesheet settings saved.',
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
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Project Timesheet Settings</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400 mb-6">
          Override the organisation's standard daily hours, overtime maximums, or working days for just this project. Leave a field un-overridden to inherit the organisation default.
        </p>

        {error && <p className="text-sm text-red-600 dark:text-red-400 mb-4">{error}</p>}

        {!canManage && !error && (
          <div className="mb-6 rounded-lg border border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-900/20 px-4 py-3 text-sm text-amber-700 dark:text-amber-300">
            You can view these settings, but only this project's Project Manager or a PMO Admin can change them.
          </div>
        )}

        <form onSubmit={handleSave} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 space-y-5">
          <fieldset disabled={!canManage} className="space-y-5 disabled:opacity-60">
            {[
              { key: 'standard_daily_hours', label: 'Standard daily hours', step: '0.5', min: 0.5, max: 24 },
              { key: 'max_overtime_per_day', label: 'Max overtime / day', step: '0.5', min: 0, max: 24 },
              { key: 'max_overtime_per_week', label: 'Max overtime / week', step: '0.5', min: 0, max: 168 },
            ].map(({ key, label, step, min, max }) => (
              <div key={key} className="flex items-end gap-3">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{label}</label>
                  <input type="number" step={step} min={min} max={max}
                    value={overrideFlags[key] ? form[key] : orgDefaults[key]}
                    disabled={!overrideFlags[key]}
                    onChange={(e) => setForm((f) => ({ ...f, [key]: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-60" />
                </div>
                <label className="flex items-center gap-2 pb-2 text-sm text-gray-600 dark:text-gray-300">
                  <input type="checkbox" checked={!!overrideFlags[key]} onChange={(e) => toggleOverride(key, e.target.checked)}
                    className="w-4 h-4 text-blue-600 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500" />
                  Override
                </label>
              </div>
            ))}

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Standard working days</label>
                <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                  <input type="checkbox" checked={!!overrideFlags.working_days} onChange={(e) => toggleOverride('working_days', e.target.checked)}
                    className="w-4 h-4 text-blue-600 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500" />
                  Override
                </label>
              </div>
              <div className="flex flex-wrap gap-2">
                {DAY_OPTIONS.map((d) => {
                  const activeDays = overrideFlags.working_days ? form.working_days : orgDefaults.working_days
                  const checked = activeDays.includes(d.value)
                  return (
                    <button key={d.value} type="button" disabled={!overrideFlags.working_days} onClick={() => toggleDay(d.value)}
                      className={`px-3 py-1.5 rounded-lg border text-sm font-medium disabled:opacity-60 ${checked
                        ? 'border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-500 dark:bg-blue-900/30 dark:text-blue-300'
                        : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>
                      {d.label}
                    </button>
                  )
                })}
              </div>
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
