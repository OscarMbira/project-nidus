import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { platformDb } from '@nidus/supabase'
import {
  getTemplateNode,
  listFieldLinksForNode,
  publishTemplateNode,
} from '@nidus/shared/services/pmTemplateNodeService.js'
import { mergeFieldLinksByChain, listEnabledEffectiveFields } from '@nidus/shared/services/pmTemplateInheritanceService.js'

export default function PmoFieldTemplateDetailPage() {
  const { nodeId } = useParams()
  const [node, setNode] = useState(null)
  const [links, setLinks] = useState([])
  const [effective, setEffective] = useState([])
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState(null)

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

      // Walk parent chain for effective fields preview
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

  const handlePublish = async () => {
    if (!node || node.is_system_synced) return
    setBusy(true)
    try {
      const updated = await publishTemplateNode(platformDb, node.id)
      setNode(updated)
      setMessage(`Published successfully. Node id: ${node.id}.`)
    } catch (e) {
      setError(e.message || String(e))
    }
    setBusy(false)
  }

  if (loading) return <p className="p-6 text-sm text-gray-500">Loading…</p>
  if (error && !node) return <p className="p-6 text-sm text-red-500">{error}</p>
  if (!node) return null

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4 md:p-6">
      <Link to="/app/pmo/field-templates" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
        ← Back to field templates
      </Link>
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">{node.name}</h1>
        <p className="text-sm text-gray-500">
          {node.tier} · {node.status} · v{node.version}
          {node.is_system_synced ? ' · system-synced (read-only)' : ''}
        </p>
        <p className="text-xs text-gray-400 mt-1">id {node.id}</p>
      </div>

      {message && <p className="text-sm text-emerald-500">{message}</p>}
      {error && <p className="text-sm text-red-500">{error}</p>}

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

      <section className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-2">
        <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Links on this node ({links.length})</h2>
        {links.length === 0 ? (
          <p className="text-sm text-gray-500">No field links. Attach Local Data Extension definitions in a follow-up edit.</p>
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

      <section className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-2">
        <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
          Effective fields (inherited + local) ({effective.length})
        </h2>
        {effective.length === 0 ? (
          <p className="text-sm text-gray-500">No enabled fields resolve for this chain yet.</p>
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
    </div>
  )
}
