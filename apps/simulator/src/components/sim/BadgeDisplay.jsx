import React from 'react';
import { useThemeContext } from '../../context/ThemeContext';
import { Award, Lock } from 'lucide-react';
import { getBadgeIcon } from '../../utils/badgeIcons.jsx';

const BadgeDisplay = ({ badge, earned = false, showProgress = false, progress = null }) => {
  const { theme } = useThemeContext();

  const getCategoryColor = (category) => {
    const colors = {
      progression: 'from-blue-500 to-blue-600',
      skill: 'from-green-500 to-green-600',
      achievement: 'from-purple-500 to-purple-600',
      special: 'from-yellow-500 to-orange-500',
      streak: 'from-red-500 to-pink-500',
    };
    return colors[category] || 'from-gray-500 to-gray-600';
  };

  return (
    <div className={`relative rounded-lg p-4 border-2 transition-all ${
      earned
        ? `bg-gradient-to-br ${getCategoryColor(badge.category)} border-transparent`
        : theme === 'dark'
        ? 'bg-gray-800 border-gray-700 opacity-60'
        : 'bg-gray-100 border-gray-300 opacity-60'
    }`}>
      {!earned && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 rounded-lg">
          <Lock className="w-8 h-8 text-white opacity-50" />
        </div>
      )}

      <div className="relative">
        <div className="flex items-start space-x-3">
          <div className={`p-3 rounded-lg ${
            earned ? 'bg-white bg-opacity-20' : 'bg-gray-200 dark:bg-gray-700'
          }`}>
            {badge.icon_url ? (
              <img 
                src={badge.icon_url} 
                alt={badge.name}
                className="w-8 h-8"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'block';
                }}
              />
            ) : null}
            <div 
              className={`w-8 h-8 ${earned ? 'text-white' : 'text-gray-400'}`}
              style={{ display: badge.icon_url ? 'none' : 'block' }}
            >
              {getBadgeIcon(badge.category, earned)}
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <h3 className={`font-semibold mb-1 ${
              earned ? 'text-white' : theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
            }`}>
              {badge.name}
            </h3>
            <p className={`text-sm mb-2 ${
              earned ? 'text-white text-opacity-90' : theme === 'dark' ? 'text-gray-500' : 'text-gray-500'
            }`}>
              {badge.description}
            </p>

            {showProgress && progress && !earned && (
              <div className="mt-2">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
                    Progress
                  </span>
                  <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
                    {progress.current} / {progress.target}
                  </span>
                </div>
                <div className={`w-full h-1.5 rounded-full ${
                  theme === 'dark' ? 'bg-gray-700' : 'bg-gray-300'
                }`}>
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all"
                    style={{ width: `${Math.min(progress.progress, 100)}%` }}
                  />
                </div>
              </div>
            )}

            {badge.xp_reward > 0 && earned && (
              <div className="mt-2 text-xs text-white text-opacity-80">
                +{badge.xp_reward} XP
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BadgeDisplay;

