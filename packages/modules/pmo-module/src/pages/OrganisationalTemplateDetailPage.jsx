import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Save, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { platformDb } from '@nidus/supabase'
import { getTemplateNode, updateTemplateNode, archiveTemplateNode } from '@nidus/shared/services/pmTemplateNodeService.js'
import {
  getNodeContent,
  updateOpaContent,
  updateProcessTemplateContent,
} from '@nidus/shared/services/pmTemplateContentService.js'
import { getMenuLabel } from '@nidus/shared/services/menuLabelService.js'

const inputClass = 'w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100'
const labelClass = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'

/** "owner_role" -> "Owner Role" — labels for document_data keys, which have no fixed schema. */
function humanizeKey(key) {
  return String(key || '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

/**
 * document_data is a flat JSON object with no fixed shape (varies per one of 24
 * process-template document types) — split it into one labelled field per key
 * instead of a raw JSON blob. Falls back to raw-JSON editing only when the
 * payload isn't a plain object (e.g. an array at the top level), which the
 * per-key editor can't represent.
 */
function splitDocumentData(docData) {
  if (docData && typeof docData === 'object' && !Array.isArray(docData)) {
    const fields = {}
    const types = {}
    for (const [key, value] of Object.entries(docData)) {
      if (Array.isArray(value)) {
        types[key] = 'array'
        fields[key] = value.join('\n')
      } else if (value && typeof value === 'object') {
        types[key] = 'object'
        fields[key] = JSON.stringify(value, null, 2)
      } else if (typeof value === 'boolean') {
        types[key] = 'boolean'
        fields[key] = String(value)
      } else if (typeof value === 'number') {
        types[key] = 'number'
        fields[key] = String(value)
      } else {
        types[key] = 'string'
        fields[key] = value == null ? '' : String(value)
      }
    }
    return { fields, types, rawFallback: false, rawText: '' }
  }
  return {
    fields: {},
    types: {},
    rawFallback: docData != null,
    rawText: docData != null ? JSON.stringify(docData, null, 2) : '',
  }
}

/** Reverse of splitDocumentData — coerces each field's display string back to its original type. */
function buildDocumentData(fields, types) {
  const result = {}
  for (const [key, displayValue] of Object.entries(fields)) {
    const type = types[key] || 'string'
    if (type === 'array') {
      result[key] = displayValue.split('\n').map((line) => line.trim()).filter(Boolean)
    } else if (type === 'object') {
      result[key] = displayValue.trim() ? JSON.parse(displayValue) : {}
    } else if (type === 'boolean') {
      result[key] = displayValue.trim().toLowerCase() === 'true'
    } else if (type === 'number') {
      result[key] = displayValue.trim() === '' ? null : Number(displayValue)
    } else {
      result[key] = displayValue
    }
  }
  return result
}

/**
 * Organisational Template detail — view + edit an account-owned (is_system_synced=false)
 * pm_template_nodes row. Editable surface is deliberately generic for process_template/
 * level templates (v805 decision 4) rather than 24 bespoke document forms.
 * Route: /app/pmo/organisational-templates/:nodeId
 */
export default function OrganisationalTemplateDetailPage() {
  const { nodeId: nodeIdOrReference } = useParams()
  const navigate = useNavigate()
  const [node, setNode] = useState(null)
  const [contentInfo, setContentInfo] = useState({ kind: 'none', content: null })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [form, setForm] = useState({ name: '', description: '', category: '' })
  const [contentForm, setContentForm] = useState({ title: '', description: '' })
  // document_data, split into one editable field per key (see splitDocumentData).
  const [documentFields, setDocumentFields] = useState({})
  const [documentFieldTypes, setDocumentFieldTypes] = useState({})
  const [rawJsonFallback, setRawJsonFallback] = useState(false)
  const [rawJsonText, setRawJsonText] = useState('')
  // Mirrors the DB-driven menu_items row — no hardcoded duplicate string.
  const [backLinkLabel, setBackLinkLabel] = useState('Organisational Templates')

  useEffect(() => {
    getMenuLabel(platformDb, 'plat_tpl_organisational', 'Organisational Templates').then(setBackLinkLabel)
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const n = await getTemplateNode(platformDb, nodeIdOrReference)
      if (!n) {
        toast.error('Template not found')
        return
      }
      if (n.is_system_synced) {
        toast.error('This is a Global template — open it from the Global Template Library instead')
        navigate('/app/pmo/template-library')
        return
      }
      // Display ID in URLs (CLAUDE.md rule 16.1) — swap a raw-UUID or stale link for the
      // canonical template_reference once it's known, without losing history/scroll position.
      if (n.template_reference && n.template_reference !== nodeIdOrReference) {
        navigate(`/app/pmo/organisational-templates/${n.template_reference}`, { replace: true })
      }
      setNode(n)
      setForm({ name: n.name || '', description: n.description || '', category: n.category || '' })
      const info = await getNodeContent(platformDb, n)
      setContentInfo(info)
      if (info.content) {
        setContentForm({
          title: info.content.title || info.content.name || '',
          description: info.content.description || '',
        })
        const { fields, types, rawFallback, rawText } = splitDocumentData(info.content.document_data)
        setDocumentFields(fields)
        setDocumentFieldTypes(types)
        setRawJsonFallback(rawFallback)
        setRawJsonText(rawText)
      }
    } catch (e) {
      toast.error(e.message || 'Failed to load template')
    } finally {
      setLoading(false)
    }
  }, [nodeIdOrReference, navigate])

  useEffect(() => { load() }, [load])

  const handleSave = async () => {
    setSaving(true)
    try {
      await updateTemplateNode(platformDb, node.id, form)
      if (contentInfo.kind === 'opa' && contentInfo.content) {
        await updateOpaContent(platformDb, contentInfo.content.id, {
          name: contentForm.title,
          description: contentForm.description,
        })
      } else if (contentInfo.kind === 'process_template' && contentInfo.content && contentInfo.table) {
        let documentData
        if (rawJsonFallback) {
          try {
            documentData = rawJsonText.trim() ? JSON.parse(rawJsonText) : null
          } catch {
            toast.error('Document data must be valid JSON')
            setSaving(false)
            return
          }
        } else {
          try {
            documentData = buildDocumentData(documentFields, documentFieldTypes)
          } catch {
            toast.error('One of the document data fields has invalid JSON')
            setSaving(false)
            return
          }
        }
        await updateProcessTemplateContent(platformDb, contentInfo.table, contentInfo.content.id, {
          title: contentForm.title,
          description: contentForm.description,
          documentData,
        })
      }
      toast.success('Saved')
      await load()
    } catch (e) {
      toast.error(e.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!window.confirm(`Retire "${node?.name}"? It will no longer appear in Organisational Templates or be inherited by downstream tiers.`)) {
      return
    }
    setDeleting(true)
    try {
      await archiveTemplateNode(platformDb, node.id)
      toast.success(`Retired (${node.template_reference || node.id})`)
      navigate('/app/pmo/organisational-templates')
    } catch (e) {
      toast.error(e.message || 'Delete failed')
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return <div className="mx-auto max-w-5xl p-4 md:p-6"><p className="text-sm text-gray-500 dark:text-gray-400">Loading…</p></div>
  }
  if (!node) return null

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <Link
          to="/app/pmo/organisational-templates"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          <ArrowLeft className="h-4 w-4" />
          {backLinkLabel}
        </Link>
        <button
          type="button"
          disabled={deleting}
          onClick={handleDelete}
          className="inline-flex items-center gap-1 rounded bg-red-50 px-3 py-1.5 text-xs text-red-700 hover:bg-red-100 disabled:opacity-60 dark:bg-red-950/40 dark:text-red-400 dark:hover:bg-red-950"
        >
          <Trash2 className="h-3 w-3" />
          {deleting ? 'Retiring…' : 'Retire'}
        </button>
      </div>

      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">{node.name}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {node.tier} · {node.domain} {node.parent_node_id ? '· copied from Global' : '· custom draft'}
        </p>
      </div>

      <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Template metadata</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className={labelClass}>Name</label>
            <input className={inputClass} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </div>
          <div>
            <label className={labelClass}>Category</label>
            <input className={inputClass} value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} />
          </div>
          <div className="md:col-span-2">
            <label className={labelClass}>Description</label>
            <textarea
              className={inputClass}
              rows={3}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>
        </div>
      </div>

      {node.domain === 'fields' && (
        <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Field links for this template are managed on its dedicated page.
          </p>
          <Link
            to={`/app/pmo/field-templates/${node.id}`}
            className="mt-2 inline-block text-sm text-blue-600 hover:underline dark:text-blue-400"
          >
            Manage fields →
          </Link>
        </div>
      )}

      {contentInfo.kind === 'opa' && (
        <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">OPA content</h2>
          <div>
            <label className={labelClass}>Title</label>
            <input className={inputClass} value={contentForm.title} onChange={(e) => setContentForm((f) => ({ ...f, title: e.target.value }))} />
          </div>
          <div>
            <label className={labelClass}>Description</label>
            <textarea
              className={inputClass}
              rows={4}
              value={contentForm.description}
              onChange={(e) => setContentForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            For richer OPA fields, use the{' '}
            <Link to={`/app/opa/${contentInfo.content?.id}/edit`} className="text-blue-600 hover:underline dark:text-blue-400">
              full OPA editor
            </Link>.
          </p>
        </div>
      )}

      {contentInfo.kind === 'process_template' && contentInfo.content && (
        <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Process document content ({contentInfo.table})</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className={labelClass}>Title</label>
              <input className={inputClass} value={contentForm.title} onChange={(e) => setContentForm((f) => ({ ...f, title: e.target.value }))} />
            </div>
            <div className="md:col-span-2">
              <label className={labelClass}>Description</label>
              <textarea
                className={inputClass}
                rows={2}
                value={contentForm.description}
                onChange={(e) => setContentForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
          </div>

          {rawJsonFallback ? (
            <div>
              <label className={labelClass}>Document data (JSON)</label>
              <p className="mb-1 text-xs text-gray-500 dark:text-gray-400">
                This document's data isn't a simple key/value shape, so it's shown as raw JSON.
              </p>
              <textarea
                className={`${inputClass} font-mono text-xs`}
                rows={10}
                value={rawJsonText}
                onChange={(e) => setRawJsonText(e.target.value)}
              />
            </div>
          ) : Object.keys(documentFields).length > 0 ? (
            <div>
              <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Document data
              </h3>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {Object.entries(documentFields).map(([key, value]) => {
                  const type = documentFieldTypes[key]
                  const useTextarea = type === 'array' || type === 'object' || value.length > 60
                  const spanFull = type === 'array' || type === 'object'
                  return (
                    <div key={key} className={spanFull ? 'md:col-span-2' : undefined}>
                      <label className={labelClass}>
                        {humanizeKey(key)}
                        {type === 'array' && <span className="ml-1 text-xs font-normal text-gray-400">(one per line)</span>}
                      </label>
                      {useTextarea ? (
                        <textarea
                          className={`${inputClass}${type === 'object' ? ' font-mono text-xs' : ''}`}
                          rows={type === 'array' || type === 'object' ? 4 : 3}
                          value={value}
                          onChange={(e) => setDocumentFields((f) => ({ ...f, [key]: e.target.value }))}
                        />
                      ) : (
                        <input
                          className={inputClass}
                          value={value}
                          onChange={(e) => setDocumentFields((f) => ({ ...f, [key]: e.target.value }))}
                        />
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ) : null}
        </div>
      )}

      {contentInfo.kind === 'process_template' && !contentInfo.content && (
        <p className="text-sm text-amber-600 dark:text-amber-400">
          No content row found for this process document — it may have been retired at the catalog level.
        </p>
      )}

      {contentInfo.kind === 'level_template' && (
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Portfolio/Programme/Project-level templates only carry the metadata above — there is no
          additional payload stored for this domain today.
        </p>
      )}

      <button
        type="button"
        disabled={saving}
        onClick={handleSave}
        className="inline-flex items-center gap-2 rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
      >
        <Save className="h-4 w-4" />
        {saving ? 'Saving…' : 'Save changes'}
      </button>
    </div>
  )
}
