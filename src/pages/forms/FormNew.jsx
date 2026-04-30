import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import DynamicFormRenderer from '../../components/forms/DynamicFormRenderer'
import { createFormInstance, getFormTemplate, updateFormValues } from '../../services/formEngineService'

export default function FormNew({ mode = 'platform', basePath = '/platform/projects' }) {
  const { projectId, templateCode } = useParams()
  const navigate = useNavigate()
  const [template, setTemplate] = useState(null)
  const [values, setValues] = useState({})

  useEffect(() => {
    getFormTemplate(templateCode, mode).then((r) => r.success && setTemplate(r.data))
  }, [templateCode, mode])

  const save = async () => {
    const created = await createFormInstance(projectId, templateCode, null, mode)
    if (!created.success) return
    await updateFormValues(created.data.id, values, mode)
    navigate(`${basePath}/${projectId}/forms/${created.data.id}/edit`)
  }

  return (
    <div className="space-y-4 p-4 text-gray-100">
      <h1 className="text-lg font-semibold">New Form: {template?.name || templateCode}</h1>
      <DynamicFormRenderer
        schema={template?.current_version?.schema || { sections: [] }}
        values={values}
        rows={{}}
        onValueChange={(k, v) => setValues((p) => ({ ...p, [k]: v }))}
        onRowsChange={() => {}}
      />
      <button type="button" onClick={save} className="rounded bg-blue-600 px-4 py-2 text-sm text-white">Create Draft</button>
    </div>
  )
}
