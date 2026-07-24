import React, { useState, useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { Trophy, Medal, Award, Crown } from 'lucide-react';
import { getLeaderboard, getUserRank } from '../../services/simulatorService';
import { simDb } from '../../services/supabase/supabaseClient';
import { SIMULATOR_ROLE_LIST } from '@nidus/shared/constants/simulatorRoles';

const Leaderboard = () => {
  const { theme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [leaderboardType, setLeaderboardType] = useState('global');
  const [roleFilter, setRoleFilter] = useState('project_manager');
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [userRank, setUserRank] = useState(null);
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    simDb.auth.getUser().then(({ data }) => {
      setUserId(data?.user?.id || null);
    });
  }, []);

  useEffect(() => {
    loadLeaderboard();
  }, [leaderboardType, roleFilter, userId]);

  const loadLeaderboard = async () => {
    try {
      setLoading(true);
      setError(null);
      const category = leaderboardType === 'role' ? roleFilter : null;
      const [data, rank] = await Promise.all([
        getLeaderboard(leaderboardType, 50, category),
        userId ? getUserRank(userId, leaderboardType, category) : Promise.resolve(null),
      ]);
      setLeaderboardData(
        (data || []).map((entry, index) => ({
          ...entry,
          rank: entry.rank ?? index + 1,
        })),
      );
      setUserRank(rank);
    } catch (err) {
      console.error('Error loading leaderboard:', err);
      setError(err.message || 'Failed to load leaderboard');
      setLeaderboardData([]);
      setUserRank(null);
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
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className={`rounded-xl p-6 ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} shadow`}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold mb-2">Leaderboard</h1>
            <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              Compare scores across roles and simulation types
            </p>
          </div>
          <Trophy className="w-12 h-12 text-yellow-500" />
        </div>

        <div className="flex flex-wrap gap-3">
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

          {leaderboardType === 'role' && (
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className={`px-4 py-2 rounded-lg border ${
                theme === 'dark'
                  ? 'bg-gray-700 border-gray-600 text-gray-200'
                  : 'bg-white border-gray-300'
              }`}
            >
              {SIMULATOR_ROLE_LIST.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.label}
                </option>
              ))}
            </select>
          )}
        </div>

        {leaderboardType === 'role' && (
          <div className="flex flex-wrap gap-2 mt-4">
            {SIMULATOR_ROLE_LIST.map((role) => (
              <button
                key={role.id}
                type="button"
                onClick={() => setRoleFilter(role.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  roleFilter === role.id
                    ? 'bg-blue-600 text-white'
                    : theme === 'dark'
                      ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {role.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-xl p-4 bg-red-900/20 border border-red-700 text-red-300 text-sm">
          {error}
        </div>
      )}

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
              <p className="text-2xl font-bold">{userRank.score?.toLocaleString()}</p>
            </div>
          </div>
        </div>
      )}

      {leaderboardData.length === 0 && !error && (
        <div className={`rounded-xl p-8 text-center ${theme === 'dark' ? 'bg-gray-800 text-gray-400' : 'bg-white text-gray-500'}`}>
          No leaderboard entries yet for this view.
        </div>
      )}

      {leaderboardData.length >= 3 && (
        <div className="flex items-end justify-center space-x-4 mb-6">
          {[1, 0, 2].map((idx, displayIdx) => {
            const entry = leaderboardData[idx];
            const rank = idx + 1;
            const heights = ['p-4', 'p-6', 'p-4'];
            return (
              <div key={rank} className="flex-1 text-center">
                <div className={`rounded-t-lg ${heights[displayIdx]} ${getRankColor(rank)} mb-2`}>
                  {getRankIcon(rank)}
                </div>
                <div className={`rounded-lg p-4 ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} shadow`}>
                  <p className="font-semibold mb-1">#{rank}</p>
                  <p className="text-sm mb-1">{entry?.user?.email || 'User'}</p>
                  <p className="text-lg font-bold">{entry?.score?.toLocaleString()}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {leaderboardData.length > 0 && (
        <div className={`rounded-xl overflow-hidden ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} shadow`}>
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {leaderboardData.slice(leaderboardData.length >= 3 ? 3 : 0).map((entry) => (
              <div
                key={entry.id}
                className={`p-4 flex items-center justify-between ${
                  theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-50'
                } transition-colors`}
              >
                <div className="flex items-center space-x-4">
                  <div className="w-8 text-center font-semibold">#{entry.rank}</div>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'
                  }`}>
                    {entry.user?.email?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <div>
                    <p className="font-medium">{entry.user?.email || 'User'}</p>
                    <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      {entry.simulations_count || 0} simulations
                      {entry.category ? ` · ${entry.category.replace(/_/g, ' ')}` : ''}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-lg">{entry.score?.toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Leaderboard;
