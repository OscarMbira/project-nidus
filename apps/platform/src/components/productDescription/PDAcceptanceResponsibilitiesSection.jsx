/**
 * Product Description Acceptance Responsibilities Section
 */

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { addResponsibility, deleteResponsibility } from '../../services/pdAcceptanceResponsibilitiesService'
import ResponsibilityForm from './ResponsibilityForm'
import ResponsibilityCard from './ResponsibilityCard'

export default function PDAcceptanceResponsibilitiesSection({ responsibilities, setResponsibilities, formData, onChange, pdId, mode, projectId, acceptanceCriteria = [] }) {
  const [showForm, setShowForm] = useState(false)
  const [editingResponsibility, setEditingResponsibility] = useState(null)

  const handleAddResponsibility = async (responsibilityData) => {
    if (!pdId) {
      alert('Please save the product description first before adding responsibilities')
      return
    }

    try {
      const result = await addResponsibility(pdId, responsibilityData)
      if (result.success) {
        setResponsibilities([...responsibilities, result.data])
        setShowForm(false)
      } else {
        alert('Error adding responsibility: ' + result.error)
      }
    } catch (error) {
      console.error('Error adding responsibility:', error)
      alert('Error adding responsibility: ' + error.message)
    }
  }

  const handleDeleteResponsibility = async (responsibilityId) => {
    if (!confirm('Are you sure you want to delete this responsibility?')) return

    try {
      const result = await deleteResponsibility(responsibilityId)
      if (result.success) {
        setResponsibilities(responsibilities.filter(r => r.id !== responsibilityId))
      } else {
        alert('Error deleting responsibility: ' + result.error)
      }
    } catch (error) {
      console.error('Error deleting responsibility:', error)
      alert('Error deleting responsibility: ' + error.message)
    }
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Acceptance Responsibilities</h2>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Acceptance Responsibilities (Summary)
        </label>
        <textarea
          value={formData.acceptance_responsibilities || ''}
          onChange={(e) => onChange('acceptance_responsibilities', e.target.value)}
          disabled={mode === 'view'}
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          placeholder="Who confirms acceptance"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Acceptance Method
        </label>
        <textarea
          value={formData.acceptance_method || ''}
          onChange={(e) => onChange('acceptance_method', e.target.value)}
          disabled={mode === 'view'}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          placeholder="How acceptance will be confirmed"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Handover Arrangements
        </label>
        <textarea
          value={formData.handover_arrangements || ''}
          onChange={(e) => onChange('handover_arrangements', e.target.value)}
          disabled={mode === 'view'}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          placeholder="Complex handover details if applicable"
        />
      </div>

      <div>
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={formData.phased_handover || false}
            onChange={(e) => onChange('phased_handover', e.target.checked)}
            disabled={mode === 'view'}
            className="mr-2"
          />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Phased Handover Planned
          </span>
        </label>
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">Detailed Responsibilities</h3>
          {mode !== 'view' && pdId && (
            <button
              onClick={() => {
                setEditingResponsibility(null)
                setShowForm(true)
              }}
              className="flex items-center px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Responsibility
            </button>
          )}
        </div>

        {showForm && (
          <div className="mb-4 p-4 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800">
            <ResponsibilityForm
              responsibility={editingResponsibility}
              onSubmit={handleAddResponsibility}
              onCancel={() => {
                setShowForm(false)
                setEditingResponsibility(null)
              }}
              projectId={projectId}
              acceptanceCriteria={acceptanceCriteria}
            />
          </div>
        )}

        {responsibilities.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">
            No responsibilities added yet. {mode !== 'view' && pdId && 'Click "Add Responsibility" to add one.'}
          </p>
        ) : (
          <div className="space-y-3">
            {responsibilities.map(responsibility => (
              <ResponsibilityCard
                key={responsibility.id}
                responsibility={responsibility}
                onDelete={mode !== 'view' ? () => handleDeleteResponsibility(responsibility.id) : null}
                onEdit={mode !== 'view' ? () => {
                  setEditingResponsibility(responsibility)
                  setShowForm(true)
                } : null}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
