/**
 * v1265 — date text for the Plan sheet in the organisation's regional format (rule 68), with
 * the weekday first like desktop plans: "Mon 08/08/2022". Platform projects can override the
 * organisation format; Simulator practice projects use the organisation's.
 * Until the settings load (or if they cannot be read) the built-in regional defaults are used.
 */
import { useCallback, useEffect, useState } from 'react'
import { getCurrentUserAccountId } from '@nidus/shared/utils/accountResolution.js'
import { loadResolvedRegionalFormatSettings } from '@nidus/shared/services/regionalFormatSettingsService'
import { formatRegionalDate } from '@nidus/shared/utils/formatRegionalSettings.js'
import { usePlanning } from '../context/PlanningContext.jsx'

/** Pure: 'YYYY-MM-DD' → "Mon 08/08/2022" with the given settings. Noon UTC avoids a time-zone day shift. */
export function formatPlanDate(iso, settings) {
  if (!iso) return ''
  const at = `${String(iso).slice(0, 10)}T12:00:00Z`
  let weekday = ''
  try {
    weekday = new Intl.DateTimeFormat(settings?.locale || 'en-GB', { weekday: 'short', timeZone: 'UTC' }).format(new Date(at))
  } catch {
    weekday = ''
  }
  const date = formatRegionalDate(at, settings ? { ...settings, time_zone: 'UTC' } : undefined)
  return weekday ? `${weekday} ${date}` : date
}

export function usePlanDateFormat(projectId) {
  const { isSim } = usePlanning()
  const [settings, setSettings] = useState(null)
  useEffect(() => {
    let cancelled = false
    getCurrentUserAccountId()
      .then((accountId) => (accountId ? loadResolvedRegionalFormatSettings(accountId, isSim ? null : projectId || null) : null))
      .then((result) => { if (!cancelled && result?.settings) setSettings(result.settings) })
      .catch(() => { /* keep the defaults */ })
    return () => { cancelled = true }
  }, [isSim, projectId])
  return useCallback((iso) => formatPlanDate(iso, settings), [settings])
}
