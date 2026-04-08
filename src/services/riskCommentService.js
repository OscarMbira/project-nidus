/**
 * Risk Comment Service
 * Provides comment management for risks
 */

import { platformDb } from './supabase/supabaseClient';

/**
 * Get comments for a risk
 * @param {string} riskId - Risk ID
 * @returns {Promise<Object>} Comments data
 */
export async function getCommentsByRisk(riskId) {
  try {
    const { data, error } = await platformDb
      .from('risk_comments')
      .select(`
        *,
        commented_by_user:commented_by(id, full_name, email)
      `)
      .eq('risk_id', riskId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: true });

    if (error) throw error;

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Error fetching risk comments:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Add a comment to a risk
 * @param {string} riskId - Risk ID
 * @param {string} commentText - Comment text
 * @returns {Promise<Object>} Created comment
 */
export async function addComment(riskId, commentText) {
  try {
    const { data: { user } } = await platformDb.auth.getUser();
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    const { data: userRecord } = await platformDb
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .eq('is_deleted', false)
      .single();

    if (!userRecord) {
      return { success: false, error: 'User record not found' };
    }

    const { data, error } = await platformDb
      .from('risk_comments')
      .insert({
        risk_id: riskId,
        comment_text: commentText.trim(),
        commented_by: userRecord.id
      })
      .select(`
        *,
        commented_by_user:commented_by(id, full_name, email)
      `)
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error adding comment:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Update a comment
 * @param {string} commentId - Comment ID
 * @param {string} commentText - Updated comment text
 * @returns {Promise<Object>} Updated comment
 */
export async function updateComment(commentId, commentText) {
  try {
    const { data, error } = await platformDb
      .from('risk_comments')
      .update({
        comment_text: commentText.trim(),
        updated_at: new Date().toISOString()
      })
      .eq('id', commentId)
      .select(`
        *,
        commented_by_user:commented_by(id, full_name, email)
      `)
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error updating comment:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Delete a comment
 * @param {string} commentId - Comment ID
 * @returns {Promise<Object>} Deletion result
 */
export async function deleteComment(commentId) {
  try {
    const { data: { user } } = await platformDb.auth.getUser();
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    const { data: userRecord } = await platformDb
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .eq('is_deleted', false)
      .single();

    const { error } = await platformDb
      .from('risk_comments')
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        deleted_by: userRecord.id
      })
      .eq('id', commentId);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error('Error deleting comment:', error);
    return { success: false, error: error.message };
  }
}
