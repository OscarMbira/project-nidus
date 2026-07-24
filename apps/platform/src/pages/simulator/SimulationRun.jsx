import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';

const SimulationRun = () => {
  const { theme } = useTheme();
  const { runId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [scenario, setScenario] = useState(null);
  const [currentPhase, setCurrentPhase] = useState(0);
  const [currentTask, setCurrentTask] = useState(0);
  const [decisions, setDecisions] = useState([]);
  const [showFeedback, setShowFeedback] = useState(false);
  const [currentFeedback, setCurrentFeedback] = useState(null);
  const [isCompleted, setIsCompleted] = useState(false);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [scores, setScores] = useState({ total: 0, byPhase: [] });

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
  }, [runId]);

  const loadSimulation = async () => {
    try {
      setLoading(true);
      // Mock scenario data with tasks
      const mockScenario = {
        id: runId,
        name: 'IT Project Kickoff',
        phases: [
          {
            name: 'Project Initiation',
            tasks: [
              {
                id: 1,
                type: 'decision',
                title: 'Define Project Scope',
                description: 'The stakeholder meeting is about to start. How will you approach defining the project scope?',
                options: [
                  {
                    id: 'a',
                    text: 'Present a pre-defined scope document and ask for approval',
                    feedback: 'While efficient, this approach may miss critical stakeholder input. Collaboration leads to better buy-in.',
                    score: 60,
                    isOptimal: false,
                  },
                  {
                    id: 'b',
                    text: 'Facilitate a collaborative workshop to gather requirements',
                    feedback: 'Excellent choice! Collaborative workshops ensure all perspectives are captured and increase stakeholder buy-in.',
                    score: 100,
                    isOptimal: true,
                  },
                  {
                    id: 'c',
                    text: 'Send a survey to stakeholders before the meeting',
                    feedback: 'Good for gathering initial input, but may not capture the depth of requirements. Consider following up with a workshop.',
                    score: 75,
                    isOptimal: false,
                  },
                ],
              },
              {
                id: 2,
                type: 'decision',
                title: 'Stakeholder Identification',
                description: 'You need to identify key stakeholders for the project. What approach will you take?',
                options: [
                  {
                    id: 'a',
                    text: 'Use the organizational chart to identify department heads',
                    feedback: 'Org charts help but may miss influential stakeholders without formal authority.',
                    score: 65,
                    isOptimal: false,
                  },
                  {
                    id: 'b',
                    text: 'Interview the project sponsor about who should be involved',
                    feedback: 'Good starting point, but sponsors may have blind spots. Cast a wider net.',
                    score: 70,
                    isOptimal: false,
                  },
                  {
                    id: 'c',
                    text: 'Conduct stakeholder mapping using power/interest matrix',
                    feedback: 'Perfect! The power/interest matrix helps identify and prioritize all stakeholders systematically.',
                    score: 100,
                    isOptimal: true,
                  },
                ],
              },
            ],
          },
          {
            name: 'Team Formation',
            tasks: [
              {
                id: 3,
                type: 'decision',
                title: 'Team Selection',
                description: 'HR has provided a list of available team members. How will you select your team?',
                options: [
                  {
                    id: 'a',
                    text: 'Choose the most experienced developers available',
                    feedback: 'Experience matters, but team dynamics and skill diversity are equally important for Scrum teams.',
                    score: 70,
                    isOptimal: false,
                  },
                  {
                    id: 'b',
                    text: 'Select a cross-functional team with diverse skills',
                    feedback: 'Excellent! Cross-functional teams are essential for Scrum success. They can deliver end-to-end value.',
                    score: 100,
                    isOptimal: true,
                  },
                  {
                    id: 'c',
                    text: 'Let the Product Owner decide on the team composition',
                    feedback: 'The PO focuses on what to build, not team composition. This is a PM responsibility.',
                    score: 50,
                    isOptimal: false,
                  },
                ],
              },
              {
                id: 4,
                type: 'decision',
                title: 'Working Agreements',
                description: 'The team is formed. How will you establish working agreements?',
                options: [
                  {
                    id: 'a',
                    text: 'Distribute a standard set of team rules from a template',
                    feedback: 'Templates provide structure but lack team ownership. Let the team create their own agreements.',
                    score: 55,
                    isOptimal: false,
                  },
                  {
                    id: 'b',
                    text: 'Facilitate a team session to collaboratively create agreements',
                    feedback: 'Perfect! Team-created agreements have higher compliance and foster self-organization.',
                    score: 100,
                    isOptimal: true,
                  },
                  {
                    id: 'c',
                    text: 'Skip this step to start development faster',
                    feedback: 'Skipping working agreements leads to conflicts later. This foundational step saves time long-term.',
                    score: 30,
                    isOptimal: false,
                  },
                ],
              },
            ],
          },
          {
            name: 'Sprint Planning',
            tasks: [
              {
                id: 5,
                type: 'decision',
                title: 'Sprint Length',
                description: 'The team needs to decide on sprint length. What will you recommend?',
                options: [
                  {
                    id: 'a',
                    text: '1-week sprints for faster feedback',
                    feedback: 'Good for uncertain projects, but may have high ceremony overhead for new teams.',
                    score: 75,
                    isOptimal: false,
                  },
                  {
                    id: 'b',
                    text: '2-week sprints as a balanced starting point',
                    feedback: 'Excellent choice! 2-week sprints balance feedback frequency with development time.',
                    score: 100,
                    isOptimal: true,
                  },
                  {
                    id: 'c',
                    text: '4-week sprints to complete more features',
                    feedback: 'Long sprints delay feedback and increase risk. Start shorter and adjust if needed.',
                    score: 60,
                    isOptimal: false,
                  },
                ],
              },
              {
                id: 6,
                type: 'decision',
                title: 'Sprint Goal',
                description: 'It\'s time to define the Sprint 1 goal. How will you approach this?',
                options: [
                  {
                    id: 'a',
                    text: 'Let the team pick whatever stories they want to work on',
                    feedback: 'Without a goal, the sprint lacks focus and purpose. Guide the team toward cohesion.',
                    score: 40,
                    isOptimal: false,
                  },
                  {
                    id: 'b',
                    text: 'Define a goal that delivers a coherent, valuable increment',
                    feedback: 'Perfect! A clear sprint goal aligns the team and provides purpose for the sprint.',
                    score: 100,
                    isOptimal: true,
                  },
                  {
                    id: 'c',
                    text: 'Focus on completing the highest-priority items only',
                    feedback: 'Priority matters, but a sprint goal adds cohesion beyond just priority order.',
                    score: 70,
                    isOptimal: false,
                  },
                ],
              },
            ],
          },
        ],
      };

      await new Promise(resolve => setTimeout(resolve, 500));
      setScenario(mockScenario);
    } catch (error) {
      console.error('Error loading simulation:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDecision = (option) => {
    const phase = scenario.phases[currentPhase];
    const task = phase.tasks[currentTask];

    const decision = {
      phaseIndex: currentPhase,
      taskId: task.id,
      optionId: option.id,
      score: option.score,
      isOptimal: option.isOptimal,
    };

    setDecisions([...decisions, decision]);
    setCurrentFeedback({
      text: option.feedback,
      score: option.score,
      isOptimal: option.isOptimal,
    });
    setShowFeedback(true);
  };

  const handleContinue = () => {
    setShowFeedback(false);
    setCurrentFeedback(null);

    const phase = scenario.phases[currentPhase];

    if (currentTask < phase.tasks.length - 1) {
      // Next task in current phase
      setCurrentTask(currentTask + 1);
    } else if (currentPhase < scenario.phases.length - 1) {
      // Next phase
      setCurrentPhase(currentPhase + 1);
      setCurrentTask(0);
    } else {
      // Simulation complete
      calculateFinalScore();
    }
  };

  const calculateFinalScore = () => {
    const phaseScores = scenario.phases.map((phase, phaseIndex) => {
      const phaseDecisions = decisions.filter(d => d.phaseIndex === phaseIndex);
      const phaseTotal = phaseDecisions.reduce((sum, d) => sum + d.score, 0);
      const phaseMax = phase.tasks.length * 100;
      return {
        name: phase.name,
        score: Math.round((phaseTotal / phaseMax) * 100),
        optimal: phaseDecisions.filter(d => d.isOptimal).length,
        total: phase.tasks.length,
      };
    });

    const totalScore = decisions.reduce((sum, d) => sum + d.score, 0);
    const maxScore = scenario.phases.reduce((sum, p) => sum + p.tasks.length * 100, 0);

    setScores({
      total: Math.round((totalScore / maxScore) * 100),
      byPhase: phaseScores,
      xpEarned: Math.round((totalScore / maxScore) * 100),
      optimalDecisions: decisions.filter(d => d.isOptimal).length,
      totalDecisions: decisions.length,
    });
    setIsCompleted(true);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Completion Screen
  if (isCompleted) {
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
              <div className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>XP Earned</div>
            </div>
            <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-100'}`}>
              <div className="text-2xl font-bold">{formatTime(timeElapsed)}</div>
              <div className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Time</div>
            </div>
            <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-100'}`}>
              <div className="text-2xl font-bold text-green-500">
                {scores.optimalDecisions}/{scores.totalDecisions}
              </div>
              <div className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Optimal</div>
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
              onClick={() => window.location.reload()}
              className="flex-1 py-3 px-4 rounded-lg font-medium bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  const phase = scenario.phases[currentPhase];
  const task = phase.tasks[currentTask];
  const totalTasks = scenario.phases.reduce((sum, p) => sum + p.tasks.length, 0);
  const completedTasks = scenario.phases.slice(0, currentPhase).reduce((sum, p) => sum + p.tasks.length, 0) + currentTask;
  const progress = (completedTasks / totalTasks) * 100;

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className={`rounded-xl p-4 ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} shadow mb-6`}>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="font-bold">{scenario.name}</h1>
            <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              Phase {currentPhase + 1}: {phase.name}
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
          Task {completedTasks + 1} of {totalTasks}
        </div>
      </div>

      {/* Task Card */}
      <div className={`rounded-xl p-6 ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} shadow`}>
        <h2 className="text-xl font-semibold mb-3">{task.title}</h2>
        <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} mb-6`}>
          {task.description}
        </p>

        {/* Decision Options */}
        {!showFeedback && (
          <div className="space-y-3">
            {task.options.map((option) => (
              <button
                key={option.id}
                onClick={() => handleDecision(option)}
                className={`w-full p-4 text-left rounded-lg border-2 transition-all ${
                  theme === 'dark'
                    ? 'border-gray-700 hover:border-blue-500 hover:bg-gray-750'
                    : 'border-gray-200 hover:border-blue-500 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-start">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mr-3 ${
                    theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'
                  }`}>
                    {option.id.toUpperCase()}
                  </span>
                  <span>{option.text}</span>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Feedback */}
        {showFeedback && currentFeedback && (
          <div className={`p-4 rounded-lg mb-4 ${
            currentFeedback.isOptimal
              ? 'bg-green-500 bg-opacity-10 border border-green-500'
              : 'bg-yellow-500 bg-opacity-10 border border-yellow-500'
          }`}>
            <div className="flex items-center mb-2">
              {currentFeedback.isOptimal ? (
                <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-yellow-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              )}
              <span className={`font-semibold ${currentFeedback.isOptimal ? 'text-green-500' : 'text-yellow-500'}`}>
                {currentFeedback.isOptimal ? 'Optimal Choice!' : 'Good Effort'}
              </span>
              <span className={`ml-auto font-bold ${getScoreColor(currentFeedback.score)}`}>
                +{currentFeedback.score} pts
              </span>
            </div>
            <p className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>
              {currentFeedback.text}
            </p>
          </div>
        )}

        {showFeedback && (
          <button
            onClick={handleContinue}
            className="w-full py-3 px-4 rounded-lg font-medium bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700"
          >
            Continue
          </button>
        )}
      </div>
    </div>
  );
};

export default SimulationRun;
