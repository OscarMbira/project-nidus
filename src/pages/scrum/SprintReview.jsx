import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'

import { usePlatformProjectId } from '../../hooks/usePlatformProjectId.js'
import { supabase } from '../../services/supabaseClient'
import { format } from 'date-fns'
import { CheckCircle, XCircle, Users, MessageSquare, Star, Plus, Save } from 'lucide-react'
import DemoChecklist from '../../components/scrum/DemoChecklist'

export default function SprintReview() {
  const { sprintId } = useParams()
  const { projectId, routeKey } = usePlatformProjectId()
  const navigate = useNavigate()
  const [sprint, setSprint] = useState(null)
  const [project, setProject] = useState(null)
  const [sprintStories, setSprintStories] = useState([])
  const [feedback, setFeedback] = useState([])
  const [attendance, setAttendance] = useState([])
  const [loading, setLoading] = useState(true)
  const [showFeedbackForm, setShowFeedbackForm] = useState(false)
  const [newFeedback, setNewFeedback] = useState({
    feedback_text: '',
    feedback_type: 'general',
    feedback_rating: null,
    requires_action: false,
    action_item_description: '',
  })
  const [currentUserId, setCurrentUserId] = useState(null)

  useEffect(() => {
    fetchData()
    getCurrentUser()
  }, [projectId, sprintId])

  const getCurrentUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      setCurrentUserId(user?.id || null)
    } catch (error) {
      console.error('Error getting current user:', error)
    }
  }

  const fetchData = async () => {
    try {
      setLoading(true)

      // Fetch project
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('id, project_name, project_code')
        .eq('id', projectId)
        .eq('is_deleted', false)
        .single()

      if (projectError) throw projectError
      setProject(projectData)

      // Fetch sprint
      const { data: sprintData, error: sprintError } = await supabase
        .from('sprints')
        .select('*')
        .eq('id', sprintId)
        .eq('project_id', projectId)
        .eq('is_deleted', false)
        .single()

      if (sprintError) throw sprintError
      setSprint(sprintData)

      // Fetch sprint stories
      const { data: storiesData, error: storiesError } = await supabase
        .from('sprint_backlogs')
        .select(`
          *,
          user_story:user_story_id (
            id,
            story_title,
            story_description,
            story_points,
            acceptance_criteria
          )
        `)
        .eq('sprint_id', sprintId)
        .eq('is_deleted', false)

      if (storiesError) throw storiesError
      setSprintStories(storiesData || [])

      // Fetch feedback
      const { data: feedbackData, error: feedbackError } = await supabase
        .from('sprint_review_feedback')
        .select(`
          *,
          feedback_provider:feedback_provider_user_id (id, email, full_name),
          user_story:user_story_id (id, story_title)
        `)
        .eq('sprint_id', sprintId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })

      if (feedbackError) throw feedbackError
      setFeedback(feedbackData || [])

      // Fetch attendance
      const { data: attendanceData, error: attendanceError } = await supabase
        .from('sprint_review_attendance')
        .select(`
          *,
          user:user_id (id, email, full_name)
        `)
        .eq('sprint_id', sprintId)
        .eq('is_deleted', false)

      if (attendanceError) throw attendanceError
      setAttendance(attendanceData || [])

    } catch (error) {
      console.error('Error fetching data:', error)
      alert('Error: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveFeedback = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      const { error } = await supabase
        .from('sprint_review_feedback')
        .insert({
          ...newFeedback,
          sprint_id: sprintId,
          project_id: projectId,
          feedback_provider_user_id: user.id,
          created_by: user.id,
          updated_by: user.id,
        })

      if (error) throw error

      setNewFeedback({
        feedback_text: '',
        feedback_type: 'general',
        feedback_rating: null,
        requires_action: false,
        action_item_description: '',
      })
      setShowFeedbackForm(false)
      fetchData()
    } catch (error) {
      console.error('Error saving feedback:', error)
      alert('Error saving feedback: ' + error.message)
    }
  }

  const handleMarkAttendance = async (userId, status) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      // Check if attendance already exists
      const { data: existing } = await supabase
        .from('sprint_review_attendance')
        .select('id')
        .eq('sprint_id', sprintId)
        .eq('user_id', userId)
        .eq('is_deleted', false)
        .single()

      if (existing) {
        // Update
        const { error } = await supabase
          .from('sprint_review_attendance')
          .update({
            attendance_status: status,
            updated_by: user.id,
          })
          .eq('id', existing.id)

        if (error) throw error
      } else {
        // Create
        const { error } = await supabase
          .from('sprint_review_attendance')
          .insert({
            sprint_id: sprintId,
            project_id: projectId,
            user_id: userId,
            attendance_status: status,
            created_by: user.id,
            updated_by: user.id,
          })

        if (error) throw error
      }

      fetchData()
    } catch (error) {
      console.error('Error marking attendance:', error)
      alert('Error marking attendance: ' + error.message)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading Sprint Review...</p>
        </div>
      </div>
    )
  }

  if (!sprint) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400 mb-4">Sprint not found</p>
          <button
            onClick={() => navigate(`/projects/${projectId}`)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
          >
            Go to Project
          </button>
        </div>
      </div>
    )
  }

  const completedStories = sprintStories.filter(s => s.status === 'done')
  const completedPoints = completedStories.reduce((sum, s) => sum + (s.user_story?.story_points || 0), 0)
  const totalPoints = sprintStories.reduce((sum, s) => sum + (s.user_story?.story_points || 0), 0)

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <button
        onClick={() => navigate(`/projects/${projectId}/scrum/sprint/${sprintId}/board`)}
        className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4"
      >
        ← Back to Sprint Board
      </button>

      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Sprint Review
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          {sprint.sprint_name} - {project?.project_name}
        </p>
      </div>

      {/* Sprint Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Sprint Duration</p>
          <p className="text-lg font-semibold text-gray-900 dark:text-white">
            {sprint.sprint_start_date && sprint.sprint_end_date
              ? `${format(new Date(sprint.sprint_start_date), 'MMM dd')} - ${format(new Date(sprint.sprint_end_date), 'MMM dd')}`
              : 'Not set'}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Stories Completed</p>
          <p className="text-lg font-semibold text-gray-900 dark:text-white">
            {completedStories.length} / {sprintStories.length}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Story Points</p>
          <p className="text-lg font-semibold text-gray-900 dark:text-white">
            {completedPoints} / {totalPoints} pts
          </p>
        </div>
      </div>

      {/* Demo Checklist */}
      <div className="mb-6">
        <DemoChecklist sprintStories={sprintStories} />
      </div>

      {/* Attendance */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Users className="h-5 w-5" />
          Attendance
        </h2>
        <div className="space-y-2">
          {attendance.map((att) => (
            <div key={att.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded">
              <span className="text-gray-900 dark:text-white">
                {att.user?.full_name || att.user?.email}
              </span>
              <span className={`px-2 py-1 rounded text-xs ${
                att.attendance_status === 'attended' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
                att.attendance_status === 'late' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' :
                'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
              }`}>
                {att.attendance_status}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Feedback */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Stakeholder Feedback
          </h2>
          <button
            onClick={() => setShowFeedbackForm(!showFeedbackForm)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Feedback
          </button>
        </div>

        {showFeedbackForm && (
          <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Feedback
              </label>
              <textarea
                value={newFeedback.feedback_text}
                onChange={(e) => setNewFeedback({ ...newFeedback, feedback_text: e.target.value })}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                placeholder="Enter your feedback..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Type
                </label>
                <select
                  value={newFeedback.feedback_type}
                  onChange={(e) => setNewFeedback({ ...newFeedback, feedback_type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                >
                  <option value="general">General</option>
                  <option value="story_feedback">Story Feedback</option>
                  <option value="demo_feedback">Demo Feedback</option>
                  <option value="improvement">Improvement</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Rating (1-5)
                </label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((rating) => (
                    <button
                      key={rating}
                      onClick={() => setNewFeedback({ ...newFeedback, feedback_rating: rating })}
                      className={`p-2 rounded ${
                        newFeedback.feedback_rating === rating
                          ? 'bg-yellow-400 text-yellow-900'
                          : 'bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300'
                      }`}
                    >
                      <Star className="h-4 w-4" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={newFeedback.requires_action}
                onChange={(e) => setNewFeedback({ ...newFeedback, requires_action: e.target.checked })}
                className="rounded"
              />
              <label className="text-sm text-gray-700 dark:text-gray-300">Requires action</label>
            </div>
            {newFeedback.requires_action && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Action Item Description
                </label>
                <textarea
                  value={newFeedback.action_item_description}
                  onChange={(e) => setNewFeedback({ ...newFeedback, action_item_description: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  placeholder="Describe the action item..."
                />
              </div>
            )}
            <div className="flex gap-2">
              <button
                onClick={handleSaveFeedback}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2"
              >
                <Save className="h-4 w-4" />
                Save Feedback
              </button>
              <button
                onClick={() => {
                  setShowFeedbackForm(false)
                  setNewFeedback({
                    feedback_text: '',
                    feedback_type: 'general',
                    feedback_rating: null,
                    requires_action: false,
                    action_item_description: '',
                  })
                }}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="space-y-4">
          {feedback.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-center py-8">
              No feedback yet. Be the first to provide feedback!
            </p>
          ) : (
            feedback.map((fb) => (
              <div key={fb.id} className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {fb.feedback_provider?.full_name || fb.feedback_provider?.email}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {format(new Date(fb.created_at), 'MMM dd, yyyy HH:mm')}
                    </p>
                  </div>
                  {fb.feedback_rating && (
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((rating) => (
                        <Star
                          key={rating}
                          className={`h-4 w-4 ${
                            rating <= fb.feedback_rating
                              ? 'text-yellow-400 fill-current'
                              : 'text-gray-300 dark:text-gray-600'
                          }`}
                        />
                      ))}
                    </div>
                  )}
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">{fb.feedback_text}</p>
                {fb.requires_action && fb.action_item_description && (
                  <div className="mt-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded">
                    <p className="text-xs font-medium text-yellow-800 dark:text-yellow-300">Action Item:</p>
                    <p className="text-xs text-yellow-700 dark:text-yellow-400">{fb.action_item_description}</p>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

