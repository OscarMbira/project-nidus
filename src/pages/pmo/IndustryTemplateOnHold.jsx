import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listIndustryTemplates } from '../../services/industryTemplateService'

export default function IndustryTemplateOnHold() {
  const [rows, setRows] = useState([])

  useEffect(() => {
    listIndustryTemplates({ status: 'draft', pmoView: true }).then(setRows)
  }, [])

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <Link to="/pmo/industry-templates" className="text-sm text-blue-600">
        ← All templates
      </Link>
      <h1 className="text-2xl font-bold mt-2">Template drafts & on hold</h1>
      <ul className="mt-6 space-y-2">
        {rows.map((r) => (
          <li key={r.id} className="flex justify-between rounded border px-4 py-3 dark:border-slate-700">
            <span>{r.industry_name}</span>
            <Link to={`/pmo/industry-templates/${r.id}/edit`} className="text-sm text-blue-600">
              Resume
            </Link>
          </li>
        ))}
        {!rows.length && <p className="text-sm text-slate-500">No draft templates.</p>}
      </ul>
    </div>
  )
}
