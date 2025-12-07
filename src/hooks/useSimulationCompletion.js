/**
 * Simulation Completion Hook
 * 
 * Handles all gamification features when simulation completes
 */

import { useState, useCallback } from 'react';
import { addUserXP, updateUserStreak, completeSimulation } from '../services/simulatorService';
import { checkAndAwardBadges } from '../utils/badgeAwardService';
import { updateLeaderboard } from '../utils/leaderboardService';

export const useSimulationCompletion = () => {
  const [processing, setProcessing] = useState(false);
  const [levelUp, setLevelUp] = useState(null);
  const [newBadges, setNewBadges] = useState([]);
  const [completionData, setCompletionData] = useState(null);

  const handleCompletion = useCallback(async (runId, userId, scenario, finalScore, timeSpent, responses) => {
    setProcessing(true);
    try {
      // 1. Update streak first (needed for XP bonus calculation)
      await updateUserStreak(userId);

      // 2. Calculate and award XP
      const baseXP = Math.round(finalScore * 1.5); // Base XP from score
      const xpResult = await addUserXP(userId, baseXP, true); // Apply streak bonus

      // 3. Check for level up
      if (xpResult.leveledUp) {
        setLevelUp({
          previousLevel: xpResult.previousLevel,
          newLevel: xpResult.newLevel,
          xpGained: xpResult.xpGained,
          baseXp: xpResult.baseXp,
          streakBonus: xpResult.streakBonus,
        });
      }

      // 4. Check and award badges
      const badgeResult = await checkAndAwardBadges(userId, {
        scenario,
        score: finalScore,
        responses,
        timeSpent,
      });

      if (badgeResult.success && badgeResult.newlyAwarded.length > 0) {
        setNewBadges(badgeResult.newlyAwarded);
      }

      // 5. Update leaderboards
      await updateLeaderboard(userId, finalScore, {
        methodology: scenario.methodology,
        industry: scenario.industry,
        role: scenario.target_role,
      });

      // 6. Complete simulation run
      await completeSimulation(runId, finalScore, timeSpent);

      // 7. Prepare completion data
      const completion = {
        runId,
        finalScore,
        timeSpent,
        xpEarned: xpResult.xpGained,
        baseXp: xpResult.baseXp,
        streakBonus: xpResult.streakBonus,
        leveledUp: xpResult.leveledUp,
        newLevel: xpResult.newLevel,
        previousLevel: xpResult.previousLevel,
        badgesEarned: badgeResult.newlyAwarded || [],
        scenario,
      };

      setCompletionData(completion);
      return completion;
    } catch (error) {
      console.error('Error handling simulation completion:', error);
      throw error;
    } finally {
      setProcessing(false);
    }
  }, []);

  const clearNotifications = useCallback(() => {
    setLevelUp(null);
    setNewBadges([]);
  }, []);

  return {
    handleCompletion,
    processing,
    levelUp,
    newBadges,
    completionData,
    clearNotifications,
  };
};

export default useSimulationCompletion;

