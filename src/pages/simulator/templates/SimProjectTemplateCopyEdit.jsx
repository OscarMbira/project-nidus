import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Save } from 'lucide-react'
import { getCopyById, updateCopy } from '../../../services/sim/simProjectTemplateCopyService'

const BASE = '/simulator/templates'

export default function ProjectTemplateCopyEdit() {
  const { copyId } = useParams()
  const navigate = useNavigate()
  const [row, setRow] = useState(null)
  const [contentJson, setContentJson] = useState('{}')
  const [title, setTitle] = useState('')
  const [changeNote, setChangeNote] = useState('')
  const [err, setErr] = useState(null)
  const [success, setSuccess] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    ;(async () => {
      const { data, error } = await getCopyById(copyId)
      if (error || !data) {
        setErr(error?.message || 'Not found')
        return
      }
      setRow(data)
      setTitle(data.title)
      setContentJson(JSON.stringify(data.content || {}, null, 2))
    })()
  }, [copyId])

  const save = async () => {
    let content
    try {
      content = JSON.parse(contentJson || '{}')
    } catch {
      setErr('Invalid JSON')
      return
    }
    setSaving(true)
    setErr(null)
    const { data, error } = await updateCopy(
      copyId,
      { title: title.trim(), content },
      { changeNote: changeNote.trim() || undefined }
    )
    setSaving(false)
    if (error) {
      setErr(error.message)
      return
    }
    setSuccess({ id: data.id, version: data.current_version, op: 'updated' })
  }

  if (err && !row) return <div className="p-8 text-red-600">{err}</div>
  if (!row) return <div className="p-8 text-gray-600">Loading…</div>

  if (success) {
    return (
      <div className="max-w-lg mx-auto px-4 py-12 text-center">
        <div className="rounded-xl border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 p-6">
          <p className="text-green-800 dark:text-green-200 font-medium">Saved successfully ({success.op}).</p>
          <p className="text-sm text-gray-600 mt-2">
            Copy ID: {success.id} · Version: {success.version}
          </p>
          <button type="button" className="mt-6 px-4 py-2 rounded-lg bg-violet-600 text-white" onClick={() => navigate(`${BASE}/copies/${copyId}`)}>
            View
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <Link to={`${BASE}/copies/${copyId}`} className="inline-flex items-center gap-2 text-gray-600 mb-6">
        <ArrowLeft className="h-4 w-4" /> Back
      </Link>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Edit project template copy</h1>
      {err && <p className="text-red-600 mb-4">{err}</p>}
      <label className="block mb-4">
        <span className="text-sm">Title</span>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2"
        />
      </label>
      <label className="block mb-4">
        <span className="text-sm">Optional change note</span>
        <input
          value={changeNote}
          onChange={(e) => setChangeNote(e.target.value)}
          className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2"
        />
      </label>
      <label className="block mb-4">
        <span className="text-sm">Content (JSON)</span>
        <textarea
          value={contentJson}
          onChange={(e) => setContentJson(e.target.value)}
          rows={16}
          className="mt-1 w-full font-mono text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-900 text-gray-100 px-3 py-2"
        />
      </label>
      <button
        type="button"
        disabled={saving}
        onClick={save}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-600 text-white"
      >
        <Save className="h-4 w-4" /> Save
      </button>
    </div>
  )
}
