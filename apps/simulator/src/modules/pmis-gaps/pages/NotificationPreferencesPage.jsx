/**
 * Notification Preferences — personal settings (GAP-21, v963 Phase 15, Simulator port).
 * Simulator mirror of apps/platform/src/modules/pmis-gaps/pages/NotificationPreferencesPage.jsx.
 * One page, upsert pattern: a row per event category (channel toggles + frequency), plus one
 * "General" card for quiet hours and muted (practice) projects. Always sim schema.
 */
import { useState, useEffect, useCallback, useMemo } from 'react'
import { Bell, Loader, Save, Link as LinkIcon } from 'lucide-react'
import { useSuccessModal } from '@nidus/shared/hooks/useSuccessModal'
import {
  NOTIFICATION_EVENT_CATEGORIES,
  NOTIFICATION_FREQUENCIES,
  GENERAL_SETTINGS_CATEGORY,
  getMyPreferences,
  upsertMyPreference,
  listMyProjectsForMuting,
} from '../services/notificationPreferencesService'

function defaultPrefFor(category) {
  return {
    event_category: category,
    channel_in_app: true,
    channel_email: true,
    channel_push: false,
    frequency: 'instant',
  }
}

export default function NotificationPreferencesPage({ showTemplatesLink = false, onOpenTemplates }) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(null)
  const [prefs, setPrefs] = useState({})
  const [general, setGeneral] = useState({ quiet_hours_start: '', quiet_hours_end: '', mute_project_ids: [] })
  const [projects, setProjects] = useState([])
  const { showSuccess, modal: successModal } = useSuccessModal()

  const load = useCallback(async () => {
    setLoading(true)
    const [rows, projectList] = await Promise.all([getMyPreferences(), listMyProjectsForMuting()])
    setProjects(projectList)

    const byCategory = {}
    for (const row of rows) {
      if (row.event_category === GENERAL_SETTINGS_CATEGORY) {
        setGeneral({
          quiet_hours_start: row.quiet_hours_start || '',
          quiet_hours_end: row.quiet_hours_end || '',
          mute_project_ids: row.mute_project_ids || [],
        })
        continue
      }
      byCategory[row.event_category] = row
    }
    for (const cat of NOTIFICATION_EVENT_CATEGORIES) {
      if (!byCategory[cat.value]) byCategory[cat.value] = defaultPrefFor(cat.value)
    }
    setPrefs(byCategory)
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const updateLocal = (category, patch) => {
    setPrefs((prev) => ({ ...prev, [category]: { ...prev[category], ...patch } }))
  }

  const saveRow = async (category) => {
    setSaving(category)
    const row = prefs[category]
    await upsertMyPreference({
      eventCategory: category,
      channelInApp: row.channel_in_app,
      channelEmail: row.channel_email,
      channelPush: row.channel_push,
      frequency: row.frequency,
    })
    setSaving(null)
    showSuccess({ recordId: NOTIFICATION_EVENT_CATEGORIES.find((c) => c.value === category)?.label || category, operation: 'updated', message: 'Notification preference saved.' })
  }

  const saveGeneral = async () => {
    setSaving(GENERAL_SETTINGS_CATEGORY)
    await upsertMyPreference({
      eventCategory: GENERAL_SETTINGS_CATEGORY,
      channelInApp: false,
      channelEmail: false,
      channelPush: false,
      frequency: 'off',
      quietHoursStart: general.quiet_hours_start || null,
      quietHoursEnd: general.quiet_hours_end || null,
      muteProjectIds: general.mute_project_ids,
    })
    setSaving(null)
    showSuccess({ recordId: 'General settings', operation: 'updated', message: 'Quiet hours and muted projects saved.' })
  }

  const toggleMuteProject = (projectId) => {
    setGeneral((prev) => {
      const has = prev.mute_project_ids.includes(projectId)
      return {
        ...prev,
        mute_project_ids: has ? prev.mute_project_ids.filter((id) => id !== projectId) : [...prev.mute_project_ids, projectId],
      }
    })
  }

  const rows = useMemo(() => NOTIFICATION_EVENT_CATEGORIES.map((c) => ({ ...c, pref: prefs[c.value] || defaultPrefFor(c.value) })), [prefs])

  if (loading) {
    return <div className="flex items-center justify-center min-h-[40vh] text-gray-500 dark:text-gray-400">Loading notification preferences…</div>
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Bell className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Notification Preferences</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">Choose how and when you hear about updates.</p>
          </div>
        </div>
        {showTemplatesLink && (
          <button
            type="button"
            onClick={onOpenTemplates}
            className="inline-flex items-center gap-1.5 text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            <LinkIcon className="h-3.5 w-3.5" /> Manage role-based templates
          </button>
        )}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900/40">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Category</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">In-app</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Email</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Push</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Frequency</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {rows.map(({ value, label, pref }) => (
                <tr key={value}>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{label}</td>
                  {['channel_in_app', 'channel_email', 'channel_push'].map((field) => (
                    <td key={field} className="px-4 py-3 text-center">
                      <input
                        type="checkbox"
                        checked={!!pref[field]}
                        onChange={(e) => updateLocal(value, { [field]: e.target.checked })}
                        className="h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-blue-600"
                      />
                    </td>
                  ))}
                  <td className="px-4 py-3">
                    <select
                      value={pref.frequency}
                      onChange={(e) => updateLocal(value, { frequency: e.target.value })}
                      className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    >
                      {NOTIFICATION_FREQUENCIES.map((f) => (
                        <option key={f.value} value={f.value}>{f.label}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => saveRow(value)}
                      disabled={saving === value}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white rounded disabled:opacity-50"
                    >
                      {saving === value ? <Loader className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                      Save
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5 space-y-4">
        <h2 className="text-base font-semibold text-gray-900 dark:text-white">Quiet hours & muted projects</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Quiet hours start</label>
            <input
              type="time"
              value={general.quiet_hours_start}
              onChange={(e) => setGeneral((p) => ({ ...p, quiet_hours_start: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Quiet hours end</label>
            <input
              type="time"
              value={general.quiet_hours_end}
              onChange={(e) => setGeneral((p) => ({ ...p, quiet_hours_end: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>
        </div>

        {projects.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Muted projects</label>
            <div className="flex flex-wrap gap-2">
              {projects.map((p) => (
                <label
                  key={p.id}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs border cursor-pointer ${
                    general.mute_project_ids.includes(p.id)
                      ? 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700 text-red-700 dark:text-red-300'
                      : 'bg-gray-50 dark:bg-gray-900/40 border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300'
                  }`}
                >
                  <input
                    type="checkbox"
                    className="hidden"
                    checked={general.mute_project_ids.includes(p.id)}
                    onChange={() => toggleMuteProject(p.id)}
                  />
                  {p.project_name}
                </label>
              ))}
            </div>
          </div>
        )}

        <div>
          <button
            type="button"
            onClick={saveGeneral}
            disabled={saving === GENERAL_SETTINGS_CATEGORY}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium disabled:opacity-50"
          >
            {saving === GENERAL_SETTINGS_CATEGORY ? <Loader className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save general settings
          </button>
        </div>
      </div>
      {successModal}
    </div>
  )
}
