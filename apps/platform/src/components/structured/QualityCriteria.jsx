import { useState, useEffect } from 'react'
import { supabase } from '../../services/supabaseClient'
import { format } from 'date-fns'
import { Plus, CheckCircle, XCircle, Clock, Save, X } from 'lucide-react'

export default function QualityCriteria({ productId, projectId }) {
  const [criteria, setCriteria] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newCriterion, setNewCriterion] = useState({
    criteria_name: '',
    criteria_description: '',
    criteria_type: 'functional',
    quality_standard: '',
    measurement_method: '',
    acceptance_threshold: '',
  })

  useEffect(() => {
    if (productId) {
      fetchCriteria()
    }
  }, [productId])

  const fetchCriteria = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('quality_criteria')
        .select(`
          *,
          reviewed_by:reviewed_by_user_id (id, email, full_name)
        `)
        .eq('product_deliverable_id', productId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: true })

      if (error) throw error
      setCriteria(data || [])
    } catch (error) {
      console.error('Error fetching quality criteria:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddCriterion = async () => {
    if (!newCriterion.criteria_name.trim()) {
      alert('Please enter criteria name')
      return
    }

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      const { error } = await supabase
        .from('quality_criteria')
        .insert({
          ...newCriterion,
          product_deliverable_id: productId,
          project_id: projectId,
          created_by: user.id,
          updated_by: user.id,
        })

      if (error) throw error

      setNewCriterion({
        criteria_name: '',
        criteria_description: '',
        criteria_type: 'functional',
        quality_standard: '',
        measurement_method: '',
        acceptance_threshold: '',
      })
      setShowAddForm(false)
      fetchCriteria()
    } catch (error) {
      console.error('Error adding criterion:', error)
      alert('Error adding criterion: ' + error.message)
    }
  }

  const handleUpdateStatus = async (criterionId, newStatus) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      const updateData = {
        status: newStatus,
        updated_by: user.id,
      }

      if (newStatus === 'passed' || newStatus === 'failed') {
        updateData.reviewed_date = new Date().toISOString().split('T')[0]
        updateData.reviewed_by_user_id = user.id
      }

      const { error } = await supabase
        .from('quality_criteria')
        .update(updateData)
        .eq('id', criterionId)

      if (error) throw error
      fetchCriteria()
    } catch (error) {
      console.error('Error updating criterion:', error)
      alert('Error updating criterion: ' + error.message)
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'passed':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
      case 'failed':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
      case 'in_review':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
      case 'waived':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'passed':
        return <CheckCircle className="h-4 w-4" />
      case 'failed':
        return <XCircle className="h-4 w-4" />
      case 'in_review':
        return <Clock className="h-4 w-4" />
      default:
        return <Clock className="h-4 w-4" />
    }
  }

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Quality Criteria
        </h3>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Criterion
        </button>
      </div>

      {showAddForm && (
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Criteria Name *
            </label>
            <input
              type="text"
              value={newCriterion.criteria_name}
              onChange={(e) => setNewCriterion({ ...newCriterion, criteria_name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              placeholder="Enter criteria name..."
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Type
              </label>
              <select
                value={newCriterion.criteria_type}
                onChange={(e) => setNewCriterion({ ...newCriterion, criteria_type: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              >
                <option value="functional">Functional</option>
                <option value="non_functional">Non-Functional</option>
                <option value="performance">Performance</option>
                <option value="security">Security</option>
                <option value="usability">Usability</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Quality Standard
              </label>
              <input
                type="text"
                value={newCriterion.quality_standard}
                onChange={(e) => setNewCriterion({ ...newCriterion, quality_standard: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                placeholder="e.g., ISO 9001"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description
            </label>
            <textarea
              value={newCriterion.criteria_description}
              onChange={(e) => setNewCriterion({ ...newCriterion, criteria_description: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleAddCriterion}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              Add Criterion
            </button>
            <button
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {criteria.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-8 text-center text-gray-500 dark:text-gray-400">
          No quality criteria defined yet. Add criteria to track product quality.
        </div>
      ) : (
        <div className="space-y-3">
          {criteria.map((criterion, index) => (
            <div
              key={criterion.id}
              className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900 dark:text-white">
                    {criterion.criteria_name}
                  </h4>
                  {criterion.criteria_description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {criterion.criteria_description}
                    </p>
                  )}
                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
                    <span>Type: {criterion.criteria_type.replace('_', ' ')}</span>
                    {criterion.quality_standard && (
                      <span>Standard: {criterion.quality_standard}</span>
                    )}
                  </div>
                </div>
                <span className={`px-2 py-1 rounded text-xs font-medium flex items-center gap-1 ${getStatusColor(criterion.status)}`}>
                  {getStatusIcon(criterion.status)}
                  {criterion.status.replace('_', ' ')}
                </span>
              </div>
              {criterion.status === 'pending' || criterion.status === 'in_review' ? (
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => handleUpdateStatus(criterion.id, 'passed')}
                    className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm"
                  >
                    Pass
                  </button>
                  <button
                    onClick={() => handleUpdateStatus(criterion.id, 'failed')}
                    className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm"
                  >
                    Fail
                  </button>
                  <button
                    onClick={() => handleUpdateStatus(criterion.id, 'waived')}
                    className="px-3 py-1 bg-yellow-600 hover:bg-yellow-700 text-white rounded text-sm"
                  >
                    Waive
                  </button>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

