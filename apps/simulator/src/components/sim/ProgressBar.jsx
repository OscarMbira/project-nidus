import React from 'react';
import { useTheme } from '../../context/ThemeContext';

const ProgressBar = ({ 
  currentXP, 
  xpToNext, 
  level, 
  showLabels = true,
  size = 'default' 
}) => {
  const { theme } = useTheme();
  
  const progress = xpToNext > 0 ? (currentXP / xpToNext) * 100 : 0;
  const xpInCurrentLevel = currentXP % (xpToNext / (level > 1 ? 1.5 : 1)) || currentXP;

  const sizeClasses = {
    small: 'h-2 text-xs',
    default: 'h-4 text-sm',
    large: 'h-6 text-base',
  };

  return (
    <div className="w-full">
      {showLabels && (
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <span className={`font-semibold ${theme === 'dark' ? 'text-gray-200' : 'text-gray-800'}`}>
              Level {level}
            </span>
            <span className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} ${sizeClasses[size]}`}>
              {xpInCurrentLevel.toLocaleString()} / {xpToNext.toLocaleString()} XP
            </span>
          </div>
          <span className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} ${sizeClasses[size]}`}>
            {progress.toFixed(1)}%
          </span>
        </div>
      )}
      
      <div className={`w-full ${sizeClasses[size].split(' ')[0]} rounded-full overflow-hidden ${
        theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'
      }`}>
        <div
          className={`h-full rounded-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 transition-all duration-500 relative ${
            progress >= 100 ? 'animate-pulse' : ''
          }`}
          style={{ width: `${Math.min(progress, 100)}%` }}
        >
          {progress >= 100 && (
            <div className="absolute inset-0 bg-white opacity-30 animate-shimmer"></div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProgressBar;

