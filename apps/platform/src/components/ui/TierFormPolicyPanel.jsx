import { useEffect, useMemo, useState } from 'react'
import {
  applyTieredSchemaFieldOverrides,
  buildFieldOverrideMap,
  mergeOverrideChain,
} from '@nidus/shared/utils/formTemplateFieldOverrides'
import {
  addFieldForOrg,
  deleteFieldAdditionForOrg,
  getFieldOverridesForOrg,
  getFormTemplate,
  getFormTemplates,
  listFieldAdditionsForOrg,
  resolveEntityPolicyChain,
  setFieldEnabledForOrg,
  setFieldRequiredForOrg,
} from '../../services/formEngineService'
import CompletedExampleManager from './CompletedExampleManager'

const FIELD_TYPES = [
  { value: 'text', label: 'Text' },
  { value: 'textarea', label: 'Textarea' },
  { value: 'date', label: 'Date' },
  { value: 'number', label: 'Number' },
  { value: 'money', label: 'Money' },
  { value: 'select', label: 'Select' },
]

const TIER_LABEL = { portfolio: 'Portfolio', programme: 'Programme', project: 'Project' }

/**
 * Shared "customise a shared form template for this tier" panel — reused at Portfolio,
 * Programme, and Project level (decision 9/12), one component built once. Mounted alongside
 * TierFieldCustomisationPanel (the `fields` domain's tiered panel) on each tier's own detail
 * page, e.g. the existing "Field Templates" tab — no new sidebar entry needed.
 *
 * Resolves the ancestor chain via resolveEntityPolicyChain, fetches each ancestor's own
 * override/addition layer (read-only display, via the ratchet-aware merge), and writes are
 * always scoped to THIS entity's own tier only — never an ancestor's.
 */
