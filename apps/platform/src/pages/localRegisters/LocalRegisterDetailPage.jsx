/**
 * Local Register Engine — generic detail/view page (v931), with the mandatory Details/Audit
 * tab pair per CLAUDE.md rule 63.1 (this is a record-CRUD form like any other register).
 */
import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Pencil, ShieldCheck, Lock, LayoutTemplate } from 'lucide-react'
import ExportRecordButtons from '@nidus/ui/ExportRecordButtons'
import RegisterSignoffPanel from '@nidus/ui/RegisterSignoffPanel'
import SaveAsTemplateDialog from '@nidus/ui/SaveAsTemplateDialog'
import PlaceholderBanner from '@nidus/ui/PlaceholderBanner'
import { recordPlaceholderSummary } from '@nidus/shared/utils/registerPlaceholders'
import { canManageRegisterTemplates, listRegisterTemplates, saveRecordAsTemplate } from '@nidus/shared/services/localRegisterTemplateService'
import DocumentAttachmentsPanel from '@nidus/ui/DocumentAttachmentsPanel'
import { platformDb } from '@nidus/supabase'
import { localRegisterAttachmentPanelService } from '@nidus/shared/services/localRegisterAttachmentService'
import { isRecordLockedForSignoff } from '@nidus/shared/services/localRegisterSignoffService'
import { exportRegisterRecordDocument, buildRegisterRecordDocumentPdfBlob } from '@nidus/shared/services/registerDocumentExportService'
import { getCurrentUserAccountId, getCurrentUserInternalUserId } from '@nidus/shared/utils/accountResolution'
import toastNotify from 'react-hot-toast'
import { buildRegisterRecordExport } from '@nidus/shared/utils/registerRecordExport'
import DetailAuditTabList from '@nidus/ui/DetailAuditTabList'
import RecordStatusBadge from '@nidus/ui/RecordStatusBadge'
import AuthorisationRequestModal from '@nidus/ui/AuthorisationRequestModal'
import { useToast } from '@nidus/shared/hooks/useToast'
import { getRegisterDefinition } from '../../services/localRegisterService'
import {
  getRecord,
  listRecords,
  getRecordApprovalChain,
  submitRecordForAuthorisation,
} from '../../services/localRegisterRecordService'
import LinkedRecordsView from '@nidus/ui/LinkedRecordsView'
import { useLinkedRecordsData } from '@nidus/shared/hooks/useLinkedRecordsData'
import { coreLinkedSourceConfig } from '@nidus/shared/utils/coreLinkedSource'
import { isLikelyDatabaseUuid } from '@nidus/shared/utils/isUuid'
import {
  groupRegisterFields,
  buildRegisterTabs,
  DETAILS_TAB,
  AUDIT_TAB,
  CUSTOM_FIELDS_TAB,
  SIGNOFF_TAB,
  ATTACHMENTS_TAB,
} from '@nidus/shared/utils/registerFieldGroups'
import RegisterCustomFieldsHeader from '@nidus/ui/RegisterCustomFieldsHeader'
import { useRegisterCustomFields } from '../../lib/useRegisterCustomFields'
import { useRegionalFormatSettings } from '@nidus/shared/hooks/useRegionalFormatSettings'
import { formatRegisterAmount, registerFieldExportValue } from '@nidus/shared/utils/registerCustomFields'
import { refShowFields, refTargetKey } from '@nidus/shared/utils/registerRecordRef'
import RecordRefView from '@nidus/ui/RecordRefView'
import RunbookRecordPanels from '../../components/shared-app/RunbookRecordPanels'
import LocalRegisterAuditPanel from './LocalRegisterAuditPanel'
import { useRegisterSignatoryCandidates } from '../../lib/useRegisterSignatoryCandidates'
import { parseMultiLineValue } from '@nidus/ui/MultiLineListInput'
import TableListInput from '@nidus/ui/TableListInput'
import { tableColumns } from '@nidus/shared/utils/registerTableField'
import { formatRegionalDate } from '@nidus/shared/utils/formatRegionalSettings'

