import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Save, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import ExportRecordMenu from '@nidus/ui/ExportRecordMenu'
import MultiItemTextField, {
  isMultiItemFieldValue,
} from '@nidus/ui/MultiItemTextField'
import AuditField from '@nidus/ui/AuditField'
import AuditCard from '@nidus/ui/AuditCard'
import AuditTimestampPair from '@nidus/ui/AuditTimestampPair'
import AuditDetailsPanel from '@nidus/ui/AuditDetailsPanel'
import DetailAuditTabList from '@nidus/ui/DetailAuditTabList'
import DocumentAttachmentsPanel from '@nidus/ui/DocumentAttachmentsPanel'
import SignatoriesPanel from '@nidus/ui/SignatoriesPanel'
import { platformDb } from '@nidus/supabase'
import { resolveDocumentAttachmentsForExport } from '@nidus/shared/services/processTemplateAttachmentService'
import {
  resolveEffectiveSignatoryRequirements,
  isDocumentFullySigned,
  resolveDocumentSignaturesForExport,
} from '@nidus/shared/services/processTemplateSignatoryService'
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
import { useProjectDocumentAccess } from '@nidus/shared/hooks/useProjectDocumentAccess.js'
import {
  orgTemplateDetailPath,
  resolveFormTemplateManagePath,
  resolveFormTemplateRecordsTarget,
  resolveOrgTemplatesListBaseFromDetailPath,
} from '@nidus/shared/utils/organisationalTemplateRoutes.js'
import {
  toProjectDocumentLabel,
  isProjectProcessDocumentFill,
} from '@nidus/shared/utils/projectDocumentNaming.js'
import { formatMultiItemStorage, splitMultiItemFieldText } from '@nidus/shared/utils/exportUtils'
import {
  humanizeAuditToken,
  resolveScopeReferenceLabel,
  resolveAuditUserLabels,
} from '@nidus/shared/utils/auditDisplayUtils.js'

