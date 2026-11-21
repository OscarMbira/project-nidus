/**
 * Field-level contextual help — per-form scope (v1345, P11).
 *
 * Wrap a form (or view page) in <FieldHelpScope helpKeys={[...]}>: it loads that form's help in
 * one query (rule 66), resolves the user's regional settings for format tokens (rule 68), and
 * gives every FieldLabelWithHelp inside it what it needs. Shared by Platform, Simulator and
 * Planner: the app and its own database client come from AppConfigContext (v1240).
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import AppConfigContext from './AppConfigContext.jsx'
import { useRegionalFormatSettings } from '../hooks/useRegionalFormatSettings.js'
import { loadFieldHelp } from '../services/fieldHelpService.js'

const FieldHelpContext = createContext(null)

/**
 * helpKeys is the list loaded up front (one query). A label inside the scope whose key is not in
 * that list asks for it itself (2026-11-21): the scope adds it and loads only the new keys (the
 * service caches each key for the session). A key missing from a page's list therefore still gets
 * its help instead of silently showing no icon.
 */
export function FieldHelpScope({ helpKeys = [], formKey = '', projectId = null, children }) {
  const appConfig = useContext(AppConfigContext)
  const settings = useRegionalFormatSettings(projectId)
  const [requested, setRequested] = useState([])
  const keySignature = [...new Set([...helpKeys, ...requested].filter(Boolean))].sort().join('|')
  const knownRef = useRef(new Set())
  knownRef.current = new Set(keySignature ? keySignature.split('|') : [])
  const [loaded, setLoaded] = useState({ formKey: null, help: {} })

  useEffect(() => {
    let cancelled = false
    const keys = keySignature ? keySignature.split('|') : []
    loadFieldHelp(keys, { formKey })
      .then((help) => { if (!cancelled) setLoaded({ formKey, help }) })
      .catch(() => { if (!cancelled) setLoaded((prev) => (prev.formKey === formKey ? prev : { formKey, help: {} })) })
    return () => { cancelled = true }
  }, [keySignature, formKey])

  const request = useCallback((key) => {
    if (!key || knownRef.current.has(key)) return
    knownRef.current.add(key)
    setRequested((prev) => (prev.includes(key) ? prev : [...prev, key]))
  }, [])

  const value = useMemo(() => ({
    // Keep the help already shown while newly requested keys load (no flicker).
    help: loaded.formKey === formKey ? loaded.help : {},
    settings,
    app: appConfig?.app || 'platform',
    eventsDb: appConfig?.db || null,
    request,
  }), [loaded, formKey, settings, appConfig, request])

  return <FieldHelpContext.Provider value={value}>{children}</FieldHelpContext.Provider>
}

/**
 * The help for one key inside a FieldHelpScope, or null when there is none (no scope, still
 * loading, or no help written yet — the label then shows no affordance, D10).
 * A key the scope was not told about is requested from the scope.
 */
export function useFieldHelpEntry(helpKey) {
  const ctx = useContext(FieldHelpContext)
  const request = ctx?.request
  useEffect(() => {
    if (request && helpKey) request(helpKey)
  }, [request, helpKey])
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
