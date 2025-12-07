/**
 * Leaderboard Service
 * 
 * Handles leaderboard calculations, updates, and periodic resets
 */

import { simDb } from '../services/supabase/supabaseClient';

/**
 * Update leaderboard entries for a user
 */
export async function updateLeaderboard(userId, score, context = {}) {
  try {
    const { methodology, industry, role } = context;

    // Update global leaderboard
    await updateLeaderboardEntry(userId, 'global', null, score);

    // Update role-specific leaderboard
    if (role) {
      await updateLeaderboardEntry(userId, 'role', role, score);
    }

    // Update methodology-specific leaderboard
    if (methodology) {
      await updateLeaderboardEntry(userId, 'methodology', methodology, score);
    }

    // Update industry-specific leaderboard
    if (industry) {
      await updateLeaderboardEntry(userId, 'industry', industry, score);
    }

    // Update weekly leaderboard
    await updatePeriodicLeaderboard(userId, 'weekly', score);

    // Update monthly leaderboard
    await updatePeriodicLeaderboard(userId, 'monthly', score);

    return { success: true };
  } catch (error) {
    console.error('Error updating leaderboard:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Update a specific leaderboard entry
 */
async function updateLeaderboardEntry(userId, type, category, score) {
  const { data: existing, error: fetchError } = await simDb
    .from('leaderboard_entries')
    .select('*')
    .eq('user_id', userId)
    .eq('leaderboard_type', type)
    .eq('category', category || null)
    .is('period_start', null)
    .single();

  if (fetchError && fetchError.code !== 'PGRST116') {
    throw fetchError;
  }

  if (existing) {
    // Update existing entry
    const { error: updateError } = await simDb
      .from('leaderboard_entries')
      .update({
        score: existing.score + score,
        simulations_count: existing.simulations_count + 1,
        recorded_at: new Date().toISOString(),
      })
      .eq('id', existing.id);

    if (updateError) throw updateError;
  } else {
    // Create new entry
    const { error: insertError } = await simDb
      .from('leaderboard_entries')
      .insert({
        user_id: userId,
        leaderboard_type: type,
        category: category || null,
        score: score,
        simulations_count: 1,
      });

    if (insertError) throw insertError;
  }
}

/**
 * Update periodic leaderboard (weekly/monthly)
 */
async function updatePeriodicLeaderboard(userId, period, score) {
  const now = new Date();
  let periodStart, periodEnd;

  if (period === 'weekly') {
    // Get start of current week (Monday)
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    periodStart = new Date(now.setDate(diff));
    periodStart.setHours(0, 0, 0, 0);
    periodEnd = new Date(periodStart);
    periodEnd.setDate(periodEnd.getDate() + 7);
  } else if (period === 'monthly') {
    // Get start of current month
    periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  }

  const { data: existing, error: fetchError } = await simDb
    .from('leaderboard_entries')
    .select('*')
    .eq('user_id', userId)
    .eq('leaderboard_type', period)
    .eq('period_start', periodStart.toISOString().split('T')[0])
    .single();

  if (fetchError && fetchError.code !== 'PGRST116') {
    throw fetchError;
  }

  if (existing) {
    // Update existing entry
    const { error: updateError } = await simDb
      .from('leaderboard_entries')
      .update({
        score: existing.score + score,
        simulations_count: existing.simulations_count + 1,
        recorded_at: new Date().toISOString(),
      })
      .eq('id', existing.id);

    if (updateError) throw updateError;
  } else {
    // Create new entry
    const { error: insertError } = await simDb
      .from('leaderboard_entries')
      .insert({
        user_id: userId,
        leaderboard_type: period,
        period: period,
        period_start: periodStart.toISOString().split('T')[0],
        period_end: periodEnd.toISOString().split('T')[0],
        score: score,
        simulations_count: 1,
      });

    if (insertError) throw insertError;
  }
}

/**
 * Recalculate ranks for a leaderboard
 */
export async function recalculateRanks(type, category = null, periodStart = null) {
  try {
    let query = simDb
      .from('leaderboard_entries')
      .select('*')
      .eq('leaderboard_type', type)
      .order('score', { ascending: false });

    if (category) {
      query = query.eq('category', category);
    } else {
      query = query.is('category', null);
    }

    if (periodStart) {
      query = query.eq('period_start', periodStart);
    } else {
      query = query.is('period_start', null);
    }

    const { data: entries, error } = await query;

    if (error) throw error;

    // Update ranks
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      const previousRank = entry.rank;
      const newRank = i + 1;

      if (previousRank !== newRank) {
        await simDb
          .from('leaderboard_entries')
          .update({
            rank: newRank,
            previous_rank: previousRank,
          })
          .eq('id', entry.id);
      }
    }

    return { success: true, updated: entries.length };
  } catch (error) {
    console.error('Error recalculating ranks:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Reset periodic leaderboards (weekly/monthly)
 */
export async function resetPeriodicLeaderboard(period) {
  try {
    const now = new Date();
    let cutoffDate;

    if (period === 'weekly') {
      // Reset entries older than 1 week
      cutoffDate = new Date(now);
      cutoffDate.setDate(cutoffDate.getDate() - 7);
    } else if (period === 'monthly') {
      // Reset entries older than 1 month
      cutoffDate = new Date(now);
      cutoffDate.setMonth(cutoffDate.getMonth() - 1);
    }

    // Archive old entries (optional - could move to archive table)
    // For now, we'll just mark them as inactive or delete them
    const { error } = await simDb
      .from('leaderboard_entries')
      .delete()
      .eq('leaderboard_type', period)
      .lt('period_end', cutoffDate.toISOString().split('T')[0]);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error('Error resetting leaderboard:', error);
    return { success: false, error: error.message };
  }
}

export default {
  updateLeaderboard,
  recalculateRanks,
  resetPeriodicLeaderboard,
};

