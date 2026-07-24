import { useEffect, useMemo, useState } from 'react'
import {
  resolveEffectiveFields,
  checkAncestorFieldLock,
} from '@nidus/shared/services/pmTemplateInheritanceService.js'
import {
  createTierFieldTemplateNode,
  getOrCreateEntityAssignment,
  upsertFieldLink,
} from '@nidus/shared/services/pmTemplateNodeService.js'
import { createInstanceLocalField } from '@nidus/shared/services/pmTemplateCreateInheritance.js'
import { canManagePmTemplateNode } from '@nidus/shared/services/pmTemplateAuthService.js'

/**
 * Shared "view inherited fields + customise for this tier" panel for
 * Portfolio / Sub-Portfolio / Programme / Project template customisation.
 * Pass platformDb or simDb as `db` so Platform and Simulator share one component.
 *
 * @param {string|null} [category] - e.g. `risk_register` for register-specific chains (v785)
 * @param {boolean|null} [canEdit] - optional override; when null, resolved via can_manage_pm_template_node
 */
export default function TierFieldCustomisationPanel({
  db,
  accountId,
  tier,
  entityType,
  entityId,
  entityName,
  userId = null,
  category = null,
  canEdit: canEditProp = null,
}) {
  const [loading, setLoading] = useState(true)
  const [result, setResult] = useState({ chain: [], fields: [], fieldMap: new Map(), startNodeId: null })
  const [availableFields, setAvailableFields] = useState([])
  const [err, setErr] = useState(null)
  const [busy, setBusy] = useState(false)
  const [localCode, setLocalCode] = useState('')
  const [localLabel, setLocalLabel] = useState('')
  const [localType, setLocalType] = useState('text')
  const [canEditResolved, setCanEditResolved] = useState(false)

  const canEdit = canEditProp === null || canEditProp === undefined ? canEditResolved : !!canEditProp

  async function load() {
    setLoading(true)
    setErr(null)
    try {
      const r = await resolveEffectiveFields(db, entityType, entityId, { accountId, category })
      setResult(r)

      const linkedIds = new Set([...(r.fieldMap?.values() || [])].map((f) => f.custom_field_definition_id))
      // Account-wide LDE only (scope_entity_id IS NULL) — instance-local defs are not in the shared catalog picker
      const { data: defs, error } = await db
        .from('custom_field_definitions')
        .select('id, field_code, label, field_type, scope_entity_id')
        .eq('account_id', accountId)
        .eq('workflow_status', 'published')
        .eq('is_deleted', false)
      if (error) throw error
      setAvailableFields(
        (defs || []).filter((d) => !d.scope_entity_id && !linkedIds.has(d.id))
      )
    } catch (e) {
      setErr(e.message || String(e))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (db && entityType && entityId) load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db, entityType, entityId, accountId, tier, category])

  useEffect(() => {
    if (canEditProp !== null && canEditProp !== undefined) return
    if (!db || !accountId || !tier) {
      setCanEditResolved(false)
      return
    }
    let cancelled = false
    canManagePmTemplateNode(db, {
      accountId,
      tier,
      scopeEntityType: entityType,
      scopeEntityId: entityId,
      isSystemSynced: false,
    }).then((ok) => {
      if (!cancelled) setCanEditResolved(ok)
    })
    return () => {
      cancelled = true
    }
  }, [db, accountId, tier, entityType, entityId, canEditProp])

  const nodesById = useMemo(() => new Map((result.chain || []).map((n) => [n.id, n])), [result.chain])
  const fields = useMemo(
    () =>
      [...(result.fieldMap?.values() || [])].sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0)),
    [result.fieldMap]
  )
  const ownNode = useMemo(
    () =>
      (result.chain || []).find((n) => {
        if (n.tier !== tier || n.scope_entity_id !== entityId) return false
        if (category) return n.category === category
        return true
      }) || null,
    [result.chain, tier, entityId, category]
  )

  async function ensureOwnNodeId() {
    if (ownNode?.id) return ownNode.id
    const node = await createTierFieldTemplateNode(db, {
      accountId,
      tier,
      scopeEntityType: entityType,
      scopeEntityId: entityId,
      name: `${entityName || entityType}${category ? ` (${category})` : ''} field customisation`,
      category,
      parentNodeId: result.startNodeId || null,
      userId,
    })
    // Generic fields assignment only when not category-scoped (avoids clobbering Risk Register vs project fields)
    if (!category) {
      await getOrCreateEntityAssignment(db, {
        accountId,
        entityType,
        entityId,
        domain: 'fields',
        nodeId: node.id,
      })
    }
    return node.id
  }

  async function overrideField(fieldId, patch) {
    if (!canEdit) {
      setErr('You do not have permission to customise fields for this entity.')
      return
    }
    setBusy(true)
    setErr(null)
    try {
      const nodeId = await ensureOwnNodeId()
      if (patch.enabled === false) {
        const lockCheck = checkAncestorFieldLock(result.chain, fieldId, nodeId, result.fieldMap)
        if (!lockCheck.ok) {
          throw new Error(lockCheck.message)
        }
      }
      await upsertFieldLink(db, { node_id: nodeId, custom_field_definition_id: fieldId, ...patch })
      await load()
    } catch (e) {
      setErr(e.message || String(e))
    } finally {
      setBusy(false)
    }
  }

  async function linkField(fieldId) {
    if (!canEdit) {
      setErr('You do not have permission to customise fields for this entity.')
      return
    }
    setBusy(true)
    setErr(null)
    try {
      const nodeId = await ensureOwnNodeId()
      await upsertFieldLink(db, {
        node_id: nodeId,
        custom_field_definition_id: fieldId,
        is_local: true,
        enabled: true,
      })
      await load()
    } catch (e) {
      setErr(e.message || String(e))
    } finally {
      setBusy(false)
    }
  }

  async function createLocalField(e) {
    e.preventDefault()
    if (!canEdit) {
      setErr('You do not have permission to customise fields for this entity.')
      return
    }
    if (!localCode.trim() || !localLabel.trim()) {
      setErr('Field code and label are required for an instance-local field.')
      return
    }
    setBusy(true)
    setErr(null)
    try {
      const nodeId = await ensureOwnNodeId()
      await createInstanceLocalField(db, {
        accountId,
        entityType,
        entityId,
        fieldCode: localCode.trim(),
        label: localLabel.trim(),
        fieldType: localType,
        nodeId,
        userId,
      })
      setLocalCode('')
      setLocalLabel('')
      setLocalType('text')
      await load()
    } catch (errCreate) {
      setErr(errCreate.message || String(errCreate))
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <div className="p-4 text-sm text-gray-500 dark:text-gray-400">Loading fields…</div>

  return (
    <div className="space-y-6">
      {err && (
        <p className="text-red-600 dark:text-red-400 text-sm" role="alert">
          {err}
        </p>
      )}

      {!canEdit && (
        <p className="text-sm text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2">
          View only — you need to administer this {entityType || 'entity'} to customise its field template.
        </p>
      )}

      <div>
        <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-2">Effective fields (inherited + local)</h2>
        <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-3 py-2 text-left text-gray-700 dark:text-gray-300">Field</th>
                <th className="px-3 py-2 text-left text-gray-700 dark:text-gray-300">Source</th>
                <th className="px-3 py-2 text-gray-700 dark:text-gray-300">Enabled</th>
                <th className="px-3 py-2 text-gray-700 dark:text-gray-300">Required</th>
                <th className="px-3 py-2 text-gray-700 dark:text-gray-300">Mandatory lock</th>
              </tr>
            </thead>
            <tbody>
              {fields.map((f) => {
                const sourceNode = nodesById.get(f.source_node_id)
                const isOwnTier = sourceNode?.id === ownNode?.id
                const lockNode = f.locked_by_node_id ? nodesById.get(f.locked_by_node_id) : null
                const lockedByAncestor =
                  f.locked === true && f.locked_by_node_id && f.locked_by_node_id !== ownNode?.id
                const stickyByAncestor =
                  f.enabled === false &&
                  f.sticky_disabled_by_node_id &&
                  f.sticky_disabled_by_node_id !== ownNode?.id
                const enableDisabled = busy || !canEdit || lockedByAncestor || stickyByAncestor
                const lockDisabled = busy || !canEdit || lockedByAncestor
                const lockLabel = lockNode?.tier
                  ? `Locked by ${lockNode.tier}`
                  : f.locked
                    ? 'Locked'
                    : null
                const stickyLabel =
                  stickyByAncestor && f.sticky_disabled_by_node_id
                    ? `Disabled by ${nodesById.get(f.sticky_disabled_by_node_id)?.tier || 'ancestor'}`
                    : null

                return (
                  <tr key={f.custom_field_definition_id} className="border-t border-gray-200 dark:border-gray-700">
                    <td className="px-3 py-2 text-gray-900 dark:text-gray-100">
                      <div>{f.label || f.custom_field_definition_id}</div>
                      {(lockLabel || stickyLabel) && (
                        <div className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
                          {lockLabel || stickyLabel}
                          {lockLabel ? ' — must always be captured' : ''}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400">
                      {isOwnTier ? 'This level' : sourceNode?.tier === 'pmo' ? 'PMO default' : sourceNode?.tier || '—'}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <input
                        type="checkbox"
                        checked={f.enabled !== false}
                        disabled={enableDisabled}
                        title={
                          lockedByAncestor
                            ? lockLabel
                            : stickyByAncestor
                              ? stickyLabel
                              : undefined
                        }
                        onChange={(e) =>
                          overrideField(f.custom_field_definition_id, { enabled: e.target.checked })
                        }
                      />
                    </td>
                    <td className="px-3 py-2 text-center">
                      <input
                        type="checkbox"
                        checked={!!f.required}
                        disabled={busy || !canEdit}
                        onChange={(e) =>
                          overrideField(f.custom_field_definition_id, {
                            required_override: e.target.checked,
                          })
                        }
                      />
                    </td>
                    <td className="px-3 py-2 text-center">
                      <input
                        type="checkbox"
                        checked={!!f.locked}
                        disabled={lockDisabled}
                        title={
                          lockedByAncestor
                            ? `${lockLabel} — unlock at that tier`
                            : 'Prevent descendant tiers from disabling this field'
                        }
                        onChange={(e) =>
                          overrideField(f.custom_field_definition_id, { locked: e.target.checked })
                        }
                      />
                    </td>
                  </tr>
                )
              })}
              {!fields.length && (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-gray-500 dark:text-gray-400">
                    No fields inherited yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-2">Add from existing fields (LDE catalog)</h2>
        {!canEdit ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">Editing is disabled for your role on this entity.</p>
        ) : availableFields.length ? (
          <ul className="space-y-1">
            {availableFields.map((f) => (
              <li
                key={f.id}
                className="flex items-center justify-between rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
              >
                <span className="text-gray-900 dark:text-gray-100">
                  {f.label} <span className="text-gray-400">({f.field_type})</span>
                </span>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => linkField(f.id)}
                  className="text-sky-600 dark:text-sky-400 text-xs font-medium disabled:opacity-50"
                >
                  Add to this level
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            No unlinked published account-wide fields available. Create one in Local Data Extensions, or create an instance-local field below.
          </p>
        )}
      </div>

      <div>
        <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-2">
          Create a new field just for this {entityType || 'record'}
        </h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
          Instance-local only — not added to the shared LDE catalog. Linked via the same field-link table as overrides.
        </p>
        <form onSubmit={createLocalField} className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Code</label>
            <input
              type="text"
              value={localCode}
              onChange={(e) => setLocalCode(e.target.value)}
              disabled={busy || !canEdit}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-50"
              placeholder="e.g. local_risk_note"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Label</label>
            <input
              type="text"
              value={localLabel}
              onChange={(e) => setLocalLabel(e.target.value)}
              disabled={busy || !canEdit}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-50"
              placeholder="Display label"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Type</label>
            <select
              value={localType}
              onChange={(e) => setLocalType(e.target.value)}
              disabled={busy || !canEdit}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-50"
            >
              <option value="text">Text</option>
              <option value="long_text">Long text</option>
              <option value="number">Number</option>
              <option value="integer">Integer</option>
              <option value="date">Date</option>
              <option value="boolean">Boolean</option>
              <option value="dropdown">Dropdown</option>
              <option value="url">URL</option>
            </select>
          </div>
          <button
            type="submit"
            disabled={busy || !canEdit}
            className="px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            Create local field
          </button>
        </form>
      </div>
    </div>
  )
}
