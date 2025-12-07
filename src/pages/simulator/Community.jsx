import React, { useState, useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { MessageSquare, Plus, Pin, Lock } from 'lucide-react';
import { simDb } from '../../services/supabase/supabaseClient';
import { Link } from 'react-router-dom';

const Community = () => {
  const { theme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [topics, setTopics] = useState([]);
  const [showNewTopic, setShowNewTopic] = useState(false);

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    if (selectedCategory) {
      loadTopics(selectedCategory);
    }
  }, [selectedCategory]);

  const loadCategories = async () => {
    try {
      // Mock data for now
      const mockCategories = [
        { id: '1', name: 'General Discussion', description: 'General questions and discussions', post_count: 45 },
        { id: '2', name: 'Scenarios', description: 'Discuss specific simulation scenarios', post_count: 32 },
        { id: '3', name: 'Methodologies', description: 'Share experiences with PM methodologies', post_count: 28 },
        { id: '4', name: 'Tips & Tricks', description: 'Share your best practices', post_count: 19 },
        { id: '5', name: 'Feature Requests', description: 'Suggest new features', post_count: 15 },
        { id: '6', name: 'Bug Reports', description: 'Report issues and bugs', post_count: 8 },
      ];
      setCategories(mockCategories);
    } catch (error) {
      console.error('Error loading categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTopics = async (categoryId) => {
    try {
      // Mock topics
      const mockTopics = [
        {
          id: '1',
          title: 'Best practices for Scrum kickoff?',
          content: 'Looking for advice on running effective Scrum kickoff meetings...',
          user: { email: 'user1@example.com' },
          reply_count: 5,
          view_count: 120,
          is_pinned: true,
          created_at: new Date(Date.now() - 86400000).toISOString(),
          last_reply_at: new Date(Date.now() - 3600000).toISOString(),
        },
        {
          id: '2',
          title: 'How to handle scope creep in simulations?',
          content: 'I keep getting scope creep events. What\'s the best approach?',
          user: { email: 'user2@example.com' },
          reply_count: 8,
          view_count: 95,
          is_pinned: false,
          created_at: new Date(Date.now() - 172800000).toISOString(),
          last_reply_at: new Date(Date.now() - 7200000).toISOString(),
        },
      ];
      setTopics(mockTopics);
    } catch (error) {
      console.error('Error loading topics:', error);
    }
  };

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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-2">Community Forums</h1>
            <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              Connect with other project managers, share tips, and discuss scenarios
            </p>
          </div>
          <button
            onClick={() => setShowNewTopic(true)}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>New Topic</span>
          </button>
        </div>
      </div>

      {/* Categories */}
      {!selectedCategory && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`p-6 rounded-xl text-left transition-all ${
                theme === 'dark' ? 'bg-gray-800 hover:bg-gray-700' : 'bg-white hover:bg-gray-50'
              } shadow hover:shadow-lg border ${
                theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <MessageSquare className="w-6 h-6 text-blue-500" />
                <span className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  {category.post_count} topics
                </span>
              </div>
              <h3 className="font-semibold text-lg mb-1">{category.name}</h3>
              <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                {category.description}
              </p>
            </button>
          ))}
        </div>
      )}

      {/* Topics List */}
      {selectedCategory && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`text-sm ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'} hover:underline`}
            >
              ← Back to Categories
            </button>
            <button
              onClick={() => setShowNewTopic(true)}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>New Topic</span>
            </button>
          </div>

          <div className={`rounded-xl overflow-hidden ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} shadow`}>
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {topics.map((topic) => (
                <Link
                  key={topic.id}
                  to={`/simulator/community/topic/${topic.id}`}
                  className={`block p-4 hover:${
                    theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'
                  } transition-colors`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        {topic.is_pinned && (
                          <Pin className="w-4 h-4 text-yellow-500" />
                        )}
                        {topic.is_locked && (
                          <Lock className="w-4 h-4 text-gray-500" />
                        )}
                        <h3 className="font-semibold">{topic.title}</h3>
                      </div>
                      <p className={`text-sm mb-2 line-clamp-2 ${
                        theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        {topic.content}
                      </p>
                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        <span>{topic.user?.email || 'Anonymous'}</span>
                        <span>{new Date(topic.created_at).toLocaleDateString()}</span>
                        <span>{topic.reply_count} replies</span>
                        <span>{topic.view_count} views</span>
                      </div>
                    </div>
                    {topic.last_reply_at && (
                      <div className="text-right text-xs text-gray-500 ml-4">
                        <div>Last reply</div>
                        <div>{new Date(topic.last_reply_at).toLocaleDateString()}</div>
                      </div>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* New Topic Form Placeholder */}
      {showNewTopic && (
        <div className={`rounded-xl p-6 ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} shadow`}>
          <h2 className="text-lg font-semibold mb-4">Create New Topic</h2>
          <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} mb-4`}>
            Topic creation form will be implemented here.
          </p>
          <button
            onClick={() => setShowNewTopic(false)}
            className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
          >
            Close
          </button>
        </div>
      )}
    </div>
  );
};

export default Community;

