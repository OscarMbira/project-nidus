import { useCallback, useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Save, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { platformDb } from '@nidus/supabase'
import {
  getTemplateNode,
  updateTemplateNode,
  archiveTemplateNode,
  archiveProcessTemplateNodeAndContent,
} from '@nidus/shared/services/pmTemplateNodeService.js'
import {
  getNodeContent,
  updateOpaContent,
  updateProcessTemplateContent,
} from '@nidus/shared/services/pmTemplateContentService.js'
import { getMenuLabel } from '@nidus/shared/services/menuLabelService.js'
import { usePlatformProjectId } from '@nidus/shared/hooks/usePlatformProjectId.js'
import {
  orgTemplateDetailPath,
  resolveFormTemplateManagePath,
  resolveOrgTemplatesListBaseFromDetailPath,
} from '@nidus/shared/utils/organisationalTemplateRoutes.js'
import {
  toProjectDocumentLabel,
  isProjectProcessDocumentFill,
} from '@nidus/shared/utils/projectDocumentNaming.js'

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
 * Routes: /app/pmo/organisational-templates/:nodeId · /platform/templates/organisational|project/:nodeId
 */
export default function OrganisationalTemplateDetailPage() {
  const { nodeId: nodeIdOrReference } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { projectId: contextProjectId } = usePlatformProjectId()
  const listBase = resolveOrgTemplatesListBaseFromDetailPath(location.pathname)
  const isProjectList =
    listBase.endsWith('/templates/project') || listBase.endsWith('/documents/project')
  const isProjectDocuments = listBase.endsWith('/documents/project')
  const [node, setNode] = useState(null)
  const [parentSourceName, setParentSourceName] = useState(null)
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
  const [backLinkLabel, setBackLinkLabel] = useState(
    isProjectDocuments
      ? 'Project Documents'
      : isProjectList
        ? 'Project Templates'
        : 'Organisational Templates',
  )

  useEffect(() => {
    if (isProjectDocuments) {
      getMenuLabel(platformDb, 'plat_pm_project_documents', 'Project Documents').then(setBackLinkLabel)
    } else if (isProjectList) {
      getMenuLabel(platformDb, 'plat_pm_project_templates', 'Project Templates').then(setBackLinkLabel)
    } else {
      getMenuLabel(platformDb, 'plat_tpl_organisational', 'Organisational Templates').then(setBackLinkLabel)
    }
  }, [isProjectList, isProjectDocuments])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const n = await getTemplateNode(platformDb, decodeURIComponent(String(nodeIdOrReference || '')))
      if (!n) {
        toast.error(isProjectDocuments ? 'Document not found' : 'Template not found')
        navigate(listBase)
        return
      }
      if (n.is_system_synced) {
        toast.error('This is a Global template — open it from the Global Template Library instead')
        navigate(
          listBase.startsWith('/platform/') || listBase.startsWith('/simulator/pm/')
            ? listBase
            : '/app/pmo/template-library',
        )
        return
      }
      const fillProjectDoc = isProjectProcessDocumentFill(n, {
        isProjectDocumentsRoute: isProjectDocuments,
      })
      // Project process-doc fill-in: keep UUID in the URL (TPL-* reads as "template").
      // Elsewhere, prefer display ID (CLAUDE.md rule 16.1).
      if (
        !fillProjectDoc &&
        n.template_reference &&
        n.template_reference !== nodeIdOrReference
      ) {
        navigate(orgTemplateDetailPath(listBase, n.template_reference), { replace: true })
      }
      const cleanNodeName = fillProjectDoc
        ? toProjectDocumentLabel(n.name) || n.name
        : n.name || ''
      setNode({ ...n, name: cleanNodeName })
      if (n.parent_node_id) {
        try {
          const parent = await getTemplateNode(platformDb, n.parent_node_id)
          setParentSourceName(parent?.name || null)
        } catch {
          setParentSourceName(null)
        }
      } else {
        setParentSourceName(null)
      }
      setForm({
        name: cleanNodeName,
        description: n.description || '',
        category: n.category || '',
      })
      const info = await getNodeContent(platformDb, n)
      setContentInfo(info)
      if (info.content) {
        const rawTitle = info.content.title || info.content.name || ''
        setContentForm({
          title: fillProjectDoc ? toProjectDocumentLabel(rawTitle) || rawTitle : rawTitle,
          description: info.content.description || '',
        })
        const { fields, types, rawFallback, rawText } = splitDocumentData(info.content.document_data)
        setDocumentFields(fields)
        setDocumentFieldTypes(types)
        setRawJsonFallback(rawFallback)
        setRawJsonText(rawText)
      }
    } catch (e) {
      toast.error(e.message || (isProjectDocuments ? 'Failed to load document' : 'Failed to load template'))
    } finally {
      setLoading(false)
    }
  }, [nodeIdOrReference, navigate, listBase, isProjectDocuments])

  useEffect(() => { load() }, [load])

  const handleSave = async () => {
    setSaving(true)
    try {
      const fillProjectDoc = isProjectProcessDocumentFill(node, {
        isProjectDocumentsRoute: isProjectDocuments,
      })
      const nodePatch = fillProjectDoc
        ? {
            ...form,
            name:
              toProjectDocumentLabel(contentForm.title || form.name) ||
              form.name,
          }
        : form
      await updateTemplateNode(platformDb, node.id, nodePatch)
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
          title: fillProjectDoc
            ? toProjectDocumentLabel(contentForm.title) || contentForm.title
            : contentForm.title,
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
    const retireLabel = isProjectProcessDocumentFill(node, { isProjectDocumentsRoute: isProjectDocuments })
      ? toProjectDocumentLabel(node?.name) || node?.name
      : node?.name
    if (!window.confirm(`Retire "${retireLabel}"? It will no longer appear in ${backLinkLabel}.`)) {
      return
    }
    setDeleting(true)
    try {
      // v849: process_template Retire archives node + linked catalog row together
      if (node.domain === 'process_template') {
        await archiveProcessTemplateNodeAndContent(platformDb, node)
      } else {
        await archiveTemplateNode(platformDb, node.id)
      }
      toast.success(`Retired (${node.template_reference || node.id})`)
      navigate(listBase)
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

  const isBlankOrigin = node.domain === 'form_template' && !node.parent_node_id
  const formManagePath =
    node.domain === 'form_template' && contentInfo.content?.template_code
      ? resolveFormTemplateManagePath(location.pathname, {
          templateCode: contentInfo.content.template_code,
          scopeEntityId: node.scope_entity_id || contextProjectId,
          tier: node.tier,
          isBlankOrigin,
        })
      : null
  const formManageGoesToProjectFields = Boolean(formManagePath?.includes('/field-templates'))
  const isProjectDocFill = isProjectProcessDocumentFill(node, {
    isProjectDocumentsRoute: isProjectDocuments,
  })
  const pageTitle = isProjectDocFill
    ? toProjectDocumentLabel(contentForm.title || node.name) || node.name
    : node.name
  const originBadge = isBlankOrigin
    ? 'Blank'
    : node.parent_node_id
      ? `Copied from: ${parentSourceName || 'source template'}`
      : 'Custom draft'

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <Link
          to={listBase}
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
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">{pageTitle}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {isProjectDocFill
            ? 'Project document — edit this project’s values and save. This is live project data, not a template.'
            : (
              <>
                {node.tier} · {node.domain}{' '}
                <span
                  className={`ml-1 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                    isBlankOrigin
                      ? 'bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-200'
                      : 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200'
                  }`}
                >
                  {originBadge}
                </span>
              </>
            )}
        </p>
      </div>

      {/* Hide template chrome whenever the user is filling project process-document data. */}
      {!isProjectDocFill && (
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
      )}

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

      {formManagePath && (
        <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            {formManageGoesToProjectFields
              ? 'Required/enabled fields and project-tier parameterization for this form are managed on the project Form Templates page.'
              : "Required/enabled fields, your organisation's own local fields, translations, default content, and completed examples for this form are managed on its dedicated builder page."}
          </p>
          <Link
            to={formManagePath}
            className="mt-2 inline-block text-sm text-blue-600 hover:underline dark:text-blue-400"
          >
            Manage form fields →
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
          <div>
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              {isProjectDocFill
                ? 'Document details'
                : isProjectList
                  ? `Your project's ${toProjectDocumentLabel(contentForm.title || node?.name) || 'document'}`
                  : `Organisation default content (${contentInfo.table})`}
            </h2>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {isProjectDocFill
                ? 'Fill in the fields below for this project and click Save. This is your project’s live document, not a template.'
                : isProjectList
                  ? 'These fields are the real values for this project — fill them in and save. They are not template configuration.'
                  : 'This content is the organisation starting point copied into a project when a PM copies this template down under Project Templates.'}
            </p>
          </div>
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
