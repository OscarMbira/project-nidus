import { useState, useEffect } from 'react'
import { Ticket, Plus, Filter, Search, AlertCircle, CheckCircle, Clock, XCircle, MessageSquare } from 'lucide-react'
import { supabase } from '../../services/supabaseClient'
import { createSupportTicket, getSupportTickets, addTicketComment, getSupportTicket } from '../../services/supportTicketService'
import { useToastContext } from '../../context/ToastContext'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Textarea } from '../../components/ui/Textarea'
import { Select } from '../../components/ui/Select'
import { Loading } from '../../components/ui/Loading'
import { EmptyState } from '../../components/ui/EmptyState'
import { Modal } from '../../components/ui/Modal'

export default function SupportTickets() {
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedTicket, setSelectedTicket] = useState(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [statusFilter, setStatusFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [userId, setUserId] = useState(null)
  const [newComment, setNewComment] = useState('')
  const toast = useToastContext()

  const [formData, setFormData] = useState({
    subject: '',
    description: '',
    ticket_type: 'general',
    category: '',
    priority: 'medium',
    severity: 'medium'
  })

  useEffect(() => {
    loadTickets()
    getUser()
  }, [statusFilter, priorityFilter])

  useEffect(() => {
    if (searchQuery) {
      loadTickets({ search: searchQuery })
    } else {
      loadTickets()
    }
  }, [searchQuery])

  const getUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    setUserId(user?.id || null)
  }

  const loadTickets = async (filters = {}) => {
    setLoading(true)
    try {
      const allFilters = {
        ...filters,
        user_id: userId,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        priority: priorityFilter !== 'all' ? priorityFilter : undefined
      }

      const result = await getSupportTickets(allFilters)
      if (result.success) {
        setTickets(result.data)
      }
    } catch (error) {
      console.error('Error loading tickets:', error)
      toast.error('Failed to load support tickets')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateTicket = async (e) => {
    e.preventDefault()
    if (!userId) {
      toast.error('You must be logged in to create a ticket')
      return
    }

    const result = await createSupportTicket(userId, formData)
    if (result.success) {
      toast.success('Support ticket created successfully')
      setShowCreateModal(false)
      setFormData({
        subject: '',
        description: '',
        ticket_type: 'general',
        category: '',
        priority: 'medium',
        severity: 'medium'
      })
      loadTickets()
    } else {
      toast.error(result.message || 'Failed to create support ticket')
    }
  }

  const handleViewTicket = async (ticketId) => {
    const result = await getSupportTicket(ticketId)
    if (result.success) {
      setSelectedTicket(result.data)
      setShowDetailModal(true)
    }
  }

  const handleAddComment = async () => {
    if (!newComment.trim() || !selectedTicket) return

    const result = await addTicketComment(selectedTicket.id, userId, newComment)
    if (result.success) {
      toast.success('Comment added successfully')
      setNewComment('')
      // Reload ticket
      const ticketResult = await getSupportTicket(selectedTicket.id)
      if (ticketResult.success) {
        setSelectedTicket(ticketResult.data)
      }
      loadTickets()
    } else {
      toast.error(result.message || 'Failed to add comment')
    }
  }

  const getStatusColor = (status) => {
    const colors = {
      new: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
      open: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      assigned: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      in_progress: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      waiting_customer: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
      resolved: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      closed: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
    }
    return colors[status] || colors.new
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
      case 'resolved':
      case 'closed':
        return <CheckCircle className="h-4 w-4" />
      case 'waiting_customer':
        return <Clock className="h-4 w-4" />
      case 'new':
        return <AlertCircle className="h-4 w-4" />
      default:
        return <Clock className="h-4 w-4" />
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Support Tickets
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Create and track your support requests
            </p>
          </div>
          <Button
            onClick={() => setShowCreateModal(true)}
            icon={<Plus className="h-4 w-4" />}
          >
            New Ticket
          </Button>
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <Input
              type="text"
              placeholder="Search tickets..."
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
            <option value="new">New</option>
            <option value="open">Open</option>
            <option value="assigned">Assigned</option>
            <option value="in_progress">In Progress</option>
            <option value="waiting_customer">Waiting</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
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
        </div>

        {/* Tickets List */}
        {loading ? (
          <Loading />
        ) : tickets.length === 0 ? (
          <EmptyState
            icon={<Ticket className="h-12 w-12" />}
            title="No support tickets"
            description="Create a new ticket to get help"
          />
        ) : (
          <div className="space-y-4">
            {tickets.map((ticket, index) => (
              <div
                key={ticket.id}
                className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => handleViewTicket(ticket.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="font-mono text-sm text-gray-500 dark:text-gray-400">
                        {ticket.ticket_number}
                      </span>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {ticket.subject}
                      </h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(ticket.status)}`}>
                        {ticket.status.replace('_', ' ')}
                      </span>
                      <span className={`text-sm font-medium ${getPriorityColor(ticket.priority)}`}>
                        {ticket.priority}
                      </span>
                    </div>
                    <p className="text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                      {ticket.description}
                    </p>
                    <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                      <span>{ticket.ticket_type}</span>
                      <span>•</span>
                      <span>{new Date(ticket.created_at).toLocaleDateString()}</span>
                      {ticket.assigned_user && (
                        <>
                          <span>•</span>
                          <span>Assigned to {ticket.assigned_user.full_name}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(ticket.status)}
                    <MessageSquare className="h-4 w-4 text-gray-400" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Ticket Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create Support Ticket"
      >
        <form onSubmit={handleCreateTicket} className="space-y-4">
          <Input
            label="Subject"
            value={formData.subject}
            onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
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
              value={formData.ticket_type}
              onChange={(e) => setFormData({ ...formData, ticket_type: e.target.value })}
            >
              <option value="general">General</option>
              <option value="technical">Technical</option>
              <option value="billing">Billing</option>
              <option value="feature">Feature Request</option>
              <option value="bug">Bug Report</option>
              <option value="account">Account</option>
            </Select>
            <Select
              label="Priority"
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </Select>
          </div>
          <Input
            label="Category (optional)"
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            placeholder="e.g., Dashboard, Reports, etc."
          />
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowCreateModal(false)}
            >
              Cancel
            </Button>
            <Button type="submit">Create Ticket</Button>
          </div>
        </form>
      </Modal>

      {/* Ticket Detail Modal */}
      <Modal
        isOpen={showDetailModal}
        onClose={() => {
          setShowDetailModal(false)
          setSelectedTicket(null)
          setNewComment('')
        }}
        title={selectedTicket ? `${selectedTicket.ticket_number} - ${selectedTicket.subject}` : ''}
        size="large"
      >
        {selectedTicket && (
          <div className="space-y-6">
            {/* Ticket Info */}
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 space-y-2">
              <div className="flex items-center gap-4 text-sm">
                <span className="font-medium text-gray-700 dark:text-gray-300">Status:</span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedTicket.status)}`}>
                  {selectedTicket.status.replace('_', ' ')}
                </span>
                <span className="font-medium text-gray-700 dark:text-gray-300">Priority:</span>
                <span className={`font-medium ${getPriorityColor(selectedTicket.priority)}`}>
                  {selectedTicket.priority}
                </span>
                <span className="font-medium text-gray-700 dark:text-gray-300">Type:</span>
                <span>{selectedTicket.ticket_type}</span>
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Created: {new Date(selectedTicket.created_at).toLocaleString()}
                {selectedTicket.assigned_user && (
                  <> • Assigned to: {selectedTicket.assigned_user.full_name}</>
                )}
              </div>
            </div>

            {/* Description */}
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Description</h3>
              <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                {selectedTicket.description}
              </p>
            </div>

            {/* Resolution */}
            {selectedTicket.resolution && (
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Resolution</h3>
                <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                  {selectedTicket.resolution}
                </p>
              </div>
            )}

            {/* Comments */}
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Comments</h3>
              <div className="space-y-4 max-h-[300px] overflow-y-auto">
                {selectedTicket.comments && selectedTicket.comments.length > 0 ? (
                  selectedTicket.comments.map((comment, index) => (
                    <div
                      key={comment.id}
                      className={`p-4 rounded-lg ${
                        comment.is_internal
                          ? 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800'
                          : 'bg-gray-50 dark:bg-gray-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-gray-900 dark:text-white">
                          {comment.user?.full_name || 'Unknown User'}
                        </span>
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          {new Date(comment.created_at).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                        {comment.comment_text}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 dark:text-gray-400 text-center py-4">No comments yet</p>
                )}
              </div>
            </div>

            {/* Add Comment */}
            <div>
              <Textarea
                label="Add Comment"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                rows={3}
                placeholder="Type your comment here..."
              />
              <div className="mt-2 flex justify-end">
                <Button onClick={handleAddComment} disabled={!newComment.trim()}>
                  Add Comment
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
