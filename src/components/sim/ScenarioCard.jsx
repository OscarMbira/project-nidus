import React from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';

const ScenarioCard = ({ scenario }) => {
  const { theme } = useTheme();

  const getDifficultyColor = (level) => {
    const colors = {
      beginner: 'bg-green-500',
      intermediate: 'bg-yellow-500',
      advanced: 'bg-orange-500',
      expert: 'bg-red-500',
    };
    return colors[level] || 'bg-gray-500';
  };

  const getMethodologyIcon = (methodology) => {
    switch (methodology?.toLowerCase()) {
      case 'scrum':
        return '🔄';
      case 'kanban':
        return '📋';
      case 'structured pm':
        return '📊';
      case 'agile':
        return '⚡';
      default:
        return '📁';
    }
  };

  return (
    <div
      className={`rounded-xl overflow-hidden ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} shadow hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1`}
    >
      {/* Thumbnail/Banner */}
      <div className="h-36 bg-gradient-to-r from-blue-500 to-purple-600 relative">
        {scenario.thumbnail_url ? (
          <img
            src={scenario.thumbnail_url}
            alt={scenario.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-4xl">{getMethodologyIcon(scenario.methodology)}</span>
          </div>
        )}

        {/* Premium Badge */}
        {scenario.is_premium && (
          <span className="absolute top-2 right-2 px-2 py-1 text-xs font-bold bg-yellow-400 text-black rounded-md shadow">
            PRO
          </span>
        )}

        {/* Industry Tag */}
        <span className={`absolute bottom-2 left-2 px-2 py-1 text-xs font-medium rounded ${theme === 'dark' ? 'bg-gray-900 bg-opacity-80' : 'bg-white bg-opacity-90'}`}>
          {scenario.industry}
        </span>
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-semibold text-lg mb-1 line-clamp-1">{scenario.name}</h3>
        <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} mb-3 line-clamp-2 h-10`}>
          {scenario.short_description || scenario.description}
        </p>

        {/* Meta Info */}
        <div className="flex items-center justify-between text-xs mb-3">
          <span className={`px-2 py-1 rounded ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-100'}`}>
            {scenario.methodology}
          </span>
          <span className="flex items-center">
            <span className={`w-2 h-2 rounded-full ${getDifficultyColor(scenario.difficulty_level)} mr-1`}></span>
            <span className="capitalize">{scenario.difficulty_level}</span>
          </span>
        </div>

        {/* Stats */}
        <div className={`flex items-center justify-between text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'} mb-3`}>
          <span className="flex items-center">
            <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {scenario.duration_minutes || scenario.estimated_time_display || '60'} min
          </span>
          {scenario.completions_count > 0 && (
            <span className="flex items-center">
              <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              {scenario.completions_count}
            </span>
          )}
          {scenario.rating > 0 && (
            <span className="flex items-center">
              <svg className="w-3.5 h-3.5 mr-1 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              {scenario.rating.toFixed(1)}
            </span>
          )}
        </div>

        {/* Action Button */}
        <Link
          to={`/simulator/scenario/${scenario.id}`}
          className="block w-full text-center py-2 px-4 text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg hover:from-blue-600 hover:to-purple-700 transition-colors"
        >
          {scenario.is_premium ? 'View Details' : 'Start Simulation'}
        </Link>
      </div>
    </div>
  );
};

export default ScenarioCard;
