import { useEffect, useState } from 'react'
import { getFormTemplates } from '../../services/formEngineService'

export default function FormTemplateAdmin({ mode = 'platform' }) {
  const [templates, setTemplates] = useState([])
  useEffect(() => {
    getFormTemplates(undefined, mode).then((r) => r.success && setTemplates(r.data))
  }, [mode])

  return (
    <div className="space-y-3 p-4 text-gray-100">
      <h1 className="text-lg font-semibold">Form Templates Admin</h1>
      <div className="rounded border border-gray-700 bg-gray-900 p-3">
        <p className="text-xs text-gray-300">Total templates: {templates.length}</p>
      </div>
    </div>
  )
}
