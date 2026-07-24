import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import ScenarioReview from '../../components/sim/ScenarioReview';
import { simDb } from '../../services/supabase/supabaseClient';

const ScenarioDetail = () => {
  const { theme } = useTheme();
  const { scenarioId } = useParams();
  const navigate = useNavigate();
  const [scenario, setScenario] = useState(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [userReview, setUserReview] = useState(null);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    loadScenario();
    loadReviews();
    getCurrentUser();
  }, [scenarioId]);

  const getCurrentUser = async () => {
    try {
      const { data: { user } } = await simDb.auth.getUser();
      setUserId(user?.id);
      if (user?.id) {
        loadUserReview(user.id);
      }
    } catch (error) {
      console.error('Error getting user:', error);
    }
  };

  const loadReviews = async () => {
    try {
      // Mock reviews for now
      const mockReviews = [
        {
          id: '1',
          user: { email: 'user1@example.com' },
          rating: 5,
          review_text: 'Great simulation! Really helped me understand Scrum kickoff.',
          created_at: new Date(Date.now() - 86400000).toISOString(),
          helpful_count: 12,
        },
        {
          id: '2',
          user: { email: 'user2@example.com' },
          rating: 4,
          review_text: 'Good practice scenario. Some events were challenging but realistic.',
          created_at: new Date(Date.now() - 172800000).toISOString(),
          helpful_count: 5,
        },
      ];
      setReviews(mockReviews);
    } catch (error) {
      console.error('Error loading reviews:', error);
    }
  };

  const loadUserReview = async (userId) => {
    try {
      // Check if user has already reviewed
      // Mock: no review yet
      setUserReview(null);
    } catch (error) {
      console.error('Error loading user review:', error);
    }
  };

  const handleReviewSubmitted = (review) => {
    setUserReview(review);
    setShowReviewForm(false);
    loadReviews(); // Reload reviews
  };

  const loadScenario = async () => {
    try {
      setLoading(true);
      // Mock data for now - will be replaced with actual DB call
      const mockScenarios = {
        '1': {
          id: '1',
          name: 'IT Project Kickoff',
          short_description: 'Learn to initiate and plan a software development project using Scrum methodology.',
          description: 'As a newly assigned Project Manager, you will lead the kickoff of a mobile banking app development project. You\'ll work with stakeholders to define requirements, set up the Scrum framework, create the initial product backlog, and plan the first sprint. This simulation covers project charter creation, stakeholder identification, team formation, and establishing communication protocols.',
          industry: 'IT/Software',
          methodology: 'Scrum',
          difficulty_level: 'beginner',
          duration_minutes: 60,
          target_role: 'project_manager',
          is_premium: false,
          completions_count: 1250,
          rating: 4.5,
          xp_reward: 100,
          learning_objectives: [
            'Create a comprehensive project charter',
            'Identify and analyze key stakeholders',
            'Set up a Scrum framework for your team',
            'Build an initial product backlog with user stories',
            'Plan and execute sprint planning for Sprint 1',
          ],
          prerequisites: [
            'Basic understanding of project management concepts',
            'Familiarity with Agile principles',
          ],
          phases: [
            {
              name: 'Project Initiation',
              description: 'Define the project charter and identify key stakeholders',
              duration_minutes: 15,
              objectives: ['Create project charter', 'Identify stakeholders', 'Define success criteria'],
            },
            {
              name: 'Team Formation',
              description: 'Assemble and onboard the Scrum team',
              duration_minutes: 10,
              objectives: ['Select team members', 'Define roles', 'Set working agreements'],
            },
            {
              name: 'Product Backlog Creation',
              description: 'Work with Product Owner to create initial backlog',
              duration_minutes: 20,
              objectives: ['Gather requirements', 'Write user stories', 'Prioritize backlog'],
            },
            {
              name: 'Sprint Planning',
              description: 'Plan the first sprint with the team',
              duration_minutes: 15,
              objectives: ['Define sprint goal', 'Select backlog items', 'Estimate effort'],
            },
          ],
        },
      };

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));
      setScenario(mockScenarios[scenarioId] || mockScenarios['1']);
    } catch (error) {
      console.error('Error loading scenario:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartSimulation = async () => {
    setStarting(true);
    try {
      // In real app: const run = await startSimulation(userId, scenarioId);
      await new Promise(resolve => setTimeout(resolve, 1000));
      navigate(`/simulator/run/${scenarioId}`);
    } catch (error) {
      console.error('Error starting simulation:', error);
      setStarting(false);
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

  const getRoleLabel = (role) => {
    const labels = {
      team_member: 'Team Member',
      team_lead: 'Team Lead',
      project_manager: 'Project Manager',
      programme_manager: 'Programme Manager',
    };
    return labels[role] || role;
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
      <div className="text-center py-12">
        <h2 className="text-xl font-bold mb-2">Scenario not found</h2>
        <Link to="/simulator/scenarios" className="text-blue-500 hover:underline">
          Back to scenarios
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Back Button */}
      <Link
        to="/simulator/scenarios"
        className={`inline-flex items-center mb-6 ${theme === 'dark' ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-black'}`}
      >
        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to Scenarios
      </Link>

      {/* Header */}
      <div className={`rounded-xl overflow-hidden ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} shadow-lg mb-6`}>
        <div className="h-48 bg-gradient-to-r from-blue-500 to-purple-600 relative">
          {scenario.is_premium && (
            <span className="absolute top-4 right-4 px-3 py-1 text-sm font-bold bg-yellow-400 text-black rounded-lg shadow">
              PRO
            </span>
          )}
        </div>
        <div className="p-6">
          <div className="flex flex-wrap gap-2 mb-3">
            <span className={`px-3 py-1 text-sm rounded-full ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-100'}`}>
              {scenario.industry}
            </span>
            <span className={`px-3 py-1 text-sm rounded-full ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-100'}`}>
              {scenario.methodology}
            </span>
            <span className={`px-3 py-1 text-sm rounded-full ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-100'}`}>
              {getRoleLabel(scenario.target_role)}
            </span>
          </div>
          <h1 className="text-2xl font-bold mb-2">{scenario.name}</h1>
          <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} mb-4`}>
            {scenario.description}
          </p>

          {/* Stats Row */}
          <div className="flex flex-wrap items-center gap-6 text-sm">
            <div className="flex items-center">
              <span className={`w-3 h-3 rounded-full ${getDifficultyColor(scenario.difficulty_level)} mr-2`}></span>
              <span className="capitalize">{scenario.difficulty_level}</span>
            </div>
            <div className="flex items-center">
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {scenario.duration_minutes} min
            </div>
            <div className="flex items-center">
              <svg className="w-4 h-4 mr-1 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              {scenario.rating?.toFixed(1) || 'N/A'}
            </div>
            <div className="flex items-center">
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              {scenario.completions_count} completed
            </div>
            <div className="flex items-center text-purple-500">
              <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
              </svg>
              +{scenario.xp_reward} XP
            </div>
          </div>
        </div>
      </div>

      {/* Learning Objectives */}
      {scenario.learning_objectives && (
        <div className={`rounded-xl p-6 ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} shadow mb-6`}>
          <h2 className="text-lg font-semibold mb-4">What You'll Learn</h2>
          <ul className="space-y-2">
            {scenario.learning_objectives.map((objective, index) => (
              <li key={index} className="flex items-start">
                <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>{objective}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Phases */}
      {scenario.phases && scenario.phases.length > 0 && (
        <div className={`rounded-xl p-6 ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} shadow mb-6`}>
          <h2 className="text-lg font-semibold mb-4">Simulation Phases</h2>
          <div className="space-y-4">
            {scenario.phases.map((phase, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg border ${theme === 'dark' ? 'border-gray-700 bg-gray-750' : 'border-gray-200 bg-gray-50'}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mr-3 ${
                      theme === 'dark' ? 'bg-gray-600' : 'bg-gray-300'
                    }`}>
                      {index + 1}
                    </span>
                    <h3 className="font-medium">{phase.name}</h3>
                  </div>
                  <span className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                    ~{phase.duration_minutes} min
                  </span>
                </div>
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} mb-2 ml-9`}>
                  {phase.description}
                </p>
                <div className="flex flex-wrap gap-1 ml-9">
                  {phase.objectives?.map((obj, i) => (
                    <span
                      key={i}
                      className={`px-2 py-0.5 text-xs rounded ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'}`}
                    >
                      {obj}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Prerequisites */}
      {scenario.prerequisites && scenario.prerequisites.length > 0 && (
        <div className={`rounded-xl p-6 ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} shadow mb-6`}>
          <h2 className="text-lg font-semibold mb-4">Prerequisites</h2>
          <ul className="space-y-2">
            {scenario.prerequisites.map((prereq, index) => (
              <li key={index} className="flex items-start">
                <svg className="w-5 h-5 text-blue-500 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>{prereq}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Reviews Section */}
      <div className={`rounded-xl p-6 ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} shadow mb-6`}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Reviews</h2>
          {userId && !userReview && (
            <button
              onClick={() => setShowReviewForm(!showReviewForm)}
              className="px-4 py-2 text-sm font-medium bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              {showReviewForm ? 'Cancel' : 'Write Review'}
            </button>
          )}
        </div>

        {/* Review Form */}
        {showReviewForm && userId && (
          <div className="mb-6">
            <ScenarioReview
              scenarioId={scenarioId}
              userReview={userReview}
              onReviewSubmitted={handleReviewSubmitted}
            />
          </div>
        )}

        {/* Reviews List */}
        {reviews.length === 0 ? (
          <p className={`text-center py-8 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            No reviews yet. Be the first to review this scenario!
          </p>
        ) : (
          <div className="space-y-4">
            {reviews.map((review) => (
              <div
                key={review.id}
                className={`p-4 rounded-lg border ${
                  theme === 'dark' ? 'border-gray-700 bg-gray-750' : 'border-gray-200 bg-gray-50'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-medium">{review.user?.email || 'Anonymous'}</p>
                    <p className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                      {new Date(review.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <svg
                        key={star}
                        className={`w-4 h-4 ${
                          star <= review.rating
                            ? 'text-yellow-400 fill-current'
                            : 'text-gray-300 dark:text-gray-600'
                        }`}
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                </div>
                {review.review_text && (
                  <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    {review.review_text}
                  </p>
                )}
                {review.helpful_count > 0 && (
                  <div className="flex items-center mt-2 text-xs text-gray-500">
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                    </svg>
                    {review.helpful_count} helpful
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Start Button */}
      <div className="flex justify-center">
        <button
          onClick={handleStartSimulation}
          disabled={starting}
          className={`px-8 py-4 rounded-xl font-medium text-lg transition-all ${
            starting
              ? 'bg-gray-500 cursor-not-allowed'
              : 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 shadow-lg hover:shadow-xl'
          } text-white`}
        >
          {starting ? (
            <span className="flex items-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Starting Simulation...
            </span>
          ) : (
            <>Start Simulation</>
          )}
        </button>
      </div>
    </div>
  );
};

export default ScenarioDetail;
