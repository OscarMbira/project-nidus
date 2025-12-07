/**
 * Beta Program Service
 * 
 * Manages beta program enrollment, feedback collection, and surveys
 */

import { simDb } from './supabase/supabaseClient';

/**
 * Enroll user in beta program
 */
export async function enrollInBetaProgram(userId, cohort = 'beta_1', invitedBy = null) {
  try {
    const { data, error } = await simDb.rpc('enroll_in_beta_program', {
      user_id_param: userId,
      cohort_param: cohort,
      invited_by_param: invitedBy,
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error enrolling in beta program:', error);
    throw error;
  }
}

/**
 * Check if user is enrolled in beta program
 */
export async function isBetaUser(userId) {
  try {
    const { data, error } = await simDb
      .from('beta_program_enrollments')
      .select('id, status, cohort')
      .eq('user_id', userId)
      .eq('status', 'active')
      .single();

    if (error && error.code !== 'PGRST116') throw error; // PGRST116 means no rows found
    return data !== null;
  } catch (error) {
    console.error('Error checking beta user status:', error);
    return false;
  }
}

/**
 * Get user's beta enrollment
 */
export async function getBetaEnrollment(userId) {
  try {
    const { data, error } = await simDb
      .from('beta_program_enrollments')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  } catch (error) {
    console.error('Error getting beta enrollment:', error);
    return null;
  }
}

/**
 * Submit beta feedback
 */
export async function submitBetaFeedback(userId, feedbackData) {
  try {
    const { data, error } = await simDb.rpc('submit_beta_feedback', {
      user_id_param: userId,
      feedback_type_param: feedbackData.type,
      title_param: feedbackData.title,
      description_param: feedbackData.description,
      severity_param: feedbackData.severity || 'medium',
      tags_param: feedbackData.tags || [],
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error submitting beta feedback:', error);
    throw error;
  }
}

/**
 * Get beta feedback items
 */
export async function getBetaFeedback(filters = {}) {
  try {
    let query = simDb
      .from('beta_feedback')
      .select('*, user:user_id(id, email)')
      .order('created_at', { ascending: false });

    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    if (filters.type) {
      query = query.eq('feedback_type', filters.type);
    }
    if (filters.severity) {
      query = query.eq('severity', filters.severity);
    }
    if (filters.limit) {
      query = query.limit(filters.limit);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error getting beta feedback:', error);
    throw error;
  }
}

/**
 * Vote on feedback
 */
export async function voteOnFeedback(feedbackId, userId, voteType = 'upvote') {
  try {
    const { error } = await simDb.rpc('vote_on_feedback', {
      feedback_id_param: feedbackId,
      user_id_param: userId,
      vote_type_param: voteType,
    });

    if (error) throw error;
  } catch (error) {
    console.error('Error voting on feedback:', error);
    throw error;
  }
}

/**
 * Get active surveys
 */
export async function getActiveSurveys(userId = null) {
  try {
    let query = simDb
      .from('beta_surveys')
      .select('*')
      .eq('is_active', true)
      .gte('end_date', new Date().toISOString())
      .order('created_at', { ascending: false });

    const { data, error } = await query;
    if (error) throw error;

    // Check if user has already completed surveys
    if (userId && data.length > 0) {
      const surveyIds = data.map(s => s.id);
      const { data: responses } = await simDb
        .from('beta_survey_responses')
        .select('survey_id')
        .eq('user_id', userId)
        .in('survey_id', surveyIds);

      const completedIds = new Set(responses?.map(r => r.survey_id) || []);
      return data.map(survey => ({
        ...survey,
        completed: completedIds.has(survey.id),
      }));
    }

    return data;
  } catch (error) {
    console.error('Error getting active surveys:', error);
    throw error;
  }
}

/**
 * Submit survey response
 */
export async function submitSurveyResponse(surveyId, userId, responses) {
  try {
    const { data, error } = await simDb
      .from('beta_survey_responses')
      .insert({
        survey_id: surveyId,
        user_id: userId,
        responses,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error submitting survey response:', error);
    throw error;
  }
}

/**
 * Get beta program statistics
 */
export async function getBetaProgramStats() {
  try {
    const { data, error } = await simDb
      .from('beta_program_stats')
      .select('*');

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error getting beta program stats:', error);
    throw error;
  }
}

export default {
  enrollInBetaProgram,
  isBetaUser,
  getBetaEnrollment,
  submitBetaFeedback,
  getBetaFeedback,
  voteOnFeedback,
  getActiveSurveys,
  submitSurveyResponse,
  getBetaProgramStats,
};

