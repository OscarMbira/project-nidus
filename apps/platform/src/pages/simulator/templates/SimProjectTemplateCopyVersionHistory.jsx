import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, RotateCcw } from 'lucide-react'
import { getCopyVersionHistory, restoreCopyVersion, getCopyById } from '../../../services/sim/simProjectTemplateCopyService'

const BASE = '/simulator/templates'

export default function ProjectTemplateCopyVersionHistory() {
  const { copyId } = useParams()
  const navigate = useNavigate()
  const [rows, setRows] = useState([])
  const [title, setTitle] = useState('')
  const [currentV, setCurrentV] = useState(null)
  const [pick, setPick] = useState(null)
  const [err, setErr] = useState(null)

  const load = async () => {
    const { data: c } = await getCopyById(copyId)
    setTitle(c?.title || '')
    setCurrentV(c?.current_version)
    const { data, error } = await getCopyVersionHistory(copyId)
    if (error) setErr(error.message)
    setRows(data || [])
  }

  useEffect(() => {
    load()
  }, [copyId])

  const restore = async () => {
    if (!pick) return
    if (
      !window.confirm(
        `Restore content from version ${pick.version_number}? This creates a new version on save (current v${currentV}).`
      )
    )
      return
    const { error } = await restoreCopyVersion(copyId, pick.version_number, { confirmNote: 'Restored from v' })
    if (error) setErr(error.message)
    else navigate(`${BASE}/copies/${copyId}`)
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <Link to={`${BASE}/copies/${copyId}`} className="inline-flex items-center gap-2 text-gray-600 mb-6">
        <ArrowLeft className="h-4 w-4" /> Back
      </Link>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Version history</h1>
      <p className="text-gray-600 dark:text-gray-400 mb-4">{title}</p>
      <p className="text-sm text-gray-500 mb-4">Current version: {currentV}</p>
      {err && <p className="text-red-600 mb-4">{err}</p>}
      <ul className="space-y-2 mb-6">
        {rows.map((r) => (
          <li key={r.id} className="flex justify-between items-center rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-3">
            <button type="button" className="text-left" onClick={() => setPick(r)}>
              <span className="font-medium">v{r.version_number}</span>
              <span className="text-sm text-gray-500 ml-2">{r.changed_at ? new Date(r.changed_at).toLocaleString() : ''}</span>
              {r.change_description && <p className="text-xs text-gray-500">{r.change_description}</p>}
            </button>
            {pick?.id === r.id && <span className="text-xs text-violet-500">selected</span>}
          </li>
        ))}
      </ul>
      <button
        type="button"
        disabled={!pick}
        onClick={restore}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-600 text-white disabled:opacity-50"
      >
        <RotateCcw className="h-4 w-4" /> Restore selected version
      </button>
    </div>
  )
}
