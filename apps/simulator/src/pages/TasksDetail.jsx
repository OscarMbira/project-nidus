import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { supabase } from '../services/supabaseClient'
import { Save, X, AlertTriangle, AlertCircle } from 'lucide-react'
import { RowActionButton } from '@nidus/ui'
import SelectField from '@nidus/ui/SelectField'
import TaskComments from '../components/TaskComments'
import TaskAttachments from '../components/TaskAttachments'
import TaskDependencies from '../components/TaskDependencies'
import IssueForm from '../components/IssueForm'
import RiskForm from '../components/RiskForm'
import ExportRecordButtons from '@nidus/ui/ExportRecordButtons'
import { exportRecordToExcel, exportRecordToWord, exportRecordToPPT, exportRecordToCSV, exportRecordToXML, exportRecordToJSON, exportRecordToPrint } from '@nidus/shared/utils/exportUtils'
import { parseSkillsLines } from '@nidus/shared/utils/roleSkillsUtils.js'
import { getCurrentUserInternalUserId } from '@nidus/shared/utils/accountResolution'
import { fillOwnerRolesFromInvitations } from '@nidus/shared/utils/taskOwnerInvitationRoles'
import { useSuccessModal } from '@nidus/shared/hooks/useSuccessModal'

const TASK_VIEW_SECTIONS = [
  { title: 'Task', fields: [
    { key: 'task_name', label: 'Name' },
    { key: 'task_code', label: 'Code' },
    { key: 'priority', label: 'Priority' }
  ]}
]