const labelColorClass = 'text-gray-700 dark:text-gray-300'
const inputClass = 'w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100'
const labelClass = `block text-sm font-medium ${labelColorClass} mb-1`
const groupLabelClass = `text-sm font-bold ${labelColorClass}`

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
        const joined = value.map((v) => (v == null ? '' : String(v))).join('\n')
        const multi = splitMultiItemFieldText(joined)
        fields[key] = multi ? formatMultiItemStorage(multi) : joined
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
        const raw = value == null ? '' : String(value)
        // Normalize packed lists (intro + bullets) for the list editor
        const multi = splitMultiItemFieldText(raw)
        fields[key] = multi ? formatMultiItemStorage(multi) : raw
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
  // v897 Part B — team_lead/team_member get read-only access on the Project Documents
  // route specifically; Organisational Templates management (PMO-admin audience) is
  // untouched — always canManage there, since this hook is a no-op without a projectId.
  const { canManage: docAccessCanManage } = useProjectDocumentAccess({
    db: platformDb,
    projectId: isProjectDocuments
      ? (node?.scope_entity_type === 'project' && node.scope_entity_id) || contextProjectId || null
      : null,
    schema: 'public',
  })
  const canManageDocument = !isProjectDocuments || docAccessCanManage
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
  const [formRecordCount, setFormRecordCount] = useState(null)
  const [formRecordCountLoading, setFormRecordCountLoading] = useState(false)
  const [detailTab, setDetailTab] = useState('details') // 'details' | 'audit'
  const [auditUserLabels, setAuditUserLabels] = useState({})
  const [scopeReferenceLabel, setScopeReferenceLabel] = useState(null)

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
      // Display ID over raw UUID in the URL (CLAUDE.md rule 16.1) — including project
      // document fill-ins: this pm_template_nodes row is that project's own copy, so its
      // template_reference is already a stable per-document identifier, not a shared one.
      if (n.template_reference && n.template_reference !== nodeIdOrReference) {
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

  useEffect(() => {
    const ids = [
      node?.created_by,
      contentInfo?.content?.created_by,
      contentInfo?.content?.updated_by,
      contentInfo?.content?.author_id,
      contentInfo?.content?.owner_id,
    ]
    let cancelled = false
    resolveAuditUserLabels(platformDb, ids).then((map) => {
      if (!cancelled) setAuditUserLabels(map)
    })
    return () => {
      cancelled = true
    }
  }, [node?.created_by, contentInfo?.content])

  useEffect(() => {
    let cancelled = false
    const scopeType = node?.scope_entity_type
    const scopeId = node?.scope_entity_id
    if (!scopeId) {
      setScopeReferenceLabel(null)
      return
    }
    resolveScopeReferenceLabel(platformDb, { scopeType, scopeId }).then((label) => {
      if (!cancelled) setScopeReferenceLabel(label)
    })
    return () => {
      cancelled = true
    }
  }, [node?.scope_entity_type, node?.scope_entity_id])

  useEffect(() => {
    let cancelled = false
    async function loadRecordCount() {
      if (node?.domain !== 'form_template') {
        setFormRecordCount(null)
        return
      }
      const projectId = node?.scope_entity_id || contextProjectId
      const templateName = contentInfo.content?.name || contentInfo.content?.title || node?.name || ''
      const templateCode = contentInfo.content?.template_code || ''
      const target = resolveFormTemplateRecordsTarget(location.pathname, {
        projectId,
        templateCode,
        category: node?.category,
        templateName,
      })

      setFormRecordCountLoading(true)
      try {
        if (target.kind === 'native' && target.countSpec && projectId) {
          let q = platformDb
            .from(target.countSpec.table)
            .select('id', { count: 'exact', head: true })
            .eq(target.countSpec.projectColumn, projectId)
          if (target.countSpec.softDeleteColumn) {
            q = q.eq(target.countSpec.softDeleteColumn, false)
          }
          const { count, error } = await q
          if (cancelled) return
          if (error) throw error
          setFormRecordCount(typeof count === 'number' ? count : 0)
          return
        }

        const templateId = node?.domain_ref_id
        if (!templateId || !projectId) {
          setFormRecordCount(null)
          return
        }
        const { count, error } = await platformDb
          .from('form_instances')
          .select('id', { count: 'exact', head: true })
          .eq('project_id', projectId)
          .eq('template_id', templateId)
          .neq('status', 'archived')
        if (cancelled) return
        if (error) throw error
        setFormRecordCount(typeof count === 'number' ? count : 0)
      } catch (e) {
        if (!cancelled) {
          console.error('[OrganisationalTemplateDetailPage] form record count failed', e)
          setFormRecordCount(null)
        }
      } finally {
        if (!cancelled) setFormRecordCountLoading(false)
      }
    }
    loadRecordCount()
    return () => { cancelled = true }
  }, [
    node?.domain,
    node?.domain_ref_id,
    node?.scope_entity_id,
    node?.category,
    node?.name,
    contentInfo.content?.template_code,
    contentInfo.content?.name,
    contentInfo.content?.title,
    contextProjectId,
    location.pathname,
  ])

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

  const isProjectDocFill = isProjectProcessDocumentFill(node, {
    isProjectDocumentsRoute: isProjectDocuments,
  })

  // v868 — Signatories tab only appears when a PMO Admin has configured a
  // requirement for this document's table; the document (+ Attachments panel)
  // locks read-only once every required slot is signed. Declared before
  // exportSections below since that useMemo depends on `fullySigned`.
  const [hasSignatoryRequirement, setHasSignatoryRequirement] = useState(false)
  const [fullySigned, setFullySigned] = useState(false)
  const [signatureOverrides, setSignatureOverrides] = useState({ textValues: [], assets: [] })
  useEffect(() => {
    if (!node?.account_id || !contentInfo.table) { setHasSignatoryRequirement(false); return }
    let cancelled = false
    const projectIdForResolve =
      (node.scope_entity_type === 'project' && node.scope_entity_id) || contextProjectId || null
    resolveEffectiveSignatoryRequirements(platformDb, {
      accountId: node.account_id,
      documentTable: contentInfo.table,
      projectId: projectIdForResolve,
    }).then((result) => {
      if (!cancelled) setHasSignatoryRequirement(result.success && (result.data?.slots || []).length > 0)
    })
    return () => { cancelled = true }
  }, [node?.account_id, node?.scope_entity_id, node?.scope_entity_type, contentInfo.table, contextProjectId])
  useEffect(() => {
    if (!node?.id || !hasSignatoryRequirement) { setFullySigned(false); return }
    let cancelled = false
    isDocumentFullySigned(platformDb, node.id).then((signed) => {
      if (!cancelled) setFullySigned(signed)
    })
    return () => { cancelled = true }
  }, [node?.id, hasSignatoryRequirement, detailTab])
  useEffect(() => {
    // Fetch whenever this doc type has signatories configured — not gated on fullySigned:
    // resolveDocumentSignaturesForExport already renders per-slot status (signed/pending/
    // declined) for a partially-signed document, and fullySigned is derived once per tab
    // visit (see effect above) so it can go stale the moment a slot is signed without a
    // tab switch — gating on it hid already-captured signatures from the export/preview.
    if (!node?.id || !hasSignatoryRequirement) return
    let cancelled = false
    resolveDocumentSignaturesForExport(platformDb, node.id).then((result) => {
      if (!cancelled && result.success) setSignatureOverrides(result.data)
    })
    return () => { cancelled = true }
  }, [node?.id, hasSignatoryRequirement, fullySigned])

  // v853 — Export + inline View (PDF/Word/PPT/Excel) from current form values
  // Hooks must run before any early return below.
  const exportSections = useMemo(() => {
    if (!node) return []
    if (contentInfo.kind === 'process_template' && contentInfo.content) {
      const sections = [
        {
          title: isProjectDocFill ? 'Document details' : 'Details',
          fields: [
            { key: 'title', label: 'Title' },
            { key: 'description', label: 'Description' },
          ],
        },
      ]
      if (rawJsonFallback) {
        sections.push({
          title: 'Document data',
          fields: [{ key: 'document_data_json', label: 'Document data (JSON)' }],
        })
      } else if (Object.keys(documentFields).length > 0) {
        sections.push({
          title: 'Document data',
          fields: Object.keys(documentFields).map((key) => ({
            key: `dd_${key}`,
            label: humanizeKey(key),
          })),
        })
      }
      if (node?.id) {
        sections.push({
          title: 'Attachments',
          fields: [{ key: 'attachments', label: 'Attachments' }],
        })
      }
      if (node?.id && hasSignatoryRequirement) {
        sections.push({
          title: 'Signatures',
          fields: [{ key: 'signatures', label: 'Signatures' }],
        })
      }
      return sections
    }
    if (contentInfo.kind === 'opa') {
      return [
        {
          title: 'OPA content',
          fields: [
            { key: 'title', label: 'Title' },
            { key: 'description', label: 'Description' },
          ],
        },
      ]
    }
    if (!isProjectDocFill) {
      return [
        {
          title: 'Template metadata',
          fields: [
            { key: 'name', label: 'Name' },
            { key: 'category', label: 'Category' },
            { key: 'description', label: 'Description' },
          ],
        },
      ]
    }
    return []
  }, [
    node,
    contentInfo.kind,
    contentInfo.content,
    isProjectDocFill,
    rawJsonFallback,
    documentFields,
    hasSignatoryRequirement,
  ])

  // v867 — resolve this document's attachments once for export (Word/PPT/PDF/Print embed
  // images; Excel/CSV/XML/JSON get filename+link, via the same mechanism as v863).
  const [attachmentOverrides, setAttachmentOverrides] = useState({ textValues: [], assets: [] })
  useEffect(() => {
    if (!node?.id) return
    let cancelled = false
    resolveDocumentAttachmentsForExport(platformDb, node.id).then((result) => {
      if (!cancelled && result.success) setAttachmentOverrides(result.data)
    })
    return () => { cancelled = true }
  }, [node?.id])

  const exportRecord = useMemo(() => {
    const rec = {
      title: contentForm.title || '',
      description: contentForm.description || '',
      name: form.name || '',
      category: form.category || '',
      document_data_json: rawJsonText || '',
      attachments: attachmentOverrides.textValues,
      signatures: signatureOverrides.textValues,
    }
    for (const [key, value] of Object.entries(documentFields)) {
      // Normalize packed lists so View/Export see intro + bullets (not a lead-in bullet)
      const multi = splitMultiItemFieldText(value)
      rec[`dd_${key}`] = multi ? formatMultiItemStorage(multi) : value
    }
    return rec
  }, [contentForm, form, documentFields, rawJsonText, attachmentOverrides, signatureOverrides])

  if (loading) {
    return <div className="mx-auto max-w-5xl p-4 md:p-6"><p className="text-sm text-gray-500 dark:text-gray-400">Loading…</p></div>
  }
  if (!node) return null

  const isBlankOrigin = node.domain === 'form_template' && !node.parent_node_id
  const formTemplateCode = contentInfo.content?.template_code || ''
  const recordsProjectId = node.scope_entity_id || contextProjectId
  const formTemplateName = contentInfo.content?.name || contentInfo.content?.title || node.name || ''
  const formManagePath =
    node.domain === 'form_template' && formTemplateCode
      ? resolveFormTemplateManagePath(location.pathname, {
          templateCode: formTemplateCode,
          scopeEntityId: recordsProjectId,
          scopeEntityType: node.scope_entity_type,
          tier: node.tier,
          isBlankOrigin,
        })
      : null
  const formRecordsTarget =
    node.domain === 'form_template' && (formTemplateCode || formTemplateName)
      ? resolveFormTemplateRecordsTarget(location.pathname, {
          projectId: recordsProjectId,
          templateCode: formTemplateCode,
          category: node.category,
          templateName: formTemplateName,
        })
      : null
  const formRecordsPath = formRecordsTarget?.path || null
  const formRecordsAreNative = formRecordsTarget?.kind === 'native'
  const formManageGoesToProjectFields = Boolean(formManagePath?.includes('/field-templates'))
  const pageTitle = isProjectDocFill
    ? toProjectDocumentLabel(contentForm.title || node.name) || node.name
    : node.name
  const originBadge = isBlankOrigin
    ? 'Blank'
    : node.parent_node_id
      ? `Copied from: ${parentSourceName || 'source template'}`
      : 'Custom draft'

  const exportBaseFilename = String(
    node.template_reference || pageTitle || node.id || 'Document',
  )
    .replace(/[^\w.-]+/g, '_')
    .slice(0, 80)

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link
          to={listBase}
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          <ArrowLeft className="h-4 w-4" />
          {backLinkLabel}
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          {exportSections.length > 0 && (
            <ExportRecordMenu
              sections={exportSections}
              record={exportRecord}
              baseFilename={exportBaseFilename}
              attachmentAssets={{ attachments: attachmentOverrides.assets, signatures: signatureOverrides.assets }}
            />
          )}
          {canManageDocument && (
            <button
              type="button"
              disabled={deleting}
              onClick={handleDelete}
              className="inline-flex items-center gap-1 rounded bg-red-50 px-3 py-1.5 text-xs text-red-700 hover:bg-red-100 disabled:opacity-60 dark:bg-red-950/40 dark:text-red-400 dark:hover:bg-red-950"
            >
              <Trash2 className="h-3 w-3" />
              {deleting ? 'Retiring…' : 'Retire'}
            </button>
          )}
        </div>
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

      {formRecordsPath && (
        <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            {formRecordsAreNative
              ? 'Open the live register for this template (native project records — not form-instance rows).'
              : "Open the project forms register filtered to this template's filled-in records (drafts, in review, approved, rejected)."}
          </p>
          {formRecordCountLoading && (
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">Counting records…</p>
          )}
          {!formRecordCountLoading && formRecordCount === 0 && (
            <p className="mt-2 text-sm text-amber-700 dark:text-amber-300">
              {formRecordsAreNative
                ? 'No register records yet for this project. You can still open the register to create one.'
                : 'No records yet for this form. You can still open the list to start a new record or bulk upload rows.'}
            </p>
          )}
          {!formRecordCountLoading && formRecordCount != null && formRecordCount > 0 && (
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              {formRecordCount} active record{formRecordCount === 1 ? '' : 's'} for this project.
            </p>
          )}
          <Link
            to={formRecordsPath}
            className="mt-2 inline-block text-sm text-blue-600 hover:underline dark:text-blue-400"
          >
            {formRecordsAreNative
              ? (formRecordCount != null && formRecordCount > 0
                ? `View register (${formRecordCount}) →`
                : 'View register →')
              : (formRecordCount != null && formRecordCount > 0
                ? `View form records (${formRecordCount}) →`
                : 'View form records →')}
          </Link>
        </div>
      )}

      <DetailAuditTabList
        activeTab={detailTab}
        onChange={setDetailTab}
        detailsLabel={isProjectDocFill ? 'Document details' : 'Details'}
        ariaLabel="Document sections"
        extraTab={isProjectDocuments || hasSignatoryRequirement ? { value: 'signatories', label: 'Signatories' } : null}
      />

      {detailTab === 'signatories' && (isProjectDocuments || hasSignatoryRequirement) && (
        <SignatoriesPanel
          db={platformDb}
          templateNodeId={node.id}
          accountId={node.account_id}
          documentTable={contentInfo.table}
          projectId={
            (node.scope_entity_type === 'project' && node.scope_entity_id) || contextProjectId || null
          }
          disabled={!canManageDocument}
          mode="platform"
        />
      )}

      {detailTab === 'audit' && (
        <AuditDetailsPanel
          description={`Who created or changed this ${isProjectDocFill ? 'document' : 'template'}, and how it is classified.`}
        >
          <AuditCard
            title="Identity"
            description="How this record is labelled and versioned."
          >
            <AuditField label="Display ID" value={node.template_reference} />
            <AuditField label="Status" value={humanizeAuditToken(node.status)} />
            <AuditField label="Version" value={node.version != null ? String(node.version) : null} />
            <AuditField label="Current version" value={node.is_current ? 'Yes' : 'No'} />
            <AuditField label="Origin" value={originBadge} />
          </AuditCard>

          <AuditCard
            title="Classification"
            description="Where this record sits in the template hierarchy."
          >
            <AuditField label="Tier" value={humanizeAuditToken(node.tier)} />
            <AuditField label="Domain" value={humanizeAuditToken(node.domain)} />
            <AuditField label="Methodology" value={humanizeAuditToken(node.methodology)} />
            <AuditField
              label="Scope type"
              value={humanizeAuditToken(node.scope_entity_type)}
            />
            <AuditField
              label="Scope reference"
              value={scopeReferenceLabel || node.scope_entity_id || null}
            />
          </AuditCard>

          <AuditCard
            title="Record history"
            description="When this template/document row was created and last changed."
          >
            <AuditField
              label="Created by"
              value={node.created_by ? (auditUserLabels[node.created_by] || node.created_by) : null}
            />
            <AuditTimestampPair dateLabel="Created at" value={node.created_at} />
            <AuditTimestampPair dateLabel="Last updated" value={node.updated_at} />
          </AuditCard>

          {contentInfo.content ? (
            <AuditCard
              title="Document content history"
              description="Audit trail for the linked document data row."
            >
              <AuditField
                label="Content type"
                value={humanizeAuditToken(contentInfo.table || contentInfo.kind)}
              />
              <AuditField
                label="Created by"
                value={
                  contentInfo.content.created_by
                    ? (auditUserLabels[contentInfo.content.created_by] || contentInfo.content.created_by)
                    : contentInfo.content.author_id
                      ? (auditUserLabels[contentInfo.content.author_id] || contentInfo.content.author_id)
                      : null
                }
              />
              <AuditField
                label="Updated by"
                value={
                  contentInfo.content.updated_by
                    ? (auditUserLabels[contentInfo.content.updated_by] || contentInfo.content.updated_by)
                    : null
                }
              />
              <AuditTimestampPair dateLabel="Created at" value={contentInfo.content.created_at} />
              <AuditTimestampPair dateLabel="Last updated" value={contentInfo.content.updated_at} />
            </AuditCard>
          ) : null}
        </AuditDetailsPanel>
      )}

      {detailTab === 'details' && (
      <fieldset disabled={fullySigned || !canManageDocument} className="m-0 border-0 p-0 space-y-4">
      {!canManageDocument && (
        <p className="rounded border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-700 dark:border-blue-900/50 dark:bg-blue-950/20 dark:text-blue-400">
          You have read-only access to this document.
        </p>
      )}
      {fullySigned && (
        <p className="rounded border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-700 dark:border-green-900/50 dark:bg-green-950/20 dark:text-green-400">
          This document is fully signed and is now read-only. See the Signatories tab for details.
        </p>
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
                  const useList = isMultiItemFieldValue(value, type)
                  const useTextarea =
                    !useList &&
                    (type === 'object' || value.length > 60 || value.includes('\n'))
                  const spanFull = useList || type === 'array' || type === 'object'
                  return (
                    <div key={key} className={spanFull ? 'md:col-span-2' : undefined}>
                      <label className={labelClass}>
                        {humanizeKey(key)}
                        {useList && (
                          <span className="ml-1 text-xs font-normal text-gray-400">
                            (one item per line)
                          </span>
                        )}
                      </label>
                      {useList ? (
                        <MultiItemTextField
                          value={value}
                          inputClassName={inputClass}
                          groupLabelClassName={groupLabelClass}
                          onChange={(next) => setDocumentFields((f) => ({ ...f, [key]: next }))}
                        />
                      ) : useTextarea ? (
                        <textarea
                          className={`${inputClass}${type === 'object' ? ' font-mono text-xs' : ''}`}
                          rows={type === 'object' ? 4 : 3}
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

      {contentInfo.kind === 'process_template' && contentInfo.content && node?.id && (
        <DocumentAttachmentsPanel db={platformDb} templateNodeId={node.id} mode="platform" disabled={fullySigned || !canManageDocument} />
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
        disabled={saving || fullySigned || !canManageDocument}
        onClick={handleSave}
        className="inline-flex items-center gap-2 rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
      >
        <Save className="h-4 w-4" />
        {saving ? 'Saving…' : 'Save changes'}
      </button>
      </fieldset>
      )}
    </div>
  )
}
