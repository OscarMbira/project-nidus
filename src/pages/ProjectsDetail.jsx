import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../services/supabaseClient'
import { GanttChart } from '../components/gantt'
import { Edit2, Trash2, Archive, AlertTriangle } from 'lucide-react'

export default function ProjectsDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [project, setProject] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('list') // 'list' or 'gantt'
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [archiving, setArchiving] = useState(false)

  useEffect(() => {
    fetchProject()
  }, [id])

  const handleDelete = async () => {
    try {
      setDeleting(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      const { error } = await supabase
        .from('projects')
        .update({
          is_deleted: true,
          deleted_at: new Date().toISOString(),
          deleted_by: user.id
        })
        .eq('id', id)

      if (error) throw error

      setShowDeleteConfirm(false)
      navigate('/projects')
    } catch (error) {
      console.error('Error deleting project:', error)
      alert('Error deleting project: ' + error.message)
    } finally {
      setDeleting(false)
    }
  }

  const handleArchive = async () => {
    try {
      setArchiving(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      // Find archived status
      const { data: archivedStatus, error: statusError } = await supabase
        .from('project_statuses')
        .select('id')
        .eq('status_code', 'archived')
        .eq('is_active', true)
        .eq('is_deleted', false)
        .single()

      if (statusError && statusError.code !== 'PGRST116') throw statusError

      const updateData = {
        updated_by: user.id
      }

      if (archivedStatus) {
        updateData.status_id = archivedStatus.id
      }

      const { error } = await supabase
        .from('projects')
        .update(updateData)
        .eq('id', id)

      if (error) throw error

      setShowArchiveConfirm(false)
      await fetchProject() // Refresh project data
    } catch (error) {
      console.error('Error archiving project:', error)
      alert('Error archiving project: ' + error.message)
    } finally {
      setArchiving(false)
    }
  }

  const fetchProject = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('projects')
        .select(`
          *,
          project_types:project_type_id (*),
          project_statuses:status_id (*),
          project_methodologies!inner (
            methodologies:methodology_id (*)
          )
        `)
        .eq('id', id)
        .eq('is_deleted', false)
        .single()

      if (error) throw error
      setProject(data)
    } catch (error) {
      console.error('Error fetching project:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading project...</p>
        </div>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <p className="text-gray-500 dark:text-gray-400 mb-4">Project not found</p>
          <button
            onClick={() => navigate('/projects')}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
          >
            Back to Projects
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <button
        onClick={() => navigate('/projects')}
        className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4"
      >
        ← Back to Projects
      </button>

      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              {project.project_name}
            </h1>
            {project.project_code && (
              <p className="text-gray-500 dark:text-gray-400">Code: {project.project_code}</p>
            )}
          </div>
          <div className="flex gap-2">
            {project.project_statuses && (
              <span
                className="px-3 py-1 text-sm rounded text-white"
                style={{ backgroundColor: project.project_statuses.status_color || '#6B7280' }}
              >
                {project.project_statuses.status_name}
              </span>
            )}
            <button
              onClick={() => navigate('/projects/' + id + '/edit')}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
            >
              <Edit2 className="h-4 w-4" />
              Edit
            </button>
            <button
              onClick={() => setShowArchiveConfirm(true)}
              className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
            >
              <Archive className="h-4 w-4" />
              Archive
            </button>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </button>
          </div>
        </div>

        {project.project_description && (
          <p className="text-gray-600 dark:text-gray-300 mb-6">{project.project_description}</p>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Methodology</h3>
            {project.project_methodologies && project.project_methodologies[0]?.methodologies ? (
              <div className="flex items-center gap-2">
                <div
                  className="w-4 h-4 rounded"
                  style={{ backgroundColor: project.project_methodologies[0].methodologies.methodology_color || '#3B82F6' }}
                ></div>
                <p className="text-gray-900 dark:text-white">{project.project_methodologies[0].methodologies.methodology_name}</p>
              </div>
            ) : (
              <p className="text-gray-900 dark:text-white">Not assigned</p>
            )}
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Project Type</h3>
            <p className="text-gray-900 dark:text-white">
              {project.project_types?.type_name || 'Not specified'}
            </p>
          </div>

          {project.budget_amount && (
            <div>
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Budget</h3>
              <p className="text-gray-900 dark:text-white">${project.budget_amount.toLocaleString()}</p>
            </div>
          )}
        </div>

        {(project.planned_start_date || project.planned_end_date) && (
          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Timeline</h3>
            <div className="flex gap-4">
              {project.planned_start_date && (
                <div>
                  <span className="text-xs text-gray-500 dark:text-gray-400">Start: </span>
                  <span className="text-gray-900 dark:text-white">
                    {new Date(project.planned_start_date).toLocaleDateString()}
                  </span>
                </div>
              )}
              {project.planned_end_date && (
                <div>
                  <span className="text-xs text-gray-500 dark:text-gray-400">End: </span>
                  <span className="text-gray-900 dark:text-white">
                    {new Date(project.planned_end_date).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Structured PM Modules */}
      {/* Note: 'prince2' methodology_code checked for database backward compatibility only */}
      {project.project_methodologies && 
       project.project_methodologies[0]?.methodologies &&
       (project.project_methodologies[0].methodologies.methodology_code === 'prince2' ||
        project.project_methodologies[0].methodologies.methodology_code === 'structured_pm') && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Structured Project Management Processes
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={() => navigate(`/projects/${id}/structured/starting-up`)}
              className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left"
            >
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                Starting Up a Project
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Create Project Mandate and Project Brief
              </p>
            </button>
            <button
              onClick={() => navigate(`/projects/${id}/structured/initiating`)}
              className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left"
            >
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                Initiating a Project
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Create Business Case and Project Initiation Document
              </p>
            </button>
                <button
                  onClick={() => navigate(`/projects/${id}/structured/stage-gates`)}
                  className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left"
                >
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                    Stage Gates
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Manage stage boundaries and approvals
                  </p>
                </button>
                <button
                  onClick={() => navigate(`/projects/${id}/structured/controlling-stage`)}
                  className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left"
                >
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                    Controlling a Stage
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Manage work packages and stage execution
                  </p>
                </button>
                <button
                  onClick={() => navigate(`/projects/${id}/structured/managing-product-delivery`)}
                  className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left"
                >
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                    Managing Product Delivery
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Manage product deliverables and quality
                  </p>
                </button>
              </div>
            </div>
          )}

      {/* Universal Modules - Available to all projects */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Universal Modules
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={() => navigate(`/projects/${id}/issues`)}
            className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left"
          >
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
              Issue Management
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Track and manage project issues across all methodologies
            </p>
          </button>
          <button
            onClick={() => navigate(`/projects/${id}/risks`)}
            className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left"
          >
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
              Risk Management
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Manage project risks, assumptions, and dependencies
            </p>
          </button>
          <button
            onClick={() => navigate(`/projects/${id}/raid-log`)}
            className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left"
          >
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
              RAID Log
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Combined view of Risks, Assumptions, Issues, and Dependencies
            </p>
          </button>
        </div>
      </div>

      {/* Scrum Modules */}
      {project.project_methodologies && 
       project.project_methodologies[0]?.methodologies &&
       project.project_methodologies[0].methodologies.methodology_code === 'scrum' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Scrum Modules
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={() => navigate(`/projects/${id}/scrum/product-backlog`)}
              className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left"
            >
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                Product Backlog
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Manage user stories, epics, and backlog prioritization
              </p>
            </button>
            <button
              onClick={() => navigate(`/projects/${id}/scrum/sprint-planning`)}
              className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left"
            >
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                Sprint Planning
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Create sprints, plan capacity, and assign stories
              </p>
            </button>
          </div>
        </div>
      )}

      {/* Kanban Modules */}
      {project.project_methodologies && 
       project.project_methodologies[0]?.methodologies &&
       project.project_methodologies[0].methodologies.methodology_code === 'kanban' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Kanban Modules
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={() => navigate(`/projects/${id}/kanban`)}
              className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left"
            >
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                Kanban Boards
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Create and manage Kanban boards with WIP limits
              </p>
            </button>
          </div>
        </div>
      )}

      {/* Tasks Section with Tabs */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Header with Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between px-6 pt-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Project Tasks
            </h2>
            <button
              onClick={() => navigate(`/tasks/create`, { state: { projectId: id } })}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors text-sm"
            >
              + Add Task
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-4 px-6 mt-4">
            <button
              onClick={() => setActiveTab('list')}
              className={`pb-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'list'
                  ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              📋 List View
            </button>
            <button
              onClick={() => setActiveTab('gantt')}
              className={`pb-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'gantt'
                  ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              📊 Gantt Chart
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'list' ? (
            <p className="text-gray-500 dark:text-gray-400 text-center py-8">
              Task list will be displayed here
            </p>
          ) : (
            <div className="min-h-[500px]">
              <GanttChart projectId={id} />
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <ConfirmDialog
          title="Delete Project"
          message={`Are you sure you want to delete "${project.project_name}"? This action cannot be undone.`}
          confirmText="Delete"
          cancelText="Cancel"
          confirmColor="red"
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteConfirm(false)}
          loading={deleting}
        />
      )}

      {/* Archive Confirmation Modal */}
      {showArchiveConfirm && (
        <ConfirmDialog
          title="Archive Project"
          message={`Are you sure you want to archive "${project.project_name}"? You can restore it later if needed.`}
          confirmText="Archive"
          cancelText="Cancel"
          confirmColor="yellow"
          onConfirm={handleArchive}
          onCancel={() => setShowArchiveConfirm(false)}
          loading={archiving}
        />
      )}
    </div>
  )
}

// Confirm Dialog Component
function ConfirmDialog({ title, message, confirmText, cancelText, confirmColor, onConfirm, onCancel, loading }) {
  const colorClasses = {
    red: 'bg-red-600 hover:bg-red-700',
    yellow: 'bg-yellow-600 hover:bg-yellow-700',
    blue: 'bg-blue-600 hover:bg-blue-700'
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6">
        <div className="flex items-center gap-3 mb-4">
          <AlertTriangle className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
            {title}
          </h3>
        </div>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          {message}
        </p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`px-4 py-2 text-white font-medium rounded-lg transition-colors disabled:opacity-50 ${colorClasses[confirmColor] || colorClasses.blue}`}
          >
            {loading ? 'Processing...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}

