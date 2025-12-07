import React, { useState, useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { generateAIHint } from '../../services/openaiService';
import { Lightbulb, X, Loader } from 'lucide-react';

const HintsPanel = ({ scenario, phase, currentEvent, projectHealth, difficulty, onClose }) => {
  const { theme } = useTheme();
  const [hint, setHint] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showPanel, setShowPanel] = useState(true);

  useEffect(() => {
    if (showPanel && currentEvent) {
      loadHint();
    }
  }, [currentEvent, phase]);

  const loadHint = async () => {
    setLoading(true);
    try {
      const aiHint = await generateAIHint({
        scenario,
        phase,
        currentEvent,
        projectHealth,
        difficulty,
      });

      if (aiHint) {
        setHint(aiHint);
      } else {
        // Fallback to contextual hints based on event category
        setHint(generateFallbackHint(currentEvent));
      }
    } catch (error) {
      console.error('Error loading hint:', error);
      setHint(generateFallbackHint(currentEvent));
    } finally {
      setLoading(false);
    }
  };

  const generateFallbackHint = (event) => {
    if (!event) return null;

    const hintsByCategory = {
      stakeholder: 'Consider stakeholder management best practices: communication, expectation management, and relationship building.',
      risk: 'Think about risk management: identify, assess, mitigate, and monitor risks proactively.',
      team: 'Team dynamics matter: facilitate collaboration, resolve conflicts constructively, and support your team.',
      resource: 'Resource management requires planning, optimization, and contingency planning.',
      scope: 'Scope changes need proper evaluation through change control processes.',
      quality: 'Quality should never be compromised. Consider long-term impacts of quality decisions.',
      communication: 'Clear, timely communication is key. Consider all stakeholders who need to know.',
      schedule: 'Schedule management involves early warning, recovery planning, and stakeholder communication.',
      budget: 'Budget issues require early identification, root cause analysis, and transparent communication.',
    };

    return hintsByCategory[event.category] || 'Consider project management best practices and stakeholder impact when making decisions.';
  };

  if (!showPanel) return null;

  return (
    <div className={`fixed bottom-4 right-4 w-80 rounded-lg shadow-xl z-40 ${
      theme === 'dark' ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
    }`}>
      <div className={`p-4 border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Lightbulb className="w-5 h-5 text-yellow-500" />
            <h3 className={`font-semibold ${theme === 'dark' ? 'text-gray-200' : 'text-gray-800'}`}>
              Hint
            </h3>
          </div>
          <button
            onClick={() => {
              setShowPanel(false);
              if (onClose) onClose();
            }}
            className={`p-1 rounded hover:bg-opacity-20 ${
              theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="p-4">
        {loading ? (
          <div className="flex items-center justify-center py-4">
            <Loader className="w-5 h-5 animate-spin text-blue-500" />
            <span className={`ml-2 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              Generating hint...
            </span>
          </div>
        ) : hint ? (
          <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
            {hint}
          </p>
        ) : (
          <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
            No hint available at this time.
          </p>
        )}

        {!loading && hint && (
          <button
            onClick={loadHint}
            className={`mt-3 text-xs text-blue-500 hover:text-blue-600 ${
              theme === 'dark' ? 'hover:text-blue-400' : ''
            }`}
          >
            Get another hint
          </button>
        )}
      </div>
    </div>
  );
};

export default HintsPanel;

