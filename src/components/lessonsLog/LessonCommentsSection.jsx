/**
 * Lesson Comments Section Component
 * Discussion thread for lessons
 */

import { useState, useEffect } from 'react';
import { platformDb } from '../../services/supabase/supabaseClient';
import { MessageSquare, Send, Edit2, Trash2 } from 'lucide-react';

export default function LessonCommentsSection({ lessonId }) {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
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
    if (lessonId) {
      fetchComments();
    }
  }, [lessonId]);

  const fetchComments = async () => {
    try {
      setLoading(true);
      const { data, error } = await platformDb
        .from('lesson_comments')
        .select(`
          *,
          commented_by_user:commented_by(id, full_name, email)
        `)
        .eq('lesson_id', lessonId)
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
    if (!newComment.trim() || !currentUserId) return;

    try {
      setSubmitting(true);
      const { error } = await platformDb
        .from('lesson_comments')
        .insert({
          lesson_id: lessonId,
          comment_text: newComment.trim(),
          commented_by: currentUserId
        });

      if (error) throw error;
      setNewComment('');
      fetchComments();
    } catch (error) {
      console.error('Error adding comment:', error);
      alert('Error adding comment: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (commentId) => {
    if (!confirm('Delete this comment?')) return;

    try {
      const { error } = await platformDb
        .from('lesson_comments')
        .update({ is_deleted: true, deleted_at: new Date().toISOString() })
        .eq('id', commentId);

      if (error) throw error;
      fetchComments();
    } catch (error) {
      console.error('Error deleting comment:', error);
      alert('Error deleting comment: ' + error.message);
    }
  };

  if (loading) {
    return <div className="text-center py-4 text-gray-500">Loading comments...</div>;
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
        <MessageSquare className="w-5 h-5" />
        Comments ({comments.length})
      </h3>

      {/* Comment Form */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Add a comment..."
          rows={3}
          className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
        />
        <button
          type="submit"
          disabled={submitting || !newComment.trim()}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
        >
          <Send className="w-4 h-4" />
          Post
        </button>
      </form>

      {/* Comments List */}
      <div className="space-y-3">
        {comments.map((comment) => (
          <div key={comment.id} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-gray-900 dark:text-white">
                    {comment.commented_by_user?.full_name || 'Unknown'}
                  </span>
                  <span className="text-xs text-gray-500">
                    {new Date(comment.created_at).toLocaleString()}
                  </span>
                </div>
                <p className="text-gray-700 dark:text-gray-300">{comment.comment_text}</p>
              </div>
              {comment.commented_by === currentUserId && (
                <button
                  onClick={() => handleDelete(comment.id)}
                  className="text-red-600 hover:text-red-800"
                  title="Delete comment"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
