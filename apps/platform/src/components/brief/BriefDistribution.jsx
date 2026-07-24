/**
 * Brief Distribution Component
 * Distribution list management
 */

import { useState, useEffect } from 'react'
import { supabase } from '../../services/supabaseClient'
import { Plus, Trash2, Mail, CheckCircle, Clock } from 'lucide-react'

export default function BriefDistribution({ briefId, readOnly = false }) {
  const [distributions, setDistributions] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    recipient_id: '',
    recipient_name: '',
    recipient_title: '',
    version_distributed: '1.0'
  })

  useEffect(() => {
    if (briefId) {
      loadDistributions()
      if (!readOnly) {
        loadUsers()
        loadBriefVersion()
      }
    }
  }, [briefId, readOnly])

  const loadBriefVersion = async () => {
    try {
      const { data } = await supabase
        .from('project_briefs')
        .select('version_number')
        .eq('id', briefId)
        .single()
      
      if (data) {
        setFormData(prev => ({ ...prev, version_distributed: data.version_number || '1.0' }))
      }
    } catch (error) {
      console.error('Error loading brief version:', error)
    }
  }

  const loadDistributions = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('brief_distribution')
        .select(`
          *,
          recipient:users!brief_distribution_recipient_id_fkey(id, full_name, email)
        `)
        .eq('brief_id', briefId)
        .order('date_of_issue', { ascending: false })

      if (error) throw error
      setDistributions(data || [])
    } catch (error) {
      console.error('Error loading distributions:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, full_name, email')
        .eq('is_deleted', false)
        .order('full_name', { ascending: true })
        .limit(100)

      if (error) throw error
      setUsers(data || [])
    } catch (error) {
      console.error('Error loading users:', error)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const { error } = await supabase
        .from('brief_distribution')
        .insert({
          brief_id: briefId,
          ...formData,
          date_of_issue: new Date().toISOString().split('T')[0]
        })

      if (error) throw error
      await loadDistributions()
      setShowForm(false)
      setFormData({
        recipient_id: '',
        recipient_name: '',
        recipient_title: '',
        version_distributed: formData.version_distributed
      })
    } catch (error) {
      console.error('Error adding distribution:', error)
      alert('Error adding distribution: ' + error.message)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Remove from distribution list?')) return
    try {
      const { error } = await supabase
        .from('brief_distribution')
        .delete()
        .eq('id', id)

      if (error) throw error
      await loadDistributions()
    } catch (error) {
      console.error('Error deleting distribution:', error)
      alert('Error removing distribution: ' + error.message)
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'acknowledged':
        return <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
      case 'read':
        return <CheckCircle className="w-4 h-4 text-blue-600 dark:text-blue-400" />
      case 'sent':
      default:
        return <Clock className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
    }
  }

  if (!briefId) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        Please save the brief first before managing distribution
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Distribution List</h3>
        {!readOnly && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Recipient
          </button>
        )}
      </div>

      {/* Add Form */}
      {showForm && !readOnly && (
        <form onSubmit={handleSubmit} className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Recipient
              </label>
              <select
                value={formData.recipient_id || ''}
                onChange={(e) => {
                  const user = users.find(u => u.id === e.target.value)
                  setFormData({
                    ...formData,
                    recipient_id: e.target.value,
                    recipient_name: user?.full_name || ''
                  })
                }}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">Select user...</option>
                {users.map(user => (
                  <option key={user.id} value={user.id}>
                    {user.full_name} ({user.email})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Or Enter External Name
              </label>
              <input
                type="text"
                value={formData.recipient_name}
                onChange={(e) => setFormData({ ...formData, recipient_name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="External recipient name"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Title
              </label>
              <input
                type="text"
                value={formData.recipient_title}
                onChange={(e) => setFormData({ ...formData, recipient_title: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Version Distributed
              </label>
              <input
                type="text"
                value={formData.version_distributed}
                onChange={(e) => setFormData({ ...formData, version_distributed: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                required
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
            >
              Add to Distribution
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false)
                setFormData({
                  recipient_id: '',
                  recipient_name: '',
                  recipient_title: '',
                  version_distributed: formData.version_distributed
                })
              }}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Distribution List */}
      {loading ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">Loading...</div>
      ) : distributions.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          No recipients in distribution list
        </div>
      ) : (
        <div className="space-y-3">
          {distributions.map((dist, index) => (
            <div
              key={dist.id}
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <span className="font-medium text-gray-900 dark:text-white">
                      {dist.recipient_name || dist.recipient?.full_name || 'Unknown'}
                    </span>
                    {dist.recipient_title && (
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        ({dist.recipient_title})
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                    <span>Version: {dist.version_distributed}</span>
                    <span>Issued: {new Date(dist.date_of_issue).toLocaleDateString()}</span>
                    <span className="flex items-center gap-1 capitalize">
                      {getStatusIcon(dist.distribution_status)}
                      {dist.distribution_status}
                    </span>
                  </div>
                </div>
                {!readOnly && (
                  <button
                    onClick={() => handleDelete(dist.id)}
                    className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900 rounded"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
