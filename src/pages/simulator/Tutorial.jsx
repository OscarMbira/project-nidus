import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';

const Tutorial = () => {
  const { theme } = useTheme();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    {
      title: 'Welcome to PM Simulator',
      content: 'This tutorial will guide you through how simulations work. You\'ll learn to make decisions, receive feedback, and track your progress.',
      image: 'welcome',
      highlight: null,
    },
    {
      title: 'Understanding Scenarios',
      content: 'Each scenario presents a real-world project situation. You\'ll take on a role (Team Member, Team Lead, Project Manager, or Programme Manager) and make decisions throughout the project lifecycle.',
      image: 'scenarios',
      highlight: 'scenarios',
    },
    {
      title: 'Making Decisions',
      content: 'During simulations, you\'ll face various situations where you need to choose the best course of action. Click on an option to select your decision.',
      image: 'decision',
      highlight: 'options',
      demo: {
        type: 'decision',
        question: 'Your team reports a potential delay. What do you do?',
        options: [
          { id: 'a', text: 'Wait to see if it resolves itself', correct: false },
          { id: 'b', text: 'Assess impact and communicate to stakeholders', correct: true },
          { id: 'c', text: 'Add more resources immediately', correct: false },
        ],
      },
    },
    {
      title: 'Getting Feedback',
      content: 'After each decision, you\'ll receive immediate feedback explaining why your choice was good (or how it could be improved). This helps you learn PM best practices.',
      image: 'feedback',
      highlight: 'feedback',
    },
    {
      title: 'Earning Points & XP',
      content: 'Your decisions earn points based on how optimal they are. Complete simulations to earn XP, level up, unlock badges, and climb the leaderboard!',
      image: 'scoring',
      highlight: 'xp',
    },
    {
      title: 'Track Your Progress',
      content: 'Visit your dashboard to see your level, XP progress, completed simulations, badges earned, and areas for improvement. Your learning journey is tracked over time.',
      image: 'progress',
      highlight: 'dashboard',
    },
    {
      title: 'Ready to Begin!',
      content: 'You\'re all set! Start with beginner scenarios to build your foundation, then progress to intermediate and advanced levels. Good luck on your PM journey!',
      image: 'complete',
      highlight: null,
    },
  ];

  const [demoSelection, setDemoSelection] = useState(null);
  const [showDemoFeedback, setShowDemoFeedback] = useState(false);

  const handleDemoSelect = (option) => {
    setDemoSelection(option.id);
    setTimeout(() => setShowDemoFeedback(true), 300);
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
      setDemoSelection(null);
      setShowDemoFeedback(false);
    } else {
      // Tutorial complete
      localStorage.setItem('simulator_tutorial_completed', 'true');
      navigate('/simulator');
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      setDemoSelection(null);
      setShowDemoFeedback(false);
    }
  };

  const handleSkip = () => {
    localStorage.setItem('simulator_tutorial_completed', 'true');
    navigate('/simulator');
  };

  const step = steps[currentStep];
  const progress = ((currentStep + 1) / steps.length) * 100;

  return (
    <div className="max-w-2xl mx-auto">
      <div className={`rounded-xl overflow-hidden ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} shadow-lg`}>
        {/* Progress Bar */}
        <div className="w-full bg-gray-200 dark:bg-gray-700 h-1">
          <div
            className="bg-gradient-to-r from-blue-500 to-purple-600 h-1 transition-all duration-300"
            style={{ width: `${progress}%` }}
          ></div>
        </div>

        <div className="p-6">
          {/* Step Indicator */}
          <div className="flex justify-between items-center mb-6">
            <span className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              Step {currentStep + 1} of {steps.length}
            </span>
            <button
              onClick={handleSkip}
              className={`text-sm ${theme === 'dark' ? 'text-gray-400 hover:text-gray-300' : 'text-gray-600 hover:text-gray-800'}`}
            >
              Skip Tutorial
            </button>
          </div>

          {/* Content */}
          <div className="text-center mb-6">
            {/* Icon/Illustration */}
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
              {step.image === 'welcome' && (
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
              {step.image === 'scenarios' && (
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              )}
              {step.image === 'decision' && (
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
              {step.image === 'feedback' && (
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              )}
              {step.image === 'scoring' && (
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              )}
              {step.image === 'progress' && (
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              )}
              {step.image === 'complete' && (
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>

            <h2 className="text-xl font-bold mb-3">{step.title}</h2>
            <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              {step.content}
            </p>
          </div>

          {/* Demo Decision (for step 3) */}
          {step.demo && (
            <div className={`p-4 rounded-lg mb-6 ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-100'}`}>
              <p className={`text-sm font-medium mb-3 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                {step.demo.question}
              </p>
              <div className="space-y-2">
                {step.demo.options.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => handleDemoSelect(option)}
                    disabled={demoSelection !== null}
                    className={`w-full p-3 text-left text-sm rounded-lg border transition-all ${
                      demoSelection === option.id
                        ? option.correct
                          ? 'border-green-500 bg-green-500 bg-opacity-10'
                          : 'border-red-500 bg-red-500 bg-opacity-10'
                        : demoSelection !== null && option.correct
                        ? 'border-green-500 bg-green-500 bg-opacity-10'
                        : theme === 'dark'
                        ? 'border-gray-600 hover:border-gray-500'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <span className="font-medium mr-2">{option.id.toUpperCase()}.</span>
                    {option.text}
                  </button>
                ))}
              </div>
              {showDemoFeedback && (
                <div className={`mt-3 p-3 rounded-lg text-sm ${
                  step.demo.options.find(o => o.id === demoSelection)?.correct
                    ? 'bg-green-500 bg-opacity-10 text-green-500'
                    : 'bg-yellow-500 bg-opacity-10 text-yellow-500'
                }`}>
                  {step.demo.options.find(o => o.id === demoSelection)?.correct
                    ? 'Great choice! Assessing impact and communicating proactively is best practice.'
                    : 'Not quite. Proactive communication is key in project management.'}
                </div>
              )}
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between">
            <button
              onClick={handlePrevious}
              disabled={currentStep === 0}
              className={`px-4 py-2 rounded-lg ${
                currentStep === 0
                  ? 'opacity-50 cursor-not-allowed'
                  : theme === 'dark'
                  ? 'hover:bg-gray-700'
                  : 'hover:bg-gray-100'
              }`}
            >
              Previous
            </button>
            <button
              onClick={handleNext}
              className="px-6 py-2 rounded-lg font-medium bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700"
            >
              {currentStep === steps.length - 1 ? 'Get Started' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Tutorial;
