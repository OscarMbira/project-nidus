/**
 * Product Status Account View Component
 * Read-only view with tabs for all sections
 */

import { useState, useEffect } from 'react'
import { FileText, Clock, TrendingUp, CheckCircle, AlertCircle, Target, Link as LinkIcon, Edit } from 'lucide-react'
import { getProductStatusAccountById } from '../../services/productStatusAccountService'
import { getStatusHistory } from '../../services/psaStatusHistoryService'
import { getProgressSnapshots } from '../../services/psaProgressSnapshotsService'
import { getLinkedIssues } from '../../services/psaLinkedIssuesService'
import { getMilestones } from '../../services/psaMilestonesService'
import { getDependencies } from '../../services/psaDependenciesService'
import PSAStatusIndicator from './PSAStatusIndicator'
import PSAProgressIndicator from './PSAProgressIndicator'
import ProductStatusAccountExportMenu from './ProductStatusAccountExportMenu'
import ExportRecordButtons from '../ui/ExportRecordButtons'
import { exportRecordToExcel, exportRecordToWord, exportRecordToPPT, exportRecordToCSV, exportRecordToXML, exportRecordToJSON, exportRecordToPrint } from '../../utils/exportUtils'

const PSA_VIEW_SECTIONS = [
  { title: 'Overview', fields: [
    { key: 'psa_reference', label: 'Reference' },
    { key: 'product_name', label: 'Product Name' },
    { key: 'current_status', label: 'Status' },
    { key: 'progress_indicator', label: 'Progress' }
  ]}
]

const TABS = [
  { id: 'overview', label: 'Overview', icon: FileText },
  { id: 'progress', label: 'Progress', icon: TrendingUp },
  { id: 'quality', label: 'Quality & Acceptance', icon: CheckCircle },
  { id: 'issues', label: 'Issues & Dependencies', icon: AlertCircle },
  { id: 'history', label: 'History', icon: Clock }
]

