import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../services/supabaseClient'
import { format } from 'date-fns'
import { AlertCircle, Clock, ArrowRight, User, Calendar, CheckCircle } from 'lucide-react'
import { getPendingDecisions } from '../services/issueDecisionService'
import DecisionForm from '../components/issues/DecisionForm'

export default function PendingDecisions() {
  const navigate = useNavigate()
  const [issues, setIssues] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedProject, setSelectedProject] = useState(null)
  const [showDecisionForm, setShowDecisionForm] = useState(false)
  const [selectedIssue, setSelectedIssue] = useState(null)

  useEffect(() => {
    fetchPendingDecisions()
  }, [])

  const fetchPendingDecisions = async () => {
    try {
      setLoading(true)
      // Get all projects user has access to
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      const { data: userData } = await supabase
        .from('users')
        .select('id')
        .eq('auth_user_id', user.id)
        .single()

      if (!userData) throw new Error('User not found')

      const { data: projects } = await supabase
        .from('user_projects')
        .select('project_id, project:projects(id, project_name)')
        .eq('user_id', userData.id)
        .eq('is_deleted', false)

      if (!projects) return

      // Get pending decisions for all projects
      const allIssues = []
      for (const up of projects) {
        try {
          const pending = await getPendingDecisions(up.project_id)
          allIssues.push(...pending.map(issue => ({
            ...issue,
            project: up.project
          })))
        } catch (error) {
          console.error(`Error fetching pending decisions for project ${up.project_id}:`, error)
        }
      }

      setIssues(allIssues)
    } catch (error) {
      console.error('Error fetching pending decisions:', error)
      alert('Error: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleRecordDecision = (issue) => {
    setSelectedIssue(issue)
    setSelectedProject(issue.project)
    setShowDecisionForm(true)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading Pending Decisions...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Pending Decisions
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Issues awaiting decisions across all projects ({issues.length})
        </p>
      </div>

      {issues.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
          <CheckCircle className="h-16 w-16 text-green-400 dark:text-green-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            No Pending Decisions
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            All issues have decisions recorded.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {issues.map((issue) => (
            <div
              key={issue.id}
              className="bg-white dark:bg-gray-800 rounded-lg border border-yellow-200 dark:border-yellow-800 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="h-5 w-5 text-yellow-600" />
                    <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 rounded text-xs font-medium">
                      Awaiting Decision
                    </span>
                    {issue.issue_identifier && (
                      <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded text-xs font-mono">
                        {issue.issue_identifier}
                      </span>
                    )}
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    {issue.issue_title}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                    {issue.issue_description}
                  </p>
                  <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mb-3">
                    <button
                      onClick={() => navigate(`/projects/${issue.project.id}/issues/register`)}
                      className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                    >
                      <span>{issue.project.project_name}</span>
                      <ArrowRight className="h-3 w-3" />
                    </button>
                    {issue.date_raised && (
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        <span>Raised: {format(new Date(issue.date_raised), 'MMM dd, yyyy')}</span>
                      </div>
                    )}
                    {issue.raised_by && (
                      <div className="flex items-center gap-1">
                        <User className="h-4 w-4" />
                        <span>Raised by: {issue.raised_by.full_name || issue.raised_by.email}</span>
                      </div>
                    )}
                  </div>
                  {issue.impact_description && (
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 mb-3">
                      <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2">
                        <span className="font-medium">Impact:</span> {issue.impact_description}
                      </p>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => handleRecordDecision(issue)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 ml-4"
                >
                  <AlertCircle className="h-4 w-4" />
                  Record Decision
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showDecisionForm && selectedIssue && (
        <DecisionForm
          issueId={selectedIssue.id}
          issue={selectedIssue}
          onSave={() => {
            setShowDecisionForm(false)
            setSelectedIssue(null)
            fetchPendingDecisions()
          }}
          onCancel={() => {
            setShowDecisionForm(false)
            setSelectedIssue(null)
          }}
        />
      )}
    </div>
  )
}
