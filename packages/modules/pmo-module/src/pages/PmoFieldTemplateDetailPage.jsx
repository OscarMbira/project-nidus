import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { platformDb } from '@nidus/supabase'
import {
  getTemplateNode,
  listFieldLinksForNode,
  publishTemplateNode,
} from '@nidus/shared/services/pmTemplateNodeService.js'
import { mergeFieldLinksByChain, listEnabledEffectiveFields } from '@nidus/shared/services/pmTemplateInheritanceService.js'
import {
  humanizeAuditToken,
  resolveScopeReferenceLabel,
  resolveAuditUserLabels,
} from '@nidus/shared/utils/auditDisplayUtils.js'
import AuditField from '@nidus/ui/AuditField'
import AuditCard from '@nidus/ui/AuditCard'
import AuditTimestampPair from '@nidus/ui/AuditTimestampPair'
import AuditDetailsPanel from '@nidus/ui/AuditDetailsPanel'
import DetailAuditTabList from '@nidus/ui/DetailAuditTabList'

export default function PmoFieldTemplateDetailPage() {
  const { nodeId } = useParams()
  const [node, setNode] = useState(null)
  const [links, setLinks] = useState([])
  const [effective, setEffective] = useState([])
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState(null)
  const [detailTab, setDetailTab] = useState('details')
  const [auditUserLabels, setAuditUserLabels] = useState({})
  const [scopeReferenceLabel, setScopeReferenceLabel] = useState(null)

  const reload = async () => {
    if (!nodeId) return
    setLoading(true)
    try {
      const n = await getTemplateNode(platformDb, nodeId)
      if (!n) {
        setError('Template node not found.')
        setLoading(false)
        return
      }
      setNode(n)
      const fieldLinks = await listFieldLinksForNode(platformDb, nodeId)
      setLinks(fieldLinks)

      const chainNodes = []
      let current = n
      const seen = new Set()
      while (current && !seen.has(current.id)) {
        seen.add(current.id)
        chainNodes.unshift(current)
        if (!current.parent_node_id) break
        current = await getTemplateNode(platformDb, current.parent_node_id)
      }
      const linksByTier = []
      for (const cn of chainNodes) {
        linksByTier.push(await listFieldLinksForNode(platformDb, cn.id))
      }
      const map = mergeFieldLinksByChain(linksByTier)
      setEffective(listEnabledEffectiveFields(map))
      setError(null)
    } catch (e) {
      setError(e.message || String(e))
    }
    setLoading(false)
  }

  useEffect(() => { reload() }, [nodeId])

  useEffect(() => {
    const ids = [node?.created_by, node?.updated_by]
    let cancelled = false
    resolveAuditUserLabels(platformDb, ids).then((map) => {
      if (!cancelled) setAuditUserLabels(map)
    })
    return () => { cancelled = true }
  }, [node?.created_by, node?.updated_by])

  useEffect(() => {
    let cancelled = false
    if (!node?.scope_entity_id) {
      setScopeReferenceLabel(null)
      return
    }
    resolveScopeReferenceLabel(platformDb, {
      scopeType: node.scope_entity_type,
      scopeId: node.scope_entity_id,
    }).then((label) => {
      if (!cancelled) setScopeReferenceLabel(label)
    })
    return () => { cancelled = true }
  }, [node?.scope_entity_type, node?.scope_entity_id])

  const handlePublish = async () => {
    if (!node || node.is_system_synced) return
    setBusy(true)
    try {
      const updated = await publishTemplateNode(platformDb, node.id)
      setNode(updated)
      setMessage(`Published successfully (${node.template_reference || node.id}).`)
    } catch (e) {
      setError(e.message || String(e))
    }
    setBusy(false)
  }

  if (loading) return <p className="p-6 text-sm text-gray-500 dark:text-gray-400">Loading…</p>
  if (error && !node) return <p className="p-6 text-sm text-red-500">{error}</p>
  if (!node) return null

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4 md:p-6">
      <Link to="/app/pmo/field-templates" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
        ← Back to field templates
      </Link>
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">{node.name}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {node.tier} · {node.status} · v{node.version}
          {node.is_system_synced ? ' · system-synced (read-only)' : ''}
        </p>
      </div>

      {message && <p className="text-sm text-emerald-600 dark:text-emerald-500">{message}</p>}
      {error && <p className="text-sm text-red-500">{error}</p>}

      <DetailAuditTabList
        activeTab={detailTab}
        onChange={setDetailTab}
        detailsLabel="Details"
        ariaLabel="Field template sections"
      />

      {detailTab === 'audit' && (
        <AuditDetailsPanel description="Who created or changed this field template, and how it is classified.">
          <AuditCard title="Identity" description="How this record is labelled and versioned.">
            <AuditField label="Display ID" value={node.template_reference} />
            <AuditField label="Status" value={humanizeAuditToken(node.status)} />
            <AuditField label="Version" value={node.version != null ? String(node.version) : null} />
            <AuditField label="Current version" value={node.is_current ? 'Yes' : 'No'} />
            <AuditField label="System synced" value={node.is_system_synced ? 'Yes' : 'No'} />
          </AuditCard>
          <AuditCard title="Classification" description="Where this record sits in the template hierarchy.">
            <AuditField label="Tier" value={humanizeAuditToken(node.tier)} />
            <AuditField label="Domain" value={humanizeAuditToken(node.domain)} />
            <AuditField label="Methodology" value={humanizeAuditToken(node.methodology)} />
            <AuditField label="Scope type" value={humanizeAuditToken(node.scope_entity_type)} />
            <AuditField label="Scope reference" value={scopeReferenceLabel || node.scope_entity_id || null} />
          </AuditCard>
          <AuditCard title="Record history" description="When this template row was created and last changed.">
            <AuditField
              label="Created by"
              value={node.created_by ? (auditUserLabels[node.created_by] || node.created_by) : null}
            />
            <AuditTimestampPair dateLabel="Created at" value={node.created_at} />
            <AuditField
              label="Updated by"
              value={node.updated_by ? (auditUserLabels[node.updated_by] || node.updated_by) : null}
            />
            <AuditTimestampPair dateLabel="Last updated" value={node.updated_at} />
          </AuditCard>
        </AuditDetailsPanel>
      )}

      {detailTab === 'details' && (
        <>
          {!node.is_system_synced && node.status !== 'published' && (
            <button
              type="button"
              disabled={busy}
              onClick={handlePublish}
              className="rounded bg-blue-700 px-3 py-1.5 text-sm text-white disabled:opacity-50"
            >
              {busy ? 'Publishing…' : 'Publish node'}
            </button>
          )}

          <section className="rounded-lg border border-gray-200 bg-white p-4 space-y-2 dark:border-gray-700 dark:bg-gray-900">
            <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Links on this node ({links.length})</h2>
            {links.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">No field links. Attach Local Data Extension definitions in a follow-up edit.</p>
            ) : (
              <ul className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
                {links.map((l) => (
                  <li key={l.id}>
                    {l.custom_field_definitions?.label || l.custom_field_definition_id}
                    {' · '}
                    {l.enabled === false ? 'disabled' : 'enabled'}
                    {l.is_local ? ' · local' : ''}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-lg border border-gray-200 bg-white p-4 space-y-2 dark:border-gray-700 dark:bg-gray-900">
            <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
              Effective fields (inherited + local) ({effective.length})
            </h2>
            {effective.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">No enabled fields resolve for this chain yet.</p>
            ) : (
              <ul className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
                {effective.map((f) => (
                  <li key={f.custom_field_definition_id}>
                    {f.label || f.custom_field_definition_id}
                    {f.required ? ' · required' : ''}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  )
}
