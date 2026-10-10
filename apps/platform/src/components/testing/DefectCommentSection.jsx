import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
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
      const data = await getComments(defectId)
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
      toast.success('Comment posted.')
      await load()
    } catch (err) {
      console.error(err)
      toast.error('Could not post this comment. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/40 p-4">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Comments</h3>
      {loading ? (
        <p className="text-xs text-gray-500 dark:text-gray-400">Loading…</p>
      ) : (
        <ul className="space-y-3 mb-4 max-h-64 overflow-y-auto">
          {comments.length === 0 && <li className="text-xs text-gray-500 dark:text-gray-400">No comments yet.</li>}
          {comments.map((c) => (
            <li key={c.id} className="text-sm border-b border-gray-100 dark:border-gray-800 pb-2">
              <p className="text-gray-700 dark:text-gray-200 whitespace-pre-wrap">{c.comment}</p>
              <p className="text-[11px] text-gray-500 dark:text-gray-500 mt-1">{new Date(c.created_at).toLocaleString()}</p>
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
          className="flex-1 bg-white dark:bg-gray-950 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white"
        />
        <button
          type="submit"
          disabled={saving || !currentUserId}
          className="self-end px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm disabled:opacity-50"
        >
          Post
        </button>
      </form>
    </div>
  )
}
