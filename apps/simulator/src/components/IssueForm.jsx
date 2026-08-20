import { useState, useEffect } from 'react'
import { supabase } from '../services/supabaseClient'
import { format } from 'date-fns'
import { Save, User, Calendar, AlertTriangle, Package, X } from 'lucide-react'
import FormSurface from './ui/FormSurface'
import RecordLifecycleFieldLock, { isRecordLifecycleLocked } from '@nidus/ui/RecordLifecycleFieldLock'
import AuditDetailsPanel from '@nidus/ui/AuditDetailsPanel'
import AuditCard from '@nidus/ui/AuditCard'
import AuditField from '@nidus/ui/AuditField'
import AuditTimestampPair from '@nidus/ui/AuditTimestampPair'
import DetailAuditTabList from '@nidus/ui/DetailAuditTabList'
import { getOrCreateIssueRegister } from '../services/issueRegisterService'
import { createIssue, updateIssue } from '../services/issueService'
import { validateIssueForm, validateStatusTransition } from '@nidus/shared/utils/issueValidation'
import { useSuccessModal } from '@nidus/shared/hooks/useSuccessModal'
import { HoldButton } from './ui/HoldButton'
import { humanizeAuditToken, resolveAuditUserLabels } from '@nidus/shared/utils/auditDisplayUtils'
import toast from 'react-hot-toast'

const ISSUE_FORM_TABS = [
  { value: 'details', label: 'Details' },
  { value: 'ownership', label: 'Ownership' },
  { value: 'impact', label: 'Impact' },
  { value: 'links', label: 'Links' },
  { value: 'audit', label: 'Audit details' },
]

const FIELD_TAB = {
  issue_title: 'details',
  issue_description: 'details',
  issue_type: 'details',
  date_raised: 'details',
  due_date: 'details',
  priority: 'details',
  severity: 'details',
  owner_id: 'ownership',
  raised_by_id: 'ownership',
  author_id: 'ownership',
  assigned_to_user_id: 'ownership',
  impact_description: 'impact',
  related_product_id: 'impact',
  cause_description: 'impact',
  scope_impact: 'impact',
  cost_impact: 'impact',
  schedule_impact_days: 'impact',
}

const FIELD_LABELS = {
  issue_title: 'Issue title',
  issue_description: 'Description',
  issue_type: 'Issue type',
  date_raised: 'Date raised',
  due_date: 'Due date',
  priority: 'Priority',
  severity: 'Severity',
  owner_id: 'Owner',
  raised_by_id: 'Raised by',
  author_id: 'Author',
  impact_description: 'Impact description',
  related_product_id: 'Related product',
  status: 'Status',
}

const TAB_LABELS = {
  details: 'Details',
  ownership: 'Ownership',
  impact: 'Impact',
  links: 'Links',
  audit: 'Audit details',
}

function tabForErrorKeys(errorKeys) {
  for (const key of errorKeys) {
    if (FIELD_TAB[key]) return FIELD_TAB[key]
  }
  return 'details'
}

function buildValidationBanner(errors) {
  const entries = Object.entries(errors || {})
  const items = entries.map(([key, message]) => {
    const field = FIELD_LABELS[key] || key.replace(/_/g, ' ')
    const tabId = FIELD_TAB[key]
    const tab = TAB_LABELS[tabId]
    const detail = message || `${field} needs attention`
    return tab ? `${detail} — open the ${tab} tab to fix it.` : detail
  })
  return {
    title:
      entries.length === 1
        ? 'One field still needs attention before you can save'
        : `${entries.length} fields still need attention before you can save`,
    items,
  }
}

