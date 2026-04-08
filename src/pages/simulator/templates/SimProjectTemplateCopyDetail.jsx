import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Pencil } from 'lucide-react'
import { getCopyById, exportCopyToExcel, exportCopyToPpt } from '../../../services/sim/simProjectTemplateCopyService'
import ExportRecordMenu from '../../../components/ui/ExportRecordMenu'

const BASE = '/simulator/templates'

export default function ProjectTemplateCopyDetail() {
  const { copyId } = useParams()
  const navigate = useNavigate()
  const [row, setRow] = useState(null)
  const [err, setErr] = useState(null)

  useEffect(() => {
    ;(async () => {
      const { data, error } = await getCopyById(copyId)
      if (error) setErr(error.message)
      setRow(data)
    })()
  }, [copyId])

  const exportSections = useMemo(() => {
    if (!row) return []
    const fields = Object.keys(row.content || {}).map((k) => ({ key: k, label: k }))
    return [
      {
        title: 'Copy',
        fields: [{ key: 'title', label: 'Title' }, { key: 'status', label: 'Status' }, { key: 'current_version', label: 'Version' }, ...fields],
      },
    ]
  }, [row])

  const exportRecord = useMemo(() => {
    if (!row) return {}
    return { title: row.title, status: row.status, current_version: row.current_version, ...(row.content || {}) }
  }, [row])

  if (err || !row) return <div className="p-8 text-gray-600">{err || 'Loading…'}</div>

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Link to={`${BASE}/project-copies`} className="inline-flex items-center gap-2 text-gray-600 mb-6">
        <ArrowLeft className="h-4 w-4" /> Back
      </Link>
      <div className="flex flex-wrap justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{row.title}</h1>
          <p className="text-sm text-gray-500 mt-1">
            Run {row.project_id ? String(row.project_id).slice(0, 8) + '…' : '—'} · v{row.current_version} · {row.status}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ExportRecordMenu sections={exportSections} record={exportRecord} baseFilename={`TemplateCopy_${copyId?.slice(0, 8)}`} />
          <button
            type="button"
            onClick={() => exportCopyToExcel(row)}
            className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm"
          >
            Excel
          </button>
          <button
            type="button"
            onClick={() => exportCopyToPpt(row)}
            className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm"
          >
            PPT
          </button>
          <button
            type="button"
            onClick={() => navigate(`${BASE}/copies/${copyId}/edit`)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-600 text-white min-h-[44px]"
          >
            <Pencil className="h-4 w-4" /> Edit
          </button>
          <Link to={`${BASE}/copies/${copyId}/versions`} className="inline-flex items-center px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 min-h-[44px]">
            Version history
          </Link>
        </div>
      </div>
      <pre className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-900/40 p-4 text-sm text-gray-200 overflow-auto">
        {JSON.stringify(row.content || {}, null, 2)}
      </pre>
    </div>
  )
}
