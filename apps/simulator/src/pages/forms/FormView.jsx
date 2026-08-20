import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { usePlatformProjectId } from '@nidus/shared/hooks/usePlatformProjectId.js'
import { schemaToExportSections, buildFormTemplateExportFilename } from '@nidus/shared/utils/formTemplateExportUtils'
import {
  formInstanceRouteKeyFromRow,
  resolveFormInstanceDetailPath,
  resolveFormInstanceRecordsListPath,
} from '@nidus/shared/utils/formInstanceRegisterUtils.js'
import {
  humanizeAuditToken,
} from '@nidus/shared/utils/auditDisplayUtils.js'
import { platformDb } from '@nidus/supabase'
import ExportRecordMenu from '@nidus/ui/ExportRecordMenu'
import RowActionButton from '@nidus/ui/RowActionButton'
import AuditField from '@nidus/ui/AuditField'
import AuditCard from '@nidus/ui/AuditCard'
import AuditTimestampPair from '@nidus/ui/AuditTimestampPair'
import AuditDetailsPanel from '@nidus/ui/AuditDetailsPanel'
import DetailAuditTabList from '@nidus/ui/DetailAuditTabList'
import ApprovalWorkflowPanel from '../../components/forms/ApprovalWorkflowPanel'
import FormVersionHistory from '../../components/forms/FormVersionHistory'
import FormAuditTimeline from '../../components/forms/FormAuditTimeline'
import DynamicFormRenderer from '../../components/forms/DynamicFormRenderer'
import {
  approveForm,
  archiveForm,
  getFormAuditLog,
  getFormInstance,
  getFormVersionHistory,
  rejectForm,
  submitFormForApproval,
} from '../../services/formEngineService'
import { resolveAttachmentFieldsForExport } from '../../services/formFieldAttachmentService'

function valuesMapFromInstance(instance) {
  const next = {}
  for (const item of instance?.values || []) next[item.field_key] = item.field_value
  return next
}

function decodeSeg(raw) {
  try {
    return decodeURIComponent(String(raw || '').trim())
  } catch {
    return String(raw || '').trim()
  }
}

