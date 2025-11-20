import { useState, useEffect } from 'react'
import { supabase } from '../services/supabaseClient'
import { format } from 'date-fns'
import { X, Save, User, Calendar, AlertTriangle } from 'lucide-react'

export default function IssueForm({ issue, projectId, onSave, onCancel, linkedTaskId, linkedWorkPackageId, linkedUserStoryId, linkedKanbanCardId }) {
  const [formData, setFormData] = useState({
    issue_title: '',
    issue_description: '',
    issue_code: '',
    issue_type: 'bug',
    issue_category: '',
    priority: 'medium',
    severity: 'medium',
    assigned_to_user_id: '',
    due_date: '',
    impact_description: '',
    affected_areas: [],
    task_id: '',
    work_package_id: '',
    user_story_id: '',
    kanban_card_id: '',
  })
  const [teamMembers, setTeamMembers] = useState([])
  const [tasks, setTasks] = useState([])
  const [workPackages, setWorkPackages] = useState([])
  const [userStories, setUserStories] = useState([])
  const [kanbanCards, setKanbanCards] = useState([])
  const [saving, setSaving] = useState(false)
  const [newArea, setNewArea] = useState('')

  useEffect(() => {
    if (issue) {
      setFormData({
        issue_title: issue.issue_title || '',
        issue_description: issue.issue_description || '',
        issue_code: issue.issue_code || '',
        issue_type: issue.issue_type || 'bug',
        issue_category: issue.issue_category || '',
        priority: issue.priority || 'medium',
        severity: issue.severity || 'medium',
        assigned_to_user_id: issue.assigned_to_user_id || '',
        due_date: issue.due_date ? format(new Date(issue.due_date), 'yyyy-MM-dd') : '',
        impact_description: issue.impact_description || '',
        affected_areas: issue.affected_areas || [],
        task_id: issue.task_id || '',
        work_package_id: issue.work_package_id || '',
        user_story_id: issue.user_story_id || '',
        kanban_card_id: issue.kanban_card_id || '',
      })
    } else {
      // Set linked IDs if provided
      setFormData(prev => ({
        ...prev,
        task_id: linkedTaskId || '',
        work_package_id: linkedWorkPackageId || '',
        user_story_id: linkedUserStoryId || '',
        kanban_card_id: linkedKanbanCardId || '',
      }))
    }
    fetchTeamMembers()
    fetchLinkedItems()
  }, [issue, projectId, linkedTaskId, linkedWorkPackageId, linkedUserStoryId, linkedKanbanCardId])

  const fetchTeamMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('project_members')
        .select(`
          *,
          user:user_id (id, email, full_name)
        `)
        .eq('project_id', projectId)
        .eq('is_deleted', false)

      if (error) throw error
      setTeamMembers(data || [])
    } catch (error) {
      console.error('Error fetching team members:', error)
    }
  }

  const fetchLinkedItems = async () => {
    try {
      // Fetch tasks
      const { data: tasksData } = await supabase
        .from('tasks')
        .select('id, task_name')
        .eq('project_id', projectId)
        .eq('is_deleted', false)
        .order('task_name', { ascending: true })
      if (tasksData) setTasks(tasksData)

      // Fetch work packages
      const { data: wpData } = await supabase
        .from('work_packages')
        .select('id, work_package_name, work_package_code')
        .eq('project_id', projectId)
        .eq('is_deleted', false)
        .order('work_package_name', { ascending: true })
      if (wpData) setWorkPackages(wpData)

      // Fetch user stories
      const { data: storiesData } = await supabase
        .from('user_stories')
        .select('id, story_title')
        .eq('project_id', projectId)
        .eq('is_deleted', false)
        .order('story_title', { ascending: true })
      if (storiesData) setUserStories(storiesData)

      // Fetch kanban cards (need to get boards first)
      const { data: boardsData } = await supabase
        .from('kanban_boards')
        .select('id')
        .eq('project_id', projectId)
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
      console.error('Error fetching linked items:', error)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleAddArea = () => {
    if (newArea.trim()) {
      setFormData(prev => ({
        ...prev,
        affected_areas: [...prev.affected_areas, newArea.trim()]
      }))
      setNewArea('')
    }
  }

  const handleRemoveArea = (index) => {
    setFormData(prev => ({
      ...prev,
      affected_areas: prev.affected_areas.filter((_, i) => i !== index)
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      const submitData = {
        ...formData,
        project_id: projectId,
        assigned_to_user_id: formData.assigned_to_user_id || null,
        due_date: formData.due_date || null,
        task_id: formData.task_id || null,
        work_package_id: formData.work_package_id || null,
        user_story_id: formData.user_story_id || null,
        kanban_card_id: formData.kanban_card_id || null,
        status: issue ? issue.status : 'new',
        reported_by_user_id: user.id,
        updated_by: user.id,
      }

      if (issue) {
        // Update
        const { error } = await supabase
          .from('issues')
          .update(submitData)
          .eq('id', issue.id)

        if (error) throw error
      } else {
        // Create
        submitData.created_by = user.id
        const { error } = await supabase
          .from('issues')
          .insert(submitData)

        if (error) throw error
      }

      onSave()
    } catch (error) {
      console.error('Error saving issue:', error)
      alert('Error saving issue: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {issue ? 'Edit Issue' : 'Create Issue'}
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
                Issue Title *
              </label>
              <input
                type="text"
                name="issue_title"
                value={formData.issue_title}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Issue Code
              </label>
              <input
                type="text"
                name="issue_code"
                value={formData.issue_code}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                placeholder="e.g., ISSUE-001"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description *
            </label>
            <textarea
              name="issue_description"
              value={formData.issue_description}
              onChange={handleChange}
              rows={5}
              required
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Issue Type
              </label>
              <select
                name="issue_type"
                value={formData.issue_type}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                <option value="bug">Bug</option>
                <option value="enhancement">Enhancement</option>
                <option value="task">Task</option>
                <option value="question">Question</option>
                <option value="blocker">Blocker</option>
                <option value="risk">Risk</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Priority
              </label>
              <select
                name="priority"
                value={formData.priority}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Severity
              </label>
              <select
                name="severity"
                value={formData.severity}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <User className="h-4 w-4 inline mr-1" />
                Assign To
              </label>
              <select
                name="assigned_to_user_id"
                value={formData.assigned_to_user_id}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                <option value="">Unassigned</option>
                {teamMembers.map((member) => (
                  <option key={member.user_id} value={member.user_id}>
                    {member.user?.full_name || member.user?.email}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Calendar className="h-4 w-4 inline mr-1" />
                Due Date
              </label>
              <input
                type="date"
                name="due_date"
                value={formData.due_date}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
          </div>

          {/* Link to Related Items */}
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Link to Related Items (Optional)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Link to Task
                </label>
                <select
                  name="task_id"
                  value={formData.task_id}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                >
                  <option value="">No Task Link</option>
                  {tasks.map((task) => (
                    <option key={task.id} value={task.id}>
                      {task.task_name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Link to Work Package
                </label>
                <select
                  name="work_package_id"
                  value={formData.work_package_id}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                >
                  <option value="">No Work Package Link</option>
                  {workPackages.map((wp) => (
                    <option key={wp.id} value={wp.id}>
                      {wp.work_package_code || wp.work_package_name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Link to User Story
                </label>
                <select
                  name="user_story_id"
                  value={formData.user_story_id}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                >
                  <option value="">No User Story Link</option>
                  {userStories.map((story) => (
                    <option key={story.id} value={story.id}>
                      {story.story_title}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Link to Kanban Card
                </label>
                <select
                  name="kanban_card_id"
                  value={formData.kanban_card_id}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                >
                  <option value="">No Kanban Card Link</option>
                  {kanbanCards.map((card) => (
                    <option key={card.id} value={card.id}>
                      {card.card_title}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Impact Description
            </label>
            <textarea
              name="impact_description"
              value={formData.impact_description}
              onChange={handleChange}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Affected Areas
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={newArea}
                onChange={(e) => setNewArea(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddArea())}
                placeholder="Add affected area..."
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
              <button
                type="button"
                onClick={handleAddArea}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
              >
                Add
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.affected_areas.map((area, index) => (
                <span
                  key={index}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded text-sm"
                >
                  {area}
                  <button
                    type="button"
                    onClick={() => handleRemoveArea(index)}
                    className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {saving ? 'Saving...' : issue ? 'Update' : 'Create'} Issue
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

