import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';

const SkillAssessment = () => {
  const { theme } = useTheme();
  const navigate = useNavigate();
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [showResults, setShowResults] = useState(false);
  const [results, setResults] = useState(null);

  // Assessment questions
  const questions = [
    {
      id: 1,
      category: 'experience',
      question: 'How many years of project management experience do you have?',
      type: 'multiple_choice',
      options: [
        { value: 'none', label: 'No experience', score: 0 },
        { value: '1-2', label: '1-2 years', score: 1 },
        { value: '3-5', label: '3-5 years', score: 2 },
        { value: '5+', label: 'More than 5 years', score: 3 },
      ],
    },
    {
      id: 2,
      category: 'methodology',
      question: 'Which project management methodology are you most familiar with?',
      type: 'multiple_choice',
      options: [
        { value: 'none', label: 'None / Not sure', score: 0 },
        { value: 'traditional', label: 'Traditional/Waterfall', score: 1 },
        { value: 'agile', label: 'Agile/Scrum', score: 1 },
        { value: 'both', label: 'Both Traditional and Agile', score: 2 },
      ],
    },
    {
      id: 3,
      category: 'planning',
      question: 'How comfortable are you creating a Work Breakdown Structure (WBS)?',
      type: 'scale',
      options: [
        { value: 1, label: 'Not at all', score: 0 },
        { value: 2, label: 'Somewhat', score: 1 },
        { value: 3, label: 'Comfortable', score: 2 },
        { value: 4, label: 'Very comfortable', score: 3 },
      ],
    },
    {
      id: 4,
      category: 'risk',
      question: 'How would you rate your risk management skills?',
      type: 'scale',
      options: [
        { value: 1, label: 'Beginner', score: 0 },
        { value: 2, label: 'Basic', score: 1 },
        { value: 3, label: 'Intermediate', score: 2 },
        { value: 4, label: 'Advanced', score: 3 },
      ],
    },
    {
      id: 5,
      category: 'leadership',
      question: 'Have you led a project team before?',
      type: 'multiple_choice',
      options: [
        { value: 'no', label: 'No', score: 0 },
        { value: 'small', label: 'Yes, small team (2-5 people)', score: 1 },
        { value: 'medium', label: 'Yes, medium team (6-15 people)', score: 2 },
        { value: 'large', label: 'Yes, large team (15+ people)', score: 3 },
      ],
    },
    {
      id: 6,
      category: 'tools',
      question: 'Which project management tools have you used?',
      type: 'multiple_choice',
      options: [
        { value: 'none', label: 'None', score: 0 },
        { value: 'basic', label: 'Basic (Excel, Google Sheets)', score: 1 },
        { value: 'intermediate', label: 'PM Tools (Jira, Trello, Asana)', score: 2 },
        { value: 'advanced', label: 'Enterprise (MS Project, Primavera)', score: 3 },
      ],
    },
    {
      id: 7,
      category: 'communication',
      question: 'How often do you create project status reports?',
      type: 'multiple_choice',
      options: [
        { value: 'never', label: 'Never', score: 0 },
        { value: 'rarely', label: 'Occasionally', score: 1 },
        { value: 'often', label: 'Regularly', score: 2 },
        { value: 'always', label: 'For every project', score: 3 },
      ],
    },
    {
      id: 8,
      category: 'role_preference',
      question: 'Which role interests you most?',
      type: 'multiple_choice',
      options: [
        { value: 'team_member', label: 'Team Member - Execute tasks and collaborate', score: 0, role: 'team_member' },
        { value: 'team_lead', label: 'Team Lead - Coordinate team activities', score: 1, role: 'team_lead' },
        { value: 'project_manager', label: 'Project Manager - Lead entire projects', score: 2, role: 'project_manager' },
        { value: 'programme_manager', label: 'Programme Manager - Oversee multiple projects', score: 3, role: 'programme_manager' },
      ],
    },
  ];

  const handleAnswer = (questionId, answer) => {
    setAnswers({
      ...answers,
      [questionId]: answer,
    });
  };

  const handleNext = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      calculateResults();
    }
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  const calculateResults = () => {
    let totalScore = 0;
    let categoryScores = {};
    let recommendedRole = 'team_member';

    questions.forEach((q) => {
      const answer = answers[q.id];
      if (answer) {
        const option = q.options.find((o) => o.value === answer || o.value === parseInt(answer));
        if (option) {
          totalScore += option.score;
          categoryScores[q.category] = (categoryScores[q.category] || 0) + option.score;

          if (q.category === 'role_preference' && option.role) {
            recommendedRole = option.role;
          }
        }
      }
    });

    // Determine difficulty level based on score
    let recommendedDifficulty = 'beginner';
    if (totalScore >= 18) {
      recommendedDifficulty = 'expert';
    } else if (totalScore >= 12) {
      recommendedDifficulty = 'advanced';
    } else if (totalScore >= 6) {
      recommendedDifficulty = 'intermediate';
    }

    // Determine strengths and areas for improvement
    const strengths = [];
    const improvements = [];

    Object.entries(categoryScores).forEach(([category, score]) => {
      if (score >= 2) {
        strengths.push(category);
      } else if (score <= 1 && category !== 'role_preference') {
        improvements.push(category);
      }
    });

    const calculatedResults = {
      total_score: totalScore,
      max_score: questions.length * 3,
      percentage: Math.round((totalScore / (questions.length * 3)) * 100),
      recommended_role: recommendedRole,
      recommended_difficulty: recommendedDifficulty,
      category_scores: categoryScores,
      strengths,
      improvements,
    };

    setResults(calculatedResults);
    setShowResults(true);
  };

  const getRoleLabel = (role) => {
    const labels = {
      team_member: 'Team Member',
      team_lead: 'Team Lead',
      project_manager: 'Project Manager',
      programme_manager: 'Programme Manager',
    };
    return labels[role] || role;
  };

  const getDifficultyColor = (level) => {
    const colors = {
      beginner: 'text-green-500',
      intermediate: 'text-yellow-500',
      advanced: 'text-orange-500',
      expert: 'text-red-500',
    };
    return colors[level] || 'text-gray-500';
  };

  const handleComplete = () => {
    // In a real app, save results to database
    navigate('/simulator');
  };

  if (showResults && results) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className={`rounded-xl p-6 ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} shadow-lg`}>
          <div className="text-center mb-6">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold mb-2">Assessment Complete!</h2>
            <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              Here's your personalized learning path
            </p>
          </div>

          {/* Score Overview */}
          <div className={`p-4 rounded-lg mb-6 ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-100'}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium">Overall Score</span>
              <span className="text-xl font-bold">{results.percentage}%</span>
            </div>
            <div className="w-full bg-gray-300 dark:bg-gray-600 rounded-full h-3">
              <div
                className="bg-gradient-to-r from-blue-500 to-purple-600 h-3 rounded-full"
                style={{ width: `${results.percentage}%` }}
              ></div>
            </div>
          </div>

          {/* Recommendations */}
          <div className="space-y-4 mb-6">
            <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-100'}`}>
              <h3 className="font-medium mb-2">Recommended Role</h3>
              <p className="text-lg font-semibold text-blue-500">
                {getRoleLabel(results.recommended_role)}
              </p>
            </div>

            <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-100'}`}>
              <h3 className="font-medium mb-2">Starting Difficulty</h3>
              <p className={`text-lg font-semibold capitalize ${getDifficultyColor(results.recommended_difficulty)}`}>
                {results.recommended_difficulty}
              </p>
            </div>
          </div>

          {/* Strengths & Improvements */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <h3 className="font-medium mb-2 text-green-500">Strengths</h3>
              <ul className="space-y-1">
                {results.strengths.length > 0 ? (
                  results.strengths.map((s, index) => (
                    <li key={s} className={`text-sm capitalize ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                      • {s.replace('_', ' ')}
                    </li>
                  ))
                ) : (
                  <li className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                    Building foundation
                  </li>
                )}
              </ul>
            </div>
            <div>
              <h3 className="font-medium mb-2 text-orange-500">Areas to Develop</h3>
              <ul className="space-y-1">
                {results.improvements.length > 0 ? (
                  results.improvements.map((i) => (
                    <li key={i} className={`text-sm capitalize ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                      • {i.replace('_', ' ')}
                    </li>
                  ))
                ) : (
                  <li className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                    Well-rounded skills
                  </li>
                )}
              </ul>
            </div>
          </div>

          <button
            onClick={handleComplete}
            className="w-full py-3 px-4 text-white font-medium rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 transition-colors"
          >
            Start Learning Journey
          </button>
        </div>
      </div>
    );
  }

  const question = questions[currentQuestion];
  const progress = ((currentQuestion + 1) / questions.length) * 100;

  return (
    <div className="max-w-2xl mx-auto">
      <div className={`rounded-xl p-6 ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} shadow-lg`}>
        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              Question {currentQuestion + 1} of {questions.length}
            </span>
            <span className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              {Math.round(progress)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>

        {/* Question */}
        <div className="mb-6">
          <span className={`text-xs uppercase tracking-wide ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
            {question.category.replace('_', ' ')}
          </span>
          <h2 className="text-xl font-semibold mt-2">{question.question}</h2>
        </div>

        {/* Options */}
        <div className="space-y-3 mb-6">
          {question.options.map((option, index) => (
            <button
              key={option.value}
              onClick={() => handleAnswer(question.id, option.value)}
              className={`w-full p-4 text-left rounded-lg border-2 transition-all ${
                answers[question.id] === option.value
                  ? 'border-blue-500 bg-blue-500 bg-opacity-10'
                  : theme === 'dark'
                  ? 'border-gray-700 hover:border-gray-600'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center">
                <div
                  className={`w-5 h-5 rounded-full border-2 mr-3 flex items-center justify-center ${
                    answers[question.id] === option.value
                      ? 'border-blue-500 bg-blue-500'
                      : theme === 'dark'
                      ? 'border-gray-600'
                      : 'border-gray-300'
                  }`}
                >
                  {answers[question.id] === option.value && (
                    <div className="w-2 h-2 rounded-full bg-white"></div>
                  )}
                </div>
                <span>{option.label}</span>
              </div>
            </button>
          ))}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={handlePrevious}
            disabled={currentQuestion === 0}
            className={`px-4 py-2 rounded-lg ${
              currentQuestion === 0
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
            disabled={!answers[question.id]}
            className={`px-6 py-2 rounded-lg font-medium ${
              answers[question.id]
                ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700'
                : 'bg-gray-300 dark:bg-gray-700 text-gray-500 cursor-not-allowed'
            }`}
          >
            {currentQuestion === questions.length - 1 ? 'Complete' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SkillAssessment;
