/**
 * Risk Review Service
 * Provides risk review management functionality
 */

import { platformDb } from './supabase/supabaseClient';

/**
 * Schedule a risk review
 * @param {string} registerId - Risk register ID
 * @param {string} reviewDate - Review date
 * @returns {Promise<Object>} Update result
 */
export async function scheduleReview(registerId, reviewDate) {
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
      .from('risk_registers')
      .update({
        next_review_date: reviewDate,
        updated_by: userRecord.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', registerId)
      .select()
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error scheduling review:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Conduct a risk review
 * @param {string} registerId - Risk register ID
 * @param {Object} reviewData - Review data
 * @returns {Promise<Object>} Created review
 */
export async function conductReview(registerId, reviewData) {
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
      .from('risk_reviews')
      .insert({
        risk_register_id: registerId,
        review_date: reviewData.review_date || new Date().toISOString().split('T')[0],
        review_type: reviewData.review_type || 'scheduled',
        reviewed_by: userRecord.id,
        participants: reviewData.participants || [],
        risks_reviewed_count: reviewData.risks_reviewed_count || 0,
        new_risks_identified: reviewData.new_risks_identified || 0,
        risks_closed: reviewData.risks_closed || 0,
        key_findings: reviewData.key_findings,
        actions_arising: reviewData.actions_arising,
        next_review_date: reviewData.next_review_date
      })
      .select()
      .single();

    if (error) throw error;

    // Update register with review dates
    await platformDb
      .from('risk_registers')
      .update({
        last_review_date: reviewData.review_date || new Date().toISOString().split('T')[0],
        next_review_date: reviewData.next_review_date,
        updated_by: userRecord.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', registerId);

    return { success: true, data };
  } catch (error) {
    console.error('Error conducting review:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get review history for a register
 * @param {string} registerId - Risk register ID
 * @returns {Promise<Object>} Review history
 */
export async function getReviewHistory(registerId) {
  try {
    const { data, error } = await platformDb
      .from('risk_reviews')
      .select(`
        *,
        reviewed_by_user:reviewed_by(id, full_name, email)
      `)
      .eq('risk_register_id', registerId)
      .order('review_date', { ascending: false });

    if (error) throw error;

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Error fetching review history:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get upcoming reviews for a user
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Upcoming reviews
 */
export async function getUpcomingReviews(userId) {
  try {
    // Get projects where user is PM or team manager
    const { data: projects } = await platformDb
      .from('user_projects')
      .select('project_id')
      .eq('user_id', userId)
      .in('access_level', ['owner', 'admin'])
      .eq('is_deleted', false);

    if (!projects || projects.length === 0) {
      return { success: true, data: [] };
    }

    const projectIds = projects.map(p => p.project_id);

    const { data, error } = await platformDb
      .from('risk_registers')
      .select(`
        *,
        projects:project_id(id, project_name, project_code)
      `)
      .in('project_id', projectIds)
      .eq('is_deleted', false)
      .gte('next_review_date', new Date().toISOString().split('T')[0])
      .order('next_review_date', { ascending: true })
      .limit(10);

    if (error) throw error;

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Error fetching upcoming reviews:', error);
    return { success: false, error: error.message };
  }
}