export default function FormView({ mode = 'platform', basePath = '/platform/projects' }) {
  const { formInstanceId: formInstanceKey } = useParams()
  const { projectId, routeKey } = usePlatformProjectId()
  const location = useLocation()
  const navigate = useNavigate()
  const [instance, setInstance] = useState(null)
  const [projectCode, setProjectCode] = useState(null)
  const [versions, setVersions] = useState([])
  const [auditEvents, setAuditEvents] = useState([])
  const [loadError, setLoadError] = useState(null)
  const [busy, setBusy] = useState(false)
  const [detailTab, setDetailTab] = useState('details')
  const [auditUserLabels, setAuditUserLabels] = useState({})

  const resolvedInstanceId = instance?.id || null
  const projectRouteKey = projectCode || routeKey || projectId

  const listPath = useMemo(
    () =>
      resolveFormInstanceRecordsListPath({
        pathname: location.pathname,
        projectId,
        projectKey: projectRouteKey,
        templateCode: instance?.template?.template_code,
        fallbackBasePath: basePath,
      }),
    [location.pathname, projectId, projectRouteKey, instance?.template?.template_code, basePath],
  )
  const editPath = useMemo(
    () => (instance ? resolveFormInstanceDetailPath(listPath, instance, 'edit') : null),
    [listPath, instance],
  )

  const reload = useCallback(async () => {
    setLoadError(null)
    const [inst] = await Promise.all([
      getFormInstance(formInstanceKey, mode),
    ])
    if (!inst.success) {
      setLoadError(inst.message || 'Failed to load form')
      setInstance(null)
      setVersions([])
      setAuditEvents([])
      return
    }
    setInstance(inst.data)
    const id = inst.data.id
    const [histR, auditR] = await Promise.all([
      getFormVersionHistory(id, mode),
      getFormAuditLog(id, mode),
    ])
    setVersions(histR.success ? histR.data || [] : [])
    setAuditEvents(auditR.success ? auditR.data || [] : [])
  }, [formInstanceKey, mode])

  useEffect(() => {
    reload()
  }, [reload])

  useEffect(() => {
    const pid = projectId || instance?.project_id
    if (!pid) {
      setProjectCode(null)
      return
    }
    let cancelled = false
    platformDb
      .from('projects')
      .select('project_code')
      .eq('id', pid)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) setProjectCode(data?.project_code || null)
      })
    return () => {
      cancelled = true
    }
  }, [projectId, instance?.project_id])

  useEffect(() => {
    const ids = [instance?.created_by, instance?.updated_by, instance?.submitted_by]
      .map((id) => String(id || '').trim())
      .filter(Boolean)
    const unique = [...new Set(ids)]
    if (!unique.length) {
      setAuditUserLabels({})
      return
    }
    let cancelled = false
    platformDb
      .from('users')
      .select('id, full_name, email')
      .in('id', unique)
      .then(({ data }) => {
        if (cancelled) return
        const map = {}
        for (const row of data || []) {
          map[row.id] = row.full_name || row.email || row.id
        }
        setAuditUserLabels(map)
      })
    return () => { cancelled = true }
  }, [instance?.created_by, instance?.updated_by, instance?.submitted_by])

  useEffect(() => {
    if (!instance?.id || !projectRouteKey) return
    const desiredInstanceKey = formInstanceRouteKeyFromRow(instance)
    if (!desiredInstanceKey) return
    const desiredPath = resolveFormInstanceDetailPath(
      resolveFormInstanceRecordsListPath({
        pathname: location.pathname,
        projectId: projectId || instance.project_id,
        projectKey: projectRouteKey,
        fallbackBasePath: basePath,
      }),
      instance,
      'view',
    )
    if (!desiredPath) return
    const currentInstanceKey = decodeSeg(formInstanceKey)
    const currentProjectKey = decodeSeg(routeKey)
    const needsReplace =
      currentInstanceKey !== desiredInstanceKey ||
      (projectCode && currentProjectKey && currentProjectKey !== projectCode)
    if (needsReplace && desiredPath !== location.pathname) {
      navigate(desiredPath + (location.search || ''), { replace: true })
    }
  }, [
    instance,
    projectRouteKey,
    projectCode,
    projectId,
    formInstanceKey,
    routeKey,
    location.pathname,
    location.search,
    basePath,
    navigate,
  ])

  const schema = instance?.schema || { sections: [] }
  const values = useMemo(() => valuesMapFromInstance(instance), [instance])
  const exportSections = useMemo(() => schemaToExportSections(schema), [schema])
  const exportFilename = buildFormTemplateExportFilename({
    templateCode: instance?.template?.template_code,
    templateName: instance?.template?.name || 'form',
  })

  const [exportOverrides, setExportOverrides] = useState({ textValues: {}, assets: {} })
  useEffect(() => {
    if (!resolvedInstanceId) return
    let cancelled = false
    resolveAttachmentFieldsForExport(schema, values, mode).then((result) => {
      if (!cancelled && result.success) setExportOverrides(result.data)
    })
    return () => { cancelled = true }
  }, [resolvedInstanceId, schema, values, mode])
  const exportRecord = useMemo(
    () => ({ ...values, ...exportOverrides.textValues }),
    [values, exportOverrides],
  )
  const refLabel = instance?.instance_reference || resolvedInstanceId || formInstanceKey

  const runAction = async (label, fn) => {
    if (!resolvedInstanceId) return
    setBusy(true)
    try {
      const r = await fn()
      if (!r?.success) throw new Error(r?.message || `${label} failed`)
      toast.success(`${label} successful (${refLabel})`)
      await reload()
    } catch (e) {
      toast.error(e.message || `${label} failed`)
      throw e
    } finally {
      setBusy(false)
    }
  }

  const userLabel = (id) => (id ? (auditUserLabels[id] || id) : null)

  return (
    <div className="mx-auto w-full md:w-3/4 space-y-4 p-4 text-gray-900 dark:text-gray-100">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link
          to={listPath}
          className="text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
        >
          ← Back to records
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          {editPath && (
            <RowActionButton variant="edit" label="Edit form" onClick={() => navigate(editPath)} />
          )}
          <ExportRecordMenu
            sections={exportSections}
            record={exportRecord}
            attachmentAssets={exportOverrides.assets}
            baseFilename={exportFilename}
            disabled={!instance || exportSections.length === 0}
          />
        </div>
      </div>
      <div>
        <h1 className="text-lg font-semibold">
          {instance
            ? `View: ${instance.display_title || instance.template?.name || 'Form'}`
            : 'Form View'}
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {[
            instance?.template?.name,
            instance?.template?.template_code,
            instance?.status,
            instance?.instance_reference,
          ]
            .filter(Boolean)
            .join(' · ')}
        </p>
      </div>
      {loadError && (
        <div className="rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-500/40 dark:bg-red-950/30 dark:text-red-200">
          {loadError}
        </div>
      )}

      <DetailAuditTabList
        activeTab={detailTab}
        onChange={setDetailTab}
        detailsLabel="Form details"
        ariaLabel="Form sections"
      />

      {detailTab === 'audit' && (
        <AuditDetailsPanel
          description="Who created or changed this form record, and how it is classified."
          footer={<FormAuditTimeline events={auditEvents} />}
        >
          <AuditCard title="Identity" description="How this record is labelled and versioned.">
            <AuditField label="Display ID" value={instance?.instance_reference} />
            <AuditField label="Status" value={humanizeAuditToken(instance?.status)} />
            <AuditField label="Template" value={instance?.template?.name || instance?.template?.template_code} />
            <AuditField label="Template code" value={instance?.template?.template_code} />
          </AuditCard>
          <AuditCard title="Classification" description="Where this record sits.">
            <AuditField label="Project" value={projectCode || instance?.project_id || null} />
            <AuditField label="Process group" value={humanizeAuditToken(instance?.template?.process_group)} />
          </AuditCard>
          <AuditCard title="Record history" description="When this form instance was created and last changed.">
            <AuditField label="Created by" value={userLabel(instance?.created_by)} />
            <AuditTimestampPair dateLabel="Created at" value={instance?.created_at} />
            <AuditField label="Updated by" value={userLabel(instance?.updated_by)} />
            <AuditTimestampPair dateLabel="Last updated" value={instance?.updated_at} />
            <AuditField label="Submitted by" value={userLabel(instance?.submitted_by)} />
            <AuditTimestampPair dateLabel="Submitted at" value={instance?.submitted_at} />
          </AuditCard>
        </AuditDetailsPanel>
      )}

      {detailTab === 'details' && (
        <>
          {instance && (
            <fieldset disabled className="space-y-4 opacity-95">
              <DynamicFormRenderer
                schema={schema}
                values={values}
                rows={{}}
                onValueChange={() => {}}
                onRowsChange={() => {}}
                showCalculated
                formInstanceId={resolvedInstanceId}
                disabled
                mode={mode}
              />
            </fieldset>
          )}
          <ApprovalWorkflowPanel
            status={instance?.status}
            busy={busy || !instance}
            onSubmit={() => runAction('Submit', () => submitFormForApproval(resolvedInstanceId, mode))}
            onApprove={(comments) =>
              runAction('Approve', () => approveForm(resolvedInstanceId, null, comments, mode))
            }
            onReject={(comments) =>
              runAction('Reject', () => rejectForm(resolvedInstanceId, null, comments, mode))
            }
            onArchive={async () => {
              if (!window.confirm('Archive this form record?')) return
              await runAction('Archive', () => archiveForm(resolvedInstanceId, mode))
            }}
          />
          <FormVersionHistory versions={versions} />
        </>
      )}
    </div>
  )
}