function fieldValueToText(field, value, settings) {
  if (value === null || value === undefined || value === '') return '—'
  // Date & time, record references and calculated values (v1337) use the shared formatter.
  if (field.field_type === 'datetime' || field.field_type === 'record_ref' || field.calculation?.op) {
    return registerFieldExportValue(value, field, settings) || '—'
  }
  // Amounts and numbers in the organisation's regional format (rule 68).
  const amount = formatRegisterAmount(value, field, settings)
  if (amount !== null) return amount
  if (field.field_type === 'boolean') return value ? 'Yes' : 'No'
  // Dropdown / multi-select values are option keys — show their labels.
  const labelOf = (v) => (field.dropdown_options || []).find((o) => o.value === v)?.label || v
  if (Array.isArray(value)) return value.length ? value.map(labelOf).join(', ') : '—'
  if (field.field_type === 'dropdown') return labelOf(value)
  return String(value)
}

export default function LocalRegisterDetailPage() {
  const { registerId, recordId } = useParams()
  const navigate = useNavigate()
  const toast = useToast()

  const [loading, setLoading] = useState(true)
  const [register, setRegister] = useState(null)
  const [record, setRecord] = useState(null)
  const [submitModalOpen, setSubmitModalOpen] = useState(false)
  const [approvalChain, setApprovalChain] = useState([])
  const [submitting, setSubmitting] = useState(false)
  const [activeTab, setActiveTab] = useState(DETAILS_TAB)
  // Organisation custom fields (v1311) — read-only here; added from the create/edit form.
  const customFields = useRegisterCustomFields(register)
  const regionalSettings = useRegionalFormatSettings(record?.project_id || null)
  // Document registers (v1318): sign-off, annexure attachments and the complete document export.
  const [viewer, setViewer] = useState({ accountId: null, userId: null })
  const isDocument = Boolean(register?.is_document)
  const signatoryCandidates = useRegisterSignatoryCandidates({
    projectId: record?.record_project_id || null,
    accountId: record?.account_id || viewer.accountId,
    enabled: isDocument,
  })

  useEffect(() => {
    let cancelled = false
    Promise.all([getCurrentUserAccountId(), getCurrentUserInternalUserId()]).then(([accountId, userId]) => {
      if (!cancelled) setViewer({ accountId, userId })
    })
    return () => { cancelled = true }
  }, [])

  // "Linked records" fields (v1332): the source register's records for this record's project,
  // e.g. Data Scope products under the Migration Strategy's Product Takeover tab.
  // Core sources (v1338): e.g. the Requirements Specification's chapters from requirements_register.
  const linked = useLinkedRecordsData({ register, record, db: platformDb, getRegisterDefinition, listRecords })

  // Save as template (v1336): PMO Admin tier / Account Owner / Project-Programme-Portfolio Manager.
  const [templateRights, setTemplateRights] = useState({ forKey: null, canManage: false, orgTemplates: [] })
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false)
  const [savingTemplate, setSavingTemplate] = useState(false)
  const templateRightsKey = viewer.accountId && register?.register_key ? `${viewer.accountId}|${register.register_key}` : null
  useEffect(() => {
    if (!templateRightsKey) return undefined
    let cancelled = false
    Promise.all([
      canManageRegisterTemplates(platformDb, viewer.accountId),
      listRegisterTemplates(platformDb, register.register_key),
    ]).then(([canManage, list]) => {
      if (cancelled) return
      setTemplateRights({
        forKey: templateRightsKey,
        canManage,
        orgTemplates: list.success ? list.data.filter((t) => t.template_scope === 'organisation') : [],
      })
    })
    return () => { cancelled = true }
  }, [templateRightsKey]) // eslint-disable-line react-hooks/exhaustive-deps
  const canSaveTemplate = templateRights.forKey === templateRightsKey && templateRights.canManage

  const handleSaveAsTemplate = async ({ name, description, templateId }) => {
    setSavingTemplate(true)
    const result = await saveRecordAsTemplate(platformDb, {
      recordId: record.id, name, description, templateId, accountId: record.account_id || viewer.accountId, mode: 'platform',
    })
    setSavingTemplate(false)
    if (!result.success) {
      toastNotify.error(result.message || 'The template could not be saved')
      return
    }
    setTemplateDialogOpen(false)
    if (result.data.failedFiles.length) toastNotify.error(`Template saved, but these annexures could not be copied: ${result.data.failedFiles.join(', ')}`)
    else toastNotify.success(`Template “${name}” saved — find it on the Templates tab`)
    setTemplateRights((prev) => ({ ...prev, forKey: null }))
  }

  const reloadRecord = async () => {
    const refreshed = await getRecord(recordId)
    if (refreshed.data) setRecord(refreshed.data)
  }

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      const [registerResult, recordResult] = await Promise.all([
        getRegisterDefinition(registerId),
        getRecord(recordId),
      ])
      if (cancelled) return
      setRegister(registerResult.data)
      setRecord(recordResult.data)

      // Self-correct a raw-UUID register segment to the friendly register_key (rule 16.3).
      if (
        registerResult.data?.register_key &&
        isLikelyDatabaseUuid(registerId) &&
        registerId !== registerResult.data.register_key
      ) {
        navigate(`/platform/local-registers/${registerResult.data.register_key}/${recordId}`, { replace: true })
      }
      setLoading(false)
    })()
    return () => { cancelled = true }
  }, [registerId, recordId])

  // "Decide" (approve/reject) is deliberately NOT built here — the existing generic
  // pmo/authorisation/queue and pm/authorisation/queue pages already list pending requests for
  // ANY table_name, local_register_records included, with zero changes needed to those pages
  // (rule 62 — reuse, don't duplicate). This only wires the "submit" side.
  const openSubmitModal = async () => {
    const chainResult = await getRecordApprovalChain(record.account_id, record.project_id)
    setApprovalChain(chainResult.data || [])
    setSubmitModalOpen(true)
  }

  const handleSubmitForAuthorisation = async (notes) => {
    setSubmitting(true)
    const result = await submitRecordForAuthorisation(record.id, notes)
    setSubmitting(false)
    setSubmitModalOpen(false)
    if (!result.success) {
      toast.error(result.error || 'Failed to submit for authorisation')
      return
    }
    toast.success('Submitted for authorisation.')
    const refreshed = await getRecord(recordId)
    setRecord(refreshed.data)
  }

  if (loading) {
    return <div className="p-8 text-gray-500 dark:text-gray-400">Loading…</div>
  }
  if (!register || !record) {
    return <div className="p-8 text-gray-500 dark:text-gray-400">Record not found.</div>
  }

  const routeKey = register.register_key || registerId
  const loadRefFacts = async (field, ids) => {
    const target = await getRegisterDefinition(refTargetKey(field))
    const wanted = (target.data?.fields || []).filter((f) => refShowFields(field).includes(f.field_key))
    const out = {}
    await Promise.all(ids.map(async (id) => {
      const ref = await getRecord(id)
      if (!ref.data) return
      out[id] = wanted
        .map((f) => ({ label: f.field_label, value: registerFieldExportValue(ref.data.field_values?.[f.field_key], f, regionalSettings) }))
        .filter((row) => row.value)
    }))
    return out
  }
  const statusLabel = (register.status_workflow || []).find((s) => s.key === record.status)?.label || record.status
  const { detailsFields, groups } = groupRegisterFields(register.fields, record.field_values || {})
  // A conditional tab (v1346) can vanish when its controlling value changes — show Details then.
  const shownTab = activeTab.startsWith('group-') && !groups.some((g) => g.value === activeTab) ? DETAILS_TAB : activeTab
  const visibleFields =
    shownTab === DETAILS_TAB
      ? detailsFields
      : shownTab === CUSTOM_FIELDS_TAB
        ? customFields.fields
        : groups.find((g) => g.value === shownTab)?.fields || []
  // View (preview) + Export (PDF, Excel, Word, PowerPoint, CSV, XML, JSON, Print) via ExportRecordMenu — rule 38.
  const exportData = buildRegisterRecordExport({ register, record, customFields: customFields.fields, settings: regionalSettings, linked: linked.data })
  const locked = isRecordLockedForSignoff(record)
  const exportDocument = async (format, branding) => {
    try {
      await exportRegisterRecordDocument(platformDb, {
        format,
        register,
        record,
        customFields: customFields.fields,
        settings: regionalSettings,
        branding,
        accountId: record.account_id || viewer.accountId,
        linked: linked.data,
      })
    } catch (error) {
      toastNotify.error(error?.message || 'Failed to build the document')
    }
  }
  // View preview of the complete document (cover, contents, appendices, annexures).
  const buildDocumentPdf = (branding) => buildRegisterRecordDocumentPdfBlob(platformDb, {
    register,
    record,
    customFields: customFields.fields,
    settings: regionalSettings,
    branding,
    accountId: record.account_id || viewer.accountId,
    linked: linked.data,
  })

  return (
    <div className="p-4 sm:p-6 w-full space-y-6">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to {register.label}
      </button>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{record.title}</h1>
            {register.requires_approval && <RecordStatusBadge status={record.record_status} />}
          </div>
          {record.display_id && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {record.display_id}
              {register.versioned ? ` · Version ${record.content_version || 1}` : ''}
            </p>
          )}
          {locked && (
            <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
              <Lock className="h-3.5 w-3.5" />
              {record.signoff_state === 'complete' ? 'Signed off — read-only' : 'Locked for sign-off'}
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ExportRecordButtons
            sections={exportData.sections}
            record={exportData.record}
            baseFilename={exportData.baseFilename}
            onExportDocument={isDocument ? exportDocument : null}
            onBuildDocumentPdf={isDocument ? buildDocumentPdf : null}
          />
          {register.requires_approval && record.record_status === 'live' && (
            <button
              type="button"
              onClick={openSubmitModal}
              className="inline-flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium"
            >
              <ShieldCheck className="h-4 w-4" />
              Submit for Authorisation
            </button>
          )}
          {canSaveTemplate && (
            <button
              type="button"
              onClick={() => setTemplateDialogOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
            >
              <LayoutTemplate className="h-4 w-4" />
              Save as template
            </button>
          )}
          {!locked && (
          <button
            type="button"
            onClick={() => navigate(`/platform/local-registers/${routeKey}/${recordId}/edit`)}
            className="inline-flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100 rounded-lg text-sm font-medium"
          >
            <Pencil className="h-4 w-4" />
            Edit
          </button>
          )}
        </div>
      </div>

      <PlaceholderBanner summary={recordPlaceholderSummary(register, record)} />

      <RunbookRecordPanels register={register} record={record} basePath="/platform" settings={regionalSettings} />

      <DetailAuditTabList
        activeTab={shownTab}
        onChange={setActiveTab}
        tabs={buildRegisterTabs(groups, { includeCustomFields: true, includeDocumentTabs: isDocument })}
        ariaLabel={`${register.label} sections`}
      />

      {shownTab === AUDIT_TAB ? (
        <LocalRegisterAuditPanel register={register} record={record} />
      ) : shownTab === SIGNOFF_TAB ? (
        <RegisterSignoffPanel
          db={platformDb}
          record={record}
          registerKey={register.register_key}
          accountId={record.account_id || viewer.accountId}
          projectId={record.record_project_id || null}
          teamMembers={signatoryCandidates}
          currentUserId={viewer.userId}
          mode="platform"
          onRecordChange={reloadRecord}
          suggestedRoles={register.suggested_signatory_roles || null}
        />
      ) : shownTab === ATTACHMENTS_TAB ? (
        <DocumentAttachmentsPanel
          db={platformDb}
          templateNodeId={record.id}
          mode="platform"
          disabled={locked}
          service={localRegisterAttachmentPanelService}
          title="Attachments (Annexures)"
          description={locked
            ? 'Read-only while the document is locked for sign-off.'
            : 'Each file becomes an annexure (Annexure A, B, …) in the complete document export. Give each one a title.'}
          captionPlaceholder="Annexure title"
        />
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
          {shownTab === DETAILS_TAB && (
            <>
              <div>
                <p className="text-xs uppercase text-gray-400 mb-1">Status</p>
                <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300">
                  {statusLabel}
                </span>
              </div>
              {record.description && (
                <div className="md:col-span-2">
                  <p className="text-xs uppercase text-gray-400 mb-1">Description</p>
                  <p className="text-sm text-gray-700 dark:text-gray-300">{record.description}</p>
                </div>
              )}
            </>
          )}
          {shownTab === CUSTOM_FIELDS_TAB && (
            <RegisterCustomFieldsHeader
              count={customFields.used}
              limit={customFields.limit}
              loading={customFields.loading}
              error={customFields.error}
              onManage={customFields.canManage ? () => navigate(customFields.managePath) : null}
            />
          )}
          {visibleFields.map((field) => (
            <div key={field.id} className={['multi_line', 'long_text', 'table', 'linked_records'].includes(field.field_type) ? 'md:col-span-2' : ''}>
              <p className="text-xs uppercase text-gray-400 mb-1">{field.field_label}</p>
              {field.field_type === 'linked_records' ? (
                <LinkedRecordsView
                  linked={linked.data[field.field_key] || null}
                  loading={linked.loading}
                  error={linked.error}
                  settings={regionalSettings}
                  recordHref={(rec) => (rec && linked.data[field.field_key]?.register
                    ? `/platform/local-registers/${linked.data[field.field_key].register.register_key}/${rec.id}`
                    : null)}
                  sourceHref={coreLinkedSourceConfig(field)
                    ? `/platform/scope/requirements${coreLinkedSourceConfig(field).category ? `?category=${coreLinkedSourceConfig(field).category}` : ''}`
                    : null}
                />
              ) : field.field_type === 'record_ref' ? (
                <RecordRefView
                  field={field}
                  value={record.field_values?.[field.field_key]}
                  hrefFor={(id) => `/platform/local-registers/${refTargetKey(field)}/${id}`}
                  loadFacts={loadRefFacts}
                />
              ) : field.field_type === 'table' ? (
                <TableListInput
                  viewModeId={`local-register-view-${field.register_id}-${field.field_key}`}
                  columns={tableColumns(field)}
                  value={String(record.field_values?.[field.field_key] ?? '')}
                  onChange={() => {}}
                  ariaLabelPrefix={field.field_label}
                  formatDate={(v) => formatRegionalDate(v, regionalSettings)}
                  disabled
                />
              ) : field.field_type === 'multi_line' &&
              parseMultiLineValue(String(record.field_values?.[field.field_key] ?? '')).length > 0 ? (
                <ul className="list-disc pl-5 space-y-0.5 text-sm text-gray-700 dark:text-gray-300">
                  {parseMultiLineValue(String(record.field_values[field.field_key])).map((line, i) => (
                    <li key={i}>{line}</li>
                  ))}
                </ul>
              ) : field.field_type === 'url' && record.field_values?.[field.field_key] ? (
                <a
                  href={String(record.field_values[field.field_key])}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 dark:text-blue-400 hover:underline break-all"
                >
                  {String(record.field_values[field.field_key])}
                </a>
              ) : (
                <p className={`text-sm text-gray-700 dark:text-gray-300${field.field_type === 'long_text' ? ' whitespace-pre-wrap' : ''}`}>
                  {fieldValueToText(field, record.field_values?.[field.field_key], regionalSettings)}
                </p>
              )}
            </div>
          ))}
        </div>
      )}


      {register.requires_approval && (
        <AuthorisationRequestModal
          open={submitModalOpen}
          onClose={() => setSubmitModalOpen(false)}
          onSubmit={handleSubmitForAuthorisation}
          chain={approvalChain}
          mode="submit"
          loading={submitting}
        />
      )}
      {templateDialogOpen && (
        <SaveAsTemplateDialog
          isOpen
          onClose={() => !savingTemplate && setTemplateDialogOpen(false)}
          defaultName={record.title}
          organisationTemplates={templateRights.orgTemplates}
          busy={savingTemplate}
          onSave={handleSaveAsTemplate}
        />
      )}
    </div>
  )
}
