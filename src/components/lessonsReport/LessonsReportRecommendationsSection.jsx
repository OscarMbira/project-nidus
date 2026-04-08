/**
 * Lessons Report Recommendations Section
 * Structured recommendations with ownership and timelines
 */

import { useState, useEffect } from 'react'
import { Plus, X, Edit2, CheckCircle, Clock, User } from 'lucide-react'
import { getRecommendations, addRecommendation, updateRecommendation, deleteRecommendation, syncRecommendationsFromLessons } from '../../services/lessonsReportRecommendationService'
import { platformDb } from '../../services/supabase/supabaseClient'

export default function LessonsReportRecommendationsSection({
  reportId,
  readOnly = false
}) {
  const [recommendations, setRecommendations] = useState([])
  const [loading, setLoading] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [users, setUsers] = useState([])
  const [formData, setFormData] = useState({
    recommendation_title: '',
    recommendation_description: '',
    recommendation_type: 'other',
    priority: 'medium',
    responsible_party_id: null,
    responsible_party_name: '',
    target_implementation_date: null
  })

  useEffect(() => {
    if (reportId && reportId !== 'new') {
      loadRecommendations()
      loadUsers()
    }
  }, [reportId])

  const loadRecommendations = async () => {
    try {
      setLoading(true)
      const result = await getRecommendations(reportId)
      if (result.success) {
        setRecommendations(result.data || [])
      }
    } catch (error) {
      console.error('Error loading recommendations:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadUsers = async () => {
    try {
      const { data } = await platformDb
        .from('users')
        .select('id, full_name, email')
        .eq('is_deleted', false)
        .order('full_name')

      setUsers(data || [])
    } catch (error) {
      console.error('Error loading users:', error)
    }
  }

  const handleSyncFromLessons = async () => {
    try {
      setLoading(true)
      const result = await syncRecommendationsFromLessons(reportId)
      if (result.success) {
        alert(`Synced ${result.data.added} recommendations from lessons`)
        await loadRecommendations()
      } else {
        alert('Error syncing recommendations: ' + result.error)
      }
    } catch (error) {
      console.error('Error syncing recommendations:', error)
      alert('Error syncing recommendations: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      setLoading(true)
      let result

      if (editingId) {
        result = await updateRecommendation(editingId, formData)
      } else {
        result = await addRecommendation(reportId, formData)
      }

      if (result.success) {
        await loadRecommendations()
        setShowAddForm(false)
        setEditingId(null)
        setFormData({
          recommendation_title: '',
          recommendation_description: '',
          recommendation_type: 'other',
          priority: 'medium',
          responsible_party_id: null,
          responsible_party_name: '',
          target_implementation_date: null
        })
      } else {
        alert('Error saving recommendation: ' + result.error)
      }
    } catch (error) {
      console.error('Error saving recommendation:', error)
      alert('Error saving recommendation: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this recommendation?')) return

    try {
      const result = await deleteRecommendation(id)
      if (result.success) {
        await loadRecommendations()
      }
    } catch (error) {
      console.error('Error deleting recommendation:', error)
      alert('Error deleting recommendation: ' + error.message)
    }
  }

  const handleEdit = (rec) => {
    setFormData({
      recommendation_title: rec.recommendation_title,
      recommendation_description: rec.recommendation_description,
      recommendation_type: rec.recommendation_type,
      priority: rec.priority,
      responsible_party_id: rec.responsible_party_id,
      responsible_party_name: rec.responsible_party_name || '',
      target_implementation_date: rec.target_implementation_date || null
    })
    setEditingId(rec.id)
    setShowAddForm(true)
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200'
      case 'in_progress': return 'bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200'
      case 'deferred': return 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200'
      case 'cancelled': return 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-200'
      default: return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
    }
  }

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'text-red-600 dark:text-red-400'
      case 'medium': return 'text-orange-600 dark:text-orange-400'
      default: return 'text-gray-600 dark:text-gray-400'
    }
  }

  if (reportId === 'new') {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        <p>Save the report first to add recommendations</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Recommendations
        </h3>
        {!readOnly && (
          <div className="flex gap-2">
            <button
              onClick={handleSyncFromLessons}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Sync from Lessons
            </button>
            <button
              onClick={() => {
                setShowAddForm(true)
                setEditingId(null)
                setFormData({
                  recommendation_title: '',
                  recommendation_description: '',
                  recommendation_type: 'other',
                  priority: 'medium',
                  responsible_party_id: null,
                  responsible_party_name: '',
                  target_implementation_date: null
                })
              }}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Recommendation
            </button>
          </div>
        )}
      </div>

      {/* Recommendations List */}
      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      ) : recommendations.length === 0 ? (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-8 text-center text-gray-500 dark:text-gray-400">
          <p>No recommendations added yet</p>
          {!readOnly && (
            <button
              onClick={() => setShowAddForm(true)}
              className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
            >
              Add Recommendation
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {recommendations.map((rec) => (
            <div
              key={rec.id}
              className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="font-semibold text-gray-900 dark:text-white">
                      {rec.recommendation_title}
                    </h4>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(rec.implementation_status)}`}>
                      {rec.implementation_status}
                    </span>
                    <span className={`text-xs font-medium ${getPriorityColor(rec.priority)}`}>
                      {rec.priority}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
                    {rec.recommendation_description}
                  </p>
                  <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                    {rec.responsible_party?.full_name || rec.responsible_party_name ? (
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {rec.responsible_party?.full_name || rec.responsible_party_name}
                      </span>
                    ) : null}
                    {rec.target_implementation_date && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Target: {new Date(rec.target_implementation_date).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
                {!readOnly && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(rec)}
                      className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(rec.id)}
                      className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Form Modal */}
      {showAddForm && !readOnly && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">
              {editingId ? 'Edit Recommendation' : 'Add Recommendation'}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Recommendation Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.recommendation_title}
                  onChange={(e) => setFormData({ ...formData, recommendation_title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Brief title for the recommendation"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={formData.recommendation_description}
                  onChange={(e) => setFormData({ ...formData, recommendation_description: e.target.value })}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Detailed description of the recommendation"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Type
                  </label>
                  <select
                    value={formData.recommendation_type}
                    onChange={(e) => setFormData({ ...formData, recommendation_type: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="process">Process</option>
                    <option value="documentation">Documentation</option>
                    <option value="role">Role</option>
                    <option value="organizational">Organizational</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Priority
                  </label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Responsible Party
                </label>
                <select
                  value={formData.responsible_party_id || ''}
                  onChange={(e) => setFormData({ ...formData, responsible_party_id: e.target.value || null })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">Select user...</option>
                  {users.map(user => (
                    <option key={user.id} value={user.id}>{user.full_name}</option>
                  ))}
                </select>
                <input
                  type="text"
                  value={formData.responsible_party_name}
                  onChange={(e) => setFormData({ ...formData, responsible_party_name: e.target.value })}
                  className="w-full mt-2 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Or enter external party name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Target Implementation Date
                </label>
                <input
                  type="date"
                  value={formData.target_implementation_date || ''}
                  onChange={(e) => setFormData({ ...formData, target_implementation_date: e.target.value || null })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end mt-6">
              <button
                onClick={() => {
                  setShowAddForm(false)
                  setEditingId(null)
                }}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={loading || !formData.recommendation_title || !formData.recommendation_description}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
