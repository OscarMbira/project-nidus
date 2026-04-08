import { useState, useEffect } from 'react'
import { supabase } from '../services/supabaseClient'
import { format } from 'date-fns'
import { X, Save, User, Calendar, AlertTriangle, Package } from 'lucide-react'
import { getOrCreateIssueRegister } from '../services/issueRegisterService'
import { createIssue, updateIssue } from '../services/issueService'
import { validateIssueForm, validateStatusTransition } from '../utils/issueValidation'
import { HoldButton } from './ui/HoldButton'

export default function IssueForm({ issue, projectId, issueRegisterId, onSave, onCancel, linkedTaskId, linkedWorkPackageId, linkedUserStoryId, linkedKanbanCardId }) {
  const [formData, setFormData] = useState({
    issue_title: '',
    issue_description: '',
    issue_code: '',
    issue_type: 'problem_concern',
    issue_category: '',
    sub_category: '',
    priority: 'medium',
    severity: 'moderate',
    priority_rationale: '',
    severity_rationale: '',
    urgency: '',
    assigned_to_user_id: '',
    owner_id: '',
    raised_by_id: '',
    author_id: '',
    due_date: '',
    date_raised: '',
    impact_description: '',
    cause_description: '',
    cost_impact: '',
    schedule_impact_days: '',
    quality_impact: '',
    scope_impact: '',
    affects_baseline: false,
    affected_areas: [],
    related_product_id: '',
    task_id: '',
    work_package_id: '',
    user_story_id: '',
    kanban_card_id: '',
    tags: [],
  })
  const [teamMembers, setTeamMembers] = useState([])
  const [tasks, setTasks] = useState([])
  const [workPackages, setWorkPackages] = useState([])
  const [userStories, setUserStories] = useState([])
  const [kanbanCards, setKanbanCards] = useState([])
  const [products, setProducts] = useState([])
  const [saving, setSaving] = useState(false)
  const [newArea, setNewArea] = useState('')
  const [newTag, setNewTag] = useState('')
  const [currentRegisterId, setCurrentRegisterId] = useState(issueRegisterId)
  const [errors, setErrors] = useState({})
  const [touched, setTouched] = useState({})

  useEffect(() => {
    const initializeForm = async () => {
      // Get or create issue register if not provided
      if (!currentRegisterId && projectId) {
        try {
          const register = await getOrCreateIssueRegister(projectId)
          setCurrentRegisterId(register.id)
        } catch (error) {
          console.error('Error getting issue register:', error)
        }
      }

      if (issue) {
        setFormData({
          issue_title: issue.issue_title || '',
          issue_description: issue.issue_description || '',
          issue_code: issue.issue_code || issue.issue_identifier || '',
          issue_type: issue.issue_type || 'problem_concern',
          issue_category: issue.issue_category || '',
          sub_category: issue.sub_category || '',
          priority: issue.priority || 'medium',
          severity: issue.severity || 'moderate',
          priority_rationale: issue.priority_rationale || '',
          severity_rationale: issue.severity_rationale || '',
          urgency: issue.urgency || '',
          assigned_to_user_id: issue.assigned_to_user_id || issue.owner_id || '',
          owner_id: issue.owner_id || issue.assigned_to_user_id || '',
          raised_by_id: issue.raised_by_id || issue.reported_by_user_id || '',
          author_id: issue.author_id || '',
          due_date: issue.due_date ? format(new Date(issue.due_date), 'yyyy-MM-dd') : '',
          date_raised: issue.date_raised ? format(new Date(issue.date_raised), 'yyyy-MM-dd') : '',
          impact_description: issue.impact_description || '',
          cause_description: issue.cause_description || '',
          cost_impact: issue.cost_impact || '',
          schedule_impact_days: issue.schedule_impact_days || '',
          quality_impact: issue.quality_impact || '',
          scope_impact: issue.scope_impact || '',
          affects_baseline: issue.affects_baseline || false,
          affected_areas: issue.affected_areas || [],
          related_product_id: issue.related_product_id || '',
          task_id: issue.task_id || '',
          work_package_id: issue.work_package_id || issue.related_work_package_id || '',
          user_story_id: issue.user_story_id || '',
          kanban_card_id: issue.kanban_card_id || '',
          tags: issue.tags || [],
        })
        if (issue.issue_register_id) {
          setCurrentRegisterId(issue.issue_register_id)
        }
      } else {
        // Set linked IDs if provided
        setFormData(prev => ({
          ...prev,
          date_raised: format(new Date(), 'yyyy-MM-dd'),
          task_id: linkedTaskId || '',
          work_package_id: linkedWorkPackageId || '',
          user_story_id: linkedUserStoryId || '',
          kanban_card_id: linkedKanbanCardId || '',
        }))
      }
      fetchTeamMembers()
      fetchLinkedItems()
      fetchProducts()
    }
    initializeForm()
  }, [issue, projectId, issueRegisterId, linkedTaskId, linkedWorkPackageId, linkedUserStoryId, linkedKanbanCardId])

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

  const fetchProducts = async () => {
    try {
      const { data: productsData } = await supabase
        .from('product_deliverables')
        .select('id, product_name, product_code')
        .eq('project_id', projectId)
        .eq('is_deleted', false)
        .order('product_name', { ascending: true })
      if (productsData) setProducts(productsData)
    } catch (error) {
      console.error('Error fetching products:', error)
    }
  }

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    const fieldValue = type === 'checkbox' ? checked : value
    setFormData(prev => ({ ...prev, [name]: fieldValue }))
    
    // Clear error when field is touched
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[name]
        return newErrors
      })
    }
    setTouched(prev => ({ ...prev, [name]: true }))
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

  const handleAddTag = () => {
    if (newTag.trim()) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()]
      }))
      setNewTag('')
    }
  }

  const handleRemoveTag = (index) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter((_, i) => i !== index)
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setErrors({})

    try {
      // Validate form
      const validation = validateIssueForm(formData)
      if (!validation.valid) {
        setErrors(validation.errors)
        setSaving(false)
        return
      }

      // Validate status transition if updating
      if (issue && formData.status && formData.status !== issue.status) {
        const statusValidation = validateStatusTransition(issue.status, formData.status)
        if (!statusValidation.valid) {
          setErrors({ status: statusValidation.message })
          setSaving(false)
          return
        }
      }

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      // Ensure we have an issue register
      let registerId = currentRegisterId
      if (!registerId && projectId) {
        const register = await getOrCreateIssueRegister(projectId)
        registerId = register.id
        setCurrentRegisterId(registerId)
      }

      if (!registerId) {
        throw new Error('Issue register not found. Please ensure the project has an issue register.')
      }

      const submitData = {
        issue_title: formData.issue_title,
        issue_description: formData.issue_description,
        issue_type: formData.issue_type,
        issue_category: formData.issue_category || null,
        sub_category: formData.sub_category || null,
        priority: formData.priority,
        severity: formData.severity,
        priority_rationale: formData.priority_rationale || null,
        severity_rationale: formData.severity_rationale || null,
        urgency: formData.urgency || null,
        impact_description: formData.impact_description || null,
        cause_description: formData.cause_description || null,
        cost_impact: formData.cost_impact ? parseFloat(formData.cost_impact) : null,
        schedule_impact_days: formData.schedule_impact_days ? parseInt(formData.schedule_impact_days) : null,
        quality_impact: formData.quality_impact || null,
        scope_impact: formData.scope_impact || null,
        affects_baseline: formData.affects_baseline || false,
        affected_areas: formData.affected_areas || [],
        tags: formData.tags || [],
        date_raised: formData.date_raised || new Date().toISOString().split('T')[0],
        raised_by_id: formData.raised_by_id || user.id,
        author_id: formData.author_id || user.id,
        owner_id: formData.owner_id || formData.assigned_to_user_id || null,
        assigned_to_user_id: formData.owner_id || formData.assigned_to_user_id || null,
        related_product_id: formData.related_product_id || null,
        related_work_package_id: formData.work_package_id || null,
        task_id: formData.task_id || null,
        work_package_id: formData.work_package_id || null,
        user_story_id: formData.user_story_id || null,
        kanban_card_id: formData.kanban_card_id || null,
        due_date: formData.due_date || null,
        status: issue ? issue.status : 'draft',
      }

      if (issue) {
        // Update using service
        await updateIssue(issue.id, submitData)
        alert('Issue updated successfully!')
      } else {
        // Create using service
        await createIssue(registerId, submitData)
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
                className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${
                  errors.issue_title ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                }`}
              />
              {errors.issue_title && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.issue_title}</p>
              )}
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
              className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${
                errors.issue_description ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
              }`}
            />
            {errors.issue_description && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.issue_description}</p>
            )}
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
                <optgroup label="Issue Register Types">
                  <option value="request_for_change">Request for Change (RFC)</option>
                  <option value="off_specification">Off-Specification</option>
                  <option value="problem_concern">Problem/Concern</option>
                </optgroup>
                <optgroup label="Legacy Types">
                  <option value="bug">Bug</option>
                  <option value="enhancement">Enhancement</option>
                  <option value="task">Task</option>
                  <option value="question">Question</option>
                  <option value="blocker">Blocker</option>
                  <option value="risk">Risk</option>
                  <option value="other">Other</option>
                </optgroup>
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
                <option value="minor">Minor</option>
                <option value="moderate">Moderate</option>
                <option value="major">Major</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Calendar className="h-4 w-4 inline mr-1" />
                Date Raised *
              </label>
              <input
                type="date"
                name="date_raised"
                value={formData.date_raised}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
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

          {/* Issue Ownership Section */}
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Issue Ownership
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Raised By
                </label>
                <select
                  name="raised_by_id"
                  value={formData.raised_by_id}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                >
                  <option value="">Select...</option>
                  {teamMembers.map((member) => (
                    <option key={member.user_id} value={member.user_id}>
                      {member.user?.full_name || member.user?.email}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Author (Documented By)
                </label>
                <select
                  name="author_id"
                  value={formData.author_id}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                >
                  <option value="">Select...</option>
                  {teamMembers.map((member) => (
                    <option key={member.user_id} value={member.user_id}>
                      {member.user?.full_name || member.user?.email}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <User className="h-4 w-4 inline mr-1" />
                  Owner (Responsible)
                </label>
                <select
                  name="owner_id"
                  value={formData.owner_id}
                  onChange={(e) => {
                    setFormData(prev => ({
                      ...prev,
                      owner_id: e.target.value,
                      assigned_to_user_id: e.target.value
                    }))
                  }}
                  className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 ${
                    errors.owner_id ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  }`}
                >
                  <option value="">Unassigned</option>
                  {teamMembers.map((member) => (
                    <option key={member.user_id} value={member.user_id}>
                      {member.user?.full_name || member.user?.email}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Type-Specific Fields */}
          {formData.issue_type === 'off_specification' && (
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
              <h3 className="text-sm font-medium text-blue-900 dark:text-blue-300 mb-3">
                Off-Specification Details
              </h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <Package className="h-4 w-4 inline mr-1" />
                  Related Product/Deliverable
                </label>
                <select
                  name="related_product_id"
                  value={formData.related_product_id}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 ${
                    errors.related_product_id ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  }`}
                >
                  <option value="">No Product Link</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.product_code ? `${product.product_code} - ` : ''}{product.product_name}
                    </option>
                  ))}
                </select>
                {errors.related_product_id && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.related_product_id}</p>
                )}
              </div>
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Cause Description
                </label>
                <textarea
                  name="cause_description"
                  value={formData.cause_description}
                  onChange={handleChange}
                  rows={3}
                  placeholder="Describe the root cause of the off-specification..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                />
              </div>
            </div>
          )}

          {formData.issue_type === 'request_for_change' && (
            <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 border border-purple-200 dark:border-purple-800">
              <h3 className="text-sm font-medium text-purple-900 dark:text-purple-300 mb-3">
                Request for Change (RFC) Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Scope Impact
                  </label>
                  <textarea
                    name="scope_impact"
                    value={formData.scope_impact}
                    onChange={handleChange}
                    rows={2}
                    placeholder="Describe scope changes..."
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Cost Impact ($)
                  </label>
                  <input
                    type="number"
                    name="cost_impact"
                    value={formData.cost_impact}
                    onChange={handleChange}
                    step="0.01"
                    placeholder="0.00"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Schedule Impact (Days)
                  </label>
                  <input
                    type="number"
                    name="schedule_impact_days"
                    value={formData.schedule_impact_days}
                    onChange={handleChange}
                    placeholder="0"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  />
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    name="affects_baseline"
                    checked={formData.affects_baseline}
                    onChange={(e) => setFormData(prev => ({ ...prev, affects_baseline: e.target.checked }))}
                    className="h-4 w-4 text-blue-600 rounded border-gray-300"
                  />
                  <label className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                    Affects Project Baseline
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Impact Analysis */}
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Impact Analysis
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Impact Description *
                </label>
                <textarea
                  name="impact_description"
                  value={formData.impact_description}
                  onChange={handleChange}
                  rows={3}
                  required
                  placeholder="Describe the impact on the project..."
                  className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 ${
                    errors.impact_description ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  }`}
                />
                {errors.impact_description && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.impact_description}</p>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Priority Rationale
                  </label>
                  <textarea
                    name="priority_rationale"
                    value={formData.priority_rationale}
                    onChange={handleChange}
                    rows={2}
                    placeholder="Why this priority level?"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Severity Rationale
                  </label>
                  <textarea
                    name="severity_rationale"
                    value={formData.severity_rationale}
                    onChange={handleChange}
                    rows={2}
                    placeholder="Why this severity level?"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Urgency
                </label>
                <select
                  name="urgency"
                  value={formData.urgency}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                >
                  <option value="">Select urgency...</option>
                  <option value="immediate">Immediate</option>
                  <option value="this_week">This Week</option>
                  <option value="this_stage">This Stage</option>
                  <option value="can_wait">Can Wait</option>
                </select>
              </div>
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Tags
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                  placeholder="Add tag..."
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
                <button
                  type="button"
                  onClick={handleAddTag}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                >
                  Add
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-sm"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(index)}
                      className="text-blue-500 hover:text-blue-700 dark:hover:text-blue-300"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
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
            {!issue && (
              <HoldButton
                entityType="issue"
                formData={formData}
                projectId={projectId}
                onHoldComplete={onCancel}
                disabled={saving}
              />
            )}
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