export default function TasksDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { showSuccess, modal } = useSuccessModal()
  const [task, setTask] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [taskStatuses, setTaskStatuses] = useState([])
  const [users, setUsers] = useState([])
  const [functionalRoles, setFunctionalRoles] = useState([])
  const [formData, setFormData] = useState({})
  const [errors, setErrors] = useState({})
  const [showIssueForm, setShowIssueForm] = useState(false)
  const [showRiskForm, setShowRiskForm] = useState(false)

  const selectedRoleSkills = useMemo(() => {
    const role = functionalRoles.find((r) => r.id === formData.functional_role_id)
      || task?.functional_role
    return parseSkillsLines(role?.required_skills)
  }, [functionalRoles, formData.functional_role_id, task])

  const roleOptions = useMemo(
    () => [
      { value: '', label: 'No role' },
      ...functionalRoles.map((r) => ({ value: r.id, label: r.role_label })),
    ],
    [functionalRoles],
  )

  const ownerOptions = useMemo(
    () => [
      { value: '', label: 'Unassigned' },
      ...users.map((u) => ({
        value: u.id,
        label: u.full_name || u.email || u.id,
        description: u.projectRole || '—',
      })),
    ],
    [users],
  )

  useEffect(() => {
    fetchTask()
    if (editing) {
      fetchLookupData()
    }
  }, [id, editing])

  const buildFormFromTask = (data) => ({
    task_name: data.task_name || '',
    task_description: data.task_description || '',
    project_id: data.project_id || '',
    status_id: data.status_id || '',
    priority: data.priority || 'medium',
    assigned_to_user_id: data.assigned_to_user_id || '',
    functional_role_id: data.functional_role_id || '',
    due_date: data.due_date ? format(new Date(data.due_date), 'yyyy-MM-dd') : '',
    estimated_hours: data.estimated_hours || '',
    estimated_duration_days: data.estimated_duration_days || '',
    percentage_complete: data.percentage_complete || 0,
  })

  const fetchTask = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('tasks')
        .select(`
          *,
          projects:project_id (id, project_name, project_code),
          task_statuses:status_id (*),
          assigned_user:assigned_to_user_id (id, full_name, email),
          functional_role:functional_role_id (id, role_label, required_skills),
          created_by_user:created_by (id, full_name, email)
        `)
        .eq('id', id)
        .eq('is_deleted', false)
        .single()

      if (error) throw error
      setTask(data)

      if (data) {
        setFormData(buildFormFromTask(data))
      }
    } catch (error) {
      console.error('Error fetching task:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchLookupData = async () => {
    try {
      const projectId = formData.project_id || task?.project_id

      const statusPromise = supabase
        .from('task_statuses')
        .select('*')
        .eq('is_active', true)
        .eq('is_deleted', false)
        .order('status_order', { ascending: true })

      const usersPromise = supabase
        .from('users')
        .select('id, full_name, email')
        .eq('is_active', true)
        .eq('is_deleted', false)
        .order('full_name', { ascending: true })

      const rolesPromise = projectId
        ? supabase
            .from('project_functional_roles')
            .select('id, role_label, required_skills, sort_order')
            .eq('project_id', projectId)
            .eq('is_active', true)
            .order('sort_order', { ascending: true })
            .order('role_label', { ascending: true })
        : Promise.resolve({ data: [], error: null })

      const membershipsPromise = projectId
        ? supabase
            .from('project_memberships')
            .select(`
              user_id,
              role:project_roles ( role_display_name, role_name )
            `)
            .eq('project_id', projectId)
            .eq('is_active', true)
            .or('invitation_status.eq.accepted,invitation_status.is.null')
        : Promise.resolve({ data: [], error: null })

      const [
        { data: statusesData, error: statusesError },
        { data: usersData, error: usersError },
        rolesResult,
        membershipsResult,
      ] = await Promise.all([statusPromise, usersPromise, rolesPromise, membershipsPromise])

      if (statusesError) throw statusesError
      if (usersError) throw usersError
      if (rolesResult.error) throw rolesResult.error
      if (membershipsResult.error) throw membershipsResult.error

      const roleByUserId = new Map()
      for (const row of membershipsResult.data || []) {
        if (!row?.user_id) continue
        const label = row.role?.role_display_name || row.role?.role_name || ''
        if (label && !roleByUserId.has(row.user_id)) {
          roleByUserId.set(row.user_id, label)
        }
      }

      const rolesWithInvitations = await fillOwnerRolesFromInvitations(supabase, {
        projectId: projectId || null,
        users: usersData || [],
        roleByUserId,
      })

      setTaskStatuses(statusesData || [])
      setUsers(
        (usersData || []).map((u) => ({
          ...u,
          projectRole: rolesWithInvitations.get(u.id) || '',
        })),
      )
      setFunctionalRoles(rolesResult.data || [])
    } catch (error) {
      console.error('Error fetching lookup data:', error)
    }
  }

  const handleEdit = () => {
    setEditing(true)
    fetchLookupData()
  }

  const handleCancel = () => {
    setEditing(false)
    setErrors({})
    if (task) {
      setFormData(buildFormFromTask(task))
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  const validateForm = () => {
    const newErrors = {}
    if (!formData.task_name?.trim()) {
      newErrors.task_name = 'Task name is required'
    }
    if (!formData.project_id) {
      newErrors.project_id = 'No project on this task'
    }
    if (!formData.status_id) {
      newErrors.status_id = 'Please select a status'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSave = async () => {
    if (!validateForm()) {
      return
    }

    try {
      setSaving(true)
      const actorId = await getCurrentUserInternalUserId()
      if (!actorId) throw new Error('Your user profile could not be resolved')

      const updateData = {
        task_name: formData.task_name,
        task_description: formData.task_description || null,
        project_id: formData.project_id,
        status_id: formData.status_id,
        priority: formData.priority,
        assigned_to_user_id: formData.assigned_to_user_id || null,
        functional_role_id: formData.functional_role_id || null,
        due_date: formData.due_date || null,
        estimated_hours: formData.estimated_hours ? parseFloat(formData.estimated_hours) : null,
        estimated_duration_days: formData.estimated_duration_days ? parseInt(formData.estimated_duration_days) : null,
        percentage_complete: formData.percentage_complete ? parseInt(formData.percentage_complete) : 0,
        updated_by: actorId
      }

      const { error } = await supabase
        .from('tasks')
        .update(updateData)
        .eq('id', id)

      if (error) throw error

      if (formData.assigned_to_user_id !== task.assigned_to_user_id) {
        if (task.assigned_to_user_id) {
          await supabase
            .from('task_assignments')
            .update({ is_deleted: true, deleted_at: new Date().toISOString() })
            .eq('task_id', id)
            .eq('user_id', task.assigned_to_user_id)
        }

        if (formData.assigned_to_user_id) {
          await supabase
            .from('task_assignments')
            .insert({
              task_id: id,
              user_id: formData.assigned_to_user_id,
              assignment_type: 'assignee',
              assigned_by_user_id: actorId,
              created_by: actorId
            })
        }
      }

      setEditing(false)
      setErrors({})
      await fetchTask()
      showSuccess({
        recordId: formData.task_name || id,
        operation: 'updated',
        message: 'Task updated successfully.',
      })
    } catch (error) {
      console.error('Error updating task:', error)
      setErrors({ submit: error.message || 'Failed to update task' })
    } finally {
      setSaving(false)
    }
  }

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'critical': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
      case 'high': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300'
      case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
      case 'low': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading task...</p>
        </div>
      </div>
    )
  }

  if (!task) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <p className="text-gray-500 dark:text-gray-400 mb-4">Task not found</p>
          <button
            onClick={() => navigate(-1)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
          >
            Back to Tasks
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-4 flex items-center justify-between flex-wrap gap-3">
        <button
          onClick={() => navigate(-1)}
          className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
        >
          ← Back to Tasks
        </button>
        {!editing && (
          <ExportRecordButtons
            onExportPPT={() => exportRecordToPPT(TASK_VIEW_SECTIONS, task, `Task_${task.task_code || id}`)}
            onExportWord={() => exportRecordToWord(TASK_VIEW_SECTIONS, task, `Task_${task.task_code || id}`)}
            onExportExcel={() => exportRecordToExcel(TASK_VIEW_SECTIONS, task, `Task_${task.task_code || id}`)}
            onExportCSV={() => exportRecordToCSV(TASK_VIEW_SECTIONS, task, `Task_${task.task_code || id}`)}
            onExportXML={() => exportRecordToXML(TASK_VIEW_SECTIONS, task, `Task_${task.task_code || id}`)}
            onExportJSON={() => exportRecordToJSON(TASK_VIEW_SECTIONS, task, `Task_${task.task_code || id}`)}
            onExportPrint={() => exportRecordToPrint(TASK_VIEW_SECTIONS, task, `Task_${task.task_code || id}`)}
          />
        )}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            {!editing ? (
              <>
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                    {task.task_name}
                  </h1>
                  {task.task_code && (
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {task.task_code}
                    </span>
                  )}
                  <span className={`px-3 py-1 text-sm font-medium rounded ${getPriorityColor(task.priority)}`}>
                    {task.priority || 'medium'}
                  </span>
                </div>
                {task.task_description && (
                  <p className="text-gray-600 dark:text-gray-300 mb-4">{task.task_description}</p>
                )}
              </>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Task Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="task_name"
                    value={formData.task_name}
                    onChange={handleChange}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                      errors.task_name ? 'border-red-500' : 'border-gray-300'
                    }`}
                    required
                  />
                  {errors.task_name && (
                    <p className="mt-1 text-sm text-red-600">{errors.task_name}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Task Description
                  </label>
                  <textarea
                    name="task_description"
                    value={formData.task_description}
                    onChange={handleChange}
                    rows={4}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 ml-4">
            {!editing ? (
              <>
                {task.task_statuses && (
                  <span
                    className="px-4 py-2 text-sm font-medium rounded text-white"
                    style={{ backgroundColor: task.task_statuses.status_color || '#6B7280' }}
                  >
                    {task.task_statuses.status_name}
                  </span>
                )}
                <RowActionButton
                  variant="edit"
                  label="Edit task"
                  onClick={handleEdit}
                />
              </>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  {saving ? 'Saving...' : 'Save'}
                </button>
                <button
                  onClick={handleCancel}
                  disabled={saving}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  <X className="h-4 w-4" />
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Task Details Grid */}
        {!editing && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Project</h3>
              {task.projects ? (
                <div className="flex items-center gap-2">
                  <span>📁</span>
                  <span className="text-gray-900 dark:text-white">
                    {task.projects.project_name}
                    {task.projects.project_code && ` (${task.projects.project_code})`}
                  </span>
                </div>
              ) : (
                <p className="text-gray-900 dark:text-white">Not assigned</p>
              )}
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Task owner</h3>
              {task.assigned_user ? (
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                    <span className="text-blue-600 dark:text-blue-400 text-xs font-medium">
                      {task.assigned_user.full_name?.charAt(0) || task.assigned_user.email?.charAt(0) || 'U'}
                    </span>
                  </div>
                  <span className="text-gray-900 dark:text-white">
                    {task.assigned_user.full_name || task.assigned_user.email}
                  </span>
                </div>
              ) : (
                <p className="text-gray-900 dark:text-white">Unassigned</p>
              )}
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Role</h3>
              <p className="text-gray-900 dark:text-white">
                {task.functional_role?.role_label || 'No role'}
              </p>
            </div>

            {task.functional_role && (
              <div className="md:col-span-2">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Skills</h3>
                {parseSkillsLines(task.functional_role.required_skills).length > 0 ? (
                  <ul className="text-gray-900 dark:text-white list-disc list-inside space-y-0.5">
                    {parseSkillsLines(task.functional_role.required_skills).map((skill) => (
                      <li key={skill}>{skill}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-900 dark:text-white">No required skills defined for this role.</p>
                )}
              </div>
            )}

            {task.due_date && (
              <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Due Date</h3>
                <p className="text-gray-900 dark:text-white">
                  {new Date(task.due_date).toLocaleDateString()}
                </p>
              </div>
            )}

            {(task.estimated_hours || task.estimated_duration_days) && (
              <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Estimate</h3>
                <p className="text-gray-900 dark:text-white">
                  {task.estimated_hours && `${task.estimated_hours}h`}
                  {task.estimated_hours && task.estimated_duration_days && ' / '}
                  {task.estimated_duration_days && `${task.estimated_duration_days} days`}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Quick Actions */}
        {task && !editing && (
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-6">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Quick Actions</h3>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setShowIssueForm(true)}
                className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg flex items-center gap-2 text-sm"
              >
                <AlertCircle className="h-4 w-4" />
                Create Related Issue
              </button>
              <button
                onClick={() => setShowRiskForm(true)}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg flex items-center gap-2 text-sm"
              >
                <AlertTriangle className="h-4 w-4" />
                Create Related Risk
              </button>
              {task.projects && (
                <>
                  <button
                    onClick={() => navigate(`/projects/${task.project_id}/issues`)}
                    className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 flex items-center gap-2 text-sm"
                  >
                    View All Issues
                  </button>
                  <button
                    onClick={() => navigate(`/projects/${task.project_id}/risks`)}
                    className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 flex items-center gap-2 text-sm"
                  >
                    View All Risks
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {editing ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Project
              </label>
              <p className="rounded-md border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/40 px-3 py-2 text-sm text-gray-900 dark:text-gray-100">
                {task.projects
                  ? `${task.projects.project_name}${task.projects.project_code ? ` (${task.projects.project_code})` : ''}`
                  : '—'}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Status <span className="text-red-500">*</span>
              </label>
              <select
                name="status_id"
                value={formData.status_id}
                onChange={handleChange}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                  errors.status_id ? 'border-red-500' : 'border-gray-300'
                }`}
                required
              >
                <option value="">Select a status</option>
                {taskStatuses.map((status) => (
                  <option key={status.id} value={status.id}>
                    {status.status_name}
                  </option>
                ))}
              </select>
              {errors.status_id && (
                <p className="mt-1 text-sm text-red-600">{errors.status_id}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Priority
              </label>
              <select
                name="priority"
                value={formData.priority}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Task owner
              </label>
              <SelectField
                id="assigned_to_user_id"
                name="assigned_to_user_id"
                options={ownerOptions}
                value={formData.assigned_to_user_id || ''}
                onChange={(value) => setFormData((prev) => ({ ...prev, assigned_to_user_id: value || '' }))}
                placeholder="Unassigned"
                searchPlaceholder="Search people"
                forceSearchable
                descriptionColumnLabel="Role"
                aria-label="Task owner"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Role
              </label>
              <SelectField
                id="functional_role_id"
                name="functional_role_id"
                options={roleOptions}
                value={formData.functional_role_id || ''}
                onChange={(value) => setFormData((prev) => ({ ...prev, functional_role_id: value || '' }))}
                placeholder="No role"
                forceSearchable={functionalRoles.length >= 12}
              />
            </div>

            {formData.functional_role_id ? (
              <div className="md:col-span-2">
                <p className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Skills</p>
                {selectedRoleSkills.length > 0 ? (
                  <ul className="rounded-md border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/40 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 list-disc list-inside space-y-1">
                    {selectedRoleSkills.map((skill) => (
                      <li key={skill}>{skill}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-700 dark:text-gray-200">
                    No required skills defined for this role.
                  </p>
                )}
              </div>
            ) : null}

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Due Date
              </label>
              <input
                type="date"
                name="due_date"
                value={formData.due_date}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Estimated Hours
              </label>
              <input
                type="number"
                name="estimated_hours"
                value={formData.estimated_hours}
                onChange={handleChange}
                min="0"
                step="0.5"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Estimated Days
              </label>
              <input
                type="number"
                name="estimated_duration_days"
                value={formData.estimated_duration_days}
                onChange={handleChange}
                min="0"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Progress (%)
              </label>
              <input
                type="number"
                name="percentage_complete"
                value={formData.percentage_complete}
                onChange={handleChange}
                min="0"
                max="100"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>
          </div>
        ) : null}

        {errors.submit && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-red-700 dark:text-red-300">
            {errors.submit}
          </div>
        )}

        {/* Progress */}
        {task.percentage_complete > 0 && (
          <div className="mb-6">
            <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400 mb-2">
              <span>Progress</span>
              <span>{task.percentage_complete}%</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
              <div
                className="bg-blue-600 h-3 rounded-full transition-all"
                style={{ width: `${task.percentage_complete}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* Metadata */}
        <div className="pt-6 border-t border-gray-200 dark:border-gray-700 text-sm text-gray-500 dark:text-gray-400">
          <p>
            Created by {task.created_by_user?.full_name || task.created_by_user?.email || 'Unknown'} on{' '}
            {new Date(task.created_at).toLocaleDateString()}
          </p>
          {task.updated_at && task.updated_at !== task.created_at && (
            <p className="mt-1">
              Last updated on {new Date(task.updated_at).toLocaleDateString()}
            </p>
          )}
        </div>
      </div>

      {/* Dependencies Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
        <TaskDependencies taskId={id} projectId={task.project_id} />
      </div>

      {/* Comments Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
        <TaskComments taskId={id} />
      </div>

      {/* Attachments Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <TaskAttachments taskId={id} />
      </div>

      {/* Issue Form Modal */}
      {showIssueForm && task && (
        <IssueForm
          projectId={task.project_id}
          linkedTaskId={task.id}
          onSave={() => {
            setShowIssueForm(false)
            alert('Issue created successfully!')
          }}
          onCancel={() => setShowIssueForm(false)}
        />
      )}

      {/* Risk Form Modal */}
      {showRiskForm && task && (
        <RiskForm
          projectId={task.project_id}
          linkedTaskId={task.id}
          onSave={() => {
            setShowRiskForm(false)
            alert('Risk created successfully!')
          }}
          onCancel={() => setShowRiskForm(false)}
        />
      )}
      {modal}
    </div>
  )
}