export default function ProductStatusAccountView({ psaId, projectId }) {
  const [activeTab, setActiveTab] = useState('overview')
  const [psa, setPsa] = useState(null)
  const [statusHistory, setStatusHistory] = useState([])
  const [progressSnapshots, setProgressSnapshots] = useState([])
  const [linkedIssues, setLinkedIssues] = useState([])
  const [milestones, setMilestones] = useState([])
  const [dependencies, setDependencies] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (psaId) {
      loadData()
    }
  }, [psaId])

  const loadData = async () => {
    try {
      setLoading(true)
      const [psaResult, historyResult, progressResult, issuesResult, milestonesResult, depsResult] = await Promise.all([
        getProductStatusAccountById(psaId),
        getStatusHistory(psaId),
        getProgressSnapshots(psaId),
        getLinkedIssues(psaId),
        getMilestones(psaId),
        getDependencies(psaId)
      ])

      if (psaResult.success) setPsa(psaResult.data)
      if (historyResult.success) setStatusHistory(historyResult.data || [])
      if (progressResult.success) setProgressSnapshots(progressResult.data || [])
      if (issuesResult.success) setLinkedIssues(issuesResult.data || [])
      if (milestonesResult.success) setMilestones(milestonesResult.data || [])
      if (depsResult.success) setDependencies(depsResult.data || [])
    } catch (error) {
      console.error('Error loading PSA data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading product status account...</p>
        </div>
      </div>
    )
  }

  if (!psa) {
    return (
      <div className="text-center p-8">
        <p className="text-gray-600 dark:text-gray-400">Product Status Account not found</p>
      </div>
    )
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="space-y-6">
            {/* Current Status */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Current Status</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-600 dark:text-gray-400">Status</label>
                  <div className="mt-1">
                    <PSAStatusIndicator status={psa.current_status} size="md" />
                  </div>
                </div>
                {psa.status_date && (
                  <div>
                    <label className="text-sm text-gray-600 dark:text-gray-400">Status Date</label>
                    <p className="mt-1 text-gray-900 dark:text-white">{new Date(psa.status_date).toLocaleDateString()}</p>
                  </div>
                )}
                {psa.status_set_by_user && (
                  <div>
                    <label className="text-sm text-gray-600 dark:text-gray-400">Set By</label>
                    <p className="mt-1 text-gray-900 dark:text-white">{psa.status_set_by_user.full_name}</p>
                  </div>
                )}
              </div>
              {psa.status_notes && (
                <div className="mt-4">
                  <label className="text-sm text-gray-600 dark:text-gray-400">Status Notes</label>
                  <p className="mt-1 text-gray-900 dark:text-white">{psa.status_notes}</p>
                </div>
              )}
            </div>

            {/* Progress */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Progress</h3>
              <PSAProgressIndicator 
                progressPercentage={psa.progress_percentage || 0}
                progressIndicator={psa.progress_indicator}
              />
              {psa.progress_notes && (
                <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">{psa.progress_notes}</p>
              )}
            </div>

            {/* Schedule */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Schedule</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {psa.planned_start_date && (
                  <div>
                    <label className="text-sm text-gray-600 dark:text-gray-400">Planned Start</label>
                    <p className="mt-1 text-gray-900 dark:text-white">{new Date(psa.planned_start_date).toLocaleDateString()}</p>
                  </div>
                )}
                {psa.actual_start_date && (
                  <div>
                    <label className="text-sm text-gray-600 dark:text-gray-400">Actual Start</label>
                    <p className="mt-1 text-gray-900 dark:text-white">{new Date(psa.actual_start_date).toLocaleDateString()}</p>
                  </div>
                )}
                {psa.planned_completion_date && (
                  <div>
                    <label className="text-sm text-gray-600 dark:text-gray-400">Planned Completion</label>
                    <p className="mt-1 text-gray-900 dark:text-white">{new Date(psa.planned_completion_date).toLocaleDateString()}</p>
                  </div>
                )}
                {psa.forecast_completion_date && (
                  <div>
                    <label className="text-sm text-gray-600 dark:text-gray-400">Forecast Completion</label>
                    <p className="mt-1 text-gray-900 dark:text-white">{new Date(psa.forecast_completion_date).toLocaleDateString()}</p>
                  </div>
                )}
                {psa.actual_completion_date && (
                  <div>
                    <label className="text-sm text-gray-600 dark:text-gray-400">Actual Completion</label>
                    <p className="mt-1 text-gray-900 dark:text-white">{new Date(psa.actual_completion_date).toLocaleDateString()}</p>
                  </div>
                )}
                {psa.schedule_variance_days !== null && (
                  <div>
                    <label className="text-sm text-gray-600 dark:text-gray-400">Schedule Variance</label>
                    <p className={`mt-1 ${psa.schedule_variance_days > 0 ? 'text-red-600' : psa.schedule_variance_days < 0 ? 'text-green-600' : 'text-gray-900 dark:text-white'}`}>
                      {psa.schedule_variance_days > 0 ? '+' : ''}{psa.schedule_variance_days} days
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Status Summary */}
            {psa.status_summary && (
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Status Summary</h3>
                <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{psa.status_summary}</p>
              </div>
            )}
          </div>
        )

      case 'progress':
        return (
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Progress Tracking</h3>
              <PSAProgressIndicator 
                progressPercentage={psa.progress_percentage || 0}
                progressIndicator={psa.progress_indicator}
              />
            </div>

            {/* Progress Snapshots */}
            {progressSnapshots.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Progress History</h3>
                <div className="space-y-4">
                  {progressSnapshots.map((snapshot) => (
                    <div key={snapshot.id} className="border-l-4 border-blue-500 pl-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {new Date(snapshot.snapshot_date).toLocaleDateString()}
                        </span>
                        <span className="text-sm text-gray-600 dark:text-gray-400">{snapshot.progress_percentage}%</span>
                      </div>
                      {snapshot.progress_notes && (
                        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{snapshot.progress_notes}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Milestones */}
            {milestones.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Milestones</h3>
                <div className="space-y-4">
                  {milestones.map((milestone) => (
                    <div key={milestone.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-gray-900 dark:text-white">{milestone.milestone_name}</h4>
                        <span className={`px-2 py-1 text-xs rounded ${
                          milestone.milestone_status === 'achieved' ? 'bg-green-100 text-green-800' :
                          milestone.milestone_status === 'missed' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {milestone.milestone_status}
                        </span>
                      </div>
                      {milestone.milestone_description && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{milestone.milestone_description}</p>
                      )}
                      <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                        <span>Planned: {new Date(milestone.planned_date).toLocaleDateString()}</span>
                        {milestone.actual_date && (
                          <span>Actual: {new Date(milestone.actual_date).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )

      case 'quality':
        return (
          <div className="space-y-6">
            {/* Quality Status */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quality Status</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-600 dark:text-gray-400">Quality Status</label>
                  <p className="mt-1 text-gray-900 dark:text-white">{psa.quality_status?.replace('_', ' ')}</p>
                </div>
                {psa.quality_review_date && (
                  <div>
                    <label className="text-sm text-gray-600 dark:text-gray-400">Review Date</label>
                    <p className="mt-1 text-gray-900 dark:text-white">{new Date(psa.quality_review_date).toLocaleDateString()}</p>
                  </div>
                )}
                {psa.quality_reviewer && (
                  <div>
                    <label className="text-sm text-gray-600 dark:text-gray-400">Reviewer</label>
                    <p className="mt-1 text-gray-900 dark:text-white">{psa.quality_reviewer.full_name}</p>
                  </div>
                )}
              </div>
              {psa.quality_notes && (
                <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">{psa.quality_notes}</p>
              )}
            </div>

            {/* Acceptance Status */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Acceptance Status</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-600 dark:text-gray-400">Acceptance Status</label>
                  <p className="mt-1 text-gray-900 dark:text-white">{psa.acceptance_status?.replace('_', ' ')}</p>
                </div>
                {psa.acceptance_date && (
                  <div>
                    <label className="text-sm text-gray-600 dark:text-gray-400">Acceptance Date</label>
                    <p className="mt-1 text-gray-900 dark:text-white">{new Date(psa.acceptance_date).toLocaleDateString()}</p>
                  </div>
                )}
                {psa.accepted_by && (
                  <div>
                    <label className="text-sm text-gray-600 dark:text-gray-400">Accepted By</label>
                    <p className="mt-1 text-gray-900 dark:text-white">{psa.accepted_by.full_name}</p>
                  </div>
                )}
              </div>
              {psa.acceptance_notes && (
                <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">{psa.acceptance_notes}</p>
              )}
            </div>

            {/* Handover Status */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Handover Status</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-600 dark:text-gray-400">Handover Status</label>
                  <p className="mt-1 text-gray-900 dark:text-white">{psa.handover_status?.replace('_', ' ')}</p>
                </div>
                {psa.handover_date && (
                  <div>
                    <label className="text-sm text-gray-600 dark:text-gray-400">Handover Date</label>
                    <p className="mt-1 text-gray-900 dark:text-white">{new Date(psa.handover_date).toLocaleDateString()}</p>
                  </div>
                )}
                {psa.handed_over_to && (
                  <div>
                    <label className="text-sm text-gray-600 dark:text-gray-400">Handed Over To</label>
                    <p className="mt-1 text-gray-900 dark:text-white">{psa.handed_over_to.full_name}</p>
                  </div>
                )}
              </div>
              {psa.handover_notes && (
                <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">{psa.handover_notes}</p>
              )}
            </div>
          </div>
        )

      case 'issues':
        return (
          <div className="space-y-6">
            {/* Linked Issues */}
            {linkedIssues.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Linked Issues & Blockers</h3>
                <div className="space-y-4">
                  {linkedIssues.map((link) => (
                    <div key={link.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-gray-900 dark:text-white">
                          {link.issue?.issue_title || 'Issue'}
                        </h4>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 text-xs rounded ${
                            link.issue_type === 'blocker' ? 'bg-red-100 text-red-800' :
                            link.issue_type === 'risk' ? 'bg-orange-100 text-orange-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {link.issue_type}
                          </span>
                          {link.is_resolved && (
                            <span className="px-2 py-1 text-xs rounded bg-green-100 text-green-800">Resolved</span>
                          )}
                        </div>
                      </div>
                      {link.impact_on_product && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">Impact: {link.impact_on_product}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Dependencies */}
            {dependencies.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Dependencies</h3>
                <div className="space-y-4">
                  {dependencies.map((dep) => (
                    <div key={dep.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-gray-900 dark:text-white">
                          {dep.dependent_product?.product_name || dep.dependent_deliverable?.product_name || 'Dependency'}
                        </h4>
                        <div className="flex items-center gap-2">
                          {dep.is_critical && (
                            <span className="px-2 py-1 text-xs rounded bg-red-100 text-red-800">Critical</span>
                          )}
                          <span className={`px-2 py-1 text-xs rounded ${
                            dep.dependency_status === 'satisfied' ? 'bg-green-100 text-green-800' :
                            dep.dependency_status === 'blocked' ? 'bg-red-100 text-red-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {dep.dependency_status}
                          </span>
                        </div>
                      </div>
                      {dep.dependency_description && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">{dep.dependency_description}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {linkedIssues.length === 0 && dependencies.length === 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
                <AlertCircle className="w-16 h-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400">No issues or dependencies linked</p>
              </div>
            )}
          </div>
        )

      case 'history':
        return (
          <div className="space-y-6">
            {/* Status History */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Status History</h3>
              {statusHistory.length > 0 ? (
                <div className="space-y-4">
                  {statusHistory.map((history) => (
                    <div key={history.id} className="border-l-4 border-blue-500 pl-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {history.previous_status || 'N/A'} → {history.new_status}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {new Date(history.status_change_date).toLocaleDateString()} by {history.status_changed_by_user?.full_name || 'Unknown'}
                          </p>
                        </div>
                      </div>
                      {history.status_change_reason && (
                        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{history.status_change_reason}</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 dark:text-gray-400">No status history available</p>
              )}
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{psa.product_name}</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {psa.psa_reference} • Report Date: {new Date(psa.report_date).toLocaleDateString()}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <PSAStatusIndicator status={psa.current_status} size="lg" />
            <ExportRecordButtons
              onExportPPT={() => exportRecordToPPT(PSA_VIEW_SECTIONS, psa, `ProductStatusAccount_${psa.psa_reference || psa.id}`)}
              onExportWord={() => exportRecordToWord(PSA_VIEW_SECTIONS, psa, `ProductStatusAccount_${psa.psa_reference || psa.id}`)}
              onExportExcel={() => exportRecordToExcel(PSA_VIEW_SECTIONS, psa, `ProductStatusAccount_${psa.psa_reference || psa.id}`)}
              onExportCSV={() => exportRecordToCSV(PSA_VIEW_SECTIONS, psa, `ProductStatusAccount_${psa.psa_reference || psa.id}`)}
              onExportXML={() => exportRecordToXML(PSA_VIEW_SECTIONS, psa, `ProductStatusAccount_${psa.psa_reference || psa.id}`)}
              onExportJSON={() => exportRecordToJSON(PSA_VIEW_SECTIONS, psa, `ProductStatusAccount_${psa.psa_reference || psa.id}`)}
              onExportPrint={() => exportRecordToPrint(PSA_VIEW_SECTIONS, psa, `ProductStatusAccount_${psa.psa_reference || psa.id}`)}
            />
            <ProductStatusAccountExportMenu
              psa={psa}
              statusHistory={statusHistory}
              progressSnapshots={progressSnapshots}
              linkedIssues={linkedIssues}
              milestones={milestones}
              dependencies={dependencies}
            />
          </div>
        </div>

        {/* Links */}
        <div className="flex items-center gap-4 text-sm">
          {psa.product_deliverable && (
            <a
              href={`/app/projects/${projectId}/product-deliverables`}
              className="flex items-center text-blue-600 dark:text-blue-400 hover:underline"
            >
              <LinkIcon className="w-4 h-4 mr-1" />
              Product Deliverable
            </a>
          )}
          {psa.product_description && (
            <a
              href={`/app/projects/${projectId}/product-descriptions/${psa.product_description.id}`}
              className="flex items-center text-blue-600 dark:text-blue-400 hover:underline"
            >
              <LinkIcon className="w-4 h-4 mr-1" />
              Product Description
            </a>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex space-x-8">
          {TABS.map((tab) => {
            const TabIcon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                <TabIcon className="w-4 h-4" />
                {tab.label}
              </button>
            )
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div>{renderTabContent()}</div>
    </div>
  )
}
