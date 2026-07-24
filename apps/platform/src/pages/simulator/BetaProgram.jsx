import React, { useState, useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { Users, MessageSquare, CheckCircle, AlertCircle, TrendingUp } from 'lucide-react';
import { 
  enrollInBetaProgram, 
  isBetaUser, 
  getBetaEnrollment,
  submitBetaFeedback,
  getBetaFeedback,
  voteOnFeedback,
  getActiveSurveys,
  submitSurveyResponse,
  getBetaProgramStats,
} from '../../services/betaProgramService';
import { simDb } from '../../services/supabase/supabaseClient';

const BetaProgram = () => {
  const { theme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [enrollment, setEnrollment] = useState(null);
  const [feedback, setFeedback] = useState([]);
  const [surveys, setSurveys] = useState([]);
  const [stats, setStats] = useState(null);
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);
  const [feedbackForm, setFeedbackForm] = useState({
    type: 'general',
    title: '',
    description: '',
    severity: 'medium',
    tags: [],
  });
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    getCurrentUser();
  }, []);

  useEffect(() => {
    if (userId) {
      loadData();
    }
  }, [userId]);

  const getCurrentUser = async () => {
    try {
      const { data: { user } } = await simDb.auth.getUser();
      setUserId(user?.id);
    } catch (error) {
      console.error('Error getting user:', error);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const enrolled = await isBetaUser(userId);
      setIsEnrolled(enrolled);

      if (enrolled) {
        const enrollmentData = await getBetaEnrollment(userId);
        setEnrollment(enrollmentData);

        const feedbackData = await getBetaFeedback({ limit: 20 });
        setFeedback(feedbackData);

        const surveysData = await getActiveSurveys(userId);
        setSurveys(surveysData);

        const statsData = await getBetaProgramStats();
        setStats(statsData?.[0]);
      }
    } catch (error) {
      console.error('Error loading beta program data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEnroll = async () => {
    try {
      await enrollInBetaProgram(userId);
      await loadData();
    } catch (error) {
      console.error('Error enrolling:', error);
      alert('Failed to enroll in beta program. Please try again.');
    }
  };

  const handleSubmitFeedback = async (e) => {
    e.preventDefault();
    try {
      await submitBetaFeedback(userId, feedbackForm);
      setShowFeedbackForm(false);
      setFeedbackForm({
        type: 'general',
        title: '',
        description: '',
        severity: 'medium',
        tags: [],
      });
      await loadData();
    } catch (error) {
      console.error('Error submitting feedback:', error);
      alert('Failed to submit feedback. Please try again.');
    }
  };

  const handleVote = async (feedbackId) => {
    try {
      await voteOnFeedback(feedbackId, userId);
      await loadData();
    } catch (error) {
      console.error('Error voting:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!isEnrolled) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className={`rounded-xl p-8 ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} shadow text-center`}>
          <Users className="w-16 h-16 mx-auto mb-4 text-blue-500" />
          <h1 className="text-3xl font-bold mb-4">Join the Beta Program</h1>
          <p className={`text-lg mb-6 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
            Help shape the future of Simulator by joining our beta program. Get early access to new features and provide feedback.
          </p>
          <div className="space-y-4 mb-8 text-left max-w-2xl mx-auto">
            <div className="flex items-start">
              <CheckCircle className="w-6 h-6 text-green-500 mr-3 mt-1 flex-shrink-0" />
              <div>
                <h3 className="font-semibold mb-1">Early Access</h3>
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  Be the first to try new features and scenarios
                </p>
              </div>
            </div>
            <div className="flex items-start">
              <CheckCircle className="w-6 h-6 text-green-500 mr-3 mt-1 flex-shrink-0" />
              <div>
                <h3 className="font-semibold mb-1">Direct Impact</h3>
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  Your feedback directly influences product development
                </p>
              </div>
            </div>
            <div className="flex items-start">
              <CheckCircle className="w-6 h-6 text-green-500 mr-3 mt-1 flex-shrink-0" />
              <div>
                <h3 className="font-semibold mb-1">Exclusive Benefits</h3>
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  Special badges, recognition, and extended access
                </p>
              </div>
            </div>
          </div>
          <button
            onClick={handleEnroll}
            className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 font-medium"
          >
            Join Beta Program
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className={`rounded-xl p-6 ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} shadow`}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-2">Beta Program</h1>
            <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              Cohort: {enrollment?.cohort || 'N/A'} • Enrolled: {new Date(enrollment?.enrollment_date).toLocaleDateString()}
            </p>
          </div>
          <button
            onClick={() => setShowFeedbackForm(!showFeedbackForm)}
            className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700"
          >
            <MessageSquare className="w-5 h-5 inline mr-2" />
            Submit Feedback
          </button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className={`rounded-xl p-6 ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} shadow`}>
          <h2 className="text-xl font-bold mb-4">Program Statistics</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Total Enrollments</p>
              <p className="text-2xl font-bold">{stats.total_enrollments || 0}</p>
            </div>
            <div>
              <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Active Users</p>
              <p className="text-2xl font-bold">{stats.active_users || 0}</p>
            </div>
            <div>
              <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Feedback Items</p>
              <p className="text-2xl font-bold">{stats.total_feedback_items || 0}</p>
            </div>
            <div>
              <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Resolved</p>
              <p className="text-2xl font-bold">{stats.resolved_feedback || 0}</p>
            </div>
          </div>
        </div>
      )}

      {/* Feedback Form */}
      {showFeedbackForm && (
        <div className={`rounded-xl p-6 ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} shadow`}>
          <h2 className="text-xl font-bold mb-4">Submit Feedback</h2>
          <form onSubmit={handleSubmitFeedback} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Type</label>
              <select
                value={feedbackForm.type}
                onChange={(e) => setFeedbackForm({ ...feedbackForm, type: e.target.value })}
                className={`w-full px-4 py-2 rounded-lg border ${
                  theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                }`}
              >
                <option value="bug_report">Bug Report</option>
                <option value="feature_request">Feature Request</option>
                <option value="usability">Usability</option>
                <option value="performance">Performance</option>
                <option value="general">General</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Title</label>
              <input
                type="text"
                required
                value={feedbackForm.title}
                onChange={(e) => setFeedbackForm({ ...feedbackForm, title: e.target.value })}
                className={`w-full px-4 py-2 rounded-lg border ${
                  theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                }`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Description</label>
              <textarea
                required
                rows={6}
                value={feedbackForm.description}
                onChange={(e) => setFeedbackForm({ ...feedbackForm, description: e.target.value })}
                className={`w-full px-4 py-2 rounded-lg border ${
                  theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                }`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Severity</label>
              <select
                value={feedbackForm.severity}
                onChange={(e) => setFeedbackForm({ ...feedbackForm, severity: e.target.value })}
                className={`w-full px-4 py-2 rounded-lg border ${
                  theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                }`}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
            <div className="flex space-x-4">
              <button
                type="submit"
                className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700"
              >
                Submit
              </button>
              <button
                type="button"
                onClick={() => setShowFeedbackForm(false)}
                className={`px-4 py-2 rounded-lg ${
                  theme === 'dark' ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'
                }`}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Feedback List */}
      <div className={`rounded-xl p-6 ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} shadow`}>
        <h2 className="text-xl font-bold mb-4">Community Feedback</h2>
        {feedback.length === 0 ? (
          <p className={`text-center py-8 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            No feedback submitted yet. Be the first!
          </p>
        ) : (
          <div className="space-y-4">
            {feedback.map((item, index) => (
              <div
                key={item.id}
                className={`p-4 rounded-lg border ${
                  theme === 'dark' ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-semibold">{item.title}</h3>
                    <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      {item.feedback_type} • {item.severity} • {new Date(item.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs ${
                      item.status === 'resolved'
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        : item.status === 'in_review'
                        ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {item.status}
                  </span>
                </div>
                <p className={`mb-3 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  {item.description}
                </p>
                <div className="flex items-center space-x-4">
                  <button
                    onClick={() => handleVote(item.id)}
                    className="flex items-center space-x-1 text-sm"
                  >
                    <TrendingUp className="w-4 h-4" />
                    <span>{item.upvotes || 0}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Surveys */}
      {surveys.length > 0 && (
        <div className={`rounded-xl p-6 ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} shadow`}>
          <h2 className="text-xl font-bold mb-4">Surveys</h2>
          <div className="space-y-4">
            {surveys.map((survey, index) => (
              <div
                key={survey.id}
                className={`p-4 rounded-lg border ${
                  theme === 'dark' ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold">{survey.title}</h3>
                    <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      {survey.description}
                    </p>
                  </div>
                  {survey.completed ? (
                    <CheckCircle className="w-6 h-6 text-green-500" />
                  ) : (
                    <button className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
                      Take Survey
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default BetaProgram;

