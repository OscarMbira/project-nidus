import { useState, useEffect } from 'react'
import { supabase } from '../services/supabaseClient'
import { X, Save, Calendar, User, Clock } from 'lucide-react'

import { getDisplayRowNumber } from '../utils/tableRowNumberUtils'
export default function ResourceAssignment({ assignment, resourceId, onSave, onCancel }) {
  const [formData, setFormData] = useState({
    assignment_type: 'task',
    assignment_target_id: '',
    assignment_start_date: '',
    assignment_end_date: '',
    allocated_hours_per_day: 8.0,
    total_allocated_hours: '',
    allocation_percentage: 100.0,
    assignment_status: 'planned',
    role_in_assignment: '',
    responsibility_description: '',
    notes: '',
  })
  const [tasks, setTasks] = useState([])
  const [workPackages, setWorkPackages] = useState([])
  const [userStories, setUserStories] = useState([])
  const [kanbanCards, setKanbanCards] = useState([])
  const [projects, setProjects] = useState([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (assignment) {
      setFormData({
        assignment_type: assignment.assignment_type || 'task',
        assignment_target_id: assignment.assignment_target_id || '',
        assignment_start_date: assignment.assignment_start_date ? assignment.assignment_start_date.split('T')[0] : '',
        assignment_end_date: assignment.assignment_end_date ? assignment.assignment_end_date.split('T')[0] : '',
        allocated_hours_per_day: assignment.allocated_hours_per_day || 8.0,
        total_allocated_hours: assignment.total_allocated_hours || '',
        allocation_percentage: assignment.allocation_percentage || 100.0,
        assignment_status: assignment.assignment_status || 'planned',
        role_in_assignment: assignment.role_in_assignment || '',
        responsibility_description: assignment.responsibility_description || '',
        notes: assignment.notes || '',
      })
    }
    fetchLookupData()
  }, [assignment])

  const fetchLookupData = async () => {
    try {
      // Fetch tasks
      const { data: tasksData } = await supabase
        .from('tasks')
        .select('id, task_name')
        .eq('is_deleted', false)
        .order('task_name', { ascending: true })
      if (tasksData) setTasks(tasksData)

      // Fetch work packages
      const { data: wpData } = await supabase
        .from('work_packages')
        .select('id, work_package_name, work_package_code')
        .eq('is_deleted', false)
        .order('work_package_name', { ascending: true })
      if (wpData) setWorkPackages(wpData)

      // Fetch user stories
      const { data: storiesData } = await supabase
        .from('user_stories')
        .select('id, story_title')
        .eq('is_deleted', false)
        .order('story_title', { ascending: true })
      if (storiesData) setUserStories(storiesData)

      // Fetch projects
      const { data: projectsData } = await supabase
        .from('projects')
        .select('id, project_name, project_code')
        .eq('is_deleted', false)
        .order('project_name', { ascending: true })
      if (projectsData) setProjects(projectsData)

      // Fetch kanban cards (need boards first)
      const { data: boardsData } = await supabase
        .from('kanban_boards')
        .select('id')
        .eq('is_deleted', false)
      
      if (boardsData && boardsData.length > 0) {
        const boardIds = boardsData.map(b => b.id)
        const { data: cardsData } = await supabase
          .from('kanban_cards')
          .select('id, card_title')
          .in('board_id', boardIds)
          .eq('is_deleted', false)
          .order('card_title', { ascending: true })
        if (cardsData) setKanbanCards(cardsData)
      }
    } catch (error) {
      console.error('Error fetching lookup data:', error)
    }
  }

  const handleChange = (e) => {
    const { name, value, type } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? (value ? parseFloat(value) : '') : value
    }))
  }

  const getTargetOptions = () => {
    switch (formData.assignment_type) {
      case 'task':
        return tasks.map(task => ({ id: task.id, name: task.task_name }))
      case 'work_package':
        return workPackages.map(wp => ({ id: wp.id, name: `${wp.work_package_code || ''} ${wp.work_package_name}`.trim() }))
      case 'user_story':
        return userStories.map(story => ({ id: story.id, name: story.story_title }))
      case 'kanban_card':
        return kanbanCards.map(card => ({ id: card.id, name: card.card_title }))
      case 'project':
        return projects.map(project => ({ id: project.id, name: `${project.project_code || ''} ${project.project_name}`.trim() }))
      default:
        return []
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      const submitData = {
        resource_id: resourceId,
        assignment_type: formData.assignment_type,
        assignment_target_id: formData.assignment_target_id,
        assignment_start_date: formData.assignment_start_date,
        assignment_end_date: formData.assignment_end_date || null,
        allocated_hours_per_day: formData.allocated_hours_per_day,
        total_allocated_hours: formData.total_allocated_hours ? parseFloat(formData.total_allocated_hours) : null,
        allocation_percentage: formData.allocation_percentage,
        assignment_status: formData.assignment_status,
        role_in_assignment: formData.role_in_assignment || null,
        responsibility_description: formData.responsibility_description || null,
        notes: formData.notes || null,
        updated_by: user.id,
      }

      if (assignment) {
        // Update
        const { error } = await supabase
          .from('resource_assignments')
          .update(submitData)
          .eq('id', assignment.id)

        if (error) throw error
      } else {
        // Create
        submitData.created_by = user.id
        const { error } = await supabase
          .from('resource_assignments')
          .insert(submitData)

        if (error) throw error
      }

      onSave()
    } catch (error) {
      console.error('Error saving assignment:', error)
      alert('Error saving assignment: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {assignment ? 'Edit Assignment' : 'Create Assignment'}
          </h2>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Assignment Type *
              </label>
              <select
                name="assignment_type"
                value={formData.assignment_type}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                <option value="task">Task</option>
                <option value="work_package">Work Package</option>
                <option value="user_story">User Story</option>
                <option value="kanban_card">Kanban Card</option>
                <option value="project">Project</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Assign To *
              </label>
              <select
                name="assignment_target_id"
                value={formData.assignment_target_id}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                <option value="">Select {formData.assignment_type.replace('_', ' ')}</option>
                {getTargetOptions().map((option, index) => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Calendar className="h-4 w-4 inline mr-1" />
                Start Date *
              </label>
              <input
                type="date"
                name="assignment_start_date"
                value={formData.assignment_start_date}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Calendar className="h-4 w-4 inline mr-1" />
                End Date
              </label>
              <input
                type="date"
                name="assignment_end_date"
                value={formData.assignment_end_date}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
          </div>

          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Allocation Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Hours per Day
                </label>
                <input
                  type="number"
                  name="allocated_hours_per_day"
                  value={formData.allocated_hours_per_day}
                  onChange={handleChange}
                  min="0"
                  max="24"
                  step="0.5"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Total Hours
                </label>
                <input
                  type="number"
                  name="total_allocated_hours"
                  value={formData.total_allocated_hours}
                  onChange={handleChange}
                  min="0"
                  step="0.5"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Allocation %
                </label>
                <input
                  type="number"
                  name="allocation_percentage"
                  value={formData.allocation_percentage}
                  onChange={handleChange}
                  min="0"
                  max="100"
                  step="1"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Status
              </label>
              <select
                name="assignment_status"
                value={formData.assignment_status}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                <option value="planned">Planned</option>
                <option value="confirmed">Confirmed</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Role
              </label>
              <input
                type="text"
                name="role_in_assignment"
                value={formData.role_in_assignment}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                placeholder="e.g., Lead, Contributor, Reviewer"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Responsibility Description
            </label>
            <textarea
              name="responsibility_description"
              value={formData.responsibility_description}
              onChange={handleChange}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Notes
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>

          <div className="flex justify-end gap-2 border-t border-gray-200 dark:border-gray-700 pt-6 mt-6">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 flex items-center gap-2"
            >
              <X className="h-4 w-4" />
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {saving ? 'Saving...' : 'Save Assignment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

