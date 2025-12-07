/**
 * Simulator Service
 *
 * Handles all simulator-related database operations
 * Uses simDb client for sim schema operations
 */

import { simDb } from './supabase/supabaseClient';

// =============================================
// SCENARIOS
// =============================================

/**
 * Get all active scenarios with optional filters
 */
export const getScenarios = async (filters = {}) => {
  let query = simDb
    .from('scenarios')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (filters.industry) {
    query = query.eq('industry', filters.industry);
  }
  if (filters.methodology) {
    query = query.eq('methodology', filters.methodology);
  }
  if (filters.difficulty_level) {
    query = query.eq('difficulty_level', filters.difficulty_level);
  }
  if (filters.target_role) {
    query = query.eq('target_role', filters.target_role);
  }
  if (filters.is_premium !== undefined) {
    query = query.eq('is_premium', filters.is_premium);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
};

/**
 * Get a single scenario by ID
 */
export const getScenarioById = async (scenarioId) => {
  const { data, error } = await simDb
    .from('scenarios')
    .select(`
      *,
      scenario_phases (*)
    `)
    .eq('id', scenarioId)
    .single();

  if (error) throw error;
  return data;
};

/**
 * Get featured scenarios
 */
export const getFeaturedScenarios = async (limit = 6) => {
  const { data, error } = await simDb
    .from('scenarios')
    .select('*')
    .eq('is_active', true)
    .eq('is_featured', true)
    .order('sort_order', { ascending: true })
    .limit(limit);

  if (error) throw error;
  return data;
};

// =============================================
// SIMULATION RUNS
// =============================================

/**
 * Start a new simulation run
 */
export const startSimulation = async (userId, scenarioId) => {
  const { data, error } = await simDb
    .from('simulation_runs')
    .insert({
      user_id: userId,
      scenario_id: scenarioId,
      status: 'in_progress',
      started_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw error;
  return data;
};

/**
 * Get user's simulation runs
 */
export const getUserRuns = async (userId, status = null) => {
  let query = simDb
    .from('simulation_runs')
    .select(`
      *,
      scenarios (
        id,
        name,
        industry,
        methodology,
        difficulty_level,
        thumbnail_url
      )
    `)
    .eq('user_id', userId)
    .order('started_at', { ascending: false });

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
};

/**
 * Get a specific simulation run
 */
export const getRunById = async (runId) => {
  const { data, error } = await simDb
    .from('simulation_runs')
    .select(`
      *,
      scenarios (*),
      ai_events (*),
      module_scores (*)
    `)
    .eq('id', runId)
    .single();

  if (error) throw error;
  return data;
};

/**
 * Update simulation run state
 */
export const updateRunState = async (runId, updates) => {
  const { data, error } = await simDb
    .from('simulation_runs')
    .update({
      ...updates,
      last_activity_at: new Date().toISOString(),
    })
    .eq('id', runId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

/**
 * Complete a simulation run
 */
export const completeSimulation = async (runId, finalScore, timeSpent) => {
  const { data, error } = await simDb
    .from('simulation_runs')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      total_score: finalScore,
      time_spent_minutes: timeSpent,
    })
    .eq('id', runId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

// =============================================
// USER PROGRESS
// =============================================

/**
 * Get or create user progress
 */
export const getUserProgress = async (userId) => {
  const { data, error } = await simDb
    .from('user_progress')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error && error.code === 'PGRST116') {
    // No progress found, create new
    return createUserProgress(userId);
  }
  if (error) throw error;
  return data;
};

/**
 * Create initial user progress
 */
export const createUserProgress = async (userId) => {
  const { data, error } = await simDb
    .from('user_progress')
    .insert({
      user_id: userId,
      total_xp: 0,
      current_level: 1,
      xp_to_next_level: 100,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
};

/**
 * Update user progress
 */
export const updateUserProgress = async (userId, updates) => {
  const { data, error } = await simDb
    .from('user_progress')
    .update(updates)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

/**
 * Complete skill assessment
 */
export const completeSkillAssessment = async (userId, results) => {
  const { data, error } = await simDb
    .from('user_progress')
    .update({
      skill_assessment_completed: true,
      skill_assessment_results: results,
      preferred_role: results.recommended_role,
    })
    .eq('user_id', userId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

/**
 * Complete onboarding
 */
export const completeOnboarding = async (userId) => {
  const { data, error } = await simDb
    .from('user_progress')
    .update({
      onboarding_completed: true,
    })
    .eq('user_id', userId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

/**
 * Calculate streak bonus multiplier
 */
const getStreakBonus = (streak) => {
  if (streak >= 30) return 2.0;
  if (streak >= 14) return 1.5;
  if (streak >= 7) return 1.25;
  if (streak >= 3) return 1.1;
  return 1.0;
};

/**
 * Add XP to user progress and handle level ups
 * Supports streak bonuses
 */
export const addUserXP = async (userId, xpAmount, applyStreakBonus = true) => {
  const progress = await getUserProgress(userId);

  // Apply streak bonus if enabled
  let finalXpAmount = xpAmount;
  if (applyStreakBonus && progress.current_streak > 0) {
    const streakMultiplier = getStreakBonus(progress.current_streak);
    finalXpAmount = Math.floor(xpAmount * streakMultiplier);
  }

  let newTotalXP = progress.total_xp + finalXpAmount;
  let newLevel = progress.current_level;
  let xpToNext = progress.xp_to_next_level;

  // Calculate level ups (XP required doubles each level)
  while (newTotalXP >= xpToNext) {
    newTotalXP -= xpToNext;
    newLevel++;
    xpToNext = 100 * Math.pow(1.5, newLevel - 1);
  }

  const { data, error } = await simDb
    .from('user_progress')
    .update({
      total_xp: progress.total_xp + finalXpAmount,
      current_level: newLevel,
      xp_to_next_level: Math.floor(xpToNext),
    })
    .eq('user_id', userId)
    .select()
    .single();

  if (error) throw error;
  return {
    ...data,
    xpGained: finalXpAmount,
    baseXp: xpAmount,
    streakBonus: applyStreakBonus && progress.current_streak > 0 
      ? getStreakBonus(progress.current_streak) 
      : 1.0,
    leveledUp: newLevel > progress.current_level,
    previousLevel: progress.current_level,
    newLevel: newLevel,
  };
};

/**
 * Update user streak
 */
export const updateUserStreak = async (userId) => {
  const progress = await getUserProgress(userId);
  const today = new Date().toDateString();
  const lastActivity = progress.last_activity_date ? new Date(progress.last_activity_date).toDateString() : null;

  let newStreak = progress.current_streak || 0;
  let longestStreak = progress.longest_streak || 0;

  if (lastActivity === today) {
    // Already active today
    return progress;
  }

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  if (lastActivity === yesterday.toDateString()) {
    // Continuing streak
    newStreak++;
  } else {
    // Streak broken
    newStreak = 1;
  }

  if (newStreak > longestStreak) {
    longestStreak = newStreak;
  }

  const { data, error } = await simDb
    .from('user_progress')
    .update({
      current_streak: newStreak,
      longest_streak: longestStreak,
      last_activity_date: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

/**
 * Save preferred role
 */
export const savePreferredRole = async (userId, role) => {
  const { data, error } = await simDb
    .from('user_progress')
    .update({
      preferred_role: role,
    })
    .eq('user_id', userId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

// =============================================
// LEADERBOARDS
// =============================================

/**
 * Get leaderboard entries
 */
export const getLeaderboard = async (type = 'global', limit = 100) => {
  const { data, error } = await simDb
    .from('leaderboard_entries')
    .select(`
      *,
      user:user_id (
        id,
        email
      )
    `)
    .eq('leaderboard_type', type)
    .order('score', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data;
};

/**
 * Get user's rank in leaderboard
 */
export const getUserRank = async (userId, type = 'global') => {
  const { data, error } = await simDb
    .from('leaderboard_entries')
    .select('rank, score')
    .eq('user_id', userId)
    .eq('leaderboard_type', type)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data;
};

// =============================================
// CERTIFICATES
// =============================================

/**
 * Get user's certificates
 */
export const getUserCertificates = async (userId) => {
  const { data, error } = await simDb
    .from('certificates')
    .select('*')
    .eq('user_id', userId)
    .order('issue_date', { ascending: false });

  if (error) throw error;
  return data;
};

/**
 * Get certificate by verification code
 */
export const verifyCertificate = async (verificationCode) => {
  const { data, error } = await simDb
    .from('certificates')
    .select('*')
    .eq('verification_code', verificationCode)
    .single();

  if (error) throw error;
  return data;
};

// =============================================
// SUBSCRIPTIONS
// =============================================

/**
 * Get user's active subscription
 */
export const getUserSubscription = async (userId) => {
  const { data, error } = await simDb
    .from('simulator_subscriptions')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('started_at', { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data;
};

/**
 * Check if user has premium access
 */
export const checkPremiumAccess = async (userId) => {
  const subscription = await getUserSubscription(userId);
  if (!subscription) return false;

  return ['professional', 'enterprise', 'lifetime_basic', 'lifetime_professional', 'lifetime_ultimate']
    .includes(subscription.plan_type);
};

// =============================================
// BADGES
// =============================================

/**
 * Get all badges
 */
export const getAllBadges = async () => {
  const { data, error } = await simDb
    .from('badges')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (error) throw error;
  return data;
};

/**
 * Get user's earned badges
 */
export const getUserBadges = async (userId) => {
  const { data, error } = await simDb
    .from('user_badges')
    .select(`
      *,
      badge:badge_id (*)
    `)
    .eq('user_id', userId)
    .order('earned_at', { ascending: false });

  if (error) throw error;
  return data;
};

// =============================================
// ASSESSMENT
// =============================================

/**
 * Get assessment questions
 */
export const getAssessmentQuestions = async () => {
  const { data, error } = await simDb
    .from('assessment_questions')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (error) throw error;
  return data;
};

/**
 * Submit assessment responses
 */
export const submitAssessmentResponses = async (userId, responses) => {
  const formattedResponses = responses.map(r => ({
    user_id: userId,
    question_id: r.question_id,
    response: r.response,
    is_correct: r.is_correct,
    score: r.score,
  }));

  const { data, error } = await simDb
    .from('assessment_responses')
    .insert(formattedResponses)
    .select();

  if (error) throw error;
  return data;
};

// =============================================
// SCENARIO PACKS
// =============================================

/**
 * Get available scenario packs
 */
export const getScenarioPacks = async () => {
  const { data, error } = await simDb
    .from('scenario_packs')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (error) throw error;
  return data;
};

// =============================================
// DASHBOARD DATA
// =============================================

/**
 * Get comprehensive dashboard data for user
 */
export const getDashboardData = async (userId) => {
  const [progress, recentRuns, certificates, subscription] = await Promise.all([
    getUserProgress(userId),
    getUserRuns(userId),
    getUserCertificates(userId),
    getUserSubscription(userId),
  ]);

  const inProgressRuns = recentRuns.filter(r => r.status === 'in_progress');
  const completedRuns = recentRuns.filter(r => r.status === 'completed');

  return {
    progress,
    inProgressRuns,
    completedRuns: completedRuns.slice(0, 5),
    totalCompleted: completedRuns.length,
    certificates,
    subscription,
    hasPremium: subscription?.plan_type ?
      ['professional', 'enterprise', 'lifetime_basic', 'lifetime_professional', 'lifetime_ultimate']
        .includes(subscription.plan_type) : false,
  };
};

export default {
  // Scenarios
  getScenarios,
  getScenarioById,
  getFeaturedScenarios,
  // Runs
  startSimulation,
  getUserRuns,
  getRunById,
  updateRunState,
  completeSimulation,
  // Progress
  getUserProgress,
  createUserProgress,
  updateUserProgress,
  completeSkillAssessment,
  completeOnboarding,
  addUserXP,
  updateUserStreak,
  savePreferredRole,
  // Leaderboards
  getLeaderboard,
  getUserRank,
  // Certificates
  getUserCertificates,
  verifyCertificate,
  // Subscriptions
  getUserSubscription,
  checkPremiumAccess,
  // Badges
  getAllBadges,
  getUserBadges,
  // Assessment
  getAssessmentQuestions,
  submitAssessmentResponses,
  // Packs
  getScenarioPacks,
  // Dashboard
  getDashboardData,
};
