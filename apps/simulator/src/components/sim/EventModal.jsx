import React, { useState } from 'react';
import { useTheme } from '../../context/ThemeContext';

const EventModal = ({ event, onResponse, onClose }) => {
  const { theme } = useTheme();
  const [selectedOption, setSelectedOption] = useState(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedback, setFeedback] = useState(null);

  if (!event) return null;

  const getSeverityColor = (severity) => {
    const colors = {
      low: 'border-green-500 bg-green-500',
      medium: 'border-yellow-500 bg-yellow-500',
      high: 'border-orange-500 bg-orange-500',
      critical: 'border-red-500 bg-red-500',
    };
    return colors[severity] || colors.medium;
  };

  const getSeverityLabel = (severity) => {
    const labels = {
      low: 'Low Priority',
      medium: 'Medium Priority',
      high: 'High Priority',
      critical: 'Critical',
    };
    return labels[severity] || 'Medium Priority';
  };

  const getCategoryIcon = (category) => {
    const icons = {
      stakeholder: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      risk: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      ),
      team: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
      resource: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      ),
      scope: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
        </svg>
      ),
      schedule: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      budget: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      quality: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      communication: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      ),
    };
    return icons[category] || icons.stakeholder;
  };

  const handleOptionSelect = (index) => {
    if (showFeedback) return;

    setSelectedOption(index);
    const option = event.options[index];
    setFeedback({
      text: option.feedback,
      score: option.score,
      isOptimal: option.isOptimal,
      impact: option.impact,
    });
    setShowFeedback(true);
  };

  const handleContinue = async () => {
    if (onResponse && selectedOption !== null) {
      // Call onResponse - it may be async, but we don't need to await it
      // The parent component will handle the async processing
      const response = onResponse({
        eventId: event.id,
        selectedOptionIndex: selectedOption,
        ...feedback,
      });
      
      // If onResponse returns a promise, handle it gracefully
      if (response && typeof response.then === 'function') {
        await response;
      }
    }
  };

  const getScoreColor = (score) => {
    if (score >= 90) return 'text-green-500';
    if (score >= 70) return 'text-yellow-500';
    if (score >= 50) return 'text-orange-500';
    return 'text-red-500';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div className={`w-full max-w-2xl rounded-xl overflow-hidden shadow-2xl ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
        {/* Header */}
        <div className={`p-4 border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className={`p-2 rounded-lg ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-100'}`}>
                {getCategoryIcon(event.category)}
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="font-semibold">{event.title}</h3>
                  <span className={`px-2 py-0.5 text-xs rounded-full text-white ${getSeverityColor(event.severity)}`}>
                    {getSeverityLabel(event.severity)}
                  </span>
                </div>
                <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'} capitalize`}>
                  {event.category} Event
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* NPC Section */}
          {event.npc && (
            <div className="flex items-start space-x-4 mb-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                <span className="text-white font-bold text-lg">
                  {event.npc.name.charAt(0)}
                </span>
              </div>
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-1">
                  <span className="font-medium">{event.npc.name}</span>
                  <span className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                    {event.npc.role}
                  </span>
                </div>
                <div className={`p-3 rounded-lg ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-100'}`}>
                  <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    {event.description}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Options */}
          {!event.npc && (
            <p className={`mb-4 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
              {event.description}
            </p>
          )}

          <div className="space-y-3">
            <p className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              How do you respond?
            </p>
            {event.options.map((option, index) => (
              <button
                key={index}
                onClick={() => handleOptionSelect(index)}
                disabled={showFeedback}
                className={`w-full p-4 text-left rounded-lg border-2 transition-all ${
                  selectedOption === index
                    ? feedback?.isOptimal
                      ? 'border-green-500 bg-green-500 bg-opacity-10'
                      : 'border-yellow-500 bg-yellow-500 bg-opacity-10'
                    : showFeedback
                    ? 'opacity-50 cursor-not-allowed'
                    : theme === 'dark'
                    ? 'border-gray-700 hover:border-gray-600'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-start">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mr-3 flex-shrink-0 ${
                    selectedOption === index
                      ? feedback?.isOptimal
                        ? 'bg-green-500 text-white'
                        : 'bg-yellow-500 text-white'
                      : theme === 'dark'
                      ? 'bg-gray-700'
                      : 'bg-gray-200'
                  }`}>
                    {String.fromCharCode(65 + index)}
                  </span>
                  <span className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    {option.text}
                  </span>
                </div>
              </button>
            ))}
          </div>

          {/* Feedback */}
          {showFeedback && feedback && (
            <div className={`mt-4 p-4 rounded-lg ${
              feedback.isOptimal
                ? 'bg-green-500 bg-opacity-10 border border-green-500'
                : 'bg-yellow-500 bg-opacity-10 border border-yellow-500'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center">
                  {feedback.isOptimal ? (
                    <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 text-yellow-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  )}
                  <span className={`font-semibold ${feedback.isOptimal ? 'text-green-500' : 'text-yellow-500'}`}>
                    {feedback.isOptimal ? 'Optimal Choice!' : 'Good Effort'}
                  </span>
                </div>
                <span className={`font-bold ${getScoreColor(feedback.score)}`}>
                  +{feedback.score} pts
                </span>
              </div>
              <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                {feedback.text}
              </p>

              {/* Impact indicators */}
              {feedback.impact && Object.keys(feedback.impact).length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-300 dark:border-gray-600">
                  <p className={`text-xs font-medium mb-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                    Impact on Project:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(feedback.impact).map(([key, value]) => (
                      <span
                        key={key}
                        className={`px-2 py-1 text-xs rounded ${
                          value > 0
                            ? 'bg-green-500 bg-opacity-20 text-green-500'
                            : value < 0
                            ? 'bg-red-500 bg-opacity-20 text-red-500'
                            : 'bg-gray-500 bg-opacity-20 text-gray-500'
                        }`}
                      >
                        {key.replace('_', ' ')}: {value > 0 ? '+' : ''}{value}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {showFeedback && (
          <div className={`p-4 border-t ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
            <button
              onClick={handleContinue}
              className="w-full py-3 px-4 rounded-lg font-medium bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700"
            >
              Continue
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default EventModal;
