import { useState, useEffect } from 'react'
import { getDefectComments, addDefectComment } from '../../services/defectService'

export default function DefectCommentSection({
  defectId,
  currentUserId,
  getComments = getDefectComments,
  addComment = addDefectComment,
}) {
  const [comments, setComments] = useState([])
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const load = async () => {
    if (!defectId) return
    setLoading(true)
    try {
      const data = await getDefectComments(defectId)
      setComments(data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [defectId])

  const add = async (e) => {
    e.preventDefault()
    if (!text.trim() || !currentUserId) return
    setSaving(true)
    try {
      await addComment(defectId, { comment: text.trim(), created_by: currentUserId })
      setText('')
      await load()
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900/40 p-4">
      <h3 className="text-sm font-semibold text-white mb-3">Comments</h3>
      {loading ? (
        <p className="text-xs text-gray-500">Loading…</p>
      ) : (
        <ul className="space-y-3 mb-4 max-h-64 overflow-y-auto">
          {comments.length === 0 && <li className="text-xs text-gray-500">No comments yet.</li>}
          {comments.map((c) => (
            <li key={c.id} className="text-sm border-b border-gray-800 pb-2">
              <p className="text-gray-200 whitespace-pre-wrap">{c.comment}</p>
              <p className="text-[11px] text-gray-500 mt-1">{new Date(c.created_at).toLocaleString()}</p>
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={add} className="flex gap-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={2}
          placeholder="Add a comment…"
          className="flex-1 bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
        />
        <button
          type="submit"
          disabled={saving || !currentUserId}
          className="self-end px-3 py-2 rounded-lg bg-emerald-600 text-white text-sm disabled:opacity-50"
        >
          Post
        </button>
      </form>
    </div>
  )
}
