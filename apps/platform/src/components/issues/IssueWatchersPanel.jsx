import { useState, useEffect } from 'react'
import { Eye, Plus, X, User } from 'lucide-react'
import { supabase } from '../../services/supabaseClient'

export default function IssueWatchersPanel({ issue, projectId }) {
  const [watchers, setWatchers] = useState([])
  const [availableUsers, setAvailableUsers] = useState([])
  const [showAddWatcher, setShowAddWatcher] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchWatchers()
    fetchAvailableUsers()
  }, [issue, projectId])

  const fetchWatchers = async () => {
    try {
      const { data, error } = await supabase
        .from('issue_watchers')
        .select(`
          *,
          user:users!issue_watchers_user_id_fkey(
            id,
            full_name,
            email
          )
        `)
        .eq('issue_id', issue.id)
        .eq('is_deleted', false)

      if (error) throw error
      setWatchers(data || [])
    } catch (error) {
      console.error('Error fetching watchers:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchAvailableUsers = async () => {
    try {
      // Get users from the project
      const { data: projectMembers, error } = await supabase
        .from('user_projects')
        .select(`
          user:users!user_projects_user_id_fkey(
            id,
            full_name,
            email
          )
        `)
        .eq('project_id', projectId)
        .eq('is_deleted', false)

      if (error) throw error

      const users = projectMembers
        ?.map(pm => pm.user)
        .filter(u => u && !watchers.find(w => w.user_id === u.id)) || []

      setAvailableUsers(users)
    } catch (error) {
      console.error('Error fetching available users:', error)
    }
  }

  const handleAddWatcher = async () => {
    if (!selectedUserId) return

    try {
      const { error } = await supabase
        .from('issue_watchers')
        .insert({
          issue_id: issue.id,
          user_id: selectedUserId,
          created_by: (await supabase.auth.getUser()).data.user?.id
        })

      if (error) throw error
      setShowAddWatcher(false)
      setSelectedUserId('')
      fetchWatchers()
      fetchAvailableUsers()
    } catch (error) {
      console.error('Error adding watcher:', error)
      alert('Error adding watcher: ' + error.message)
    }
  }

  const handleRemoveWatcher = async (watcherId) => {
    if (!confirm('Remove this watcher?')) return

    try {
      const { error } = await supabase
        .from('issue_watchers')
        .update({ is_deleted: true })
        .eq('id', watcherId)

      if (error) throw error
      fetchWatchers()
      fetchAvailableUsers()
    } catch (error) {
      console.error('Error removing watcher:', error)
      alert('Error removing watcher: ' + error.message)
    }
  }

  if (loading) {
    return (
      <div className="text-center py-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Eye className="h-5 w-5" />
          Watchers ({watchers.length})
        </h3>
        {availableUsers.length > 0 && (
          <button
            onClick={() => setShowAddWatcher(!showAddWatcher)}
            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 text-sm"
          >
            <Plus className="h-4 w-4" />
            Add Watcher
          </button>
        )}
      </div>

      {showAddWatcher && (
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                User
              </label>
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              >
                <option value="">Select a user...</option>
                {availableUsers.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.full_name || user.email}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowAddWatcher(false)
                  setSelectedUserId('')
                }}
                className="px-3 py-1 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={handleAddWatcher}
                disabled={!selectedUserId}
                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50"
              >
                Add Watcher
              </button>
            </div>
          </div>
        </div>
      )}

      {watchers.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <Eye className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p>No watchers</p>
        </div>
      ) : (
        <div className="space-y-2">
          {watchers.map((watcher) => (
            <div
              key={watcher.id}
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 flex items-center justify-between hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <User className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {watcher.user?.full_name || watcher.user?.email || 'Unknown User'}
                  </p>
                  {watcher.user?.email && watcher.user?.full_name && (
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {watcher.user.email}
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={() => handleRemoveWatcher(watcher.id)}
                className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                title="Remove Watcher"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
