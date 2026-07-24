import React, { useState, useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { Trophy, Medal, Award, Crown } from 'lucide-react';
import { getLeaderboard, getUserRank } from '../../services/simulatorService';

const Leaderboard = () => {
  const { theme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [leaderboardType, setLeaderboardType] = useState('global');
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [userRank, setUserRank] = useState(null);
  const [period, setPeriod] = useState('all');

  useEffect(() => {
    loadLeaderboard();
  }, [leaderboardType, period]);

  const loadLeaderboard = async () => {
    try {
      setLoading(true);
      // For now, use mock data
      const mockData = Array.from({ length: 50 }, (_, i) => ({
        id: `user-${i + 1}`,
        user: {
          id: `user-${i + 1}`,
          email: `user${i + 1}@example.com`,
        },
        score: 10000 - (i * 150),
        rank: i + 1,
        simulations_count: 25 - Math.floor(i / 2),
        metadata: {
          level: Math.floor((i + 1) / 5) + 1,
          badges: Math.floor((i + 1) / 3),
        },
      }));

      setLeaderboardData(mockData);
      setUserRank({ rank: 15, score: 7500 });
    } catch (error) {
      console.error('Error loading leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (rank) => {
    if (rank === 1) return <Crown className="w-6 h-6 text-yellow-500" />;
    if (rank === 2) return <Medal className="w-6 h-6 text-gray-400" />;
    if (rank === 3) return <Medal className="w-6 h-6 text-orange-600" />;
    return <Award className="w-5 h-5 text-gray-500" />;
  };

  const getRankColor = (rank) => {
    if (rank === 1) return 'bg-gradient-to-r from-yellow-400 to-yellow-600';
    if (rank === 2) return 'bg-gradient-to-r from-gray-300 to-gray-400';
    if (rank === 3) return 'bg-gradient-to-r from-orange-400 to-orange-600';
    return theme === 'dark' ? 'bg-gray-800' : 'bg-white';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className={`rounded-xl p-6 ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} shadow`}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold mb-2">Leaderboard</h1>
            <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              Compete with other project managers and climb the ranks
            </p>
          </div>
          <Trophy className="w-12 h-12 text-yellow-500" />
        </div>

        {/* Filters */}
        <div className="flex space-x-4">
          <select
            value={leaderboardType}
            onChange={(e) => setLeaderboardType(e.target.value)}
            className={`px-4 py-2 rounded-lg border ${
              theme === 'dark' 
                ? 'bg-gray-700 border-gray-600 text-gray-200' 
                : 'bg-white border-gray-300'
            }`}
          >
            <option value="global">Global</option>
            <option value="role">By Role</option>
            <option value="methodology">By Methodology</option>
            <option value="industry">By Industry</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>

          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className={`px-4 py-2 rounded-lg border ${
              theme === 'dark' 
                ? 'bg-gray-700 border-gray-600 text-gray-200' 
                : 'bg-white border-gray-300'
            }`}
          >
            <option value="all">All Time</option>
            <option value="month">This Month</option>
            <option value="week">This Week</option>
          </select>
        </div>
      </div>

      {/* User Rank Card */}
      {userRank && (
        <div className={`rounded-xl p-4 border-2 border-blue-500 ${
          theme === 'dark' ? 'bg-gray-800' : 'bg-blue-50'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                Your Rank
              </p>
              <p className="text-2xl font-bold">#{userRank.rank}</p>
            </div>
            <div className="text-right">
              <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                Your Score
              </p>
              <p className="text-2xl font-bold">{userRank.score.toLocaleString()}</p>
            </div>
          </div>
        </div>
      )}

      {/* Top 3 Podium */}
      {leaderboardData.length >= 3 && (
        <div className="flex items-end justify-center space-x-4 mb-6">
          {/* 2nd Place */}
          <div className="flex-1 text-center">
            <div className={`rounded-t-lg p-4 ${getRankColor(2)} mb-2`}>
              {getRankIcon(2)}
            </div>
            <div className={`rounded-lg p-4 ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} shadow`}>
              <p className="font-semibold mb-1">#{2}</p>
              <p className="text-sm mb-1">{leaderboardData[1]?.user?.email || 'User'}</p>
              <p className="text-lg font-bold">{leaderboardData[1]?.score.toLocaleString()}</p>
            </div>
          </div>

          {/* 1st Place */}
          <div className="flex-1 text-center">
            <div className={`rounded-t-lg p-6 ${getRankColor(1)} mb-2`}>
              {getRankIcon(1)}
            </div>
            <div className={`rounded-lg p-4 ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} shadow`}>
              <p className="font-semibold mb-1">#{1}</p>
              <p className="text-sm mb-1">{leaderboardData[0]?.user?.email || 'User'}</p>
              <p className="text-lg font-bold">{leaderboardData[0]?.score.toLocaleString()}</p>
            </div>
          </div>

          {/* 3rd Place */}
          <div className="flex-1 text-center">
            <div className={`rounded-t-lg p-4 ${getRankColor(3)} mb-2`}>
              {getRankIcon(3)}
            </div>
            <div className={`rounded-lg p-4 ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} shadow`}>
              <p className="font-semibold mb-1">#{3}</p>
              <p className="text-sm mb-1">{leaderboardData[2]?.user?.email || 'User'}</p>
              <p className="text-lg font-bold">{leaderboardData[2]?.score.toLocaleString()}</p>
            </div>
          </div>
        </div>
      )}

      {/* Leaderboard List */}
      <div className={`rounded-xl overflow-hidden ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} shadow`}>
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {leaderboardData.slice(3).map((entry, index) => (
            <div
              key={entry.id}
              className={`p-4 flex items-center justify-between hover:${
                theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'
              } transition-colors`}
            >
              <div className="flex items-center space-x-4">
                <div className="w-8 text-center font-semibold">
                  #{entry.rank}
                </div>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'
                }`}>
                  {entry.user?.email?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div>
                  <p className="font-medium">{entry.user?.email || 'User'}</p>
                  <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    Level {entry.metadata?.level || 1} • {entry.simulations_count} simulations
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold text-lg">{entry.score.toLocaleString()}</p>
                <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  {entry.metadata?.badges || 0} badges
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Leaderboard;

