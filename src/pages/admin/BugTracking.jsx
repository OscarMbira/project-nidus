import { useState, useEffect } from 'react'
import { Bug, Plus, Filter, Search, AlertCircle, AlertTriangle, Info, CheckCircle, XCircle, Circle } from 'lucide-react'
import { supabase } from '../../services/supabaseClient'
import { useToastContext } from '../../context/ToastContext'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { Textarea } from '../../components/ui/Textarea'
import { Loading } from '../../components/ui/Loading'
import { EmptyState } from '../../components/ui/EmptyState'

export default function BugTracking() {
  const [bugs, setBugs] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [severityFilter, setSeverityFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedBug, setSelectedBug] = useState(null)
  const toast = useToastContext()

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    steps_to_reproduce: '',
    expected_behavior: '',
    actual_behavior: '',
    severity: 'medium',
    priority: 'p2',
    status: 'new',
    assignee_id: null,
    reporter_id: null,
    page_url: '',
    browser_info: navigator.userAgent,
    screenshot_url: null
  })

  useEffect(() => {
    loadBugs()
  }, [severityFilter, priorityFilter, statusFilter, searchQuery])

  const loadBugs = async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('bugs')
        .select(`
          *,
          assignee:assignee_id (id, full_name, email),
          reporter:reporter_id (id, full_name, email)
        `)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })

      if (severityFilter !== 'all') {
        query = query.eq('severity', severityFilter)
      }
      if (priorityFilter !== 'all') {
        query = query.eq('priority', priorityFilter)
      }
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter)
      }
      if (searchQuery) {
        query = query.or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`)
      }

      const { data, error } = await query

      if (error) throw error
      setBugs(data || [])
    } catch (error) {
      console.error('Error loading bugs:', error)
      if (toast) {
        toast.error('Failed to load bugs')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleCreateBug = async (e) => {
    e.preventDefault()
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        if (toast) {
          toast.error('Please log in to create a bug report')
        }
        return
      }

      const bugData = {
        ...formData,
        reporter_id: user.id,
        status: 'new'
      }

      const { error } = await supabase
        .from('bugs')
        .insert([bugData])

      if (error) throw error

      if (toast) {
        toast.success('Bug report created successfully')
      }
      setShowCreateModal(false)
      setFormData({
        title: '',
        description: '',
        steps_to_reproduce: '',
        expected_behavior: '',
        actual_behavior: '',
        severity: 'medium',
        priority: 'p2',
        status: 'new',
        assignee_id: null,
        reporter_id: null,
        page_url: '',
        browser_info: navigator.userAgent,
        screenshot_url: null
      })
      loadBugs()
    } catch (error) {
      console.error('Error creating bug:', error)
      if (toast) {
        toast.error('Failed to create bug report')
      }
    }
  }

  const handleUpdateBug = async (bugId, updates) => {
    try {
      const { error } = await supabase
        .from('bugs')
        .update(updates)
        .eq('id', bugId)

      if (error) throw error

      if (toast) {
        toast.success('Bug updated successfully')
      }
      loadBugs()
    } catch (error) {
      console.error('Error updating bug:', error)
      if (toast) {
        toast.error('Failed to update bug')
      }
    }
  }

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'critical':
        return <XCircle className="h-5 w-5 text-red-600" />
      case 'high':
        return <AlertCircle className="h-5 w-5 text-orange-600" />
      case 'medium':
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />
      case 'low':
        return <Info className="h-5 w-5 text-blue-600" />
      default:
        return <Circle className="h-5 w-5 text-gray-600" />
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'closed':
        return <CheckCircle className="h-5 w-5 text-green-600" />
      case 'fixed':
        return <CheckCircle className="h-5 w-5 text-blue-600" />
      case 'in_progress':
        return <Circle className="h-5 w-5 text-yellow-600" />
      case 'assigned':
        return <Circle className="h-5 w-5 text-blue-600" />
      default:
        return <Circle className="h-5 w-5 text-gray-600" />
    }
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                <Bug className="h-8 w-8 text-red-600" />
                Bug Tracking
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Track and manage bug reports
              </p>
            </div>
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Report Bug
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-wrap gap-4">
          <div className="flex-1 min-w-64">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                type="text"
                placeholder="Search bugs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <Select
            label="Severity"
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="w-40"
          >
            <option value="all">All Severities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </Select>
          <Select
            label="Priority"
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="w-40"
          >
            <option value="all">All Priorities</option>
            <option value="p0">P0 - Critical</option>
            <option value="p1">P1 - High</option>
            <option value="p2">P2 - Medium</option>
            <option value="p3">P3 - Low</option>
          </Select>
          <Select
            label="Status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-40"
          >
            <option value="all">All Statuses</option>
            <option value="new">New</option>
            <option value="assigned">Assigned</option>
            <option value="in_progress">In Progress</option>
            <option value="fixed">Fixed</option>
            <option value="verified">Verified</option>
            <option value="closed">Closed</option>
          </Select>
        </div>

        {/* Bugs List */}
        {loading ? (
          <Loading text="Loading bugs..." />
        ) : bugs.length === 0 ? (
          <EmptyState
            icon={Bug}
            title="No bugs found"
            description={searchQuery ? `No bugs match "${searchQuery}"` : 'No bugs reported yet'}
            action={() => setShowCreateModal(true)}
            actionLabel="Report First Bug"
          />
        ) : (
          <div className="space-y-4">
            {bugs.map((bug) => (
              <div
                key={bug.id}
                className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      {getSeverityIcon(bug.severity)}
                      {getStatusIcon(bug.status)}
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {bug.title}
                      </h3>
                      <span className={`px-2 py-1 text-xs rounded font-medium ${
                        bug.severity === 'critical' ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200' :
                        bug.severity === 'high' ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200' :
                        bug.severity === 'medium' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200' :
                        'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200'
                      }`}>
                        {bug.severity}
                      </span>
                      <span className={`px-2 py-1 text-xs rounded font-medium ${
                        bug.status === 'closed' ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200' :
                        bug.status === 'fixed' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200' :
                        bug.status === 'in_progress' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200' :
                        'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                      }`}>
                        {bug.status.replace('_', ' ')}
                      </span>
                      <span className={`px-2 py-1 text-xs rounded font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200`}>
                        {bug.priority.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                      {bug.description}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                      {bug.reporter && (
                        <span>Reported by: {bug.reporter.full_name || bug.reporter.email}</span>
                      )}
                      {bug.assignee && (
                        <span>Assigned to: {bug.assignee.full_name || bug.assignee.email}</span>
                      )}
                      <span>{formatDate(bug.created_at)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Select
                      value={bug.status}
                      onChange={(e) => handleUpdateBug(bug.id, { status: e.target.value })}
                      className="w-40"
                    >
                      <option value="new">New</option>
                      <option value="assigned">Assigned</option>
                      <option value="in_progress">In Progress</option>
                      <option value="fixed">Fixed</option>
                      <option value="verified">Verified</option>
                      <option value="closed">Closed</option>
                    </Select>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Create Bug Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  Report New Bug
                </h2>
              </div>
              <form onSubmit={handleCreateBug} className="p-6 space-y-4">
                <Input
                  label="Title *"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
                <Textarea
                  label="Description *"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  required
                  rows={4}
                />
                <Textarea
                  label="Steps to Reproduce"
                  value={formData.steps_to_reproduce}
                  onChange={(e) => setFormData({ ...formData, steps_to_reproduce: e.target.value })}
                  rows={3}
                />
                <div className="grid grid-cols-2 gap-4">
                  <Select
                    label="Severity *"
                    value={formData.severity}
                    onChange={(e) => setFormData({ ...formData, severity: e.target.value })}
                    required
                  >
                    <option value="critical">Critical</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </Select>
                  <Select
                    label="Priority *"
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    required
                  >
                    <option value="p0">P0 - Critical (24 hours)</option>
                    <option value="p1">P1 - High (7 days)</option>
                    <option value="p2">P2 - Medium (30 days)</option>
                    <option value="p3">P3 - Low (90 days)</option>
                  </Select>
                </div>
                <Input
                  label="Page URL"
                  type="url"
                  value={formData.page_url}
                  onChange={(e) => setFormData({ ...formData, page_url: e.target.value })}
                />
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowCreateModal(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit">
                    Report Bug
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

