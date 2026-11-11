/**
 * Resolved Regional & Format settings (rule 68) for the current user's organisation, optionally
 * with a Platform project's overrides. Returns null until loaded (or when they cannot be read);
 * the formatRegional* helpers then use the built-in regional defaults.
 * Simulator callers pass no projectId — practice projects use the organisation's settings.
 */
import { useEffect, useState } from 'react'
import { getCurrentUserAccountId } from '../utils/accountResolution.js'
import { loadResolvedRegionalFormatSettings } from '../services/regionalFormatSettingsService.js'

export function useRegionalFormatSettings(projectId = null) {
  const [settings, setSettings] = useState(null)
  useEffect(() => {
    let cancelled = false
    getCurrentUserAccountId()
      .then((accountId) => (accountId ? loadResolvedRegionalFormatSettings(accountId, projectId || null) : null))
      .then((result) => { if (!cancelled && result?.settings) setSettings(result.settings) })
      .catch(() => { /* keep the defaults */ })
    return () => { cancelled = true }
  }, [projectId])
  return settings
}
