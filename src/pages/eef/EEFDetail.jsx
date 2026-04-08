import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Pencil, Trash2 } from 'lucide-react'
import { deleteEEF, getEEFById } from '../../services/eefService'
import ExportRecordMenu from '../../components/ui/ExportRecordMenu'

export default function EEFDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [row, setRow] = useState(null)
  const [err, setErr] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let c = false
    ;(async () => {
      setLoading(true)
      const { data, error } = await getEEFById(id)
      if (c) return
      if (error) setErr(error.message)
      setRow(data)
      setLoading(false)
    })()
    return () => {
      c = true
    }
  }, [id])

  const sections = useMemo(() => {
    if (!row) return []
    return [
      {
        title: 'Summary',
        fields: [
          { key: 'title', label: 'Title' },
          { key: 'description', label: 'Description' },
          { key: 'eef_type', label: 'EEF type' },
          { key: 'status', label: 'Status' },
          { key: 'is_on_hold', label: 'On hold' },
          { key: 'on_hold_reason', label: 'On-hold reason' },
        ],
      },
      {
        title: 'Impact',
        fields: [
          { key: 'impact_level', label: 'Impact level' },
          { key: 'impact_direction', label: 'Impact direction' },
          { key: 'source_reference', label: 'Source / reference' },
        ],
      },
      {
        title: 'Context',
        fields: [
          { key: 'notes', label: 'Notes' },
          { key: 'related_project_id', label: 'Related project id' },
        ],
      },
    ]
  }, [row])

  const record = useMemo(() => {
    if (!row) return {}
    return {
      ...row,
      is_on_hold: row.is_on_hold ? 'Yes' : 'No',
      category: row.category?.name,
    }
  }, [row])

  const handleDelete = async () => {
    if (!window.confirm('Delete this EEF record?')) return
    const { error } = await deleteEEF(id)
    if (error) {
      alert(error.message)
      return
    }
    navigate('/platform/eef')
  }

  if (loading) return <div className="p-8 text-gray-600 dark:text-gray-400">Loading…</div>
  if (err || !row)
    return (
      <div className="p-8 text-red-600 dark:text-red-400">
        {err || 'Not found'}
      </div>
    )

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Link to="/platform/eef" className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 mb-6">
        <ArrowLeft className="h-4 w-4" /> Back
      </Link>
      <div className="flex flex-wrap justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{row.title}</h1>
        <div className="flex flex-wrap gap-2">
          <ExportRecordMenu sections={sections} record={record} baseFilename={`EEF_${row.id}`} />
          <button
            type="button"
            onClick={() => navigate(`/platform/eef/${id}/edit`)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600"
          >
            <Pencil className="h-4 w-4" /> Edit
          </button>
          <button type="button" onClick={handleDelete} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-red-300 text-red-700 dark:text-red-400">
            <Trash2 className="h-4 w-4" /> Delete
          </button>
        </div>
      </div>
      <dl className="grid sm:grid-cols-2 gap-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div>
          <dt className="text-xs uppercase text-gray-500">Type</dt>
          <dd className="text-gray-900 dark:text-white">{row.eef_type}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase text-gray-500">Status</dt>
          <dd className="text-gray-900 dark:text-white">{row.status}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase text-gray-500">Impact</dt>
          <dd className="text-gray-900 dark:text-white">
            {row.impact_level} / {row.impact_direction}
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase text-gray-500">Category</dt>
          <dd className="text-gray-900 dark:text-white">{row.category?.name || '—'}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-xs uppercase text-gray-500">Description</dt>
          <dd className="text-gray-900 dark:text-white whitespace-pre-wrap">{row.description || '—'}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-xs uppercase text-gray-500">Notes</dt>
          <dd className="text-gray-900 dark:text-white whitespace-pre-wrap">{row.notes || '—'}</dd>
        </div>
      </dl>
    </div>
  )
}
