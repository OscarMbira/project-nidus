/**
 * Create New Task — schedule essentials (v1103) + owner/role (v1104).
 */
import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import { supabase } from '../services/supabaseClient'
import { useOfflineQueue } from '@nidus/shared/hooks/useOfflineQueue'
import { useSuccessModal } from '@nidus/shared/hooks/useSuccessModal'
import { usePlatformProjectId } from '@nidus/shared/hooks/usePlatformProjectId.js'
import { getCurrentUserInternalUserId } from '@nidus/shared/utils/accountResolution'
import { fillOwnerRolesFromInvitations } from '@nidus/shared/utils/taskOwnerInvitationRoles'
import { parseSkillsLines } from '@nidus/shared/utils/roleSkillsUtils.js'
import SelectField from '@nidus/ui/SelectField'

export default function TasksCreate() {
  useOfflineQueue()
  const navigate = useNavigate()
  const location = useLocation()
  const { showSuccess, modal } = useSuccessModal()
  const { projectId: contextProjectId, loading: projectLoading } = usePlatformProjectId()
  const stateProjectId = location.state?.projectId || ''
  const dueDate = location.state?.dueDate

  const resolvedProjectId = stateProjectId || contextProjectId || ''

  const formatDateForInput = (date) => {
    if (!date) return ''
    const d = new Date(date)
    return format(d, 'yyyy-MM-dd')
  }

  const [formData, setFormData] = useState({
    task_name: '',
    task_description: '',
    project_id: resolvedProjectId,
    status_id: '',
    priority: 'medium',
    assigned_to_user_id: '',
    functional_role_id: '',
    planned_start_date: '',
    due_date: dueDate ? formatDateForInput(dueDate) : '',
    estimated_hours: '',
    estimated_duration_days: '',
    percentage_complete: '0',
    is_milestone: false,
    task_type: 'task',
  })

  const [functionalRoles, setFunctionalRoles] = useState([])
  const [taskStatuses, setTaskStatuses] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})

  const hasCurrentProject = Boolean(resolvedProjectId)

  const selectedRoleSkills = useMemo(() => {
    const role = functionalRoles.find((r) => r.id === formData.functional_role_id)
    return parseSkillsLines(role?.required_skills)
  }, [functionalRoles, formData.functional_role_id])

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
    if (!resolvedProjectId) return
    setFormData((prev) =>
      prev.project_id === resolvedProjectId ? prev : { ...prev, project_id: resolvedProjectId },
    )
  }, [resolvedProjectId])

  useEffect(() => {
    fetchLookupData()
  }, [resolvedProjectId, hasCurrentProject])

  const fetchLookupData = async () => {
    try {
      const statusPromise = supabase
        .from('task_statuses')
        .select('*')
        .eq('is_active', true)
        .eq('is_deleted', false)
        .eq('is_initial_status', true)
        .order('status_order', { ascending: true })

      const usersPromise = supabase
        .from('users')
        .select('id, full_name, email')
        .eq('is_active', true)
        .eq('is_deleted', false)
        .order('full_name', { ascending: true })

      const rolesPromise = hasCurrentProject
        ? supabase
            .from('project_functional_roles')
            .select('id, role_label, required_skills, sort_order')
            .eq('project_id', resolvedProjectId)
            .eq('is_active', true)
            .order('sort_order', { ascending: true })
            .order('role_label', { ascending: true })
        : Promise.resolve({ data: [], error: null })

      const membershipsPromise = hasCurrentProject
        ? supabase
            .from('project_memberships')
            .select(`
              user_id,
              role:project_roles ( role_display_name, role_name )
            `)
            .eq('project_id', resolvedProjectId)
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
        projectId: hasCurrentProject ? resolvedProjectId : null,
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

      if (statusesData?.length > 0) {
        setFormData((prev) => (prev.status_id ? prev : { ...prev, status_id: statusesData[0].id }))
      }
    } catch (error) {
      console.error('Error fetching lookup data:', error)
      toast.error(error.message || 'Failed to load form options')
    }
  }

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    if (name === 'is_milestone') {
      setFormData((prev) => ({
        ...prev,
        is_milestone: checked,
        task_type: checked ? 'milestone' : 'task',
      }))
    } else {
      setFormData((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
    }
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }))
    }
  }

  const validateForm = () => {
    const newErrors = {}

    if (!formData.task_name.trim()) {
      newErrors.task_name = 'Task name is required'
    }
    if (!formData.project_id) {
      newErrors.project_id = 'No current project selected'
    }
    if (!formData.status_id) {
      newErrors.status_id = 'Please select a status'
    }

    const start = formData.planned_start_date || ''
    const end = formData.due_date || ''
    if (start && end && end < start) {
      newErrors.due_date = 'Due / finish date cannot be before planned start'
      newErrors.planned_start_date = 'Planned start cannot be after due / finish'
    }

    const pct = formData.percentage_complete === '' ? 0 : Number(formData.percentage_complete)
    if (Number.isNaN(pct) || pct < 0 || pct > 100) {
      newErrors.percentage_complete = 'Percent complete must be between 0 and 100'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validateForm()) return

    try {
      setLoading(true)

      const actorId = await getCurrentUserInternalUserId()
      if (!actorId) throw new Error('Your user profile could not be resolved')

      const due = formData.due_date || null
      const pctRaw = formData.percentage_complete === '' ? 0 : Number(formData.percentage_complete)

      const taskData = {
        task_name: formData.task_name.trim(),
        task_description: formData.task_description || null,
        project_id: formData.project_id,
        status_id: formData.status_id,
        priority: formData.priority,
        assigned_to_user_id: formData.assigned_to_user_id || null,
        assigned_by_user_id: formData.assigned_to_user_id ? actorId : null,
        functional_role_id: formData.functional_role_id || null,
        planned_start_date: formData.planned_start_date || null,
        due_date: due,
        planned_end_date: due,
        estimated_hours: formData.estimated_hours ? parseFloat(formData.estimated_hours) : null,
        estimated_duration_days: formData.estimated_duration_days
          ? parseInt(formData.estimated_duration_days, 10)
          : null,
        percentage_complete: pctRaw,
        is_milestone: !!formData.is_milestone,
        task_type: formData.is_milestone ? 'milestone' : formData.task_type || 'task',
        created_by: actorId,
      }

      const { data: task, error } = await supabase
        .from('tasks')
        .insert(taskData)
        .select()
        .single()
      if (error) throw error

      if (formData.assigned_to_user_id) {
        const { error: assignmentError } = await supabase.from('task_assignments').insert({
          task_id: task.id,
          user_id: formData.assigned_to_user_id,
          assignment_type: 'assignee',
          assigned_by_user_id: actorId,
          created_by: actorId,
        })
        if (assignmentError) {
          console.error('Error creating task assignment:', assignmentError)
        }
      }

      showSuccess({
        recordId: task.task_name || task.id,
        operation: 'created',
        message: 'Task created successfully.',
        onOk: () => navigate(`/platform/tasks/${task.id}`),
      })
    } catch (error) {
      console.error('Error creating task:', error)
      setErrors({ submit: error.message || 'Failed to create task' })
      toast.error(error.message || 'Failed to create task')
    } finally {
      setLoading(false)
    }
  }

  const fieldClass = (hasError) =>
    `w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 ${
      hasError ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
    }`

  return (
    <div className="w-full px-3 sm:px-4 lg:px-5 xl:px-6 py-6 text-gray-900 dark:text-gray-100">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white mb-4 text-sm"
          >
            ← Back
          </button>
          <h1 className="text-3xl font-bold">Create New Task</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-300">
            Fill in the details to create your new task
          </p>
        </div>

        {(projectLoading && !hasCurrentProject) && (
          <p className="text-sm text-gray-700 dark:text-gray-200">Resolving current project…</p>
        )}
        {!projectLoading && !hasCurrentProject && (
          <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
            No current project selected. Choose a project from the sidebar, then create the task again.
          </div>
        )}
        {errors.project_id && (
          <p className="text-sm text-red-600 dark:text-red-400">{errors.project_id}</p>
        )}

        <form
          onSubmit={handleSubmit}
          className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 sm:p-6 space-y-6"
        >
          <div>
            <label htmlFor="task_name" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
              Task Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="task_name"
              name="task_name"
              value={formData.task_name}
              onChange={handleChange}
              className={fieldClass(!!errors.task_name)}
              placeholder="Enter task name"
              required
            />
            {errors.task_name && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.task_name}</p>}
          </div>

          <div>
            <label htmlFor="task_description" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
              Task Description
            </label>
            <textarea
              id="task_description"
              name="task_description"
              value={formData.task_description}
              onChange={handleChange}
              rows={4}
              className={fieldClass(false)}
              placeholder="Describe the task…"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="status_id" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                Status <span className="text-red-500">*</span>
              </label>
              <select
                id="status_id"
                name="status_id"
                value={formData.status_id}
                onChange={handleChange}
                className={fieldClass(!!errors.status_id)}
                required
              >
                <option value="">Select a status</option>
                {taskStatuses.map((status) => (
                  <option key={status.id} value={status.id}>
                    {status.status_name}
                  </option>
                ))}
              </select>
              {errors.status_id && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.status_id}</p>}
            </div>
            <div>
              <label htmlFor="priority" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                Priority
              </label>
              <select
                id="priority"
                name="priority"
                value={formData.priority}
                onChange={handleChange}
                className={fieldClass(false)}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="assigned_to_user_id" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                Task owner
              </label>
              <SelectField
                id="assigned_to_user_id"
                name="assigned_to_user_id"
                options={ownerOptions}
                value={formData.assigned_to_user_id}
                onChange={(value) => {
                  setFormData((prev) => ({ ...prev, assigned_to_user_id: value || '' }))
                }}
                placeholder="Unassigned"
                searchPlaceholder="Search people"
                forceSearchable
                descriptionColumnLabel="Role"
                aria-label="Task owner"
              />
            </div>
            <div>
              <label htmlFor="functional_role_id" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                Role
              </label>
              <SelectField
                id="functional_role_id"
                name="functional_role_id"
                options={roleOptions}
                value={formData.functional_role_id}
                onChange={(value) => {
                  setFormData((prev) => ({ ...prev, functional_role_id: value || '' }))
                }}
                placeholder="No role"
                disabled={!hasCurrentProject}
                forceSearchable={functionalRoles.length >= 12}
              />
            </div>
          </div>

          {formData.functional_role_id ? (
            <div>
              <p className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Skills</p>
              {selectedRoleSkills.length > 0 ? (
                <ul className="rounded-md border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/40 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 list-disc list-inside space-y-1">
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

          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Schedule</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="planned_start_date" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                  Planned start
                </label>
                <input
                  type="date"
                  id="planned_start_date"
                  name="planned_start_date"
                  value={formData.planned_start_date}
                  onChange={handleChange}
                  className={fieldClass(!!errors.planned_start_date)}
                />
                {errors.planned_start_date && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.planned_start_date}</p>
                )}
              </div>
              <div>
                <label htmlFor="due_date" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                  Due / finish
                </label>
                <input
                  type="date"
                  id="due_date"
                  name="due_date"
                  value={formData.due_date}
                  onChange={handleChange}
                  className={fieldClass(!!errors.due_date)}
                />
                {errors.due_date && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.due_date}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label htmlFor="estimated_hours" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                  Estimated hours
                </label>
                <input
                  type="number"
                  id="estimated_hours"
                  name="estimated_hours"
                  value={formData.estimated_hours}
                  onChange={handleChange}
                  step="0.5"
                  min="0"
                  className={fieldClass(false)}
                  placeholder="0"
                />
              </div>
              <div>
                <label htmlFor="estimated_duration_days" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                  Duration (days)
                </label>
                <input
                  type="number"
                  id="estimated_duration_days"
                  name="estimated_duration_days"
                  value={formData.estimated_duration_days}
                  onChange={handleChange}
                  min="0"
                  className={fieldClass(false)}
                  placeholder="0"
                />
              </div>
              <div>
                <label htmlFor="percentage_complete" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                  % complete
                </label>
                <input
                  type="number"
                  id="percentage_complete"
                  name="percentage_complete"
                  value={formData.percentage_complete}
                  onChange={handleChange}
                  min="0"
                  max="100"
                  step="1"
                  className={fieldClass(!!errors.percentage_complete)}
                />
                {errors.percentage_complete && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.percentage_complete}</p>
                )}
              </div>
            </div>

            <label className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
              <input
                type="checkbox"
                name="is_milestone"
                checked={formData.is_milestone}
                onChange={handleChange}
                className="rounded border-gray-300 dark:border-gray-600"
              />
              Milestone
            </label>
          </div>

          {errors.submit && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <p className="text-sm text-red-600 dark:text-red-400">{errors.submit}</p>
            </div>
          )}

          <div className="flex justify-end gap-4 pt-2">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !hasCurrentProject}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg disabled:opacity-50"
            >
              {loading ? 'Creating…' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
      {modal}
    </div>
  )
}
