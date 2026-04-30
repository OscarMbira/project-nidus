import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import DynamicFormRenderer from '../../components/forms/DynamicFormRenderer'
import ApprovalWorkflowPanel from '../../components/forms/ApprovalWorkflowPanel'
import FormAutosaveIndicator from '../../components/forms/FormAutosaveIndicator'
import { getFormInstance, submitFormForApproval, updateFormValues } from '../../services/formEngineService'

export default function FormEdit({ mode = 'platform' }) {
  const { formInstanceId } = useParams()
  const [instance, setInstance] = useState(null)
  const [values, setValues] = useState({})
  const [lastSavedAt, setLastSavedAt] = useState('')

  useEffect(() => {
    getFormInstance(formInstanceId, mode).then((r) => {
      if (!r.success) return
      setInstance(r.data)
      const nextValues = {}
      for (const item of r.data.values || []) nextValues[item.field_key] = item.field_value
      setValues(nextValues)
    })
  }, [formInstanceId, mode])

  const save = async () => {
    await updateFormValues(formInstanceId, values, mode)
    setLastSavedAt(new Date().toLocaleTimeString())
  }

  return (
    <div className="space-y-4 p-4 text-gray-100">
      <h1 className="text-lg font-semibold">Edit Form</h1>
      <FormAutosaveIndicator lastSavedAt={lastSavedAt} isSaving={false} />
      <DynamicFormRenderer
        schema={{ sections: [] }}
        values={values}
        rows={{}}
        onValueChange={(k, v) => setValues((p) => ({ ...p, [k]: v }))}
        onRowsChange={() => {}}
      />
      <div className="flex gap-2">
        <button type="button" onClick={save} className="rounded bg-blue-600 px-3 py-1 text-xs text-white">Save</button>
      </div>
      <ApprovalWorkflowPanel
        status={instance?.status}
        onSubmit={() => submitFormForApproval(formInstanceId, mode)}
      />
    </div>
  )
}
