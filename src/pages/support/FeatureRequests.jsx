import { useState, useEffect } from 'react'
import { Lightbulb, Plus, ThumbsUp, Filter, Search, TrendingUp, CheckCircle, Clock, XCircle } from 'lucide-react'
import { supabase } from '../../services/supabaseClient'
import { useToastContext } from '../../context/ToastContext'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Textarea } from '../../components/ui/Textarea'
import { Select } from '../../components/ui/Select'
import { Loading } from '../../components/ui/Loading'
import { EmptyState } from '../../components/ui/EmptyState'

export default function FeatureRequests() {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sortBy, setSortBy] = useState('votes') // votes, date, status
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [userVotes, setUserVotes] = useState(new Set())
  const toast = useToastContext()
  const [userId, setUserId] = useState(null)

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'feature',
    priority: 'medium'
  })

  useEffect(() => {
    loadFeatureRequests()
    
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUserId(user?.id || null)
      if (user) {
        loadUserVotes(user.id)
      }
    }
    getUser()
  }, [statusFilter, sortBy])

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

      // Calculate vote counts and user votes
      const processedData = (data || []).map(request => {
        const votes = request.votes || []
        const upvotes = votes.filter(v => v.vote_type === 'upvote').length
        const downvotes = votes.filter(v => v.vote_type === 'downvote').length
        const userVoted = votes.some(v => v.user_id === userId)
        const userVoteType = userVoted ? votes.find(v => v.user_id === userId)?.vote_type : null

        return {
          ...request,
          vote_count: (request.vote_count || 0) + upvotes - downvotes,
          upvote_count: upvotes,
          downvote_count: downvotes,
          user_voted: userVoted,
          user_vote_type: userVoteType
        }
      })

      setRequests(processedData)
    } catch (error) {
      console.error('Error loading feature requests:', error)
      if (toast) {
        toast.error('Failed to load feature requests')
      }
    } finally {
      setLoading(false)
    }
  }

  const loadUserVotes = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('feature_request_votes')
        .select('feature_request_id, vote_type')
        .eq('user_id', userId)

      if (error) throw error

      setUserVotes(new Set(data?.map(v => `${v.feature_request_id}-${v.vote_type}`) || []))
    } catch (error) {
      console.error('Error loading user votes:', error)
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

      if (error) throw error

      const processedData = (data || []).map(request => {
        const votes = request.votes || []
        const upvotes = votes.filter(v => v.vote_type === 'upvote').length
        const downvotes = votes.filter(v => v.vote_type === 'downvote').length

        return {
          ...request,
          vote_count: (request.vote_count || 0) + upvotes - downvotes,
          upvote_count: upvotes,
          downvote_count: downvotes
        }
      })

      setRequests(processedData)
    } catch (error) {
      console.error('Error searching feature requests:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateRequest = async (e) => {
    e.preventDefault()
    try {
      if (!userId) {
        if (toast) {
          toast.error('Please log in to create a feature request')
        }
        return
      }

      const { error } = await supabase
        .from('feature_requests')
        .insert([{
          ...formData,
          user_id: userId,
          status: 'under_review',
          vote_count: 0
        }])

      if (error) throw error

      if (toast) {
        toast.success('Feature request submitted successfully')
      }
      setShowCreateModal(false)
      setFormData({
        title: '',
        description: '',
        category: 'feature',
        priority: 'medium'
      })
      loadFeatureRequests()
    } catch (error) {
      console.error('Error creating feature request:', error)
      if (toast) {
        toast.error('Failed to submit feature request')
      }
    }
  }

  const handleVote = async (requestId, voteType) => {
    if (!userId) {
      if (toast) {
        toast.info('Please log in to vote')
      }
      return
    }

    try {
      // Check if user already voted
      const { data: existingVote } = await supabase
        .from('feature_request_votes')
        .select('id, vote_type')
        .eq('feature_request_id', requestId)
        .eq('user_id', userId)
        .single()

      if (existingVote) {
        if (existingVote.vote_type === voteType) {
          // Remove vote if clicking same vote type
          await supabase
            .from('feature_request_votes')
            .delete()
            .eq('id', existingVote.id)
          
          await supabase.rpc('update_feature_request_vote_count', { request_id: requestId })
        } else {
          // Update vote type
          await supabase
            .from('feature_request_votes')
            .update({ vote_type: voteType })
            .eq('id', existingVote.id)
          
          await supabase.rpc('update_feature_request_vote_count', { request_id: requestId })
        }
      } else {
        // Create new vote
        await supabase
          .from('feature_request_votes')
          .insert([{
            feature_request_id: requestId,
            user_id: userId,
            vote_type: voteType
          }])
        
        await supabase.rpc('update_feature_request_vote_count', { request_id: requestId })
      }

      loadFeatureRequests()
      loadUserVotes(userId)
    } catch (error) {
      console.error('Error voting:', error)
      if (toast) {
        toast.error('Failed to submit vote')
      }
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="h-5 w-5 text-green-600" />
      case 'in_progress':
        return <Clock className="h-5 w-5 text-blue-600" />
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-600" />
      case 'declined':
        return <XCircle className="h-5 w-5 text-red-600" />
      default:
        return <Clock className="h-5 w-5 text-gray-600" />
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
                <Lightbulb className="h-8 w-8 text-yellow-600" />
                Feature Requests
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Request new features and vote on ideas
              </p>
            </div>
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Submit Request
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
                placeholder="Search feature requests..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <Select
            label="Status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-40"
          >
            <option value="all">All Statuses</option>
            <option value="under_review">Under Review</option>
            <option value="approved">Approved</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="declined">Declined</option>
          </Select>
          <Select
            label="Sort By"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="w-40"
          >
            <option value="votes">Most Voted</option>
            <option value="date">Newest First</option>
            <option value="status">By Status</option>
          </Select>
        </div>

        {/* Requests List */}
        {loading ? (
          <Loading text="Loading feature requests..." />
        ) : requests.length === 0 ? (
          <EmptyState
            icon={Lightbulb}
            title="No feature requests found"
            description={searchQuery ? `No requests match "${searchQuery}"` : 'Be the first to submit a feature request!'}
            action={() => setShowCreateModal(true)}
            actionLabel="Submit First Request"
          />
        ) : (
          <div className="space-y-4">
            {requests.map((request, index) => (
              <div
                key={request.id}
                className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start gap-4">
                  {/* Votes */}
                  <div className="flex flex-col items-center gap-2">
                    <button
                      onClick={() => handleVote(request.id, 'upvote')}
                      className={`p-2 rounded-lg transition-colors ${
                        request.user_vote_type === 'upvote'
                          ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                      aria-label="Upvote"
                    >
                      <ThumbsUp className="h-5 w-5" />
                    </button>
                    <span className="text-lg font-semibold text-gray-900 dark:text-white">
                      {request.vote_count || 0}
                    </span>
                    <button
                      onClick={() => handleVote(request.id, 'downvote')}
                      className={`p-2 rounded-lg transition-colors ${
                        request.user_vote_type === 'downvote'
                          ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                      aria-label="Downvote"
                    >
                      <ThumbsUp className="h-5 w-5 rotate-180" />
                    </button>
                  </div>

                  {/* Content */}
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          {getStatusIcon(request.status)}
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            {request.title}
                          </h3>
                          <span className={`px-2 py-1 text-xs rounded font-medium ${
                            request.status === 'completed' ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200' :
                            request.status === 'approved' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200' :
                            request.status === 'in_progress' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200' :
                            request.status === 'declined' ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200' :
                            'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                          }`}>
                            {request.status.replace('_', ' ')}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                          {request.description}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                          {request.user && (
                            <span>By: {request.user.full_name || request.user.email}</span>
                          )}
                          <span>{formatDate(request.created_at)}</span>
                          {request.category && (
                            <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded">
                              {request.category}
                            </span>
                          )}
                        </div>
                      </div>
                      {request.status === 'completed' && (
                        <TrendingUp className="h-6 w-6 text-green-600 flex-shrink-0" />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Create Request Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  Submit Feature Request
                </h2>
              </div>
              <form onSubmit={handleCreateRequest} className="p-6 space-y-4">
                <Input
                  label="Title *"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                  placeholder="Brief description of the feature"
                />
                <Textarea
                  label="Description *"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  required
                  rows={6}
                  placeholder="Describe the feature in detail, including use cases and benefits"
                />
                <div className="grid grid-cols-2 gap-4">
                  <Select
                    label="Category"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  >
                    <option value="feature">New Feature</option>
                    <option value="enhancement">Enhancement</option>
                    <option value="integration">Integration</option>
                    <option value="ui">UI/UX</option>
                    <option value="performance">Performance</option>
                    <option value="other">Other</option>
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
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowCreateModal(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit">
                    Submit Request
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

