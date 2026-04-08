/**
 * DeliverablesList Component
 * Manages deliverables for a mandate (in-scope and out-of-scope)
 * Works for both Platform and Simulator
 */

import { useState } from 'react'
import { Plus, Edit, Trash2, CheckCircle, XCircle } from 'lucide-react'

export default function DeliverablesList({ 
  mandateId, 
  deliverables = [], 
  onAdd, 
  onUpdate, 
  onDelete,
  isPractice = false,
  readOnly = false 
}) {
  const [editingId, setEditingId] = useState(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [formData, setFormData] = useState({
    deliverable_name: '',
    deliverable_description: '',
    is_in_scope: true,
    is_major_deliverable: true,
    estimated_completion: ''
  })

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editingId) {
        await onUpdate(editingId, formData)
        setEditingId(null)
      } else {
        await onAdd(mandateId, formData)
      }
      setFormData({
        deliverable_name: '',
        deliverable_description: '',
        is_in_scope: true,
        is_major_deliverable: true,
        estimated_completion: ''
      })
      setShowAddForm(false)
    } catch (error) {
      console.error('Error saving deliverable:', error)
      alert('Error saving deliverable: ' + error.message)
    }
  }

  const handleEdit = (deliverable) => {
    setEditingId(deliverable.id)
    setFormData({
      deliverable_name: deliverable.deliverable_name || '',
      deliverable_description: deliverable.deliverable_description || '',
      is_in_scope: deliverable.is_in_scope !== false,
      is_major_deliverable: deliverable.is_major_deliverable !== false,
      estimated_completion: deliverable.estimated_completion || ''
    })
    setShowAddForm(true)
  }

  const handleCancel = () => {
    setEditingId(null)
    setShowAddForm(false)
    setFormData({
      deliverable_name: '',
      deliverable_description: '',
      is_in_scope: true,
      is_major_deliverable: true,
      estimated_completion: ''
    })
  }

  const inScope = deliverables.filter(d => d.is_in_scope !== false)
  const outOfScope = deliverables.filter(d => d.is_in_scope === false)

  return (
    <div className="space-y-6">
      {/* In-Scope Deliverables */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
            <CheckCircle className="w-5 h-5 mr-2 text-green-600" />
            In-Scope Deliverables ({inScope.length})
          </h3>
          {!readOnly && (
            <button
              onClick={() => setShowAddForm(true)}
              className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center text-sm"
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Deliverable
            </button>
          )}
        </div>

        {showAddForm && (
          <form onSubmit={handleSubmit} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-4">
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Deliverable Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.deliverable_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, deliverable_name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.deliverable_description}
                  onChange={(e) => setFormData(prev => ({ ...prev, deliverable_description: e.target.value }))}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>
              <div className="flex items-center space-x-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.is_in_scope}
                    onChange={(e) => setFormData(prev => ({ ...prev, is_in_scope: e.target.checked }))}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">In Scope</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.is_major_deliverable}
                    onChange={(e) => setFormData(prev => ({ ...prev, is_major_deliverable: e.target.checked }))}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Major Deliverable</span>
                </label>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Estimated Completion
                </label>
                <input
                  type="text"
                  value={formData.estimated_completion}
                  onChange={(e) => setFormData(prev => ({ ...prev, estimated_completion: e.target.value }))}
                  placeholder="e.g., Q2 2026, 6 months"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>
              <div className="flex space-x-2">
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  {editingId ? 'Update' : 'Add'} Deliverable
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
              </div>
            </div>
          </form>
        )}

        {inScope.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400 italic">No in-scope deliverables added yet.</p>
        ) : (
          <div className="space-y-2">
            {inScope.map((deliverable) => (
              <div
                key={deliverable.id}
                className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 flex justify-between items-start"
              >
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <h4 className="font-medium text-gray-900 dark:text-white">{deliverable.deliverable_name}</h4>
                    {deliverable.is_major_deliverable && (
                      <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs rounded">
                        Major
                      </span>
                    )}
                  </div>
                  {deliverable.deliverable_description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                      {deliverable.deliverable_description}
                    </p>
                  )}
                  {deliverable.estimated_completion && (
                    <p className="text-xs text-gray-500 dark:text-gray-500">
                      Estimated: {deliverable.estimated_completion}
                    </p>
                  )}
                </div>
                {!readOnly && (
                  <div className="flex space-x-2 ml-4">
                    <button
                      onClick={() => handleEdit(deliverable)}
                      className="p-1.5 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
                      title="Edit"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onDelete(deliverable.id)}
                      className="p-1.5 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Out-of-Scope Deliverables */}
      {outOfScope.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center mb-4">
            <XCircle className="w-5 h-5 mr-2 text-red-600" />
            Out-of-Scope ({outOfScope.length})
          </h3>
          <div className="space-y-2">
            {outOfScope.map((deliverable) => (
              <div
                key={deliverable.id}
                className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex justify-between items-start"
              >
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900 dark:text-white">{deliverable.deliverable_name}</h4>
                  {deliverable.deliverable_description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {deliverable.deliverable_description}
                    </p>
                  )}
                </div>
                {!readOnly && (
                  <div className="flex space-x-2 ml-4">
                    <button
                      onClick={() => handleEdit(deliverable)}
                      className="p-1.5 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
                      title="Edit"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onDelete(deliverable.id)}
                      className="p-1.5 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
