/**
 * Field-level contextual help — per-form scope (v1345, P11).
 *
 * Wrap a form (or view page) in <FieldHelpScope helpKeys={[...]}>: it loads that form's help in
 * one query (rule 66), resolves the user's regional settings for format tokens (rule 68), and
 * gives every FieldLabelWithHelp inside it what it needs. Shared by Platform, Simulator and
 * Planner: the app and its own database client come from AppConfigContext (v1240).
 */
import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import AppConfigContext from './AppConfigContext.jsx'
import { useRegionalFormatSettings } from '../hooks/useRegionalFormatSettings.js'
import { loadFieldHelp } from '../services/fieldHelpService.js'

const FieldHelpContext = createContext(null)

export function FieldHelpScope({ helpKeys = [], formKey = '', projectId = null, children }) {
  const appConfig = useContext(AppConfigContext)
  const settings = useRegionalFormatSettings(projectId)
  const keySignature = [...new Set(helpKeys.filter(Boolean))].sort().join('|')
  const [loaded, setLoaded] = useState({ signature: null, help: {} })

  useEffect(() => {
    let cancelled = false
    const keys = keySignature ? keySignature.split('|') : []
    loadFieldHelp(keys, { formKey })
      .then((help) => { if (!cancelled) setLoaded({ signature: `${formKey}#${keySignature}`, help }) })
      .catch(() => { if (!cancelled) setLoaded({ signature: `${formKey}#${keySignature}`, help: {} }) })
    return () => { cancelled = true }
  }, [keySignature, formKey])

  const value = useMemo(() => ({
    help: loaded.signature === `${formKey}#${keySignature}` ? loaded.help : {},
    settings,
    app: appConfig?.app || 'platform',
    eventsDb: appConfig?.db || null,
  }), [loaded, keySignature, formKey, settings, appConfig])

  return <FieldHelpContext.Provider value={value}>{children}</FieldHelpContext.Provider>
}

/**
 * The help for one key inside a FieldHelpScope, or null when there is none (no scope, still
 * loading, or no help written yet — the label then shows no affordance, D10).
 */
export function useFieldHelpEntry(helpKey) {
  const ctx = useContext(FieldHelpContext)
  if (!ctx || !helpKey) return null
  const help = ctx.help[helpKey]
  if (!help) return null
  return { help, settings: ctx.settings, app: ctx.app, eventsDb: ctx.eventsDb }
}

/** The surrounding scope (or null): regional settings, app and events client for inline help. */
export function useFieldHelpScope() {
  return useContext(FieldHelpContext)
}

export default FieldHelpContext
