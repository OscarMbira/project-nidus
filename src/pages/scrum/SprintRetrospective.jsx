import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'

import { usePlatformProjectId } from '../../hooks/usePlatformProjectId.js'
import { supabase } from '../../services/supabaseClient'
import { format } from 'date-fns'
import { Plus, ThumbsUp, MessageSquare, CheckCircle, X, Save, AlertCircle } from 'lucide-react'
import RetroBoard from '../../components/scrum/RetroBoard'
import ActionItemTracker from '../../components/scrum/ActionItemTracker'

export default function SprintRetrospective() {
  const { sprintId } = useParams()
  const { projectId, routeKey } = usePlatformProjectId()
  const navigate = useNavigate()
  const [sprint, setSprint] = useState(null)
  const [project, setProject] = useState(null)
  const [retroItems, setRetroItems] = useState([])
  const [actionItems, setActionItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddItem, setShowAddItem] = useState(false)
  const [newItem, setNewItem] = useState({
    item_text: '',
    item_category: 'went_well',
    item_type: 'general',
  })
  const [currentUserId, setCurrentUserId] = useState(null)

  useEffect(() => {
    fetchData()
    getCurrentUser()
  }, [projectId, sprintId])

  const getCurrentUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      setCurrentUserId(user?.id || null)
    } catch (error) {
      console.error('Error getting current user:', error)
    }
  }

  const fetchData = async () => {
    try {
      setLoading(true)

      // Fetch project
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('id, project_name, project_code')
        .eq('id', projectId)
        .eq('is_deleted', false)
        .single()

      if (projectError) throw projectError
      setProject(projectData)

      // Fetch sprint
      const { data: sprintData, error: sprintError } = await supabase
        .from('sprints')
        .select('*')
        .eq('id', sprintId)
        .eq('project_id', projectId)
        .eq('is_deleted', false)
        .single()

      if (sprintError) throw sprintError
      setSprint(sprintData)

      // Fetch retrospective items
      const { data: itemsData, error: itemsError } = await supabase
        .from('retrospective_items')
        .select(`
          *,
          user:user_id (id, email, full_name)
        `)
        .eq('sprint_id', sprintId)
        .eq('is_deleted', false)
        .order('vote_count', { ascending: false })
        .order('created_at', { ascending: true })

      if (itemsError) throw itemsError
      setRetroItems(itemsData || [])

      // Fetch action items
      const { data: actionData, error: actionError } = await supabase
        .from('retrospective_action_items')
        .select(`
          *,
          assigned_to:assigned_to_user_id (id, email, full_name),
          created_by_user:created_by_user_id (id, email, full_name)
        `)
        .eq('sprint_id', sprintId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })

      if (actionError) throw actionError
      setActionItems(actionData || [])

    } catch (error) {
      console.error('Error fetching data:', error)
      alert('Error: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleAddItem = async () => {
    if (!newItem.item_text.trim()) {
      alert('Please enter item text')
      return
    }

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      const { error } = await supabase
        .from('retrospective_items')
        .insert({
          ...newItem,
          sprint_id: sprintId,
          project_id: projectId,
          user_id: user.id,
          created_by: user.id,
          updated_by: user.id,
        })

      if (error) throw error

      setNewItem({
        item_text: '',
        item_category: 'went_well',
        item_type: 'general',
      })
      setShowAddItem(false)
      fetchData()
    } catch (error) {
      console.error('Error adding item:', error)
      alert('Error adding item: ' + error.message)
    }
  }

  const handleVote = async (itemId) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      const item = retroItems.find(i => i.id === itemId)
      if (!item) return

      const { error } = await supabase
        .from('retrospective_items')
        .update({
          vote_count: (item.vote_count || 0) + 1,
          updated_by: user.id,
        })
        .eq('id', itemId)

      if (error) throw error
      fetchData()
    } catch (error) {
      console.error('Error voting:', error)
      alert('Error voting: ' + error.message)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading Sprint Retrospective...</p>
        </div>
      </div>
    )
  }

  if (!sprint) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400 mb-4">Sprint not found</p>
          <button
            onClick={() => navigate(`/projects/${projectId}`)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
          >
            Go to Project
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <button
        onClick={() => navigate(`/projects/${projectId}/scrum/sprint/${sprintId}/board`)}
        className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4"
      >
        ← Back to Sprint Board
      </button>

      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Sprint Retrospective
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          {sprint.sprint_name} - {project?.project_name}
        </p>
      </div>

      {/* Retro Board */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Retrospective Board
          </h2>
          <button
            onClick={() => setShowAddItem(!showAddItem)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Item
          </button>
        </div>

        {showAddItem && (
          <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Item Text
              </label>
              <textarea
                value={newItem.item_text}
                onChange={(e) => setNewItem({ ...newItem, item_text: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                placeholder="Enter your retrospective item..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Category
                </label>
                <select
                  value={newItem.item_category}
                  onChange={(e) => setNewItem({ ...newItem, item_category: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                >
                  <option value="went_well">What Went Well</option>
                  <option value="didnt_go_well">What Didn't Go Well</option>
                  <option value="improvements">Improvements</option>
                  <option value="actions">Actions</option>
                  <option value="appreciations">Appreciations</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Type
                </label>
                <select
                  value={newItem.item_type}
                  onChange={(e) => setNewItem({ ...newItem, item_type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                >
                  <option value="general">General</option>
                  <option value="process">Process</option>
                  <option value="technical">Technical</option>
                  <option value="team">Team</option>
                  <option value="communication">Communication</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleAddItem}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2"
              >
                <Save className="h-4 w-4" />
                Add Item
              </button>
              <button
                onClick={() => {
                  setShowAddItem(false)
                  setNewItem({
                    item_text: '',
                    item_category: 'went_well',
                    item_type: 'general',
                  })
                }}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <RetroBoard items={retroItems} onVote={handleVote} currentUserId={currentUserId} />
      </div>

      {/* Action Items */}
      <div>
        <ActionItemTracker
          actionItems={actionItems}
          sprintId={sprintId}
          projectId={projectId}
          onUpdate={fetchData}
          currentUserId={currentUserId}
        />
      </div>
    </div>
  )
}

