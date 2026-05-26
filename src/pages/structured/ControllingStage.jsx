import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'

import { usePlatformProjectId } from '../../hooks/usePlatformProjectId.js'
import { supabase } from '../../services/supabaseClient'
import { format } from 'date-fns'
import { Plus, Package, CheckCircle, Clock, AlertCircle, FileText, BarChart3, Settings } from 'lucide-react'
import WorkPackageForm from '../../components/structured/WorkPackageForm'
import WorkPackageList from '../../components/structured/WorkPackageList'
// Legacy component kept for backward compatibility
// import CheckpointReport from '../../components/structured/CheckpointReport'
import { getCheckpointReportsByProject } from '../../services/checkpointReportService'
import { getHighlightReports } from '../../services/controllingStageService'
import ToleranceDashboard from '../../components/structured/ToleranceDashboard'

export default function ControllingStage() {
  const { projectId, routeKey } = usePlatformProjectId()
  const navigate = useNavigate()
  const [project, setProject] = useState(null)
  const [stageBoundaries, setStageBoundaries] = useState([])
  const [workPackages, setWorkPackages] = useState([])
  const [loading, setLoading] = useState(true)
  const [showWorkPackageForm, setShowWorkPackageForm] = useState(false)
  const [selectedWorkPackage, setSelectedWorkPackage] = useState(null)
  const [selectedStage, setSelectedStage] = useState(null)
  const [activeTab, setActiveTab] = useState('work-packages') // 'work-packages', 'progress', 'reports', 'tolerances'
  const [checkpointReports, setCheckpointReports] = useState([])
  const [highlightReports, setHighlightReports] = useState([])
  const [highlightReportFilter, setHighlightReportFilter] = useState('')

  useEffect(() => {
    fetchData()
  }, [projectId])

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

      // Fetch stage boundaries
      const { data: stagesData, error: stagesError } = await supabase
        .from('stage_boundaries')
        .select('*')
        .eq('project_id', projectId)
        .eq('is_deleted', false)
        .order('gate_order', { ascending: true })

      if (stagesError) throw stagesError
      setStageBoundaries(stagesData || [])

      // Fetch work packages
      const { data: packagesData, error: packagesError } = await supabase
        .from('work_packages')
        .select(`
          *,
          assigned_to:assigned_to_user_id (id, email, full_name),
          stage_boundary:stage_boundary_id (id, stage_name, gate_name)
        `)
        .eq('project_id', projectId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })

      if (packagesError) throw packagesError
      setWorkPackages(packagesData || [])

      // Fetch checkpoint reports using service
      try {
        const checkpointData = await getCheckpointReportsByProject(projectId, {})
        setCheckpointReports(checkpointData.slice(0, 10)) // Limit to 10 most recent
      } catch (checkpointError) {
        console.error('Error loading checkpoint reports:', checkpointError)
        setCheckpointReports([])
      }

      // Fetch highlight reports
      try {
        const highlightData = await getHighlightReports(projectId)
        setHighlightReports(highlightData || [])
      } catch (highlightError) {
        console.error('Error loading highlight reports:', highlightError)
        setHighlightReports([])
      }

    } catch (error) {
      console.error('Error fetching data:', error)
      alert('Error: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateWorkPackage = () => {
    setSelectedWorkPackage(null)
    setShowWorkPackageForm(true)
  }

  const handleEditWorkPackage = (workPackage) => {
    setSelectedWorkPackage(workPackage)
    setShowWorkPackageForm(true)
  }

  const handleWorkPackageSaved = () => {
    setShowWorkPackageForm(false)
    setSelectedWorkPackage(null)
    fetchData()
  }

  const handleStageChange = (stageId) => {
    setSelectedStage(stageId)
    // Filter work packages by stage if needed
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading Controlling a Stage...</p>
        </div>
      </div>
    )
  }

  const activeStage = selectedStage 
    ? stageBoundaries.find(s => s.id === selectedStage)
    : stageBoundaries.find(s => s.status === 'approved' || s.status === 'in_preparation')

  const filteredWorkPackages = selectedStage
    ? workPackages.filter(wp => wp.stage_boundary_id === selectedStage)
    : workPackages

  const stats = {
    total: filteredWorkPackages.length,
    authorized: filteredWorkPackages.filter(wp => wp.status === 'authorized').length,
    inProgress: filteredWorkPackages.filter(wp => wp.status === 'in_progress').length,
    completed: filteredWorkPackages.filter(wp => wp.status === 'completed').length,
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <button
        onClick={() => navigate(`/projects/${projectId}`)}
        className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4"
      >
        ← Back to Project
      </button>

      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Controlling a Stage
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          {project?.project_name} - Work Package Management
        </p>
      </div>

      {/* Stage Selector */}
      {stageBoundaries.length > 0 && (
        <div className="mb-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Select Stage:
          </label>
          <select
            value={selectedStage || ''}
            onChange={(e) => handleStageChange(e.target.value || null)}
            className="w-full md:w-auto px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          >
            <option value="">All Stages</option>
            {stageBoundaries.map((stage, index) => (
              <option key={stage.id} value={stage.id}>
                {stage.gate_name} - {stage.stage_name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Work Packages</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
            </div>
            <Package className="h-8 w-8 text-blue-500" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Authorized</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.authorized}</p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-500" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">In Progress</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.inProgress}</p>
            </div>
            <Clock className="h-8 w-8 text-yellow-500" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Completed</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.completed}</p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200 dark:border-gray-700">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('work-packages')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'work-packages'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            <Package className="h-4 w-4 inline mr-2" />
            Work Packages
          </button>
          <button
            onClick={() => setActiveTab('progress')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'progress'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            <BarChart3 className="h-4 w-4 inline mr-2" />
            Progress
          </button>
          <button
            onClick={() => setActiveTab('reports')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'reports'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            <FileText className="h-4 w-4 inline mr-2" />
            Reports
          </button>
          <button
            onClick={() => setActiveTab('tolerances')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'tolerances'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            <AlertCircle className="h-4 w-4 inline mr-2" />
            Tolerances
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'work-packages' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Work Packages
            </h2>
            <button
              onClick={handleCreateWorkPackage}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Create Work Package
            </button>
          </div>
          <WorkPackageList
            workPackages={filteredWorkPackages}
            onEdit={handleEditWorkPackage}
            onRefresh={fetchData}
            projectId={projectId}
            stageBoundaries={stageBoundaries}
          />
        </div>
      )}

      {activeTab === 'progress' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Stage Progress
          </h2>
          <p className="text-gray-500 dark:text-gray-400">
            Progress monitoring dashboard coming soon...
          </p>
        </div>
      )}

      {activeTab === 'reports' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Reports
            </h2>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  if (filteredWorkPackages.length > 0) {
                    // Navigate to create report for first work package, or show selection
                    const firstWP = filteredWorkPackages[0]
                    navigate(`/app/projects/${projectId}/work-packages/${firstWP.id}/checkpoint-reports/create`)
                  } else {
                    alert('Please create a work package first')
                  }
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Checkpoint Report
              </button>
              <button
                onClick={() => {
                  const params = new URLSearchParams()
                  if (selectedStage) params.set('stage', selectedStage)
                  navigate(`/app/projects/${projectId}/highlight-reports/create${params.toString() ? `?${params.toString()}` : ''}`)
                }}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Highlight Report
              </button>
            </div>
          </div>

          {/* Checkpoint Reports */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Checkpoint Reports
            </h3>
            {checkpointReports.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400">No checkpoint reports yet.</p>
            ) : (
              <div className="space-y-3">
                {checkpointReports.map((report, index) => (
                  <div
                    key={report.id}
                    onClick={() => {
                      if (report.work_package_id) {
                        navigate(`/app/projects/${projectId}/work-packages/${report.work_package_id}/checkpoint-reports/${report.id}`)
                      }
                    }}
                    className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-medium text-gray-900 dark:text-white">
                          {report.report_title || `Checkpoint Report - ${format(new Date(report.checkpoint_date), 'MMM dd, yyyy')}`}
                        </h4>
                        {report.document_ref && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                            {report.document_ref} - v{report.version_no}
                          </p>
                        )}
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {report.reported_by?.full_name || report.reported_by?.email || report.author?.full_name || report.author?.email} • {format(new Date(report.checkpoint_date || report.report_date), 'MMM dd, yyyy')}
                        </p>
                        {report.work_package && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            WP: {report.work_package.work_package_name}
                          </p>
                        )}
                      </div>
                      <span className={`px-2 py-1 rounded text-xs ${
                        report.status === 'approved' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
                        report.status === 'submitted' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' :
                        'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                      }`}>
                        {report.status}
                      </span>
                    </div>
                    {report.report_summary && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                        {report.report_summary}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Highlight Reports */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Highlight Reports
              </h3>
              <input
                type="search"
                placeholder="Filter by title, reference…"
                value={highlightReportFilter}
                onChange={(e) => setHighlightReportFilter(e.target.value)}
                className="max-w-xs px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
              />
            </div>
            {(() => {
              const q = highlightReportFilter.trim().toLowerCase()
              const filtered = q
                ? highlightReports.filter(
                    (r) =>
                      (r.report_title || '').toLowerCase().includes(q) ||
                      (r.report_reference || '').toLowerCase().includes(q) ||
                      (r.executive_summary || '').toLowerCase().includes(q)
                  )
                : highlightReports
              const display = filtered.slice(0, 20)
              if (display.length === 0) {
                return <p className="text-gray-500 dark:text-gray-400">{q ? 'No matching highlight reports.' : 'No highlight reports yet.'}</p>
              }
              return (
              <div className="space-y-3">
                {display.map((report, index) => (
                  <div
                    key={report.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => navigate(`/app/projects/${projectId}/highlight-reports/${report.id}`)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(`/app/projects/${projectId}/highlight-reports/${report.id}`); } }}
                    className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-medium text-gray-900 dark:text-white">
                          {report.report_title}
                        </h4>
                        {report.report_reference && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1 font-mono">
                            {report.report_reference}{report.version_no ? ` • v${report.version_no}` : ''}
                          </p>
                        )}
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {report.prepared_by?.full_name || report.prepared_by?.email} • {format(new Date(report.report_date), 'MMM dd, yyyy')}
                        </p>
                        {(report.reporting_period_start && report.reporting_period_end) ? (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {format(new Date(report.reporting_period_start), 'MMM dd')} – {format(new Date(report.reporting_period_end), 'MMM dd')}
                          </p>
                        ) : null}
                      </div>
                      <span className={`px-2 py-1 rounded text-xs ${
                        report.stage_status === 'on_track' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
                        report.stage_status === 'at_risk' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' :
                        report.stage_status === 'off_track' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300' :
                        'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                      }`}>
                        {report.stage_status?.replace('_', ' ')}
                      </span>
                    </div>
                    {report.executive_summary && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                        {report.executive_summary}
                      </p>
                    )}
                  </div>
                ))}
              </div>
              )
            })()}
          </div>
        </div>
      )}

      {activeTab === 'tolerances' && (
        <div>
          <ToleranceDashboard projectId={projectId} stageBoundaryId={selectedStage} />
        </div>
      )}

      {/* Work Package Form Modal */}
      {showWorkPackageForm && (
        <WorkPackageForm
          workPackage={selectedWorkPackage}
          projectId={projectId}
          stageBoundaries={stageBoundaries}
          onSave={handleWorkPackageSaved}
          onCancel={() => {
            setShowWorkPackageForm(false)
            setSelectedWorkPackage(null)
          }}
        />
      )}

      {/* Checkpoint Report Modal - Removed, now using dedicated pages */}

      {/* Highlight Report Modal */}
    </div>
  )
}

