/**
 * PID Tolerances Section Component
 * Displays and manages project tolerances within the PID
 */

import { useState } from 'react'
import { Plus, Gauge, Edit2, Trash2 } from 'lucide-react'
import ToleranceCard from './ToleranceCard'

import { getDisplayRowNumber } from '../../utils/tableRowNumberUtils'
const TOLERANCE_TYPES = [
  { id: 'time', label: 'Time', unit: 'days/weeks', icon: '⏱️' },
  { id: 'cost', label: 'Cost', unit: 'currency', icon: '💰' },
  { id: 'quality', label: 'Quality', unit: '%', icon: '✓' },
  { id: 'scope', label: 'Scope', unit: 'items', icon: '📋' },
  { id: 'risk', label: 'Risk', unit: 'score', icon: '⚠️' },
  { id: 'benefits', label: 'Benefits', unit: '%', icon: '📈' }
]

export default function TolerancesSection({
  pidId,
  tolerances = [],
  onTolerancesChange,
  readOnly = false
}) {
  const [showForm, setShowForm] = useState(false)
  const [editingTolerance, setEditingTolerance] = useState(null)
  const [formData, setFormData] = useState({
    tolerance_type: '',
    tolerance_name: '',
    baseline_value: '',
    upper_tolerance: '',
    lower_tolerance: '',
    unit: '',
    description: ''
  })

  const handleAddClick = () => {
    setEditingTolerance(null)
    setFormData({
      tolerance_type: '',
      tolerance_name: '',
      baseline_value: '',
      upper_tolerance: '',
      lower_tolerance: '',
      unit: '',
      description: ''
    })
    setShowForm(true)
  }

  const handleEditClick = (tolerance) => {
    setEditingTolerance(tolerance)
    setFormData({
      tolerance_type: tolerance.tolerance_type || '',
      tolerance_name: tolerance.tolerance_name || '',
      baseline_value: tolerance.baseline_value || '',
      upper_tolerance: tolerance.upper_tolerance || '',
      lower_tolerance: tolerance.lower_tolerance || '',
      unit: tolerance.unit || '',
      description: tolerance.description || ''
    })
    setShowForm(true)
  }

  const handleSave = () => {
    if (editingTolerance) {
      const updated = tolerances.map(t =>
        t.id === editingTolerance.id ? { ...t, ...formData } : t
      )
      if (onTolerancesChange) onTolerancesChange(updated)
    } else {
      const newTolerance = { ...formData, id: Date.now().toString() }
      if (onTolerancesChange) onTolerancesChange([...tolerances, newTolerance])
    }
    setShowForm(false)
    setEditingTolerance(null)
  }

  const handleDelete = (toleranceId) => {
    if (window.confirm('Are you sure you want to delete this tolerance?')) {
      const filtered = tolerances.filter(t => t.id !== toleranceId)
      if (onTolerancesChange) onTolerancesChange(filtered)
    }
  }

  const handleTypeChange = (type) => {
    const toleranceType = TOLERANCE_TYPES.find(t => t.id === type)
    setFormData({
      ...formData,
      tolerance_type: type,
      tolerance_name: toleranceType?.label || '',
      unit: toleranceType?.unit || ''
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Gauge className="h-5 w-5" />
          Project Tolerances
        </h3>
        {!readOnly && (
          <button
            onClick={handleAddClick}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg flex items-center gap-1"
          >
            <Plus className="h-4 w-4" />
            Add Tolerance
          </button>
        )}
      </div>

      <p className="text-sm text-gray-600 dark:text-gray-400">
        Define the permissible deviations from the project plan before escalation is required.
      </p>

      {tolerances.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
          <Gauge className="h-12 w-12 mx-auto text-gray-400 dark:text-gray-500 mb-3" />
          <p className="text-gray-500 dark:text-gray-400">No tolerances defined yet</p>
          {!readOnly && (
            <button
              onClick={handleAddClick}
              className="mt-3 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm"
            >
              Add First Tolerance
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {tolerances.map((tolerance, index) => (
            <ToleranceCard
              key={tolerance.id}
              tolerance={tolerance}
              onEdit={() => handleEditClick(tolerance)}
              onDelete={() => handleDelete(tolerance.id)}
              readOnly={readOnly}
            />
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-lg w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {editingTolerance ? 'Edit Tolerance' : 'Add Tolerance'}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Tolerance Type *
                </label>
                <select
                  value={formData.tolerance_type}
                  onChange={(e) => handleTypeChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">Select type...</option>
                  {TOLERANCE_TYPES.map((type, index) => (
                    <option key={type.id} value={type.id}>
                      {type.icon} {type.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Baseline Value
                </label>
                <input
                  type="text"
                  value={formData.baseline_value}
                  onChange={(e) => setFormData({ ...formData, baseline_value: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="e.g., 100,000"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Upper Tolerance (+)
                  </label>
                  <input
                    type="text"
                    value={formData.upper_tolerance}
                    onChange={(e) => setFormData({ ...formData, upper_tolerance: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="e.g., +10%"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Lower Tolerance (-)
                  </label>
                  <input
                    type="text"
                    value={formData.lower_tolerance}
                    onChange={(e) => setFormData({ ...formData, lower_tolerance: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="e.g., -5%"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Explain when and how this tolerance should be applied..."
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowForm(false)}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!formData.tolerance_type}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
