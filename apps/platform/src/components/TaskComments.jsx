import { useState, useEffect } from 'react'
import { supabase } from '../services/supabaseClient'
import { MessageSquare, Send, Edit2, Trash2, X } from 'lucide-react'
import { format } from 'date-fns'

export default function TaskComments({ taskId }) {
  const [comments, setComments] = useState([])
  const [loading, setLoading] = useState(true)
  const [newComment, setNewComment] = useState('')
  const [editingCommentId, setEditingCommentId] = useState(null)
  const [editText, setEditText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [currentUserId, setCurrentUserId] = useState(null)

  useEffect(() => {
    const getCurrentUserId = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setCurrentUserId(user?.id)
    }
    getCurrentUserId()
  }, [])

  useEffect(() => {
    fetchComments()
    
    // Set up real-time subscription for comments
    const channel = supabase
      .channel(`task_comments:${taskId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'task_comments',
        filter: `task_id=eq.${taskId}`
      }, (payload) => {
        if (payload.eventType === 'INSERT') {
          fetchComment(payload.new.id)
        } else if (payload.eventType === 'UPDATE') {
          setComments(prev => prev.map(c => c.id === payload.new.id ? payload.new : c))
        } else if (payload.eventType === 'DELETE') {
          setComments(prev => prev.filter(c => c.id !== payload.old.id))
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [taskId])

  const fetchComments = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('task_comments')
        .select(`
          *,
          user:user_id (id, full_name, email),
          created_by_user:created_by (id, full_name, email)
        `)
        .eq('task_id', taskId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: true })

      if (error) throw error
      setComments(data || [])
    } catch (error) {
      console.error('Error fetching comments:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchComment = async (commentId) => {
    try {
      const { data, error } = await supabase
        .from('task_comments')
        .select(`
          *,
          user:user_id (id, full_name, email),
          created_by_user:created_by (id, full_name, email)
        `)
        .eq('id', commentId)
        .single()

      if (error) throw error
      setComments(prev => [...prev, data])
    } catch (error) {
      console.error('Error fetching comment:', error)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!newComment.trim()) return

    try {
      setSubmitting(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      const { data, error } = await supabase
        .from('task_comments')
        .insert({
          task_id: taskId,
          comment_text: newComment.trim(),
          user_id: user.id,
          created_by: user.id
        })
        .select(`
          *,
          user:user_id (id, full_name, email),
          created_by_user:created_by (id, full_name, email)
        `)
        .single()

      if (error) throw error

      setNewComment('')
      setComments(prev => [...prev, data])
    } catch (error) {
      console.error('Error adding comment:', error)
      alert('Error adding comment: ' + error.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleEdit = (comment) => {
    setEditingCommentId(comment.id)
    setEditText(comment.comment_text)
  }

  const handleSaveEdit = async (commentId) => {
    if (!editText.trim()) return

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      const { error } = await supabase
        .from('task_comments')
        .update({
          comment_text: editText.trim(),
          is_edited: true,
          updated_by: user.id
        })
        .eq('id', commentId)

      if (error) throw error

      setEditingCommentId(null)
      setEditText('')
      await fetchComments()
    } catch (error) {
      console.error('Error updating comment:', error)
      alert('Error updating comment: ' + error.message)
    }
  }

  const handleCancelEdit = () => {
    setEditingCommentId(null)
    setEditText('')
  }

  const handleDelete = async (commentId) => {
    if (!confirm('Are you sure you want to delete this comment?')) return

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      const { error } = await supabase
        .from('task_comments')
        .update({
          is_deleted: true,
          deleted_at: new Date().toISOString(),
          deleted_by: user.id
        })
        .eq('id', commentId)

      if (error) throw error

      setComments(prev => prev.filter(c => c.id !== commentId))
    } catch (error) {
      console.error('Error deleting comment:', error)
      alert('Error deleting comment: ' + error.message)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
        <MessageSquare className="h-5 w-5" />
        Comments ({comments.length})
      </h3>

      {/* Comments List */}
      <div className="space-y-4 max-h-96 overflow-y-auto">
        {comments.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 text-center py-8">
            No comments yet. Be the first to comment!
          </p>
        ) : (
          comments.map((comment) => {
            const isEditing = editingCommentId === comment.id
            const userName = comment.user?.full_name || comment.user?.email || 'Unknown User'
            const userInitial = userName.charAt(0).toUpperCase()

            return (
              <div
                key={comment.id}
                className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4"
              >
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                    <span className="text-blue-600 dark:text-blue-400 text-xs font-medium">
                      {userInitial}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {userName}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {format(new Date(comment.created_at), 'MMM d, yyyy h:mm a')}
                        </span>
                        {comment.is_edited && (
                          <span className="text-xs text-gray-500 dark:text-gray-400 italic">
                            (edited)
                          </span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        {!isEditing && currentUserId === comment.user_id && (
                          <>
                            <button
                              onClick={() => handleEdit(comment)}
                              className="text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400"
                              title="Edit comment"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(comment.id)}
                              className="text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400"
                              title="Delete comment"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                    {isEditing ? (
                      <div className="space-y-2">
                        <textarea
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleSaveEdit(comment.id)}
                            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded"
                          >
                            Save
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            className="px-3 py-1 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm rounded hover:bg-gray-50 dark:hover:bg-gray-700"
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
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Add Comment Form */}
      <form onSubmit={handleSubmit} className="space-y-2">
        <textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Add a comment..."
          rows={3}
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
        />
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={!newComment.trim() || submitting}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="h-4 w-4" />
            {submitting ? 'Posting...' : 'Post Comment'}
          </button>
        </div>
      </form>
    </div>
  )
}

