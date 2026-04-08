import { useState, useEffect } from 'react'
import { supabase } from '../../services/supabaseClient'
import { format } from 'date-fns'
import { Send, User, Edit2, Trash2, Eye, EyeOff } from 'lucide-react'

export default function IssueCommentsSection({ issueId, comments, onRefresh }) {
  const [newComment, setNewComment] = useState('')
  const [commentType, setCommentType] = useState('general')
  const [isInternal, setIsInternal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editText, setEditText] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!newComment.trim()) return

    try {
      setSaving(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      const { data: userData } = await supabase
        .from('users')
        .select('id')
        .eq('auth_user_id', user.id)
        .single()

      if (!userData) throw new Error('User not found')

      const { error } = await supabase
        .from('issue_comments')
        .insert({
          issue_id: issueId,
          user_id: userData.id,
          comment_text: newComment.trim(),
          comment_type: commentType,
          is_internal_note: isInternal
        })

      if (error) throw error

      setNewComment('')
      setCommentType('general')
      setIsInternal(false)
      onRefresh()
    } catch (error) {
      console.error('Error adding comment:', error)
      alert('Error adding comment: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (comment) => {
    setEditingId(comment.id)
    setEditText(comment.comment_text)
  }

  const handleSaveEdit = async (commentId) => {
    try {
      const { error } = await supabase
        .from('issue_comments')
        .update({
          comment_text: editText.trim(),
          is_edited: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', commentId)

      if (error) throw error

      setEditingId(null)
      setEditText('')
      onRefresh()
    } catch (error) {
      console.error('Error updating comment:', error)
      alert('Error updating comment: ' + error.message)
    }
  }

  const handleDelete = async (commentId) => {
    if (!confirm('Are you sure you want to delete this comment?')) return

    try {
      const { error } = await supabase
        .from('issue_comments')
        .update({
          is_deleted: true,
          deleted_at: new Date().toISOString()
        })
        .eq('id', commentId)

      if (error) throw error
      onRefresh()
    } catch (error) {
      console.error('Error deleting comment:', error)
      alert('Error deleting comment: ' + error.message)
    }
  }

  const getCommentTypeColor = (type) => {
    switch (type) {
      case 'decision':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
      case 'update':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
      case 'question':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
      case 'answer':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
    }
  }

  return (
    <div>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Comments ({comments.length})
      </h3>

      {/* Add Comment Form */}
      <form onSubmit={handleSubmit} className="mb-6">
        <div className="mb-3">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            rows={3}
            placeholder="Add a comment..."
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          />
        </div>
        <div className="flex items-center gap-4 mb-3">
          <select
            value={commentType}
            onChange={(e) => setCommentType(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          >
            <option value="general">General</option>
            <option value="update">Update</option>
            <option value="question">Question</option>
            <option value="answer">Answer</option>
            <option value="decision">Decision</option>
          </select>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isInternal}
              onChange={(e) => setIsInternal(e.target.checked)}
              className="h-4 w-4 text-blue-600 rounded border-gray-300"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300 flex items-center gap-1">
              {isInternal ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              Internal Note (PM only)
            </span>
          </label>
        </div>
        <button
          type="submit"
          disabled={saving || !newComment.trim()}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 disabled:opacity-50"
        >
          <Send className="h-4 w-4" />
          {saving ? 'Posting...' : 'Post Comment'}
        </button>
      </form>

      {/* Comments List */}
      {comments.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <p>No comments yet. Be the first to comment!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {comments.map((comment) => (
            <div
              key={comment.id}
              className={`bg-white dark:bg-gray-800 rounded-lg border ${
                comment.is_internal_note
                  ? 'border-purple-300 dark:border-purple-700 bg-purple-50 dark:bg-purple-900/20'
                  : 'border-gray-200 dark:border-gray-700'
              } p-4`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <User className="h-5 w-5 text-gray-400" />
                  <span className="font-medium text-gray-900 dark:text-white">
                    {comment.user?.full_name || comment.user?.email || 'Unknown'}
                  </span>
                  {comment.is_internal_note && (
                    <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 rounded text-xs flex items-center gap-1">
                      <EyeOff className="h-3 w-3" />
                      Internal
                    </span>
                  )}
                  <span className={`px-2 py-0.5 rounded text-xs ${getCommentTypeColor(comment.comment_type)}`}>
                    {comment.comment_type}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {format(new Date(comment.created_at), 'MMM dd, yyyy HH:mm')}
                  </span>
                  {comment.is_edited && (
                    <span className="text-xs text-gray-500 dark:text-gray-400">(edited)</span>
                  )}
                  <button
                    onClick={() => handleEdit(comment)}
                    className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    <Edit2 className="h-3 w-3" />
                  </button>
                  <button
                    onClick={() => handleDelete(comment.id)}
                    className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
              {editingId === comment.id ? (
                <div>
                  <textarea
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 mb-2"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleSaveEdit(comment.id)}
                      className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => {
                        setEditingId(null)
                        setEditText('')
                      }}
                      className="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white rounded text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                  {comment.comment_text}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
