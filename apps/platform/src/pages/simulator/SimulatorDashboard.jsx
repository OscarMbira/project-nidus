import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import simulatorService from '../../services/simulatorService';
import ProgressBar from '../../components/sim/ProgressBar';
import StreakDisplay from '../../components/sim/StreakDisplay';

const SimulatorDashboard = () => {
  const { theme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);
  const [featuredScenarios, setFeaturedScenarios] = useState([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      // For now, use mock data until auth is connected
      const mockData = {
        progress: {
          total_xp: 1250,
          current_level: 4,
          xp_to_next_level: 1600,
          completed_scenarios: 8,
          streak_days: 5,
          average_score: 78,
          skill_assessment_completed: true,
          onboarding_completed: true,
        },
        inProgressRuns: [
          {
            id: '1',
            scenarios: {
              name: 'IT Project Kickoff',
              industry: 'IT/Software',
              difficulty_level: 'beginner',
            },
            current_phase: 'Planning',
            started_at: new Date(Date.now() - 86400000).toISOString(),
          },
        ],
        completedRuns: [
          {
            id: '2',
            scenarios: {
              name: 'Marketing Campaign',
              industry: 'Marketing',
            },
            total_score: 85,
            completed_at: new Date(Date.now() - 172800000).toISOString(),
          },
        ],
        certificates: [],
        hasPremium: false,
      };
      setDashboardData(mockData);

      // Load featured scenarios
      const scenarios = [
        {
          id: '1',
          name: 'IT Project Kickoff',
          short_description: 'Learn to initiate and plan a software development project',
          industry: 'IT/Software',
          methodology: 'Scrum',
          difficulty_level: 'beginner',
          duration_minutes: 60,
          is_premium: false,
        },
        {
          id: '2',
          name: 'Construction Project',
          short_description: 'Manage a building construction from foundation to completion',
          industry: 'Construction',
          methodology: 'Structured PM',
          difficulty_level: 'intermediate',
          duration_minutes: 120,
          is_premium: false,
        },
        {
          id: '3',
          name: 'Product Launch',
          short_description: 'Coordinate a multi-team product launch campaign',
          industry: 'Marketing',
          methodology: 'Kanban',
          difficulty_level: 'intermediate',
          duration_minutes: 90,
          is_premium: true,
        },
      ];
      setFeaturedScenarios(scenarios);
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDifficultyColor = (level) => {
    const colors = {
      beginner: 'bg-green-500',
      intermediate: 'bg-yellow-500',
      advanced: 'bg-orange-500',
      expert: 'bg-red-500',
    };
    return colors[level] || 'bg-gray-500';
  };

  const calculateXpProgress = () => {
    if (!dashboardData?.progress) return 0;
    const { total_xp, xp_to_next_level, current_level } = dashboardData.progress;
    const prevLevelXp = (current_level - 1) * (current_level - 1) * 100;
    const currentProgress = total_xp - prevLevelXp;
    const levelRange = xp_to_next_level - prevLevelXp;
    return Math.min(100, (currentProgress / levelRange) * 100);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className={`rounded-xl p-6 ${theme === 'dark' ? 'bg-gradient-to-r from-blue-900 to-purple-900' : 'bg-gradient-to-r from-blue-500 to-purple-600'} text-white`}>
        <h1 className="text-2xl font-bold mb-2">Welcome to Simulator!</h1>
        <p className="opacity-90">
          Practice your project management skills in a risk-free environment.
          Complete simulations to earn XP, badges, and certificates.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Level & XP */}
        <div className={`rounded-xl p-4 ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} shadow`}>
          <div className="flex items-center justify-between mb-2">
            <span className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Level</span>
            <span className="text-2xl font-bold text-blue-500">{dashboardData?.progress?.current_level || 1}</span>
          </div>
          <ProgressBar
            currentXP={dashboardData?.progress?.total_xp || 0}
            xpToNext={dashboardData?.progress?.xp_to_next_level || 100}
            level={dashboardData?.progress?.current_level || 1}
            showLabels={true}
            size="default"
          />
        </div>

        {/* Completed Scenarios */}
        <div className={`rounded-xl p-4 ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} shadow`}>
          <div className="flex items-center justify-between">
            <span className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Completed</span>
            <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="text-2xl font-bold mt-2">{dashboardData?.progress?.completed_scenarios || 0}</div>
          <div className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>Simulations</div>
        </div>

        {/* Streak */}
        <div className={`rounded-xl p-4 ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} shadow`}>
          <StreakDisplay
            currentStreak={dashboardData?.progress?.streak_days || 0}
            longestStreak={dashboardData?.progress?.longest_streak || 0}
            showBonus={true}
          />
        </div>

        {/* Average Score */}
        <div className={`rounded-xl p-4 ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} shadow`}>
          <div className="flex items-center justify-between">
            <span className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Avg Score</span>
            <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
          </div>
          <div className="text-2xl font-bold mt-2">{dashboardData?.progress?.average_score || 0}%</div>
          <div className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>Performance</div>
        </div>
      </div>

      {/* In Progress Section */}
      {dashboardData?.inProgressRuns?.length > 0 && (
        <div className={`rounded-xl p-6 ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} shadow`}>
          <h2 className="text-lg font-semibold mb-4">Continue Where You Left Off</h2>
          <div className="space-y-3">
            {dashboardData.inProgressRuns.map((run, index) => (
              <div
                key={run.id}
                className={`flex items-center justify-between p-4 rounded-lg ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'}`}
              >                <div>
                  <h3 className="font-medium">{run.scenarios?.name}</h3>
                  <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    {run.scenarios?.industry} • {run.current_phase}
                  </p>
                </div>
                <Link
                  to={`/simulator/run/${run.id}`}
                  className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg hover:from-blue-600 hover:to-purple-700"
                >
                  Continue
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Featured Scenarios */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Featured Scenarios</h2>
          <Link
            to="/simulator/scenarios"
            className={`text-sm ${theme === 'dark' ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'}`}
          >
            View All →
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {featuredScenarios.map((scenario, index) => (
            <div
              key={scenario.id}
              className={`rounded-xl overflow-hidden ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} shadow hover:shadow-lg transition-shadow`}
            >
              <div className="h-32 bg-gradient-to-r from-blue-500 to-purple-600 relative">
                {scenario.is_premium && (
                  <span className="absolute top-2 right-2 px-2 py-1 text-xs font-medium bg-yellow-500 text-black rounded">
                    Premium
                  </span>
                )}
              </div>
              <div className="p-4">
                <h3 className="font-semibold mb-1">{scenario.name}</h3>
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} mb-3 line-clamp-2`}>
                  {scenario.short_description}
                </p>
                <div className="flex items-center justify-between text-xs mb-3">
                  <span className={`px-2 py-1 rounded ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-100'}`}>
                    {scenario.methodology}
                  </span>
                  <span className={`flex items-center`}>
                    <span className={`w-2 h-2 rounded-full ${getDifficultyColor(scenario.difficulty_level)} mr-1`}></span>
                    {scenario.difficulty_level}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                    {scenario.duration_minutes} min
                  </span>
                  <Link
                    to={`/simulator/scenario/${scenario.id}`}
                    className="text-sm font-medium text-blue-500 hover:text-blue-600"
                  >
                    Start →
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          to="/simulator/assessment"
          className={`p-4 rounded-xl ${theme === 'dark' ? 'bg-gray-800 hover:bg-gray-700' : 'bg-white hover:bg-gray-50'} shadow transition-colors`}
        >
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-blue-500 bg-opacity-10">
              <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
            <div className="ml-4">
              <h3 className="font-medium">Skill Assessment</h3>
              <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                Discover your strengths
              </p>
            </div>
          </div>
        </Link>

        <Link
          to="/simulator/leaderboard"
          className={`p-4 rounded-xl ${theme === 'dark' ? 'bg-gray-800 hover:bg-gray-700' : 'bg-white hover:bg-gray-50'} shadow transition-colors`}
        >
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-purple-500 bg-opacity-10">
              <svg className="w-6 h-6 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div className="ml-4">
              <h3 className="font-medium">Leaderboard</h3>
              <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                See top performers
              </p>
            </div>
          </div>
        </Link>

        <Link
          to="/simulator/certificates"
          className={`p-4 rounded-xl ${theme === 'dark' ? 'bg-gray-800 hover:bg-gray-700' : 'bg-white hover:bg-gray-50'} shadow transition-colors`}
        >
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-green-500 bg-opacity-10">
              <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
              </svg>
            </div>
            <div className="ml-4">
              <h3 className="font-medium">Certificates</h3>
              <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                View your achievements
              </p>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
};

export default SimulatorDashboard;