export default function IssueForm({
  issue,
  projectId,
  issueRegisterId,
  onSave,
  onCancel,
  linkedTaskId,
  linkedWorkPackageId,
  linkedUserStoryId,
  linkedKanbanCardId,
  variant = 'modal',
  accountId: accountIdProp = null,
}) {
  const [accountId, setAccountId] = useState(accountIdProp)
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
  const { showSuccess, modal: successModal } = useSuccessModal()
  const [newArea, setNewArea] = useState('')
  const [newTag, setNewTag] = useState('')
  const [currentRegisterId, setCurrentRegisterId] = useState(issueRegisterId)
  const [errors, setErrors] = useState({})
  const [touched, setTouched] = useState({})
  const [formTab, setFormTab] = useState('details')
  const [auditUserLabels, setAuditUserLabels] = useState({})
  const [projectAudit, setProjectAudit] = useState({ code: '', name: '' })
  const [formBanner, setFormBanner] = useState(null)

  useEffect(() => {
    if (!projectId) {
      setProjectAudit({ code: '', name: '' })
      return
    }
    let cancelled = false
    supabase
      .from('projects')
      .select('project_code, project_name')
      .eq('id', projectId)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) {
          setProjectAudit({
            code: data?.project_code || '',
            name: data?.project_name || '',
          })
        }
      })
    return () => {
      cancelled = true
    }
  }, [projectId])

  useEffect(() => {
    if (formTab !== 'audit' || !issue) {
      return
    }
    let cancelled = false
    ;(async () => {
      const labels = await resolveAuditUserLabels(supabase, [
        issue.created_by,
        issue.updated_by,
        issue.raised_by_id,
        issue.author_id,
        issue.owner_id,
        issue.assigned_to_user_id,
        issue.resolved_by_user_id,
        issue.closed_by_user_id,
      ])
      if (!cancelled) setAuditUserLabels(labels || {})
    })()
    return () => {
      cancelled = true
    }
  }, [formTab, issue])

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

  useEffect(() => {
    if (accountIdProp) {
      setAccountId(accountIdProp)
      return
    }
    if (!projectId) {
      setAccountId(null)
      return
    }
    let cancelled = false
    supabase
      .from('projects')
      .select('account_id')
      .eq('id', projectId)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) setAccountId(data?.account_id || null)
      })
    return () => {
      cancelled = true
    }
  }, [projectId, accountIdProp])

  const fetchTeamMembers = async () => {
    try {
      // Membership rows live in project_memberships and are retired via is_active,
      // not a soft-delete flag.
      const { data, error } = await supabase
        .from('project_memberships')
        .select(`
          id,
          user_id,
          user:user_id (id, email, full_name)
        `)
        .eq('project_id', projectId)
        .eq('is_active', true)

      if (error) throw error
      setTeamMembers((data || []).filter((m) => m.user_id))
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
      setFormBanner((prev) => {
        if (!prev) return null
        const nextErrors = { ...errors }
        delete nextErrors[name]
        return Object.keys(nextErrors).length ? buildValidationBanner(nextErrors) : null
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
    if (issue && isRecordLifecycleLocked(issue.record_status)) {
      return
    }
    setSaving(true)
    setErrors({})
    setFormBanner(null)

    try {
      // Validate form
      const validation = validateIssueForm(formData)
      if (!validation.valid) {
        setErrors(validation.errors)
        setSaving(false)
        const errorKeys = Object.keys(validation.errors)
        setFormTab(tabForErrorKeys(errorKeys))
        setFormBanner(buildValidationBanner(validation.errors))
        // Focus first invalid field after tab switch
        requestAnimationFrame(() => {
          const firstKey = errorKeys[0]
          if (firstKey) {
            const el = document.querySelector(`[name="${firstKey}"]`)
            el?.scrollIntoView?.({ behavior: 'smooth', block: 'center' })
            el?.focus?.()
          }
        })
        return
      }

      // Validate status transition if updating
      if (issue && formData.status && formData.status !== issue.status) {
        const statusValidation = validateStatusTransition(issue.status, formData.status)
        if (!statusValidation.valid) {
          setErrors({ status: statusValidation.message })
          setFormBanner({
            title: 'This status change is not allowed',
            items: [statusValidation.message],
          })
          setSaving(false)
          return
        }
      }

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      // Resolve public.users.id — auth uid is not a valid FK for raised_by/author
      const { data: appUser, error: appUserError } = await supabase
        .from('users')
        .select('id')
        .eq('auth_user_id', user.id)
        .eq('is_deleted', false)
        .single()
      if (appUserError || !appUser) throw new Error('User record not found')
      const currentUserId = appUser.id

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
        raised_by_id: formData.raised_by_id || currentUserId,
        author_id: formData.author_id || currentUserId,
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
        const updated = await updateIssue(issue.id, submitData)
        const ref =
          updated?.issue_identifier ||
          issue.issue_identifier ||
          (updated?.issue_number != null ? `Issue #${updated.issue_number}` : issue.id)
        showSuccess({ recordId: ref, operation: 'updated', message: 'Issue updated successfully.', onOk: onSave })
      } else {
        const created = await createIssue(registerId, submitData)
        const ref =
          created?.issue_identifier ||
          (created?.issue_number != null ? `Issue #${created.issue_number}` : created?.id)
        showSuccess({ recordId: ref, operation: 'created', message: 'Issue created successfully.', onOk: onSave })
      }
    } catch (error) {
      console.error('Error saving issue:', error)
      toast.error(error?.message || 'Could not save the issue. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
    {successModal}
    <FormSurface
      variant={variant}
      title={issue ? 'Edit Issue' : 'Create Issue'}
      icon={AlertTriangle}
      onClose={onCancel}
    >
      <RecordLifecycleFieldLock recordStatus={issue?.record_status}>
      <form onSubmit={handleSubmit} className="p-6 space-y-4" noValidate>
          <div className="sticky top-0 z-[5] -mx-6 px-6 pt-1 bg-white dark:bg-gray-800">
            <DetailAuditTabList
              activeTab={formTab}
              onChange={setFormTab}
              tabs={ISSUE_FORM_TABS}
              ariaLabel="Issue form sections"
            />
          </div>

          {formBanner && (
            <div
              role="alert"
              className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-500/40 dark:bg-amber-950/40 dark:text-amber-100"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 space-y-1">
                  <p className="font-medium">{formBanner.title}</p>
                  <ul className="list-disc space-y-1 pl-5 text-amber-900/90 dark:text-amber-100/90">
                    {(formBanner.items || []).map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                </div>
                <button
                  type="button"
                  onClick={() => setFormBanner(null)}
                  className="shrink-0 rounded p-1 text-amber-800 hover:bg-amber-100 dark:text-amber-200 dark:hover:bg-amber-900/50"
                  aria-label="Dismiss message"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          <div className={`space-y-6 pt-2 ${formTab === 'details' ? '' : 'hidden'}`} role="tabpanel" aria-label="Details" aria-hidden={formTab !== 'details'}>
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
                    className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${
                      errors.issue_type ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                    }`}
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
                  {errors.issue_type && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.issue_type}</p>
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
            </div>

          <div className={`space-y-6 pt-2 ${formTab === 'ownership' ? '' : 'hidden'}`} role="tabpanel" aria-label="Ownership" aria-hidden={formTab !== 'ownership'}>
              <div className="bg-gray-50 dark:bg-gray-700/80 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
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
                        setFormData((prev) => ({
                          ...prev,
                          owner_id: e.target.value,
                          assigned_to_user_id: e.target.value,
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
          </div>

          <div className={`space-y-6 pt-2 ${formTab === 'impact' ? '' : 'hidden'}`} role="tabpanel" aria-label="Impact" aria-hidden={formTab !== 'impact'}>
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
                          {product.product_code ? `${product.product_code} - ` : ''}
                          {product.product_name}
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
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, affects_baseline: e.target.checked }))
                        }
                        className="h-4 w-4 text-blue-600 rounded border-gray-300"
                      />
                      <label className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                        Affects Project Baseline
                      </label>
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-gray-50 dark:bg-gray-700/80 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
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
          </div>

          <div className={`space-y-6 pt-2 ${formTab === 'links' ? '' : 'hidden'}`} role="tabpanel" aria-label="Links" aria-hidden={formTab !== 'links'}>
            <div className="bg-gray-50 dark:bg-gray-700/80 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
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
          </div>

          <div
            className={`space-y-6 pt-2 ${formTab === 'audit' ? '' : 'hidden'}`}
            role="tabpanel"
            aria-label="Audit details"
            aria-hidden={formTab !== 'audit'}
          >
            {!issue?.id ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Audit details appear after this issue is saved.
              </p>
            ) : (
              <AuditDetailsPanel description="Who created or changed this issue, and how it is classified.">
                <AuditCard title="Identity" description="How this issue is labelled and tracked.">
                  <AuditField
                    label="Display ID"
                    value={issue.issue_identifier || issue.issue_code || formData.issue_code}
                  />
                  <AuditField label="Title" value={formData.issue_title || issue.issue_title} />
                  <AuditField label="Type" value={humanizeAuditToken(formData.issue_type || issue.issue_type)} />
                  <AuditField label="Status" value={humanizeAuditToken(issue.status)} />
                  <AuditField label="Priority" value={humanizeAuditToken(formData.priority || issue.priority)} />
                  <AuditField label="Severity" value={humanizeAuditToken(formData.severity || issue.severity)} />
                  <AuditField label="Record status" value={humanizeAuditToken(issue.record_status)} />
                </AuditCard>
                <AuditCard title="Classification" description="Where this issue sits.">
                  <AuditField
                    label="Project"
                    value={projectAudit.code || projectAudit.name || null}
                  />
                  <AuditField
                    label="Register reference"
                    value={issue.issue_register?.register_reference || null}
                  />
                  <AuditField
                    label="Raised by"
                    value={
                      formData.raised_by_id || issue.raised_by_id
                        ? auditUserLabels[formData.raised_by_id || issue.raised_by_id] || null
                        : null
                    }
                  />
                  <AuditField
                    label="Owner"
                    value={
                      formData.owner_id || issue.owner_id
                        ? auditUserLabels[formData.owner_id || issue.owner_id] || null
                        : null
                    }
                  />
                </AuditCard>
                <AuditCard title="Record history" description="When this issue was created and last changed.">
                  <AuditField
                    label="Created by"
                    value={issue.created_by ? auditUserLabels[issue.created_by] || null : null}
                  />
                  <AuditTimestampPair dateLabel="Created at" value={issue.created_at} />
                  <AuditField
                    label="Updated by"
                    value={issue.updated_by ? auditUserLabels[issue.updated_by] || null : null}
                  />
                  <AuditTimestampPair dateLabel="Last updated" value={issue.updated_at} />
                  <AuditTimestampPair dateLabel="Date raised" value={issue.date_raised || formData.date_raised} />
                  <AuditTimestampPair dateLabel="Due date" value={issue.due_date || formData.due_date} />
                  {issue.resolved_at ? (
                    <AuditTimestampPair dateLabel="Resolved at" value={issue.resolved_at} />
                  ) : null}
                  {issue.closed_at ? (
                    <AuditTimestampPair dateLabel="Closed at" value={issue.closed_at} />
                  ) : null}
                </AuditCard>
              </AuditDetailsPanel>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            {Object.keys(errors).length > 0 && (
              <p className="flex-1 text-sm text-amber-700 dark:text-amber-300 self-center">
                Complete the items listed above, then try saving again.
              </p>
            )}
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
              disabled={saving || (issue && isRecordLifecycleLocked(issue.record_status))}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {saving ? 'Saving...' : issue ? 'Update' : 'Create'} Issue
            </button>
          </div>
      </form>
      </RecordLifecycleFieldLock>
    </FormSurface>
    </>
  )
}

