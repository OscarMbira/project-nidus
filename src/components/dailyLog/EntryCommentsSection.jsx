/**
 * Entry Comments Section Component
 * Comments on daily log entries
 */

import { useState, useEffect } from 'react';
import { platformDb } from '../../services/supabase/supabaseClient';
import { MessageSquare, Send, Edit2, Trash2, X } from 'lucide-react';

export default function EntryCommentsSection({ entryId }) {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editText, setEditText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);

  useEffect(() => {
    const getCurrentUserId = async () => {
      const { data: { user } } = await platformDb.auth.getUser();
      if (user) {
        const { data: userRecord } = await platformDb
          .from('users')
          .select('id')
          .eq('auth_user_id', user.id)
          .eq('is_deleted', false)
          .single();
        setCurrentUserId(userRecord?.id);
      }
    };
    getCurrentUserId();
  }, []);

  useEffect(() => {
    if (entryId) {
      fetchComments();
    }
  }, [entryId]);

  const fetchComments = async () => {
    try {
      setLoading(true);
      const { data, error } = await platformDb
        .from('daily_log_comments')
        .select(`
          *,
          commented_by_user:commented_by(id, full_name, email)
        `)
        .eq('entry_id', entryId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setComments(data || []);
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      setSubmitting(true);
      const { data: { user } } = await platformDb.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data: userRecord } = await platformDb
        .from('users')
        .select('id')
        .eq('auth_user_id', user.id)
        .eq('is_deleted', false)
        .single();

      if (!userRecord) throw new Error('User record not found');

      const { data, error } = await platformDb
        .from('daily_log_comments')
        .insert({
          entry_id: entryId,
          comment_text: newComment.trim(),
          commented_by: userRecord.id
        })
        .select(`
          *,
          commented_by_user:commented_by(id, full_name, email)
        `)
        .single();

      if (error) throw error;

      setComments([...comments, data]);
      setNewComment('');
    } catch (error) {
      console.error('Error adding comment:', error);
      alert('Error adding comment: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async (commentId) => {
    if (!editText.trim()) return;

    try {
      const { data, error } = await platformDb
        .from('daily_log_comments')
        .update({ comment_text: editText.trim() })
        .eq('id', commentId)
        .select(`
          *,
          commented_by_user:commented_by(id, full_name, email)
        `)
        .single();

      if (error) throw error;

      setComments(comments.map(c => c.id === commentId ? data : c));
      setEditingCommentId(null);
      setEditText('');
    } catch (error) {
      console.error('Error updating comment:', error);
      alert('Error updating comment: ' + error.message);
    }
  };

  const handleDelete = async (commentId) => {
    if (!confirm('Are you sure you want to delete this comment?')) return;

    try {
      const { error } = await platformDb
        .from('daily_log_comments')
        .update({ is_deleted: true, deleted_at: new Date().toISOString() })
        .eq('id', commentId);

      if (error) throw error;

      setComments(comments.filter(c => c.id !== commentId));
    } catch (error) {
      console.error('Error deleting comment:', error);
      alert('Error deleting comment: ' + error.message);
    }
  };

  if (loading) {
    return <div className="text-center text-gray-500 py-4">Loading comments...</div>;
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <MessageSquare className="w-5 h-5" />
        Comments ({comments.length})
      </h3>

      {/* Comments List */}
      <div className="space-y-3">
        {comments.length === 0 ? (
          <p className="text-gray-500 text-sm">No comments yet. Be the first to comment!</p>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="bg-gray-50 rounded-lg p-4">
              {editingCommentId === comment.id ? (
                <div className="space-y-2">
                  <textarea
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    rows={3}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(comment.id)}
                      className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => {
                        setEditingCommentId(null);
                        setEditText('');
                      }}
                      className="px-3 py-1 bg-gray-200 text-gray-700 rounded text-sm hover:bg-gray-300"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="font-medium text-sm">
                        {comment.commented_by_user?.full_name || 'Unknown User'}
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(comment.created_at).toLocaleString()}
                      </div>
                    </div>
                    {currentUserId === comment.commented_by && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setEditingCommentId(comment.id);
                            setEditText(comment.comment_text);
                          }}
                          className="text-blue-600 hover:text-blue-800"
                          title="Edit comment"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(comment.id)}
                          className="text-red-600 hover:text-red-800"
                          title="Delete comment"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                  <p className="text-gray-700 whitespace-pre-wrap">{comment.comment_text}</p>
                </>
              )}
            </div>
          ))
        )}
      </div>

      {/* Add Comment Form */}
      <form onSubmit={handleSubmit} className="space-y-2">
        <textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Add a comment..."
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
          rows={3}
        />
        <button
          type="submit"
          disabled={submitting || !newComment.trim()}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Send className="w-4 h-4" />
          {submitting ? 'Posting...' : 'Post Comment'}
        </button>
      </form>
    </div>
  );
}
