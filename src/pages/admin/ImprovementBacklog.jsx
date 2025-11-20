import { useState, useEffect } from 'react'
import { Target, Plus, Filter, Search, TrendingUp, CheckCircle, Clock, XCircle } from 'lucide-react'
import { supabase } from '../../services/supabaseClient'
import { useToastContext } from '../../context/ToastContext'
import { getImprovementBacklog, createImprovement, updateImprovement, getImprovementStats } from '../../services/improvementBacklogService'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Textarea } from '../../components/ui/Textarea'
import { Select } from '../../components/ui/Select'
import { Loading } from '../../components/ui/Loading'
import { EmptyState } from '../../components/ui/EmptyState'
import { Modal } from '../../components/ui/Modal'

export default function ImprovementBacklog() {
  const [improvements, setImprovements] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selectedImprovement, setSelectedImprovement] = useState(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [statusFilter, setStatusFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [userId, setUserId] = useState(null)
  const toast = useToastContext()

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    improvement_type: 'enhancement',
    impact_score: 50,
    effort_score: 50,
    status: 'backlog',
    assigned_to: '',
    planned_release: '',
    target_completion_date: '',
    estimated_hours: '',
    tags: []
  })

  useEffect(() => {
    loadImprovements()
    loadStats()
    getUser()
  }, [statusFilter, typeFilter])

  useEffect(() => {
    if (searchQuery) {
      loadImprovements({ search: searchQuery })
    } else {
      loadImprovements()
    }
  }, [searchQuery])

  const getUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    setUserId(user?.id || null)
  }

  const loadImprovements = async (filters = {}) => {
    setLoading(true)
    try {
      const allFilters = {
        ...filters,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        improvement_type: typeFilter !== 'all' ? typeFilter : undefined
      }

      const result = await getImprovementBacklog(allFilters)
      if (result.success) {
        setImprovements(result.data)
      }
    } catch (error) {
      console.error('Error loading improvements:', error)
      toast.error('Failed to load improvement backlog')
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      const result = await getImprovementStats()
      if (result.success) {
        setStats(result.data)
      }
    } catch (error) {
      console.error('Error loading stats:', error)
    }
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!userId) {
      toast.error('You must be logged in')
      return
    }

    const result = await createImprovement(userId, formData)
    if (result.success) {
      toast.success('Improvement created successfully')
      setShowCreateModal(false)
      setFormData({
        title: '',
        description: '',
        improvement_type: 'enhancement',
        impact_score: 50,
        effort_score: 50,
        status: 'backlog',
        assigned_to: '',
        planned_release: '',
        target_completion_date: '',
        estimated_hours: '',
        tags: []
      })
      loadImprovements()
      loadStats()
    } else {
      toast.error(result.message || 'Failed to create improvement')
    }
  }

  const handleView = (improvementId) => {
    const improvement = improvements.find(i => i.id === improvementId)
    if (improvement) {
      setSelectedImprovement(improvement)
      setShowDetailModal(true)
    }
  }

  const handleUpdate = async () => {
    if (!selectedImprovement) return

    const result = await updateImprovement(selectedImprovement.id, {
      status: selectedImprovement.status,
      impact_score: selectedImprovement.impact_score,
      effort_score: selectedImprovement.effort_score,
      assigned_to: selectedImprovement.assigned_to,
      planned_release: selectedImprovement.planned_release,
      target_completion_date: selectedImprovement.target_completion_date
    })

    if (result.success) {
      toast.success('Improvement updated successfully')
      setShowDetailModal(false)
      setSelectedImprovement(null)
      loadImprovements()
      loadStats()
    } else {
      toast.error(result.message || 'Failed to update improvement')
    }
  }

  const getStatusColor = (status) => {
    const colors = {
      backlog: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
      planned: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      in_progress: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      testing: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      completed: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      cancelled: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
    }
    return colors[status] || colors.backlog
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Improvement Backlog
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Track and manage system improvements and enhancements
            </p>
          </div>
          <Button
            onClick={() => setShowCreateModal(true)}
            icon={<Plus className="h-4 w-4" />}
          >
            New Improvement
          </Button>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Total Items</h3>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total || 0}</div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">In Progress</h3>
              <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                {stats.by_status?.in_progress || 0}
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Completed</h3>
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {stats.by_status?.completed || 0}
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Avg Priority</h3>
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {stats.avg_priority_score || 0}
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="mb-6 flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <Input
              type="text"
              placeholder="Search improvements..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              icon={<Search className="h-4 w-4" />}
            />
          </div>
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-[150px]"
          >
            <option value="all">All Status</option>
            <option value="backlog">Backlog</option>
            <option value="planned">Planned</option>
            <option value="in_progress">In Progress</option>
            <option value="testing">Testing</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </Select>
          <Select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="w-[150px]"
          >
            <option value="all">All Types</option>
            <option value="bug_fix">Bug Fix</option>
            <option value="performance">Performance</option>
            <option value="ux">UX</option>
            <option value="feature_polish">Feature Polish</option>
            <option value="documentation">Documentation</option>
            <option value="accessibility">Accessibility</option>
            <option value="mobile">Mobile</option>
            <option value="enhancement">Enhancement</option>
          </Select>
        </div>

        {/* Improvements List */}
        {loading ? (
          <Loading />
        ) : improvements.length === 0 ? (
          <EmptyState
            icon={<Target className="h-12 w-12" />}
            title="No improvements found"
            description="Create a new improvement to get started"
          />
        ) : (
          <div className="space-y-4">
            {improvements.map((improvement) => (
              <div
                key={improvement.id}
                className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => handleView(improvement.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {improvement.title}
                      </h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(improvement.status)}`}>
                        {improvement.status.replace('_', ' ')}
                      </span>
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {improvement.improvement_type}
                      </span>
                    </div>
                    <p className="text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                      {improvement.description}
                    </p>
                    <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                      <div className="flex items-center gap-1">
                        <TrendingUp className="h-4 w-4" />
                        <span>Priority: {improvement.priority_score?.toFixed(1) || 'N/A'}</span>
                      </div>
                      <span>•</span>
                      <span>Impact: {improvement.impact_score}/100</span>
                      <span>•</span>
                      <span>Effort: {improvement.effort_score}/100</span>
                      {improvement.assigned_user && (
                        <>
                          <span>•</span>
                          <span>Assigned to: {improvement.assigned_user.full_name}</span>
                        </>
                      )}
                    </div>
                  </div>
                  {improvement.status === 'completed' && (
                    <CheckCircle className="h-6 w-6 text-green-600 flex-shrink-0" />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create Improvement"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <Input
            label="Title"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            required
          />
          <Textarea
            label="Description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={6}
            required
          />
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Type"
              value={formData.improvement_type}
              onChange={(e) => setFormData({ ...formData, improvement_type: e.target.value })}
            >
              <option value="bug_fix">Bug Fix</option>
              <option value="performance">Performance</option>
              <option value="ux">UX</option>
              <option value="feature_polish">Feature Polish</option>
              <option value="documentation">Documentation</option>
              <option value="accessibility">Accessibility</option>
              <option value="mobile">Mobile</option>
              <option value="enhancement">Enhancement</option>
            </Select>
            <Select
              label="Status"
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            >
              <option value="backlog">Backlog</option>
              <option value="planned">Planned</option>
              <option value="in_progress">In Progress</option>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Impact Score (0-100)"
              type="number"
              min="0"
              max="100"
              value={formData.impact_score}
              onChange={(e) => setFormData({ ...formData, impact_score: parseInt(e.target.value) })}
            />
            <Input
              label="Effort Score (0-100)"
              type="number"
              min="0"
              max="100"
              value={formData.effort_score}
              onChange={(e) => setFormData({ ...formData, effort_score: parseInt(e.target.value) })}
            />
          </div>
          <Input
            label="Estimated Hours"
            type="number"
            value={formData.estimated_hours}
            onChange={(e) => setFormData({ ...formData, estimated_hours: e.target.value })}
          />
          <Input
            label="Planned Release"
            value={formData.planned_release}
            onChange={(e) => setFormData({ ...formData, planned_release: e.target.value })}
            placeholder="e.g., v1.2, Q1 2025"
          />
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowCreateModal(false)}
            >
              Cancel
            </Button>
            <Button type="submit">Create</Button>
          </div>
        </form>
      </Modal>

      {/* Detail Modal */}
      <Modal
        isOpen={showDetailModal}
        onClose={() => {
          setShowDetailModal(false)
          setSelectedImprovement(null)
        }}
        title={selectedImprovement?.title || ''}
        size="large"
      >
        {selectedImprovement && (
          <div className="space-y-4">
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-700 dark:text-gray-300">Status:</span>
                  <Select
                    value={selectedImprovement.status}
                    onChange={(e) => setSelectedImprovement({ ...selectedImprovement, status: e.target.value })}
                    className="mt-1"
                  >
                    <option value="backlog">Backlog</option>
                    <option value="planned">Planned</option>
                    <option value="in_progress">In Progress</option>
                    <option value="testing">Testing</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </Select>
                </div>
                <div>
                  <span className="font-medium text-gray-700 dark:text-gray-300">Priority Score:</span>
                  <div className="mt-1 text-lg font-bold text-blue-600 dark:text-blue-400">
                    {selectedImprovement.priority_score?.toFixed(1) || 'N/A'}
                  </div>
                </div>
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Description</h3>
              <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                {selectedImprovement.description}
              </p>
            </div>
            <div className="flex justify-end gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowDetailModal(false)
                  setSelectedImprovement(null)
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleUpdate}>Save Changes</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

