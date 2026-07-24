import React from 'react';
import { useLocation } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';

const SimulatorPlaceholder = () => {
  const { theme } = useTheme();
  const location = useLocation();

  // Extract page name from path
  const getPageName = () => {
    const path = location.pathname.split('/').pop();
    return path
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      <div className={`text-center p-8 rounded-xl ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} shadow-lg max-w-md`}>
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold mb-2">{getPageName()}</h2>
        <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
          This feature is coming soon in a future update.
        </p>
        <div className="mt-4">
          <span className={`inline-block px-3 py-1 text-sm rounded-full ${theme === 'dark' ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>
            Phase 1 - Foundation
          </span>
        </div>
      </div>
    </div>
  );
};

export default SimulatorPlaceholder;