export default function TierFormPolicyPanel({ mode = 'platform', accountId, tier, entityType, entityId, entityName }) {
  const [templates, setTemplates] = useState([])
  const [templateId, setTemplateId] = useState('')
  const [templateCode, setTemplateCode] = useState('')
  const [schema, setSchema] = useState({ sections: [] })
  const [chain, setChain] = useState([])
  const [overridesByTier, setOverridesByTier] = useState([])
  const [additionsByTier, setAdditionsByTier] = useState([])
  const [ownOverrideMap, setOwnOverrideMap] = useState(() => new Map())
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  const [newField, setNewField] = useState({ sectionKey: '', key: '', label: '', type: 'text', required: false })

  useEffect(() => {
    getFormTemplates(null, mode).then((r) => {
      if (r.success) setTemplates(r.data)
    })
  }, [mode])

  useEffect(() => {
    if (!templateCode) return
    let cancelled = false
    setLoading(true)
    setErr(null)
    ;(async () => {
      try {
        const templateResult = await getFormTemplate(templateCode, mode)
        if (!templateResult.success) throw new Error(templateResult.message)
        if (cancelled) return
        setSchema(templateResult.data?.current_version?.schema || { sections: [] })

        const chainResult = await resolveEntityPolicyChain(entityType, entityId, mode)
        if (!chainResult.success) throw new Error(chainResult.message)
        const fullChain = [{ entityType: null, entityId: null }, ...chainResult.data]
        if (cancelled) return
        setChain(fullChain)

        const layers = await Promise.all(
          fullChain.map((node) =>
            Promise.all([
              getFieldOverridesForOrg(accountId, templateResult.data.id, mode, {
                scopeEntityType: node.entityType,
                scopeEntityId: node.entityId,
              }),
              listFieldAdditionsForOrg(accountId, templateResult.data.id, mode, {
                scopeEntityType: node.entityType,
                scopeEntityId: node.entityId,
              }),
            ]),
          ),
        )
        if (cancelled) return
        const overrideMaps = layers.map(([overrides]) => buildFieldOverrideMap(overrides.success ? overrides.data : []))
        const additions = layers.flatMap(([, add]) => (add.success ? add.data : []))
        setOverridesByTier(overrideMaps)
        setAdditionsByTier(additions)
        setOwnOverrideMap(overrideMaps[overrideMaps.length - 1] || new Map())
      } catch (e) {
        setErr(e.message || String(e))
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [templateCode, accountId, entityType, entityId, mode])

  const template = templates.find((t) => t.id === templateId)

  const ancestorMergedMap = useMemo(
    () => mergeOverrideChain(overridesByTier.slice(0, -1)),
    [overridesByTier],
  )

  const effectiveSchema = useMemo(
    () => applyTieredSchemaFieldOverrides(schema, overridesByTier, additionsByTier),
    [schema, overridesByTier, additionsByTier],
  )

  const catalogFields = useMemo(() => {
    const out = []
    for (const section of effectiveSchema.sections || []) {
      for (const field of section.fields || []) {
        out.push({
          sectionKey: section.key,
          sectionTitle: section.title || section.key,
          fieldKey: field.key,
          fieldLabel: field.label || field.key,
          isLocal: Boolean(field.is_local),
          ownerScopeEntityType: field.owner_scope_entity_type || null,
          ownerScopeEntityId: field.owner_scope_entity_id || null,
          baseRequired: Boolean(field.required),
        })
      }
    }
    return out
  }, [effectiveSchema])

  async function toggleEnabled(sectionKey, fieldKey, nextEnabled) {
    setBusy(true)
    setErr(null)
    const result = await setFieldEnabledForOrg(
      { organisationId: accountId, templateId, sectionKey, fieldKey, isEnabled: nextEnabled, scopeEntityType: entityType, scopeEntityId: entityId },
      mode,
    )
    setBusy(false)
    if (!result.success) { setErr(result.message); return }
    setOwnOverrideMap((prev) => {
      const next = new Map(prev)
      const existing = next.get(`${sectionKey}::${fieldKey}`) || { enabled: true, required: null }
      next.set(`${sectionKey}::${fieldKey}`, { ...existing, enabled: nextEnabled })
      return next
    })
    setOverridesByTier((prev) => {
      const next = [...prev]
      const last = new Map(next[next.length - 1])
      const existing = last.get(`${sectionKey}::${fieldKey}`) || { enabled: true, required: null }
      last.set(`${sectionKey}::${fieldKey}`, { ...existing, enabled: nextEnabled })
      next[next.length - 1] = last
      return next
    })
  }

  async function toggleRequired(sectionKey, fieldKey, nextRequired) {
    setBusy(true)
    setErr(null)
    const result = await setFieldRequiredForOrg(
      { organisationId: accountId, templateId, sectionKey, fieldKey, isRequired: nextRequired, scopeEntityType: entityType, scopeEntityId: entityId },
      mode,
    )
    setBusy(false)
    if (!result.success) { setErr(result.message); return }
    setOverridesByTier((prev) => {
      const next = [...prev]
      const last = new Map(next[next.length - 1])
      const existing = last.get(`${sectionKey}::${fieldKey}`) || { enabled: true, required: null }
      last.set(`${sectionKey}::${fieldKey}`, { ...existing, required: nextRequired })
      next[next.length - 1] = last
      return next
    })
  }

  async function handleAddField() {
    const key = newField.key.trim()
    const label = newField.label.trim()
    if (!newField.sectionKey || !key || !label) {
      setErr('Section, field key, and label are required.')
      return
    }
    setBusy(true)
    setErr(null)
    const result = await addFieldForOrg(
      {
        organisationId: accountId,
        templateId,
        sectionKey: newField.sectionKey,
        fieldDefinition: { key, label, type: newField.type, required: Boolean(newField.required) },
        scopeEntityType: entityType,
        scopeEntityId: entityId,
      },
      mode,
    )
    setBusy(false)
    if (!result.success) { setErr(result.message); return }
    setAdditionsByTier((prev) => [...prev, result.data])
    setNewField({ sectionKey: '', key: '', label: '', type: 'text', required: false })
  }

  async function handleDeleteField(fieldKey, sectionKey) {
    setBusy(true)
    setErr(null)
    const result = await deleteFieldAdditionForOrg(
      { organisationId: accountId, templateId, sectionKey, fieldKey, scopeEntityType: entityType, scopeEntityId: entityId },
      mode,
    )
    setBusy(false)
    if (!result.success) { setErr(result.message); return }
    setAdditionsByTier((prev) => prev.filter((a) => !(a.field_key === fieldKey && a.section_key === sectionKey && a.scope_entity_type === entityType)))
  }

  if (!accountId) return <p className="text-sm text-gray-500 dark:text-gray-400">Organisation could not be resolved.</p>

  return (
    <div className="space-y-4">
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">Form template</label>
        <select
          className="w-full max-w-md rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
          value={templateId}
          onChange={(e) => {
            const t = templates.find((x) => x.id === e.target.value)
            setTemplateId(e.target.value)
            setTemplateCode(t?.template_code || '')
          }}
        >
          <option value="">Select a form template…</option>
          {templates.map((t) => (
            <option key={t.id} value={t.id}>{t.name} ({t.template_code})</option>
          ))}
        </select>
      </div>

      {err && (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">{err}</p>
      )}

      {!templateCode ? null : loading ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">Loading…</p>
      ) : (
        <>
          <div>
            <h3 className="mb-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
              {TIER_LABEL[tier] || tier} field policy for {entityName || entityType}
            </h3>
            <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">
              Inherited from {chain.slice(0, -1).map((n) => (n.entityType ? TIER_LABEL[n.entityType] : 'Organisation')).join(' → ') || 'Organisation'}.
              A field already required upstream can't be disabled or un-required here — only tightened further.
            </p>
            <ul className="divide-y divide-gray-100 dark:divide-gray-800 rounded border border-gray-100 dark:border-gray-800">
              {catalogFields.map((item) => {
                const mapKey = `${item.sectionKey}::${item.fieldKey}`
                const ancestorEntry = ancestorMergedMap.get(mapKey)
                const ancestorRequired = ancestorEntry?.required === true
                const ownEntry = ownOverrideMap.get(mapKey)
                const ownEnabled = ownEntry?.enabled !== false
                const ownRequired = ownEntry?.required ?? null
                const effectiveRequired = ownRequired !== null ? ownRequired : (ancestorEntry?.required ?? item.baseRequired)
                const isOwnAddition = item.isLocal && item.ownerScopeEntityType === entityType && item.ownerScopeEntityId === entityId
                return (
                  <li key={mapKey} className="flex flex-wrap items-center justify-between gap-3 px-3 py-2 text-sm">
                    <div>
                      <span className="font-medium text-gray-900 dark:text-gray-100">{item.fieldLabel}</span>
                      <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                        {item.sectionTitle} · {item.fieldKey}
                        {item.isLocal && !isOwnAddition && (
                          <> · added by {item.ownerScopeEntityType ? TIER_LABEL[item.ownerScopeEntityType] : 'Organisation'}</>
                        )}
                        {isOwnAddition && <> · added by you</>}
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      <label
                        className="inline-flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400"
                        title={ancestorRequired ? 'Required upstream — cannot disable here' : undefined}
                      >
                        <input
                          type="checkbox"
                          checked={ownEnabled}
                          disabled={busy || ancestorRequired}
                          onChange={(e) => toggleEnabled(item.sectionKey, item.fieldKey, e.target.checked)}
                          className="rounded border-gray-600"
                        />
                        {ownEnabled ? 'Enabled' : 'Disabled'}
                      </label>
                      <label
                        className="inline-flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400"
                        title={ancestorRequired ? 'Already required upstream' : undefined}
                      >
                        <input
                          type="checkbox"
                          checked={effectiveRequired}
                          disabled={busy || !ownEnabled || ancestorRequired}
                          onChange={(e) => toggleRequired(item.sectionKey, item.fieldKey, e.target.checked)}
                          className="rounded border-gray-600"
                        />
                        Required
                      </label>
                      {isOwnAddition && (
                        <button
                          type="button"
                          onClick={() => handleDeleteField(item.fieldKey, item.sectionKey)}
                          disabled={busy}
                          className="text-xs text-red-500 hover:text-red-400 disabled:opacity-40"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </li>
                )
              })}
              {catalogFields.length === 0 && (
                <li className="px-3 py-6 text-center text-sm text-gray-500 dark:text-gray-400">No fields yet.</li>
              )}
            </ul>
          </div>

          <div className="rounded border border-dashed border-gray-300 dark:border-gray-700 p-3">
            <h3 className="mb-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
              Add a field just for this {tier}
            </h3>
            <div className="grid gap-3 md:grid-cols-5">
              <select
                className="rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-2 py-1.5 text-sm text-gray-900 dark:text-gray-100"
                value={newField.sectionKey}
                onChange={(e) => setNewField((prev) => ({ ...prev, sectionKey: e.target.value }))}
              >
                <option value="">Section</option>
                {(schema.sections || []).map((s) => (
                  <option key={s.key} value={s.key}>{s.title || s.key}</option>
                ))}
              </select>
              <input
                className="rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-2 py-1.5 text-sm text-gray-900 dark:text-gray-100"
                placeholder="Field key"
                value={newField.key}
                onChange={(e) => setNewField((prev) => ({ ...prev, key: e.target.value }))}
              />
              <input
                className="rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-2 py-1.5 text-sm text-gray-900 dark:text-gray-100"
                placeholder="Label"
                value={newField.label}
                onChange={(e) => setNewField((prev) => ({ ...prev, label: e.target.value }))}
              />
              <select
                className="rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-2 py-1.5 text-sm text-gray-900 dark:text-gray-100"
                value={newField.type}
                onChange={(e) => setNewField((prev) => ({ ...prev, type: e.target.value }))}
              >
                {FIELD_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
              <label className="inline-flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                <input
                  type="checkbox"
                  checked={newField.required}
                  onChange={(e) => setNewField((prev) => ({ ...prev, required: e.target.checked }))}
                />
                Required
              </label>
            </div>
            <button
              type="button"
              onClick={handleAddField}
              disabled={busy}
              className="mt-3 rounded bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-500 disabled:opacity-50"
            >
              Add field
            </button>
          </div>

          <div>
            <h3 className="mb-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
              Completed examples for this {tier}
            </h3>
            <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">
              Author a fully filled-in reference example — this {tier}'s own descendants (if any) can
              start a new form from it instead of a blank one.
            </p>
            <CompletedExampleManager
              mode={mode}
              accountId={accountId}
              templateId={templateId}
              schema={effectiveSchema}
              scopeEntityType={entityType}
              scopeEntityId={entityId}
            />
          </div>
        </>
      )}
    </div>
  )
}
