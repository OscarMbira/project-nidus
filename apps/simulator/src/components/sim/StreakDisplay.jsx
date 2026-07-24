import React from 'react';
import { useTheme } from '../../context/ThemeContext';
import { Flame, Zap } from 'lucide-react';

const StreakDisplay = ({ currentStreak, longestStreak, showBonus = false }) => {
  const { theme } = useTheme();

  const getStreakBonus = (streak) => {
    if (streak >= 30) return { multiplier: 2.0, label: 'Legendary' };
    if (streak >= 14) return { multiplier: 1.5, label: 'Amazing' };
    if (streak >= 7) return { multiplier: 1.25, label: 'Great' };
    if (streak >= 3) return { multiplier: 1.1, label: 'Good' };
    return { multiplier: 1.0, label: 'Starting' };
  };

  const bonus = getStreakBonus(currentStreak);

  return (
    <div className={`rounded-lg p-4 ${
      theme === 'dark' ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
    }`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className={`p-2 rounded-lg ${
            currentStreak >= 7 
              ? 'bg-orange-100 dark:bg-orange-900/30' 
              : 'bg-yellow-100 dark:bg-yellow-900/30'
          }`}>
            <Flame className={`w-6 h-6 ${
              currentStreak >= 7 ? 'text-orange-500' : 'text-yellow-500'
            } ${currentStreak > 0 ? 'animate-pulse' : ''}`} />
          </div>
          <div>
            <div className={`text-2xl font-bold ${
              theme === 'dark' ? 'text-gray-200' : 'text-gray-800'
            }`}>
              {currentStreak} {currentStreak === 1 ? 'day' : 'days'}
            </div>
            <div className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              Current Streak
            </div>
          </div>
        </div>

        {showBonus && currentStreak > 0 && (
          <div className="text-right">
            <div className="flex items-center space-x-1 text-green-500">
              <Zap className="w-4 h-4" />
              <span className="text-sm font-semibold">
                {bonus.multiplier}x XP
              </span>
            </div>
            <div className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              {bonus.label} Bonus
            </div>
          </div>
        )}

        {longestStreak > currentStreak && (
          <div className="text-right ml-4">
            <div className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              Best: {longestStreak} days
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StreakDisplay;

