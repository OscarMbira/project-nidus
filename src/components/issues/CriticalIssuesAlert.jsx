/**
 * Critical Issues Alert Component
 * Highlights critical issues requiring immediate attention
 */

import { useState, useEffect } from 'react'
import { AlertTriangle, ArrowRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { getIssues } from '../../services/issueService'
import { getIssueRegisterByProject } from '../../services/issueRegisterService'

export default function CriticalIssuesAlert({ projectId }) {
  const [criticalIssues, setCriticalIssues] = useState([])
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    if (projectId) {
      loadCriticalIssues()
    }
  }, [projectId])

  const loadCriticalIssues = async () => {
    setLoading(true)
    try {
      const registerResult = await getIssueRegisterByProject(projectId)
      if (registerResult.success && registerResult.data) {
        const issuesResult = await getIssues(registerResult.data.id, {})
        if (issuesResult.success && issuesResult.data) {
          // Filter critical/high priority issues that are open
          const critical = (issuesResult.data || []).filter(issue => {
            const isOpen = !['closed', 'cancelled', 'resolved'].includes(issue.status)
            const isCritical = issue.priority === 'critical' || 
                              issue.severity === 'critical' ||
                              (issue.priority === 'high' && issue.severity === 'major')
            return isOpen && isCritical
          })
          setCriticalIssues(critical.slice(0, 5)) // Show top 5
        }
      }
    } catch (error) {
      console.error('Error loading critical issues:', error)
      setCriticalIssues([])
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return null
  }

  if (criticalIssues.length === 0) {
    return null
  }

  return (
    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-semibold text-red-800 dark:text-red-300">
              Critical Issues Requiring Immediate Attention
            </h4>
            <button
              onClick={() => navigate(`/app/projects/${projectId}/issues/register`)}
              className="text-xs text-red-700 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300 flex items-center gap-1"
            >
              View All
              <ArrowRight className="h-3 w-3" />
            </button>
          </div>
          <ul className="space-y-2">
            {criticalIssues.map(issue => (
              <li key={issue.id} className="text-sm text-red-700 dark:text-red-400">
                <button
                  onClick={() => navigate(`/app/projects/${projectId}/issues/${issue.id}`)}
                  className="hover:underline flex items-center gap-2"
                >
                  <span className="font-mono text-xs">{issue.issue_identifier || issue.id.substring(0, 8)}</span>
                  <span>{issue.issue_title}</span>
                  {(issue.priority === 'critical' || issue.severity === 'critical') && (
                    <span className="px-1.5 py-0.5 bg-red-200 dark:bg-red-800 text-red-800 dark:text-red-200 rounded text-xs font-medium">
                      CRITICAL
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
