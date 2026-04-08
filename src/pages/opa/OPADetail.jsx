import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Pencil, Trash2 } from 'lucide-react'
import { deleteOPA, getOPAById } from '../../services/opaService'
import ExportRecordMenu from '../../components/ui/ExportRecordMenu'

export default function OPADetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [row, setRow] = useState(null)
  const [err, setErr] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let c = false
    ;(async () => {
      setLoading(true)
      const { data, error } = await getOPAById(id)
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
          { key: 'opa_type', label: 'OPA type' },
          { key: 'status', label: 'Status' },
          { key: 'version', label: 'Version' },
          { key: 'is_on_hold', label: 'On hold' },
          { key: 'on_hold_reason', label: 'On-hold reason' },
        ],
      },
      {
        title: 'Document',
        fields: [
          { key: 'document_reference', label: 'Document reference' },
          { key: 'effective_date', label: 'Effective date' },
          { key: 'expiry_date', label: 'Expiry date' },
          { key: 'tags_display', label: 'Tags' },
        ],
      },
      {
        title: 'Notes',
        fields: [{ key: 'notes', label: 'Notes' }],
      },
    ]
  }, [row])

  const record = useMemo(() => {
    if (!row) return {}
    return {
      ...row,
      is_on_hold: row.is_on_hold ? 'Yes' : 'No',
      tags_display: Array.isArray(row.tags) ? row.tags.join('\n') : '',
      category: row.category?.name,
    }
  }, [row])

  const handleDelete = async () => {
    if (!window.confirm('Delete this OPA record?')) return
    const { error } = await deleteOPA(id)
    if (error) {
      alert(error.message)
      return
    }
    navigate('/platform/opa')
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
      <Link to="/platform/opa" className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 mb-6">
        <ArrowLeft className="h-4 w-4" /> Back
      </Link>
      <div className="flex flex-wrap justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{row.title}</h1>
        <div className="flex flex-wrap gap-2">
          <ExportRecordMenu sections={sections} record={record} baseFilename={`OPA_${row.id}`} />
          <button
            type="button"
            onClick={() => navigate(`/platform/opa/${id}/edit`)}
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
          <dd className="text-gray-900 dark:text-white">{row.opa_type}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase text-gray-500">Status</dt>
          <dd className="text-gray-900 dark:text-white">{row.status}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase text-gray-500">Version</dt>
          <dd className="text-gray-900 dark:text-white">{row.version || '—'}</dd>
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
