/**
 * v1272 Phase 2 — ColumnMappingStep (PRD D26, stories 32–34): shown in a bulk-upload flow when the
 * file's columns don't line up with the template. Each source column gets a "maps to" choice, with
 * sample values, an AI confidence level and value conversions for fields with fixed values.
 * The person confirms or changes every mapping; then the flow's own validation and confirmation
 * steps run unchanged on the re-keyed rows. Confirmed mappings can be saved per organisation and are
 * offered automatically the next time the same columns appear.
 *
 * Props: target (template key, e.g. 'project_contacts'), templateLabel, columns (the template's rule 71
 * dictionary/column list), headers, rows, onConfirm({ rows, mapping, conversions }), onCancel.
 */
import { useEffect, useMemo, useState } from 'react'
import { Bot, Loader2, TriangleAlert } from 'lucide-react'
import { platformDb } from '@nidus/supabase'
import { useAppConfig } from '@nidus/shared/context/AppConfigContext'
import { getAiStatus, getAiUser } from '@nidus/shared/services/askNidusService'
import { findSavedMapping, markMappingUsed, saveMapping, suggestMapping } from '@nidus/shared/services/importMappingService'
import {
  applyMapping,
  autoMatch,
  dictionaryFromColumns,
  missingRequired,
  needsMapping,
  sampleValues,
  unconvertedValues,
} from '@nidus/shared/utils/importMapping'

const CONF_STYLE = {
  high: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200',
  medium: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200',
  low: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200',
  name: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200',
  saved: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200',
}
const CONF_LABEL = { high: 'High', medium: 'Medium', low: 'Low', name: 'Name match', saved: 'Saved' }
const selectCls = 'w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100'

export { needsMapping }

