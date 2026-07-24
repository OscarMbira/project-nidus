import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { schemaToExportSections, buildFormTemplateExportFilename } from '@nidus/shared/utils/formTemplateExportUtils'
import ExportRecordMenu from '@nidus/ui/ExportRecordMenu'
import ApprovalWorkflowPanel from '../../components/forms/ApprovalWorkflowPanel'
import FormVersionHistory from '../../components/forms/FormVersionHistory'
import FormAuditTimeline from '../../components/forms/FormAuditTimeline'
import DynamicFormRenderer from '../../components/forms/DynamicFormRenderer'
import { approveForm, getFormInstance, rejectForm } from '../../services/formEngineService'

function valuesMapFromInstance(instance) {
  const next = {}
  for (const item of instance?.values || []) next[item.field_key] = item.field_value
  return next
}

export default function FormView({ mode = 'platform' }) {
  const { formInstanceId } = useParams()
  const [instance, setInstance] = useState(null)
  const [loadError, setLoadError] = useState(null)

  useEffect(() => {
    setLoadError(null)
    getFormInstance(formInstanceId, mode).then((r) => {
      if (!r.success) {
        setLoadError(r.message || 'Failed to load form')
        return
      }
      setInstance(r.data)
    })
  }, [formInstanceId, mode])

  const schema = instance?.schema || { sections: [] }
  const values = useMemo(() => valuesMapFromInstance(instance), [instance])
  const exportSections = useMemo(() => schemaToExportSections(schema), [schema])
  const exportFilename = buildFormTemplateExportFilename({
    templateCode: instance?.template?.template_code,
    templateName: instance?.template?.name || 'form',
  })

  return (
    <div className="space-y-4 p-4 text-gray-900 dark:text-gray-100">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">
            {instance?.template?.name ? `View: ${instance.template.name}` : 'Form View'}
          </h1>
          {instance?.template?.template_code && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {instance.template.template_code}
              {instance.status ? ` · ${instance.status}` : ''}
            </p>
          )}
        </div>
        <ExportRecordMenu
          sections={exportSections}
          record={values}
          baseFilename={exportFilename}
          disabled={!instance || exportSections.length === 0}
        />
      </div>
      {loadError && (
        <div className="rounded border border-red-500/40 bg-red-950/30 px-3 py-2 text-sm text-red-200">
          {loadError}
        </div>
      )}
      {instance && (
        <fieldset disabled className="space-y-4 opacity-95">
          <DynamicFormRenderer
            schema={schema}
            values={values}
            rows={{}}
            onValueChange={() => {}}
            onRowsChange={() => {}}
            showCalculated
          />
        </fieldset>
      )}
      <ApprovalWorkflowPanel
        status={instance?.status}
        onApprove={() => approveForm(formInstanceId, null, 'Approved', mode)}
        onReject={() => rejectForm(formInstanceId, null, 'Rejected', mode)}
      />
      <FormVersionHistory versions={[]} />
      <FormAuditTimeline events={[]} />
    </div>
  )
}
