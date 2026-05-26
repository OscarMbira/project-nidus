import { useParams, useNavigate } from 'react-router-dom'

import { usePlatformProjectId } from '../../hooks/usePlatformProjectId.js'
import { useState, useEffect } from 'react'
import { Edit, ArrowLeft, FileText, Calendar, User, Package, CheckCircle, AlertCircle, TrendingUp, Printer } from 'lucide-react'
import { getCheckpointReportById } from '../../services/checkpointReportService'
import { getProductsByReport } from '../../services/checkpointReportProductsService'
import { getQualityActivities } from '../../services/checkpointReportQualityService'
import { getFollowUps } from '../../services/checkpointReportFollowUpService'
import { getLessons } from '../../services/checkpointReportLessonsService'
import { getQualityCheckStatus } from '../../services/checkpointReportQualityService'
import CheckpointReportStatusBadge from '../../components/structured/CheckpointReportStatusBadge'
import CheckpointQualityProgress from '../../components/structured/CheckpointQualityProgress'
import CheckpointReportRevisionHistory from '../../components/structured/CheckpointReportRevisionHistory'
import CheckpointReportApprovals from '../../components/structured/CheckpointReportApprovals'
import CheckpointReportDistribution from '../../components/structured/CheckpointReportDistribution'
import CheckpointReportPrintView from '../../components/structured/CheckpointReportPrintView'
import { format } from 'date-fns'
import ExportRecordButtons from '../../components/ui/ExportRecordButtons'
import { exportRecordToExcel, exportRecordToWord, exportRecordToPPT, exportRecordToCSV, exportRecordToXML, exportRecordToJSON, exportRecordToPrint } from '../../utils/exportUtils'

const CHECKPOINT_VIEW_SECTIONS = [
  { title: 'Document Information', fields: [
    { key: 'document_ref', label: 'Document Ref' },
    { key: 'report_title', label: 'Title' },
    { key: 'report_summary', label: 'Summary' },
    { key: 'checkpoint_date', label: 'Checkpoint Date' },
    { key: 'document_status', label: 'Status' }
  ]}
]

