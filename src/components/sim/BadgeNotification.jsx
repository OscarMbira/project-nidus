import React, { useEffect, useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { Award, X } from 'lucide-react';

const BadgeNotification = ({ badge, onClose }) => {
  const { theme } = useTheme();
  const [show, setShow] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShow(false);
      if (onClose) setTimeout(onClose, 300);
    }, 5000);

    return () => clearTimeout(timer);
  }, [onClose]);

  const handleClose = () => {
    setShow(false);
    if (onClose) setTimeout(onClose, 300);
  };

  if (!show) return null;

  return (
    <div className={`fixed top-4 right-4 z-50 transform transition-all duration-300 ${
      show ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
    }`}>
      <div className={`rounded-lg shadow-xl border-2 border-yellow-400 ${
        theme === 'dark' ? 'bg-gray-800' : 'bg-white'
      } p-4 max-w-sm`}>
        <div className="flex items-start space-x-3">
          <div className="p-2 rounded-lg bg-gradient-to-r from-yellow-400 to-orange-500 flex-shrink-0">
            <Award className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-semibold text-yellow-600 dark:text-yellow-400">
                Badge Earned!
              </h3>
              <button
                onClick={handleClose}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className={`font-medium mb-1 ${
              theme === 'dark' ? 'text-gray-200' : 'text-gray-800'
            }`}>
              {badge.name}
            </p>
            <p className={`text-sm ${
              theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
            }`}>
              {badge.description}
            </p>
            {badge.xp_reward > 0 && (
              <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                +{badge.xp_reward} XP awarded
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BadgeNotification;

