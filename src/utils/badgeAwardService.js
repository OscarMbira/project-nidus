/**
 * Badge Award Service
 * 
 * Handles badge awarding logic based on user achievements
 */

import { simDb } from '../services/supabase/supabaseClient';

/**
 * Check and award badges for a user
 */
export async function checkAndAwardBadges(userId, context = {}) {
  try {
    // Get user progress
    const { data: progress, error: progressError } = await simDb
      .from('user_progress')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (progressError) throw progressError;

    // Get user's simulation runs
    const { data: runs, error: runsError } = await simDb
      .from('simulation_runs')
      .select('*, scenarios(*)')
      .eq('user_id', userId)
      .eq('status', 'completed');

    if (runsError) throw runsError;

    // Get user's earned badges
    const { data: earnedBadges, error: badgesError } = await simDb
      .from('user_badges')
      .select('badge_id')
      .eq('user_id', userId);

    if (badgesError) throw badgesError;
    const earnedBadgeIds = new Set(earnedBadges.map(b => b.badge_id));

    // Get all active badges
    const { data: allBadges, error: allBadgesError } = await simDb
      .from('badges')
      .select('*')
      .eq('is_active', true);

    if (allBadgesError) throw allBadgesError;

    // Check each badge
    const newlyAwarded = [];
    for (const badge of allBadges) {
      // Skip if already earned
      if (earnedBadgeIds.has(badge.id)) continue;

      // Check if badge requirements are met
      const shouldAward = await checkBadgeRequirements(badge, progress, runs, context);

      if (shouldAward) {
        // Award the badge
        const { data: awarded, error: awardError } = await simDb
          .from('user_badges')
          .insert({
            user_id: userId,
            badge_id: badge.id,
            context: context,
          })
          .select()
          .single();

        if (awardError) {
          console.error(`Error awarding badge ${badge.badge_key}:`, awardError);
          continue;
        }

        // Add XP reward if badge has one
        if (badge.xp_reward > 0) {
          // This would typically call addUserXP, but we'll handle it separately
          // to avoid circular dependencies
        }

        newlyAwarded.push({ ...badge, awarded_at: awarded.earned_at });
      }
    }

    return { success: true, newlyAwarded };
  } catch (error) {
    console.error('Error checking badges:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Check if badge requirements are met
 */
async function checkBadgeRequirements(badge, progress, runs, context) {
  const requirements = badge.requirements || {};

  if (!requirements.type) return false;

  switch (requirements.type) {
    case 'simulations_completed':
      return (progress.completed_scenarios || 0) >= (requirements.value || 0);

    case 'score_achieved':
      return (progress.highest_score || 0) >= (requirements.value || 0);

    case 'high_scores':
      const highScoreRuns = runs.filter(r => 
        r.total_score && r.max_possible_score && 
        (r.total_score / r.max_possible_score) * 100 >= 90
      );
      return highScoreRuns.length >= (requirements.value || 0);

    case 'consistent_scores':
      const recentRuns = runs.slice(0, requirements.value || 10);
      if (recentRuns.length < requirements.value) return false;
      return recentRuns.every(r => {
        const score = r.total_score && r.max_possible_score 
          ? (r.total_score / r.max_possible_score) * 100 
          : 0;
        return score >= 80;
      });

    case 'methodology':
      const methodologyRuns = runs.filter(r => 
        r.scenarios?.methodology === requirements.methodology
      );
      return methodologyRuns.length >= (requirements.value || 0);

    case 'methodologies_completed':
      const methodologies = new Set(runs.map(r => r.scenarios?.methodology).filter(Boolean));
      return methodologies.size >= (requirements.value || 0);

    case 'industry':
      const industryRuns = runs.filter(r => 
        r.scenarios?.industry === requirements.industry
      );
      return industryRuns.length >= (requirements.value || 0);

    case 'industries_completed':
      const industries = new Set(runs.map(r => r.scenarios?.industry).filter(Boolean));
      return industries.size >= (requirements.value || 0);

    case 'role':
      const roleRuns = runs.filter(r => 
        r.scenarios?.target_role === requirements.role
      );
      return roleRuns.length >= (requirements.value || 0);

    case 'streak_days':
      return (progress.current_streak || 0) >= (requirements.value || 0);

    case 'subscription':
      // This would check subscription status
      return false; // Implement based on subscription logic

    case 'custom_scenarios':
      // This would check custom scenario creation
      return false; // Implement based on custom scenarios

    case 'positive_reviews':
      // This would check scenario reviews
      return false; // Implement based on review logic

    case 'special':
      // Special badges (e.g., beta tester, early adopter)
      return false; // These are typically awarded manually

    default:
      return false;
  }
}

/**
 * Get user's badge progress
 */
export async function getBadgeProgress(userId, badgeId) {
  try {
    const { data: badge, error: badgeError } = await simDb
      .from('badges')
      .select('*')
      .eq('id', badgeId)
      .single();

    if (badgeError) throw badgeError;

    const { data: progress, error: progressError } = await simDb
      .from('user_progress')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (progressError) throw progressError;

    const { data: runs, error: runsError } = await simDb
      .from('simulation_runs')
      .select('*, scenarios(*)')
      .eq('user_id', userId)
      .eq('status', 'completed');

    if (runsError) throw runsError;

    const requirements = badge.requirements || {};
    let current = 0;
    let target = requirements.value || 0;

    switch (requirements.type) {
      case 'simulations_completed':
        current = progress.completed_scenarios || 0;
        break;
      case 'score_achieved':
        current = progress.highest_score || 0;
        break;
      case 'streak_days':
        current = progress.current_streak || 0;
        break;
      // Add more cases as needed
    }

    return {
      current,
      target,
      progress: target > 0 ? (current / target) * 100 : 0,
      isEarned: current >= target,
    };
  } catch (error) {
    console.error('Error getting badge progress:', error);
    return null;
  }
}

export default {
  checkAndAwardBadges,
  getBadgeProgress,
};