export default function ColumnMappingStep({ target, templateLabel, columns, headers, rows, onConfirm, onCancel }) {
  const { app, db } = useAppConfig()
  const dictionary = useMemo(() => dictionaryFromColumns(columns), [columns])
  const byKey = useMemo(() => Object.fromEntries(dictionary.map((d) => [d.key, d])), [dictionary])
  const [mapping, setMapping] = useState(() => autoMatch(headers, dictionary))
  const [confidence, setConfidence] = useState(() => Object.fromEntries(Object.entries(autoMatch(headers, dictionary)).map(([h, k]) => [h, k ? 'name' : null])))
  const [conversions, setConversions] = useState({})
  const [notes, setNotes] = useState({})
  const [status, setStatus] = useState(null) // ai_org_status
  const [saved, setSaved] = useState(null)
  const [save, setSave] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const applySuggestion = (result) => {
    const next = { ...autoMatch(headers, dictionary) }
    const conf = {}
    const conv = {}
    const nts = {}
    for (const c of result?.columns || []) {
      if (!(c.source in next)) continue
      next[c.source] = c.target || null
      conf[c.source] = c.target ? c.confidence : null
      if (c.target && Object.keys(c.conversions || {}).length) conv[c.target] = { ...(conv[c.target] || {}), ...c.conversions }
      if (c.note) nts[c.source] = c.note
    }
    setMapping(next)
    setConfidence(conf)
    setConversions(conv)
    setNotes(nts)
  }

  const runSuggest = async () => {
    setBusy(true)
    setError('')
    try {
      applySuggestion(await suggestMapping(platformDb, { app, templateLabel, dictionary, headers, rows }))
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    let alive = true
    ;(async () => {
      const s = await getAiStatus(platformDb).catch(() => null)
      if (!alive) return
      setStatus(s)
      const found = await findSavedMapping(db, { accountId: s?.account_id, target, headers })
      if (!alive) return
      if (found) {
        setSaved(found)
        const m = { ...autoMatch(headers, dictionary) }
        for (const h of headers) if (h in (found.mapping || {})) m[h] = byKey[found.mapping[h]] ? found.mapping[h] : null
        setMapping(m)
        setConfidence(Object.fromEntries(headers.map((h) => [h, m[h] ? 'saved' : null])))
        setConversions(found.conversions || {})
      } else if (s?.allowed && needsMapping(headers, dictionary)) {
        runSuggest()
      }
    })()
    return () => { alive = false }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const setTarget = (header, key) => {
    setMapping((m) => {
      const next = { ...m }
      if (key) for (const h of Object.keys(next)) if (next[h] === key) next[h] = null // each field once
      next[header] = key || null
      return next
    })
    setConfidence((c) => ({ ...c, [header]: null }))
  }
  const setConversion = (key, from, to) => setConversions((c) => {
    const field = { ...(c[key] || {}) }
    if (to) field[String(from).toLowerCase()] = to
    else delete field[String(from).toLowerCase()]
    return { ...c, [key]: field }
  })

  const missing = missingRequired(mapping, dictionary)
  const used = new Set(Object.values(mapping).filter(Boolean))

  const confirm = async () => {
    setBusy(true)
    setError('')
    try {
      if (save && status?.account_id) {
        const user = await getAiUser(platformDb).catch(() => null)
        await saveMapping(db, { accountId: status.account_id, target, headers, mapping, conversions, userId: user?.userId })
          .catch((e) => console.warn('[mapping] not saved', e.message))
      } else if (saved) {
        await markMappingUsed(db, saved).catch(() => {})
      }
      onConfirm({ rows: applyMapping(rows, mapping, conversions), mapping, conversions })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">Match your columns to the {templateLabel} template</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Your file's columns don't all match the template. Check where each column should go. Nothing is imported until you continue and confirm the preview.
          </p>
        </div>
        {status?.allowed && (
          <button type="button" onClick={runSuggest} disabled={busy}
            className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-blue-200 px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-50 disabled:opacity-50 dark:border-blue-800 dark:text-blue-300 dark:hover:bg-blue-900/30">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bot className="h-4 w-4" />} Suggest mapping
          </button>
        )}
      </div>

      {saved && <p className="rounded-md bg-blue-50 px-3 py-2 text-sm text-blue-800 dark:bg-blue-900/30 dark:text-blue-200">Using the mapping your organisation saved for this file layout.</p>}
      {status && !status.allowed && <p className="text-xs text-gray-500 dark:text-gray-400">AI suggestions are off for your organisation; match the columns yourself.</p>}
      {error && <p className="flex items-start gap-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-300"><TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />{error}</p>}

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 text-sm dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th className="px-2 py-2 text-left font-medium text-gray-600 dark:text-gray-300">#</th>
              <th className="px-2 py-2 text-left font-medium text-gray-600 dark:text-gray-300">Your column</th>
              <th className="px-2 py-2 text-left font-medium text-gray-600 dark:text-gray-300">Sample values</th>
              <th className="px-2 py-2 text-left font-medium text-gray-600 dark:text-gray-300">Goes to</th>
              <th className="px-2 py-2 text-left font-medium text-gray-600 dark:text-gray-300">Match</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {headers.map((h, i) => {
              const key = mapping[h]
              const field = key ? byKey[key] : null
              const bad = field ? unconvertedValues(rows, h, field, conversions) : []
              const conf = confidence[h]
              return (
                <tr key={h} className="align-top">
                  <td className="px-2 py-2 text-gray-500 dark:text-gray-400">{i + 1}</td>
                  <td className="px-2 py-2 font-medium text-gray-900 dark:text-gray-100">{h}</td>
                  <td className="max-w-xs px-2 py-2 text-gray-600 dark:text-gray-400">{sampleValues(rows, h).join(' · ') || '—'}</td>
                  <td className="min-w-48 px-2 py-2">
                    <select className={selectCls} value={key || ''} onChange={(e) => setTarget(h, e.target.value)} aria-label={`Template field for ${h}`}>
                      <option value="">— Don't import —</option>
                      {dictionary.map((d) => (
                        <option key={d.key} value={d.key} disabled={used.has(d.key) && d.key !== key}>{d.label}{d.required ? ' *' : ''}</option>
                      ))}
                    </select>
                    {notes[h] && <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{notes[h]}</p>}
                    {bad.length > 0 && (
                      <div className="mt-2 space-y-1 rounded-md bg-amber-50 p-2 dark:bg-amber-900/20">
                        <p className="text-xs text-amber-800 dark:text-amber-200">These values aren't allowed for {field.label}. Choose what each means:</p>
                        {bad.slice(0, 10).map((v) => (
                          <label key={v} className="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300">
                            <span className="w-24 truncate">“{v}”</span>
                            <select className={selectCls} value={conversions[key]?.[v.toLowerCase()] || ''} onChange={(e) => setConversion(key, v, e.target.value)}>
                              <option value="">Leave as is</option>
                              {field.allowed.map((a) => <option key={a} value={a}>{a}</option>)}
                            </select>
                          </label>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-2 py-2">
                    {conf && <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${CONF_STYLE[conf]}`}>{CONF_LABEL[conf]}</span>}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {missing.length > 0 && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-300">
          Required: choose a column for {missing.map((k) => byKey[k]?.label || k).join(', ')}.
        </p>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
          <input type="checkbox" checked={save} onChange={(e) => setSave(e.target.checked)} />
          Save this mapping for the next file with these columns
        </label>
        <div className="flex gap-2">
          <button type="button" onClick={onCancel} className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800">Cancel</button>
          <button type="button" onClick={confirm} disabled={busy || missing.length > 0}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">Continue to preview</button>
        </div>
      </div>
    </div>
  )
}
