import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useLanguageContext } from '@nidus/shared/context/LanguageContext'
import { schemaToExportSections, buildFormTemplateExportFilename } from '@nidus/shared/utils/formTemplateExportUtils'
import { validateRequiredSchemaFields } from '@nidus/shared/utils/formValidation'
import ExportRecordMenu from '@nidus/ui/ExportRecordMenu'
import DynamicFormRenderer from '../../components/forms/DynamicFormRenderer'
import ApprovalWorkflowPanel from '../../components/forms/ApprovalWorkflowPanel'
import FormAutosaveIndicator from '../../components/forms/FormAutosaveIndicator'
import { getFieldTranslations, getFormInstance, submitFormForApproval, updateFormValues } from '../../services/formEngineService'

function groupRowsBySection(rowList = []) {
  const rows = {}
  for (const row of rowList) {
    const key = row.section_key
    if (!rows[key]) rows[key] = []
    rows[key][row.row_index] = row.row_value
  }
  for (const key of Object.keys(rows)) {
    rows[key] = (rows[key] || []).filter((v) => v != null)
  }
  return rows
}

export default function FormEdit({ mode = 'platform' }) {
  const { formInstanceId } = useParams()
  const { languageCode } = useLanguageContext()
  const [instance, setInstance] = useState(null)
  const [values, setValues] = useState({})
  const [rows, setRows] = useState({})
  const [lastSavedAt, setLastSavedAt] = useState('')
  const [translations, setTranslations] = useState([])
  const [loadError, setLoadError] = useState(null)
  const [fieldErrors, setFieldErrors] = useState({})

  useEffect(() => {
    setLoadError(null)
    getFormInstance(formInstanceId, mode).then((r) => {
      if (!r.success) {
        setLoadError(r.message || 'Failed to load form')
        return
      }
      setInstance(r.data)
      const nextValues = {}
      for (const item of r.data.values || []) nextValues[item.field_key] = item.field_value
      setValues(nextValues)
      setRows(groupRowsBySection(r.data.rows || []))
    })
  }, [formInstanceId, mode])

  useEffect(() => {
    if (!instance?.template_id) return
    getFieldTranslations(instance.template_id, mode).then((r) => r.success && setTranslations(r.data))
  }, [instance?.template_id, mode])

  const schema = instance?.schema || { sections: [] }
  const exportSections = useMemo(() => schemaToExportSections(schema), [schema])
  const exportFilename = buildFormTemplateExportFilename({
    templateCode: instance?.template?.template_code,
    templateName: instance?.template?.name || 'form',
  })

  const save = async () => {
    await updateFormValues(formInstanceId, values, mode)
    setLastSavedAt(new Date().toLocaleTimeString())
  }

  const submitForApproval = async () => {
    const errors = validateRequiredSchemaFields(schema, values)
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) {
      toast.error('Please complete all required fields before submitting')
      return
    }
    await updateFormValues(formInstanceId, values, mode)
    await submitFormForApproval(formInstanceId, mode)
  }

  return (
    <div className="space-y-4 p-4 text-gray-900 dark:text-gray-100">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">
            {instance?.template?.name ? `Edit: ${instance.template.name}` : 'Edit Form'}
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
      <FormAutosaveIndicator lastSavedAt={lastSavedAt} isSaving={false} />
      <DynamicFormRenderer
        schema={schema}
        values={values}
        rows={rows}
        onValueChange={(k, v) => setValues((p) => ({ ...p, [k]: v }))}
        onRowsChange={(sectionKey, nextRows) => setRows((prev) => ({ ...prev, [sectionKey]: nextRows }))}
        translations={translations}
        languageCode={languageCode}
        showCalculated
        errors={fieldErrors}
      />
      <div className="flex gap-2">
        <button type="button" onClick={save} className="rounded bg-blue-600 px-3 py-1 text-xs text-white">Save</button>
      </div>
      <ApprovalWorkflowPanel
        status={instance?.status}
        onSubmit={submitForApproval}
      />
    </div>
  )
}
