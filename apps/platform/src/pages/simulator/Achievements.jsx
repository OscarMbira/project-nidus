import React, { useState, useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';
import BadgeDisplay from '../../components/sim/BadgeDisplay';
import { getAllBadges, getUserBadges } from '../../services/simulatorService';
import { getBadgeProgress } from '../../utils/badgeAwardService';

const Achievements = () => {
  const { theme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [allBadges, setAllBadges] = useState([]);
  const [earnedBadges, setEarnedBadges] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [badgeProgress, setBadgeProgress] = useState({});

  useEffect(() => {
    loadBadges();
  }, []);

  const loadBadges = async () => {
    try {
      setLoading(true);
      // Mock data for now
      const mockBadges = [
        {
          id: '1',
          badge_key: 'first_sim',
          name: 'First Steps',
          description: 'Complete your first simulation',
          category: 'progression',
          xp_reward: 50,
          icon_url: null,
        },
        {
          id: '2',
          badge_key: 'perfect_score',
          name: 'Perfectionist',
          description: 'Achieve a perfect 100% score',
          category: 'skill',
          xp_reward: 150,
          icon_url: null,
        },
        // Add more mock badges...
      ];

      const mockEarned = ['1'];
      setAllBadges(mockBadges);
      setEarnedBadges(mockEarned);
    } catch (error) {
      console.error('Error loading badges:', error);
    } finally {
      setLoading(false);
    }
  };

  const categories = ['all', 'progression', 'skill', 'achievement', 'special', 'streak'];
  const filteredBadges = selectedCategory === 'all'
    ? allBadges
    : allBadges.filter(b => b.category === selectedCategory);

  const earnedCount = earnedBadges.length;
  const totalCount = allBadges.length;
  const progressPercentage = totalCount > 0 ? (earnedCount / totalCount) * 100 : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className={`rounded-xl p-6 ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} shadow`}>
        <h1 className="text-2xl font-bold mb-2">Achievements</h1>
        <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} mb-4`}>
          Track your progress and unlock badges as you master project management
        </p>

        {/* Progress Overview */}
        <div className={`rounded-lg p-4 ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-100'}`}>
          <div className="flex items-center justify-between mb-2">
            <span className={`font-medium ${theme === 'dark' ? 'text-gray-200' : 'text-gray-800'}`}>
              Collection Progress
            </span>
            <span className={`font-bold ${theme === 'dark' ? 'text-gray-200' : 'text-gray-800'}`}>
              {earnedCount} / {totalCount}
            </span>
          </div>
          <div className={`w-full h-3 rounded-full ${
            theme === 'dark' ? 'bg-gray-600' : 'bg-gray-300'
          }`}>
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-purple-600 rounded-full transition-all"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>

        {/* Category Filters */}
        <div className="flex flex-wrap gap-2 mt-4">
          {categories.map(category => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedCategory === category
                  ? 'bg-blue-500 text-white'
                  : theme === 'dark'
                  ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {category.charAt(0).toUpperCase() + category.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Badges Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredBadges.map(badge => {
          const earned = earnedBadges.includes(badge.id);
          const progress = badgeProgress[badge.id] || null;
          
          return (
            <BadgeDisplay
              key={badge.id}
              badge={badge}
              earned={earned}
              showProgress={!earned}
              progress={progress}
            />
          );
        })}
      </div>

      {filteredBadges.length === 0 && (
        <div className={`text-center py-12 rounded-xl ${
          theme === 'dark' ? 'bg-gray-800' : 'bg-white'
        }`}>
          <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            No badges found in this category.
          </p>
        </div>
      )}
    </div>
  );
};

export default Achievements;

