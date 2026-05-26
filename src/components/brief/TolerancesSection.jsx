/**
 * Tolerances Section
 * Time, cost, quality, scope, risk, benefit tolerances
 */

import { useState, useEffect } from 'react'
import { getTolerances, addTolerance, updateTolerance, deleteTolerance } from '../../services/briefTolerancesService'
import { Plus, Trash2, Edit2 } from 'lucide-react'

const TOLERANCE_TYPES = [
  { value: 'time', label: 'Time' },
  { value: 'cost', label: 'Cost' },
  { value: 'quality', label: 'Quality' },
  { value: 'scope', label: 'Scope' },
  { value: 'risk', label: 'Risk' },
  { value: 'benefit', label: 'Benefit' }
]

export default function TolerancesSection({ briefId, readOnly = false }) {
  const [tolerances, setTolerances] = useState([])
  const [loading, setLoading] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    tolerance_type: 'time',
    tolerance_description: '',
    lower_limit: '',
    upper_limit: '',
    absolute_value: '',
    escalation_required: false,
    notes: ''
  })

  useEffect(() => {
    if (briefId) {
      loadTolerances()
    }
  }, [briefId])

  const loadTolerances = async () => {
    try {
      setLoading(true)
      const data = await getTolerances(briefId)
      setTolerances(data || [])
    } catch (error) {
      console.error('Error loading tolerances:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editingId) {
        await updateTolerance(editingId, formData)
      } else {
        await addTolerance(briefId, formData)
      }
      await loadTolerances()
      setShowForm(false)
      setEditingId(null)
      setFormData({
        tolerance_type: 'time',
        tolerance_description: '',
        lower_limit: '',
        upper_limit: '',
        absolute_value: '',
        escalation_required: false,
        notes: ''
      })
    } catch (error) {
      console.error('Error saving tolerance:', error)
      alert('Error saving tolerance: ' + error.message)
    }
  }

  const handleEdit = (tolerance) => {
    setFormData({
      tolerance_type: tolerance.tolerance_type,
      tolerance_description: tolerance.tolerance_description,
      lower_limit: tolerance.lower_limit || '',
      upper_limit: tolerance.upper_limit || '',
      absolute_value: tolerance.absolute_value || '',
      escalation_required: tolerance.escalation_required || false,
      notes: tolerance.notes || ''
    })
    setEditingId(tolerance.id)
    setShowForm(true)
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this tolerance?')) return
    try {
      await deleteTolerance(id)
      await loadTolerances()
    } catch (error) {
      console.error('Error deleting tolerance:', error)
      alert('Error deleting tolerance: ' + error.message)
    }
  }

  if (!briefId) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        Please save the brief first before adding tolerances
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
            Project Tolerances
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Define acceptable variances for time, cost, quality, scope, risk, and benefits
          </p>
        </div>
        {!readOnly && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Tolerance
          </button>
        )}
      </div>

      {/* Add/Edit Form */}
      {showForm && !readOnly && (
        <form onSubmit={handleSubmit} className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Tolerance Type <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.tolerance_type}
                onChange={(e) => setFormData({ ...formData, tolerance_type: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                required
              >
                {TOLERANCE_TYPES.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Escalation Required
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.escalation_required}
                  onChange={(e) => setFormData({ ...formData, escalation_required: e.target.checked })}
                  className="mr-2"
                />
                Must escalate if breached
              </label>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              value={formData.tolerance_description}
              onChange={(e) => setFormData({ ...formData, tolerance_description: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              required
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Lower Limit
              </label>
              <input
                type="text"
                value={formData.lower_limit}
                onChange={(e) => setFormData({ ...formData, lower_limit: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="e.g., -10%"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Upper Limit
              </label>
              <input
                type="text"
                value={formData.upper_limit}
                onChange={(e) => setFormData({ ...formData, upper_limit: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="e.g., +15%"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Absolute Value
              </label>
              <input
                type="text"
                value={formData.absolute_value}
                onChange={(e) => setFormData({ ...formData, absolute_value: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="e.g., +/- $50K"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
            >
              {editingId ? 'Update' : 'Add'} Tolerance
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false)
                setEditingId(null)
                setFormData({
                  tolerance_type: 'time',
                  tolerance_description: '',
                  lower_limit: '',
                  upper_limit: '',
                  absolute_value: '',
                  escalation_required: false,
                  notes: ''
                })
              }}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Tolerances List */}
      {loading ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">Loading...</div>
      ) : tolerances.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          No tolerances defined yet
        </div>
      ) : (
        <div className="space-y-4">
          {tolerances.map((tolerance, index) => (
            <div
              key={tolerance.id}
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded text-sm font-medium capitalize">
                      {tolerance.tolerance_type}
                    </span>
                    {tolerance.escalation_required && (
                      <span className="px-2 py-1 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded text-sm">
                        Escalation Required
                      </span>
                    )}
                  </div>
                  <p className="text-gray-900 dark:text-white mb-2">{tolerance.tolerance_description}</p>
                  <div className="flex gap-4 text-sm text-gray-600 dark:text-gray-400">
                    {tolerance.lower_limit && <span>Lower: {tolerance.lower_limit}</span>}
                    {tolerance.upper_limit && <span>Upper: {tolerance.upper_limit}</span>}
                    {tolerance.absolute_value && <span>Absolute: {tolerance.absolute_value}</span>}
                  </div>
                  {tolerance.notes && (
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 italic">
                      {tolerance.notes}
                    </p>
                  )}
                </div>
                {!readOnly && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(tolerance)}
                      className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900 rounded"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(tolerance.id)}
                      className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
