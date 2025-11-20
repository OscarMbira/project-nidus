import { useState, useEffect } from 'react'
import { Lightbulb, Filter, Search, TrendingUp, CheckCircle, Clock, XCircle, Edit, Eye } from 'lucide-react'
import { supabase } from '../../services/supabaseClient'
import { useToastContext } from '../../context/ToastContext'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Textarea } from '../../components/ui/Textarea'
import { Select } from '../../components/ui/Select'
import { Loading } from '../../components/ui/Loading'
import { EmptyState } from '../../components/ui/EmptyState'
import { Modal } from '../../components/ui/Modal'

export default function FeatureRequestsManagement() {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedRequest, setSelectedRequest] = useState(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [statusFilter, setStatusFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('votes')
  const toast = useToastContext()

  const [editData, setEditData] = useState({
    status: '',
    priority: '',
    estimated_effort: '',
    business_value: '',
    technical_feasibility: '',
    roadmap_status: '',
    notes: ''
  })

  useEffect(() => {
    loadFeatureRequests()
  }, [statusFilter, priorityFilter, sortBy])

  useEffect(() => {
    if (searchQuery) {
      searchRequests()
    } else {
      loadFeatureRequests()
    }
  }, [searchQuery])

  const loadFeatureRequests = async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('feature_requests')
        .select(`
          *,
          user:user_id (id, full_name, email),
          votes:feature_request_votes (user_id, vote_type)
        `)
        .eq('is_deleted', false)

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter)
      }

      if (priorityFilter !== 'all') {
        query = query.eq('priority', priorityFilter)
      }

      // Apply sorting
      if (sortBy === 'votes') {
        query = query.order('vote_count', { ascending: false })
      } else if (sortBy === 'date') {
        query = query.order('created_at', { ascending: false })
      } else {
        query = query.order('status', { ascending: true }).order('vote_count', { ascending: false })
      }

      const { data, error } = await query

      if (error) throw error

      // Calculate vote counts
      const requestsWithVotes = (data || []).map(request => ({
        ...request,
        upvotes: request.votes?.filter(v => v.vote_type === 'upvote').length || 0,
        downvotes: request.votes?.filter(v => v.vote_type === 'downvote').length || 0,
        netVotes: (request.vote_count || 0)
      }))

      setRequests(requestsWithVotes)
    } catch (error) {
      console.error('Error loading feature requests:', error)
      toast.error('Failed to load feature requests')
    } finally {
      setLoading(false)
    }
  }

  const searchRequests = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('feature_requests')
        .select(`
          *,
          user:user_id (id, full_name, email),
          votes:feature_request_votes (user_id, vote_type)
        `)
        .eq('is_deleted', false)
        .or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`)
        .order('created_at', { ascending: false })

      if (error) throw error

      const requestsWithVotes = (data || []).map(request => ({
        ...request,
        upvotes: request.votes?.filter(v => v.vote_type === 'upvote').length || 0,
        downvotes: request.votes?.filter(v => v.vote_type === 'downvote').length || 0,
        netVotes: (request.vote_count || 0)
      }))

      setRequests(requestsWithVotes)
    } catch (error) {
      console.error('Error searching feature requests:', error)
      toast.error('Failed to search feature requests')
    } finally {
      setLoading(false)
    }
  }

  const handleViewRequest = async (requestId) => {
    const { data, error } = await supabase
      .from('feature_requests')
      .select(`
        *,
        user:user_id (id, full_name, email),
        votes:feature_request_votes (user_id, vote_type)
      `)
      .eq('id', requestId)
      .single()

    if (error) {
      toast.error('Failed to load feature request')
      return
    }

    const requestWithVotes = {
      ...data,
      upvotes: data.votes?.filter(v => v.vote_type === 'upvote').length || 0,
      downvotes: data.votes?.filter(v => v.vote_type === 'downvote').length || 0,
      netVotes: (data.vote_count || 0)
    }

    setSelectedRequest(requestWithVotes)
    setEditData({
      status: requestWithVotes.status || '',
      priority: requestWithVotes.priority || '',
      estimated_effort: requestWithVotes.estimated_effort || '',
      business_value: requestWithVotes.business_value || '',
      technical_feasibility: requestWithVotes.technical_feasibility || '',
      roadmap_status: requestWithVotes.roadmap_status || '',
      notes: requestWithVotes.notes || ''
    })
    setShowDetailModal(true)
  }

  const handleUpdateRequest = async () => {
    if (!selectedRequest) return

    try {
      const updates = {
        status: editData.status,
        priority: editData.priority,
        estimated_effort: editData.estimated_effort || null,
        business_value: editData.business_value || null,
        technical_feasibility: editData.technical_feasibility || null,
        roadmap_status: editData.roadmap_status || null,
        notes: editData.notes || null,
        updated_at: new Date().toISOString()
      }

      const { error } = await supabase
        .from('feature_requests')
        .update(updates)
        .eq('id', selectedRequest.id)

      if (error) throw error

      toast.success('Feature request updated successfully')
      setShowDetailModal(false)
      setSelectedRequest(null)
      loadFeatureRequests()
    } catch (error) {
      console.error('Error updating feature request:', error)
      toast.error('Failed to update feature request')
    }
  }

  const getStatusColor = (status) => {
    const colors = {
      under_review: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
      approved: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      in_progress: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      completed: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      declined: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
    }
    return colors[status] || colors.under_review
  }

  const getPriorityColor = (priority) => {
    const colors = {
      low: 'text-gray-600',
      medium: 'text-blue-600',
      high: 'text-orange-600',
      critical: 'text-red-600'
    }
    return colors[priority] || colors.medium
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4" />
      case 'in_progress':
        return <Clock className="h-4 w-4" />
      case 'declined':
        return <XCircle className="h-4 w-4" />
      default:
        return <Eye className="h-4 w-4" />
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Feature Requests Management
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Review and manage feature requests from users
          </p>
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <Input
              type="text"
              placeholder="Search feature requests..."
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
            <option value="under_review">Under Review</option>
            <option value="approved">Approved</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="declined">Declined</option>
          </Select>
          <Select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="w-[150px]"
          >
            <option value="all">All Priority</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </Select>
          <Select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="w-[150px]"
          >
            <option value="votes">Most Votes</option>
            <option value="date">Newest</option>
            <option value="status">By Status</option>
          </Select>
        </div>

        {/* Requests List */}
        {loading ? (
          <Loading />
        ) : requests.length === 0 ? (
          <EmptyState
            icon={<Lightbulb className="h-12 w-12" />}
            title="No feature requests found"
            description="No feature requests match your filters"
          />
        ) : (
          <div className="space-y-4">
            {requests.map((request) => (
              <div
                key={request.id}
                className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {request.title}
                      </h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
                        {request.status.replace('_', ' ')}
                      </span>
                      <span className={`text-sm font-medium ${getPriorityColor(request.priority)}`}>
                        {request.priority}
                      </span>
                    </div>
                    <p className="text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                      {request.description}
                    </p>
                    <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                      <div className="flex items-center gap-1">
                        <TrendingUp className="h-4 w-4" />
                        <span>{request.netVotes} votes</span>
                      </div>
                      {request.user && (
                        <>
                          <span>•</span>
                          <span>By: {request.user.full_name || request.user.email}</span>
                        </>
                      )}
                      <span>•</span>
                      <span>{new Date(request.created_at).toLocaleDateString()}</span>
                      {request.category && (
                        <>
                          <span>•</span>
                          <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded">
                            {request.category}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(request.status)}
                    <Button
                      variant="secondary"
                      onClick={() => handleViewRequest(request.id)}
                      icon={<Eye className="h-4 w-4" />}
                    >
                      View
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Detail Modal */}
      <Modal
        isOpen={showDetailModal}
        onClose={() => {
          setShowDetailModal(false)
          setSelectedRequest(null)
        }}
        title={selectedRequest ? selectedRequest.title : ''}
        size="large"
      >
        {selectedRequest && (
          <div className="space-y-6">
            {/* Request Info */}
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 space-y-2">
              <div className="flex items-center gap-4 text-sm">
                <span className="font-medium text-gray-700 dark:text-gray-300">Status:</span>
                <Select
                  value={editData.status}
                  onChange={(e) => setEditData({ ...editData, status: e.target.value })}
                  className="w-[200px]"
                >
                  <option value="under_review">Under Review</option>
                  <option value="approved">Approved</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="declined">Declined</option>
                </Select>
                <span className="font-medium text-gray-700 dark:text-gray-300">Priority:</span>
                <Select
                  value={editData.priority}
                  onChange={(e) => setEditData({ ...editData, priority: e.target.value })}
                  className="w-[150px]"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </Select>
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Created: {new Date(selectedRequest.created_at).toLocaleString()}
                {selectedRequest.user && (
                  <> • By: {selectedRequest.user.full_name || selectedRequest.user.email}</>
                )}
                <span> • Votes: {selectedRequest.netVotes}</span>
              </div>
            </div>

            {/* Description */}
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Description</h3>
              <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                {selectedRequest.description}
              </p>
            </div>

            {/* Admin Fields */}
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Estimated Effort (hours)"
                type="number"
                value={editData.estimated_effort}
                onChange={(e) => setEditData({ ...editData, estimated_effort: e.target.value })}
                placeholder="e.g., 40"
              />
              <Select
                label="Business Value"
                value={editData.business_value}
                onChange={(e) => setEditData({ ...editData, business_value: e.target.value })}
              >
                <option value="">Not assessed</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </Select>
              <Select
                label="Technical Feasibility"
                value={editData.technical_feasibility}
                onChange={(e) => setEditData({ ...editData, technical_feasibility: e.target.value })}
              >
                <option value="">Not assessed</option>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
                <option value="very_hard">Very Hard</option>
              </Select>
              <Select
                label="Roadmap Status"
                value={editData.roadmap_status}
                onChange={(e) => setEditData({ ...editData, roadmap_status: e.target.value })}
              >
                <option value="">Not planned</option>
                <option value="planned">Planned</option>
                <option value="next_release">Next Release</option>
                <option value="future">Future Consideration</option>
                <option value="declined">Declined</option>
              </Select>
            </div>

            <Textarea
              label="Admin Notes"
              value={editData.notes}
              onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
              rows={4}
              placeholder="Internal notes about this feature request..."
            />

            <div className="flex justify-end gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowDetailModal(false)
                  setSelectedRequest(null)
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleUpdateRequest}>
                Save Changes
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

