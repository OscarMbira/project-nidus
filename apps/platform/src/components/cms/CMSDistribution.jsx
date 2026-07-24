/**
 * CMS Distribution Component
 * Manage distribution list
 */

import { useState, useEffect } from 'react'
import { Mail, Plus, X, User } from 'lucide-react'
import { platformDb } from '../../services/supabaseClient'

export default function CMSDistribution({ cmsId, distributionData = [], onChange, readOnly = false }) {
  const [users, setUsers] = useState([])
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [showUserPicker, setShowUserPicker] = useState(false)
  const [selectedUserIds, setSelectedUserIds] = useState(distributionData.map(d => d.user_id || d.id))

  useEffect(() => {
    loadUsers()
  }, [])

  useEffect(() => {
    setSelectedUserIds(distributionData.map(d => d.user_id || d.id))
  }, [distributionData])

  const loadUsers = async () => {
    try {
      setLoadingUsers(true)
      const { data, error } = await platformDb
        .from('users')
        .select('id, full_name, email')
        .eq('is_deleted', false)
        .order('full_name', { ascending: true })
        .limit(100)

      if (error) throw error
      setUsers(data || [])
    } catch (error) {
      console.error('Error loading users:', error)
    } finally {
      setLoadingUsers(false)
    }
  }

  const handleAddUser = (userId) => {
    if (selectedUserIds.includes(userId)) return
    
    const newUserIds = [...selectedUserIds, userId]
    setSelectedUserIds(newUserIds)
    
    if (onChange) {
      const user = users.find(u => u.id === userId)
      const newDistribution = [
        ...distributionData,
        { user_id: userId, user: user, distribution_method: 'email' }
      ]
      onChange(newDistribution)
    }
    
    setShowUserPicker(false)
  }

  const handleRemoveUser = (userId) => {
    const newUserIds = selectedUserIds.filter(id => id !== userId)
    setSelectedUserIds(newUserIds)
    
    if (onChange) {
      onChange(distributionData.filter(d => (d.user_id || d.id) !== userId))
    }
  }

  const getDistributionUsers = () => {
    return distributionData.map(d => {
      if (d.user) return d
      const user = users.find(u => u.id === (d.user_id || d.id))
      return { ...d, user }
    }).filter(d => d.user)
  }

  const availableUsers = users.filter(u => !selectedUserIds.includes(u.id))

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Mail className="w-5 h-5 text-gray-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Distribution List</h3>
        </div>
        {!readOnly && (
          <button
            onClick={() => setShowUserPicker(!showUserPicker)}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add User
          </button>
        )}
      </div>

      {showUserPicker && !readOnly && (
        <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Select user to add:</p>
          {loadingUsers ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">Loading users...</p>
          ) : availableUsers.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">All users already added</p>
          ) : (
            <div className="max-h-48 overflow-y-auto space-y-1">
              {availableUsers.map((user) => (
                <button
                  key={user.id}
                  onClick={() => handleAddUser(user.id)}
                  className="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-300 flex items-center gap-2"
                >
                  <User className="w-4 h-4" />
                  <span>{user.full_name || user.email}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {getDistributionUsers().length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900 rounded-lg">
          <Mail className="w-12 h-12 mx-auto mb-3 text-gray-400" />
          <p>No users in distribution list</p>
          {!readOnly && <p className="text-sm mt-1">Add users to distribute the CMS</p>}
        </div>
      ) : (
        <div className="space-y-2">
          {getDistributionUsers().map((item) => {
            const user = item.user
            return (
              <div
                key={item.user_id || item.id}
                className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <User className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {user?.full_name || user?.email || 'Unknown User'}
                    </p>
                    {user?.email && user?.full_name && (
                      <p className="text-xs text-gray-500 dark:text-gray-400">{user.email}</p>
                    )}
                  </div>
                </div>
                {!readOnly && (
                  <button
                    onClick={() => handleRemoveUser(item.user_id || item.id)}
                    className="p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900 rounded"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
