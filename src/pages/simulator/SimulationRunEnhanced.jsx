import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useThemeContext } from '../../context/ThemeContext';
import EventModal from '../../components/sim/EventModal';
import HintsPanel from '../../components/sim/HintsPanel';
import LevelUpAnimation from '../../components/sim/LevelUpAnimation';
import BadgeNotification from '../../components/sim/BadgeNotification';
import { generatePhaseEvents, evaluateResponse, calculateCumulativeImpact } from '../../services/eventEngineService';
import { useSimulationCompletion } from '../../hooks/useSimulationCompletion';
import { simDb } from '../../services/supabase/supabaseClient';

const SimulationRunEnhanced = () => {
  const { theme } = useThemeContext();
  const { runId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [scenario, setScenario] = useState(null);
  const [currentPhase, setCurrentPhase] = useState(0);
  const [currentEventIndex, setCurrentEventIndex] = useState(0);
  const [phaseEvents, setPhaseEvents] = useState([]);
  const [responses, setResponses] = useState([]);
  const [showEvent, setShowEvent] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [scores, setScores] = useState(null);
  const [showHints, setShowHints] = useState(true);
  const [useAI, setUseAI] = useState(!!import.meta.env.VITE_OPENAI_API_KEY);
  const [userId, setUserId] = useState(null);
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [showBadgeNotification, setShowBadgeNotification] = useState(false);
  const [currentBadgeIndex, setCurrentBadgeIndex] = useState(0);
  const { handleCompletion, levelUp, newBadges, clearNotifications } = useSimulationCompletion();
  const [projectHealth, setProjectHealth] = useState({
    scope: 100,
    schedule: 100,
    budget: 100,
    quality: 100,
    team_morale: 100,
    stakeholder_satisfaction: 100,
  });

  // Timer
  useEffect(() => {
    const timer = setInterval(() => {
      if (!isCompleted) {
        setTimeElapsed(prev => prev + 1);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [isCompleted]);

  useEffect(() => {
    loadSimulation();
    getCurrentUser();
  }, [runId]);

  const getCurrentUser = async () => {
    try {
      const { data: { user } } = await simDb.auth.getUser();
      setUserId(user?.id);
    } catch (error) {
      console.error('Error getting user:', error);
    }
  };

  const loadSimulation = async () => {
    try {
      setLoading(true);

      // Mock scenario data
      const mockScenario = {
        id: runId,
        name: 'IT Project Kickoff',
        difficulty_level: 'intermediate',
        phases: [
          { name: 'Project Initiation', description: 'Define charter and stakeholders' },
          { name: 'Team Formation', description: 'Assemble and onboard team' },
          { name: 'Sprint Planning', description: 'Plan the first sprint' },
        ],
      };

      await new Promise(resolve => setTimeout(resolve, 500));
      setScenario(mockScenario);

      // Generate events for first phase (async with AI support)
      const events = await generatePhaseEvents(
        mockScenario.phases[0],
        mockScenario.difficulty_level,
        mockScenario,
        useAI
      );
      setPhaseEvents(events);
      setShowEvent(true);
    } catch (error) {
      console.error('Error loading simulation:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEventResponse = async (response) => {
    // Enhance feedback with AI if available
    if (useAI && phaseEvents[currentEventIndex]) {
      try {
        const enhanced = await evaluateResponse(
          phaseEvents[currentEventIndex],
          response.selectedOptionIndex,
          true // enhance feedback
        );
        response = { ...response, ...enhanced };
      } catch (error) {
        console.warn('Failed to enhance feedback:', error);
      }
    }

    // Add response to list
    const newResponses = [...responses, response];
    setResponses(newResponses);

    // Update project health
    if (response.impact) {
      setProjectHealth(prev => {
        const updated = { ...prev };
        Object.entries(response.impact).forEach(([key, value]) => {
          if (updated[key] !== undefined) {
            updated[key] = Math.max(0, Math.min(100, updated[key] + value));
          }
        });
        return updated;
      });
    }

    // Move to next event or phase
    if (currentEventIndex < phaseEvents.length - 1) {
      setCurrentEventIndex(currentEventIndex + 1);
    } else if (currentPhase < scenario.phases.length - 1) {
      // Move to next phase
      setCurrentPhase(currentPhase + 1);
      setCurrentEventIndex(0);
      const nextEvents = await generatePhaseEvents(
        scenario.phases[currentPhase + 1],
        scenario.difficulty_level,
        scenario,
        useAI
      );
      setPhaseEvents(nextEvents);
    } else {
      // Simulation complete
      calculateFinalScore(newResponses);
    }
  };

  const calculateFinalScore = async (allResponses) => {
    const totalScore = allResponses.reduce((sum, r) => sum + r.score, 0);
    const maxScore = allResponses.length * 100;
    const percentage = Math.round((totalScore / maxScore) * 100);

    // Calculate phase breakdown
    const phaseScores = scenario.phases.map((phase, index) => {
      const phaseResponses = allResponses.filter((_, i) => {
        const eventsPerPhase = Math.ceil(allResponses.length / scenario.phases.length);
        return Math.floor(i / eventsPerPhase) === index;
      });
      const phaseTotal = phaseResponses.reduce((sum, r) => sum + r.score, 0);
      const phaseMax = phaseResponses.length * 100;
      return {
        name: phase.name,
        score: phaseMax > 0 ? Math.round((phaseTotal / phaseMax) * 100) : 0,
        optimal: phaseResponses.filter(r => r.isOptimal).length,
        total: phaseResponses.length,
      };
    });

    const timeSpentMinutes = Math.floor(timeElapsed / 60);
    const xpEarned = Math.round(percentage * 1.5);

    // Handle completion with gamification
    if (userId && runId) {
      try {
        const completion = await handleCompletion(
          runId,
          userId,
          scenario,
          percentage,
          timeSpentMinutes,
          allResponses
        );

        // Show level-up animation if leveled up
        if (completion.leveledUp) {
          setShowLevelUp(true);
        }

        // Show badge notifications
        if (completion.badgesEarned.length > 0) {
          setCurrentBadgeIndex(0);
          setShowBadgeNotification(true);
        }

        setScores({
          total: percentage,
          byPhase: phaseScores,
          xpEarned: completion.xpEarned,
          baseXp: completion.baseXp,
          streakBonus: completion.streakBonus,
          optimalDecisions: allResponses.filter(r => r.isOptimal).length,
          totalDecisions: allResponses.length,
          projectHealth,
          leveledUp: completion.leveledUp,
          newLevel: completion.newLevel,
          badgesEarned: completion.badgesEarned,
        });
      } catch (error) {
        console.error('Error in completion handler:', error);
        // Fallback to basic scoring
        setScores({
          total: percentage,
          byPhase: phaseScores,
          xpEarned,
          optimalDecisions: allResponses.filter(r => r.isOptimal).length,
          totalDecisions: allResponses.length,
          projectHealth,
        });
      }
    } else {
      // Fallback if no user/auth
      setScores({
        total: percentage,
        byPhase: phaseScores,
        xpEarned,
        optimalDecisions: allResponses.filter(r => r.isOptimal).length,
        totalDecisions: allResponses.length,
        projectHealth,
      });
    }

    setIsCompleted(true);
    setShowEvent(false);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getScoreColor = (score) => {
    if (score >= 90) return 'text-green-500';
    if (score >= 70) return 'text-yellow-500';
    if (score >= 50) return 'text-orange-500';
    return 'text-red-500';
  };

  const getHealthColor = (value) => {
    if (value >= 80) return 'bg-green-500';
    if (value >= 60) return 'bg-yellow-500';
    if (value >= 40) return 'bg-orange-500';
    return 'bg-red-500';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!scenario) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-400">Loading scenario...</p>
        </div>
      </div>
    );
  }

  // Completion Screen
  if (isCompleted && scores) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className={`rounded-xl p-8 ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} shadow-lg text-center`}>
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-r from-green-500 to-emerald-600 flex items-center justify-center">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold mb-2">Simulation Complete!</h1>
          <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} mb-6`}>
            {scenario.name}
          </p>

          {/* Overall Score */}
          <div className={`p-6 rounded-xl mb-6 ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-100'}`}>
            <div className={`text-5xl font-bold ${getScoreColor(scores.total)} mb-2`}>
              {scores.total}%
            </div>
            <div className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              Overall Score
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-100'}`}>
              <div className="text-2xl font-bold text-purple-500">+{scores.xpEarned}</div>
              <div className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                XP Earned
                {scores.streakBonus && scores.streakBonus > 1 && (
                  <span className="ml-1 text-green-500">({scores.streakBonus.toFixed(1)}x streak bonus)</span>
                )}
              </div>
            </div>
            <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-100'}`}>
              <div className="text-2xl font-bold">{formatTime(timeElapsed)}</div>
              <div className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Time</div>
            </div>
            <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-100'}`}>
              <div className="text-2xl font-bold text-green-500">
                {scores.optimalDecisions} / {scores.totalDecisions}
              </div>
              <div className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Optimal</div>
            </div>
          </div>

          {/* Project Health */}
          <div className="text-left mb-6">
            <h3 className="font-semibold mb-3">Final Project Health</h3>
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(scores.projectHealth).map(([key, value]) => (
                <div key={key} className={`p-3 rounded-lg ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-100'}`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs capitalize">{key.replace('_', ' ')}</span>
                    <span className={`text-sm font-bold ${value >= 60 ? 'text-green-500' : 'text-red-500'}`}>
                      {value}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-300 dark:bg-gray-600 rounded-full h-1.5">
                    <div
                      className={`h-1.5 rounded-full ${getHealthColor(value)}`}
                      style={{ width: `${value}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Phase Breakdown */}
          <div className="text-left mb-6">
            <h3 className="font-semibold mb-3">Phase Breakdown</h3>
            <div className="space-y-3">
              {scores.byPhase.map((phase, index) => (
                <div key={index} className={`p-3 rounded-lg ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-100'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">{phase.name}</span>
                    <span className={`font-bold ${getScoreColor(phase.score)}`}>{phase.score}%</span>
                  </div>
                  <div className="w-full bg-gray-300 dark:bg-gray-600 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        phase.score >= 90 ? 'bg-green-500' :
                        phase.score >= 70 ? 'bg-yellow-500' :
                        phase.score >= 50 ? 'bg-orange-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${phase.score}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Badges Earned */}
          {scores.badgesEarned && scores.badgesEarned.length > 0 && (
            <div className="mb-6">
              <h3 className="font-semibold mb-3">Badges Earned!</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {scores.badgesEarned.map((badge, index) => (
                  <div
                    key={index}
                    className={`p-3 rounded-lg bg-gradient-to-r from-yellow-400 to-orange-500 text-white`}
                  >
                    <div className="font-medium text-sm">{badge.name}</div>
                    <div className="text-xs opacity-90">{badge.description}</div>
                    {badge.xp_reward > 0 && (
                      <div className="text-xs mt-1">+{badge.xp_reward} XP</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-4">
            <button
              onClick={() => navigate('/simulator/scenarios')}
              className={`flex-1 py-3 px-4 rounded-lg font-medium ${
                theme === 'dark' ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'
              }`}
            >
              Back to Scenarios
            </button>
            <button
              onClick={() => navigate('/simulator/scenario/' + scenario.id)}
              className="flex-1 py-3 px-4 rounded-lg font-medium bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700"
            >
              Review Scenario
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Calculate progress metrics (used in active screen)
  const totalEvents = scenario?.phases?.length * (phaseEvents.length || 3) || 0;
  const completedEvents = (currentPhase * (phaseEvents.length || 3)) + currentEventIndex;
  const progress = totalEvents > 0 ? (completedEvents / totalEvents) * 100 : 0;

  return (
    <div className="max-w-3xl mx-auto">
      {/* Level Up Animation */}
      {showLevelUp && levelUp && (
        <LevelUpAnimation
          level={levelUp.newLevel}
          onComplete={() => {
            setShowLevelUp(false);
            clearNotifications();
          }}
        />
      )}

      {/* Badge Notifications */}
      {showBadgeNotification && newBadges.length > 0 && newBadges[currentBadgeIndex] && (
        <BadgeNotification
          badge={newBadges[currentBadgeIndex]}
          onClose={() => {
            if (currentBadgeIndex < newBadges.length - 1) {
              setCurrentBadgeIndex(currentBadgeIndex + 1);
            } else {
              setShowBadgeNotification(false);
              setCurrentBadgeIndex(0);
              clearNotifications();
            }
          }}
        />
      )}

      {/* Header */}
      <div className={`rounded-xl p-4 ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} shadow mb-6`}>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="font-bold">{scenario?.name || 'Simulation'}</h1>
            <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              Phase {currentPhase + 1}: {scenario?.phases?.[currentPhase]?.name || 'Unknown'}
            </p>
          </div>
          <div className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            {formatTime(timeElapsed)}
          </div>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div
            className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
        <div className={`text-xs mt-1 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
          Event {completedEvents + 1} of ~{totalEvents}
        </div>
      </div>

      {/* Project Health Dashboard */}
      <div className={`rounded-xl p-4 ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} shadow mb-6`}>
        <h3 className={`text-sm font-medium mb-3 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
          Project Health
        </h3>
        <div className="grid grid-cols-3 gap-3">
          {Object.entries(projectHealth).slice(0, 6).map(([key, value]) => (
            <div key={key} className="text-center">
              <div className="relative w-12 h-12 mx-auto mb-1">
                <svg className="w-12 h-12 transform -rotate-90">
                  <circle
                    cx="24"
                    cy="24"
                    r="20"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                    className={theme === 'dark' ? 'text-gray-700' : 'text-gray-200'}
                  />
                  <circle
                    cx="24"
                    cy="24"
                    r="20"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                    strokeDasharray={`${(value / 100) * 126} 126`}
                    className={value >= 60 ? 'text-green-500' : 'text-red-500'}
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-xs font-bold">
                  {value}
                </span>
              </div>
              <span className={`text-xs capitalize ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                {key.split('_')[0]}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Event Modal */}
      {showEvent && phaseEvents[currentEventIndex] && (
        <EventModal
          event={phaseEvents[currentEventIndex]}
          onResponse={handleEventResponse}
        />
      )}

      {/* Hints Panel */}
      {showEvent && phaseEvents[currentEventIndex] && showHints && (
        <HintsPanel
          scenario={scenario}
          phase={scenario?.phases?.[currentPhase]}
          currentEvent={phaseEvents[currentEventIndex]}
          projectHealth={projectHealth}
          difficulty={scenario?.difficulty_level}
          onClose={() => setShowHints(false)}
        />
      )}
    </div>
  );
};

export default SimulationRunEnhanced;
