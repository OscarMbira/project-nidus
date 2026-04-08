import { useState, useEffect } from 'react'
import { FileText, AlertCircle, Clock, CheckCircle } from 'lucide-react'
import { getIssueReportsByProject, getIssueReportsRequiringDecision } from '../../services/issueReportService'

export default function IssueReportMetrics({ projectId = null, organizationId = null }) {
  const [metrics, setMetrics] = useState({
    totalReports: 0,
    draftReports: 0,
    pendingApproval: 0,
    awaitingDecision: 0,
    approvedReports: 0,
    distributedReports: 0,
    closedReports: 0
  })
  const [reportsRequiringDecision, setReportsRequiringDecision] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchMetrics()
  }, [projectId, organizationId])

  const fetchMetrics = async () => {
    try {
      setLoading(true)
      
      let allReports = []
      
      if (projectId) {
        // Single project
        const reports = await getIssueReportsByProject(projectId)
        allReports = reports
      } else if (organizationId) {
        // All projects in organization (would need to fetch project IDs first)
        // For now, placeholder - can be enhanced
      }

      const metrics = {
        totalReports: allReports.length,
        draftReports: allReports.filter(r => r.report_status === 'draft').length,
        pendingApproval: allReports.filter(r => r.report_status === 'submitted' || r.report_status === 'under_review').length,
        awaitingDecision: allReports.filter(r => r.decision_required && !r.decision_made).length,
        approvedReports: allReports.filter(r => r.report_status === 'approved').length,
        distributedReports: allReports.filter(r => r.report_status === 'distributed').length,
        closedReports: allReports.filter(r => r.report_status === 'closed').length
      }

      setMetrics(metrics)

      // Get reports requiring decision
      if (projectId) {
        const requiringDecision = await getIssueReportsRequiringDecision(projectId)
        setReportsRequiringDecision(requiringDecision)
      }
    } catch (error) {
      console.error('Error fetching issue report metrics:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center gap-2 mb-4">
        <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Issue Reports</h3>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900 dark:text-white">{metrics.totalReports}</div>
          <div className="text-xs text-gray-600 dark:text-gray-400">Total Reports</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{metrics.draftReports}</div>
          <div className="text-xs text-gray-600 dark:text-gray-400">Draft</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{metrics.pendingApproval}</div>
          <div className="text-xs text-gray-600 dark:text-gray-400">Pending Approval</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">{metrics.closedReports}</div>
          <div className="text-xs text-gray-600 dark:text-gray-400">Closed</div>
        </div>
      </div>

      {metrics.awaitingDecision > 0 && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
          <div className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
            <Clock className="w-4 h-4" />
            <span className="text-sm font-medium">
              {metrics.awaitingDecision} report{metrics.awaitingDecision !== 1 ? 's' : ''} awaiting decision
            </span>
          </div>
          {reportsRequiringDecision.length > 0 && (
            <ul className="mt-2 text-xs text-yellow-700 dark:text-yellow-300 list-disc list-inside">
              {reportsRequiringDecision.slice(0, 3).map((report) => (
                <li key={report.report_id}>
                  {report.report_reference} - {report.days_waiting} day{report.days_waiting !== 1 ? 's' : ''} waiting
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