export default function CheckpointReportView() {
  const { workPackageId, reportId } = useParams()
  const { projectId, routeKey } = usePlatformProjectId()
  const navigate = useNavigate()
  const [report, setReport] = useState(null)
  const [products, setProducts] = useState([])
  const [qualityActivities, setQualityActivities] = useState([])
  const [followUps, setFollowUps] = useState([])
  const [lessons, setLessons] = useState([])
  const [qualityStatus, setQualityStatus] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    loadData()
  }, [reportId])

  const loadData = async () => {
    try {
      setLoading(true)
      const [reportData, productsData, qualityData, followUpsData, lessonsData, qualityStatusData] = await Promise.all([
        getCheckpointReportById(reportId),
        getProductsByReport(reportId),
        getQualityActivities(reportId),
        getFollowUps(reportId),
        getLessons(reportId),
        getQualityCheckStatus(reportId)
      ])
      setReport(reportData)
      setProducts(productsData)
      setQualityActivities(qualityData)
      setFollowUps(followUpsData)
      setLessons(lessonsData)
      setQualityStatus(qualityStatusData)
    } catch (error) {
      console.error('Error loading report:', error)
      alert('Error loading report: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500 dark:text-gray-400">Loading report...</div>
      </div>
    )
  }

  if (!report) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <p className="text-gray-600 dark:text-gray-400">Report not found</p>
        </div>
      </div>
    )
  }

  const tabs = [
    { id: 'overview', label: 'Overview', icon: FileText },
    { id: 'products', label: 'Products', icon: Package },
    { id: 'quality', label: 'Quality', icon: CheckCircle },
    { id: 'followups', label: 'Follow-Ups', icon: AlertCircle },
    { id: 'lessons', label: 'Lessons', icon: AlertCircle },
    { id: 'tolerance', label: 'Tolerance', icon: TrendingUp },
    { id: 'history', label: 'History', icon: FileText },
    { id: 'approvals', label: 'Approvals', icon: CheckCircle },
    { id: 'distribution', label: 'Distribution', icon: User },
    { id: 'print', label: 'Print/Export', icon: Printer }
  ]

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
        <button
          onClick={() => navigate(`/app/projects/${projectId}/work-packages/${workPackageId}/checkpoint-reports`)}
          className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
        >
          <ArrowLeft className="h-5 w-5" />
          Back to Reports
        </button>
        <div className="flex items-center gap-2">
          <ExportRecordButtons
            onExportPPT={() => exportRecordToPPT(CHECKPOINT_VIEW_SECTIONS, { ...report, document_status: report.status }, `Checkpoint_${report.document_ref || reportId}`)}
            onExportWord={() => exportRecordToWord(CHECKPOINT_VIEW_SECTIONS, { ...report, document_status: report.status }, `Checkpoint_${report.document_ref || reportId}`)}
            onExportExcel={() => exportRecordToExcel(CHECKPOINT_VIEW_SECTIONS, { ...report, document_status: report.status }, `Checkpoint_${report.document_ref || reportId}`)}
            onExportCSV={() => exportRecordToCSV(CHECKPOINT_VIEW_SECTIONS, { ...report, document_status: report.status }, `Checkpoint_${report.document_ref || reportId}`)}
            onExportXML={() => exportRecordToXML(CHECKPOINT_VIEW_SECTIONS, { ...report, document_status: report.status }, `Checkpoint_${report.document_ref || reportId}`)}
            onExportJSON={() => exportRecordToJSON(CHECKPOINT_VIEW_SECTIONS, { ...report, document_status: report.status }, `Checkpoint_${report.document_ref || reportId}`)}
            onExportPrint={() => exportRecordToPrint(CHECKPOINT_VIEW_SECTIONS, { ...report, document_status: report.status }, `Checkpoint_${report.document_ref || reportId}`)}
          />
        </div>
        {report.status === 'draft' || report.status === 'rejected' ? (
          <button
            onClick={() => navigate(`/app/projects/${projectId}/work-packages/${workPackageId}/checkpoint-reports/${reportId}/edit`)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2"
          >
            <Edit className="h-5 w-5" />
            Edit Report
          </button>
        ) : null}
      </div>

      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              {report.report_title || 'Checkpoint Report'}
            </h1>
            {report.document_ref && (
              <p className="text-gray-500 dark:text-gray-400">
                {report.document_ref} - Version {report.version_no}
              </p>
            )}
          </div>
          <CheckpointReportStatusBadge status={report.status} size="lg" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
            <Calendar className="h-4 w-4" />
            <span>Checkpoint Date: {report.checkpoint_date && format(new Date(report.checkpoint_date), 'MMM dd, yyyy')}</span>
          </div>
          {report.period_start_date && report.period_end_date && (
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
              <Calendar className="h-4 w-4" />
              <span>
                Period: {format(new Date(report.period_start_date), 'MMM dd')} - {format(new Date(report.period_end_date), 'MMM dd, yyyy')}
              </span>
            </div>
          )}
          {report.author && (
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
              <User className="h-4 w-4" />
              <span>Author: {report.author.full_name || report.author.email}</span>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow mb-6">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <div className="flex overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-6 py-4 flex items-center gap-2 border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  {tab.label}
                </button>
              )
            })}
          </div>
        </div>

        <div className="p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {report.report_summary && (
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Report Summary</h3>
                  <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{report.report_summary}</p>
                </div>
              )}
              {report.progress_summary && (
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Progress Summary</h3>
                  <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{report.progress_summary}</p>
                </div>
              )}
              {qualityStatus && (
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Quality Check Status</h3>
                  <CheckpointQualityProgress qualityStatus={qualityStatus} />
                </div>
              )}
            </div>
          )}

          {activeTab === 'products' && (
            <div className="space-y-4">
              {products.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400">No products added</p>
              ) : (
                products.map((product, index) => (
                  <div key={product.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-2">{product.product_name}</h4>
                    {product.product_description && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{product.product_description}</p>
                    )}
                    <div className="flex gap-2">
                      <span className="px-2 py-1 text-xs rounded bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                        {product.product_status.replace('_', ' ')}
                      </span>
                      {product.quality_status && (
                        <span className="px-2 py-1 text-xs rounded bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                          Quality: {product.quality_status.replace('_', ' ')}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'quality' && (
            <div className="space-y-4">
              {qualityActivities.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400">No quality activities</p>
              ) : (
                qualityActivities.map((activity, index) => (
                  <div key={activity.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-2">{activity.activity_name}</h4>
                    {activity.activity_description && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{activity.activity_description}</p>
                    )}
                    <div className="flex gap-2">
                      <span className="px-2 py-1 text-xs rounded bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                        {activity.activity_type}
                      </span>
                      <span className="px-2 py-1 text-xs rounded bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                        {activity.status.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'followups' && (
            <div className="space-y-4">
              {followUps.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400">No follow-up items</p>
              ) : (
                followUps.map((followUp, index) => (
                  <div key={followUp.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">                    <p className="text-gray-900 dark:text-white mb-2">{followUp.follow_up_item}</p>
                    {followUp.resolution && (
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        <strong>Resolution:</strong> {followUp.resolution}
                      </p>
                    )}
                    <span className="px-2 py-1 text-xs rounded bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 mt-2 inline-block">
                      {followUp.status.replace('_', ' ')}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'lessons' && (
            <div className="space-y-4">
              {lessons.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400">No lessons identified</p>
              ) : (
                lessons.map((lesson, index) => (
                  <div key={lesson.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-2">{lesson.lesson_title}</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{lesson.lesson_description}</p>
                    {lesson.recommendation && (
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        <strong>Recommendation:</strong> {lesson.recommendation}
                      </p>
                    )}
                    <div className="flex gap-2 mt-2">
                      <span className="px-2 py-1 text-xs rounded bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                        {lesson.lesson_type}
                      </span>
                      {lesson.is_escalated && (
                        <span className="px-2 py-1 text-xs rounded bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200">
                          Escalated
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'tolerance' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Time</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Actual: {report.time_actual || 0} days<br />
                  Forecast: {report.time_forecast || 0} days
                </p>
                <span className={`px-2 py-1 text-xs rounded mt-2 inline-block ${
                  report.tolerance_time_status === 'within' ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' :
                  report.tolerance_time_status === 'approaching' ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200' :
                  'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
                }`}>
                  {report.tolerance_time_status || 'within'}
                </span>
              </div>
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Cost</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Actual: ${(report.cost_actual || 0).toLocaleString()}<br />
                  Forecast: ${(report.cost_forecast || 0).toLocaleString()}
                </p>
                <span className={`px-2 py-1 text-xs rounded mt-2 inline-block ${
                  report.tolerance_cost_status === 'within' ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' :
                  report.tolerance_cost_status === 'approaching' ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200' :
                  'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
                }`}>
                  {report.tolerance_cost_status || 'within'}
                </span>
              </div>
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Scope</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Actual: {(report.scope_actual_percentage || 0).toFixed(1)}%<br />
                  Forecast: {(report.scope_forecast_percentage || 0).toFixed(1)}%
                </p>
                <span className={`px-2 py-1 text-xs rounded mt-2 inline-block ${
                  report.tolerance_scope_status === 'within' ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' :
                  report.tolerance_scope_status === 'approaching' ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200' :
                  'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
                }`}>
                  {report.tolerance_scope_status || 'within'}
                </span>
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <CheckpointReportRevisionHistory reportId={reportId} />
          )}

          {activeTab === 'approvals' && (
            <CheckpointReportApprovals
              reportId={reportId}
              mode="view"
            />
          )}

          {activeTab === 'distribution' && (
            <CheckpointReportDistribution
              reportId={reportId}
              mode="view"
            />
          )}

          {activeTab === 'print' && (
            <CheckpointReportPrintView
              report={report}
              products={products}
              qualityActivities={qualityActivities}
              followUps={followUps}
              lessons={lessons}
              qualityStatus={qualityStatus}
            />
          )}
        </div>
      </div>
    </div>
  )
}
