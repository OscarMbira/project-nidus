import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { getTemplateById, getMasterVersionHistory } from '../../../services/sim/simTemplateLibraryService'

const BASE = '/simulator/templates'

export default function TemplateMasterVersionHistory() {
  const { id } = useParams()
  const [title, setTitle] = useState('')
  const [rows, setRows] = useState([])
  const [err, setErr] = useState(null)
  const [a, setA] = useState(null)
  const [b, setB] = useState(null)

  useEffect(() => {
    ;(async () => {
      const { data: t } = await getTemplateById(id)
      setTitle(t?.title || '')
      const { data, error } = await getMasterVersionHistory(id)
      if (error) setErr(error.message)
      setRows(data || [])
    })()
  }, [id])

  const snapDiff = (va, vb) => {
    if (!va || !vb) return 'Select two versions to compare.'
    const ca = JSON.stringify(va.content_snapshot || {}, null, 2)
    const cb = JSON.stringify(vb.content_snapshot || {}, null, 2)
    return ca === cb ? 'No content difference.' : 'Content differs — compare JSON below.'
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <Link to={`${BASE}/${id}`} className="inline-flex items-center gap-2 text-gray-600 mb-6">
        <ArrowLeft className="h-4 w-4" /> Back
      </Link>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Master version history</h1>
      <p className="text-gray-600 dark:text-gray-400 mb-6">{title}</p>
      {err && <p className="text-red-600 mb-4">{err}</p>}
      <div className="grid md:grid-cols-2 gap-4 mb-6">
        <div>
          <label className="text-sm text-gray-500">Version A</label>
          <select
            value={a?.id || ''}
            onChange={(e) => setA(rows.find((r) => r.id === e.target.value) || null)}
            className="w-full mt-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2"
          >
            <option value="">—</option>
            {rows.map((r) => (
              <option key={r.id} value={r.id}>
                {r.version_number} · {r.changed_at ? new Date(r.changed_at).toLocaleString() : ''}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-sm text-gray-500">Version B</label>
          <select
            value={b?.id || ''}
            onChange={(e) => setB(rows.find((r) => r.id === e.target.value) || null)}
            className="w-full mt-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2"
          >
            <option value="">—</option>
            {rows.map((r) => (
              <option key={r.id} value={r.id}>
                {r.version_number} · {r.changed_at ? new Date(r.changed_at).toLocaleString() : ''}
              </option>
            ))}
          </select>
        </div>
      </div>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{snapDiff(a, b)}</p>
      <div className="grid md:grid-cols-2 gap-4">
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3 bg-gray-900/30 overflow-auto max-h-[480px]">
          <pre className="text-xs text-gray-200">{a ? JSON.stringify(a.content_snapshot, null, 2) : '—'}</pre>
        </div>
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3 bg-gray-900/30 overflow-auto max-h-[480px]">
          <pre className="text-xs text-gray-200">{b ? JSON.stringify(b.content_snapshot, null, 2) : '—'}</pre>
        </div>
      </div>
    </div>
  )
}
