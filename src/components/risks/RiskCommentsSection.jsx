/**
 * Risk Comments Section Component
 * Discussion thread for risks
 */

import { useState, useEffect } from 'react'
import { MessageSquare, Send, Edit2, Trash2, User } from 'lucide-react'
import { platformDb } from '../../services/supabase/supabaseClient'
import { getCommentsByRisk, addComment, updateComment, deleteComment } from '../../services/riskCommentService'

export default function RiskCommentsSection({ riskId }) {
  const [comments, setComments] = useState([])
  const [loading, setLoading] = useState(false)
  const [newComment, setNewComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editText, setEditText] = useState('')
  const [currentUserId, setCurrentUserId] = useState(null)

  useEffect(() => {
    const getCurrentUserId = async () => {
      const { data: { user } } = await platformDb.auth.getUser()
      if (user) {
        const { data: userRecord } = await platformDb
          .from('users')
          .select('id')
          .eq('auth_user_id', user.id)
          .eq('is_deleted', false)
          .single()
        setCurrentUserId(userRecord?.id)
      }
    }
    getCurrentUserId()
  }, [])

  useEffect(() => {
    if (riskId) {
      fetchComments()
    }
  }, [riskId])

  const fetchComments = async () => {
    try {
      setLoading(true)
      const result = await getCommentsByRisk(riskId)
      if (result.success) {
        setComments(result.data || [])
      }
    } catch (error) {
      console.error('Error fetching comments:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!newComment.trim()) return

    try {
      setSubmitting(true)
      const result = await addComment(riskId, newComment)
      if (result.success) {
        setNewComment('')
        fetchComments()
      } else {
        alert('Error: ' + result.error)
      }
    } catch (error) {
      console.error('Error adding comment:', error)
      alert('Error adding comment: ' + error.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleEdit = (comment) => {
    setEditingId(comment.id)
    setEditText(comment.comment_text)
  }

  const handleSaveEdit = async (commentId) => {
    try {
      const result = await updateComment(commentId, editText)
      if (result.success) {
        setEditingId(null)
        setEditText('')
        fetchComments()
      } else {
        alert('Error: ' + result.error)
      }
    } catch (error) {
      console.error('Error updating comment:', error)
      alert('Error updating comment: ' + error.message)
    }
  }

  const handleDelete = async (commentId) => {
    if (!confirm('Are you sure you want to delete this comment?')) return

    try {
      const result = await deleteComment(commentId)
      if (result.success) {
        fetchComments()
      } else {
        alert('Error: ' + result.error)
      }
    } catch (error) {
      console.error('Error deleting comment:', error)
      alert('Error deleting comment: ' + error.message)
    }
  }

  const formatDate = (dateStr) => {
    try {
      return new Date(dateStr).toLocaleString()
    } catch {
      return dateStr
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Comments & Discussion
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Discuss and collaborate on this risk
        </p>
      </div>

      {/* Add Comment Form */}
      <form onSubmit={handleSubmit} className="space-y-3">
        <textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Add a comment..."
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
        />
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={submitting || !newComment.trim()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="h-4 w-4" />
            {submitting ? 'Posting...' : 'Post Comment'}
          </button>
        </div>
      </form>

      {/* Comments List */}
      {loading ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          Loading comments...
        </div>
      ) : comments.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
          <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-500 dark:text-gray-400">No comments yet. Be the first to comment!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {comments.map((comment) => {
            const isOwner = currentUserId === comment.commented_by
            const isEditing = editingId === comment.id

            return (
              <div
                key={comment.id}
                className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                    <User className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-medium text-gray-900 dark:text-white">
                        {comment.commented_by_user?.full_name || comment.commented_by_user?.email || 'Unknown User'}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {formatDate(comment.created_at)}
                      </span>
                      {comment.updated_at !== comment.created_at && (
                        <span className="text-xs text-gray-400 dark:text-gray-500">(edited)</span>
                      )}
                    </div>

                    {isEditing ? (
                      <div className="space-y-2">
                        <textarea
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
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
                            className="px-3 py-1 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded text-sm"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap mb-2">
                          {comment.comment_text}
                        </p>
                        {isOwner && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleEdit(comment)}
                              className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1"
                            >
                              <Edit2 className="h-3 w-3" />
                              Edit
                            </button>
                            <button
                              onClick={() => handleDelete(comment.id)}
                              className="text-xs text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 flex items-center gap-1"
                            >
                              <Trash2 className="h-3 w-3" />
                              Delete
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
