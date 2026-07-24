import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../services/supabaseClient'
import { format } from 'date-fns'
import { CheckCircle, Clock, AlertCircle, Calendar, ArrowRight } from 'lucide-react'
import { getMyActions, completeAction } from '../services/issueActionService'

export default function MyIssueActions() {
  const navigate = useNavigate()
  const [actions, setActions] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all') // 'all', 'planned', 'in_progress', 'overdue'

  useEffect(() => {
    fetchActions()
  }, [])

  const fetchActions = async () => {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      const { data: userData } = await supabase
        .from('users')
        .select('id')
        .eq('auth_user_id', user.id)
        .single()

      if (!userData) throw new Error('User not found')

      const actionsData = await getMyActions(userData.id)
      
      // Apply filter
      let filtered = actionsData
      if (filter === 'overdue') {
        filtered = actionsData.filter(a => 
          a.target_date && 
          new Date(a.target_date) < new Date() && 
          a.status !== 'completed'
        )
      } else if (filter !== 'all') {
        filtered = actionsData.filter(a => a.status === filter)
      }

      setActions(filtered)
    } catch (error) {
      console.error('Error fetching actions:', error)
      alert('Error: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleComplete = async (actionId) => {
    try {
      const notes = prompt('Enter completion notes (optional):')
      await completeAction(actionId, notes || null)
      fetchActions()
    } catch (error) {
      console.error('Error completing action:', error)
      alert('Error: ' + error.message)
    }
  }

  const isOverdue = (action) => {
    return action.target_date && 
           new Date(action.target_date) < new Date() && 
           action.status !== 'completed'
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
      case 'in_progress':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
      case 'blocked':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
      default:
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading My Actions...</p>
        </div>
      </div>
    )
  }

  const overdueCount = actions.filter(isOverdue).length

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          My Issue Actions
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Actions assigned to you across all projects
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              filter === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            All ({actions.length})
          </button>
          <button
            onClick={() => setFilter('planned')}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              filter === 'planned'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            Planned
          </button>
          <button
            onClick={() => setFilter('in_progress')}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              filter === 'in_progress'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            In Progress
          </button>
          <button
            onClick={() => setFilter('overdue')}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              filter === 'overdue'
                ? 'bg-red-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            Overdue ({overdueCount})
          </button>
        </div>
      </div>

      {/* Actions List */}
      {actions.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
          <CheckCircle className="h-16 w-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            No Actions Assigned
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            You don't have any issue actions assigned to you.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {actions.map((action) => (
            <div
              key={action.id}
              className={`bg-white dark:bg-gray-800 rounded-lg border ${
                isOverdue(action)
                  ? 'border-red-300 dark:border-red-700'
                  : 'border-gray-200 dark:border-gray-700'
              } p-6 hover:shadow-md transition-shadow`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(action.status)}`}>
                      {action.status.replace('_', ' ')}
                    </span>
                    {isOverdue(action) && (
                      <span className="px-2 py-1 bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 rounded text-xs font-medium">
                        Overdue
                      </span>
                    )}
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    {action.action_description}
                  </h3>
                  <div className="mb-3">
                    <button
                      onClick={() => navigate(`/projects/${action.issue.project.id}/issues/register`)}
                      className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                    >
                      <span className="font-medium">{action.issue.issue_identifier || 'Issue'}</span>
                      <span className="text-gray-600 dark:text-gray-400">
                        {action.issue.issue_title}
                      </span>
                      <ArrowRight className="h-3 w-3" />
                    </button>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      Project: {action.issue.project.project_name}
                    </p>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                    {action.target_date && (
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        <span>Target: {format(new Date(action.target_date), 'MMM dd, yyyy')}</span>
                        {isOverdue(action) && (
                          <span className="text-red-600 dark:text-red-400">
                            ({Math.floor((new Date() - new Date(action.target_date)) / (1000 * 60 * 60 * 24))} days overdue)
                          </span>
                        )}
                      </div>
                    )}
                    {action.estimated_effort_hours && (
                      <span>Est: {action.estimated_effort_hours}h</span>
                    )}
                  </div>
                </div>
                {action.status !== 'completed' && (
                  <button
                    onClick={() => handleComplete(action.id)}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center gap-2"
                  >
                    <CheckCircle className="h-4 w-4" />
                    Complete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
