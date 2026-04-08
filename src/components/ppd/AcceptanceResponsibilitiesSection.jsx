/**
 * PPD Acceptance Responsibilities Section Component
 * Displays and manages acceptance responsibilities
 */

import { useState, useEffect } from 'react'
import { Plus, Settings, User } from 'lucide-react'
import { getResponsibilities, deleteResponsibility } from '../../services/ppdAcceptanceResponsibilitiesService'
import ResponsibilityCard from './ResponsibilityCard'
import ResponsibilityForm from './ResponsibilityForm'

export default function AcceptanceResponsibilitiesSection({ ppdId, mode = 'view', formData, onChange, projectId }) {
  const [responsibilities, setResponsibilities] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [selectedResponsibility, setSelectedResponsibility] = useState(null)

  useEffect(() => {
    if (ppdId) {
      loadResponsibilities()
    }
  }, [ppdId])

  const loadResponsibilities = async () => {
    try {
      setLoading(true)
      const result = await getResponsibilities(ppdId)
      if (result.success) {
        setResponsibilities(result.data || [])
      }
    } catch (error) {
      console.error('Error loading responsibilities:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = () => {
    setSelectedResponsibility(null)
    setShowForm(true)
  }

  const handleEdit = (responsibility) => {
    setSelectedResponsibility(responsibility)
    setShowForm(true)
  }

  const handleDelete = async (responsibilityId) => {
    if (!confirm('Are you sure you want to delete this responsibility?')) {
      return
    }

    try {
      const result = await deleteResponsibility(responsibilityId)
      if (result.success) {
        await loadResponsibilities()
      } else {
        alert('Error deleting responsibility: ' + result.error)
      }
    } catch (error) {
      console.error('Error deleting responsibility:', error)
      alert('Error deleting responsibility: ' + error.message)
    }
  }

  const handleFormClose = () => {
    setShowForm(false)
    setSelectedResponsibility(null)
    loadResponsibilities()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading responsibilities...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Acceptance Responsibilities (Text Field) */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Acceptance Responsibilities
        </label>
        {mode === 'view' ? (
          <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
            {formData?.acceptance_responsibilities || 'Not defined'}
          </p>
        ) : (
          <textarea
            value={formData?.acceptance_responsibilities || ''}
            onChange={(e) => onChange && onChange('acceptance_responsibilities', e.target.value)}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="Describe who confirms acceptance..."
          />
        )}
      </div>

      {/* Detailed Responsibilities */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Detailed Responsibilities</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Specific acceptance responsibilities by role and stakeholder group
            </p>
          </div>
          {mode !== 'view' && (
            <button
              onClick={handleAdd}
              className="flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Responsibility
            </button>
          )}
        </div>

        {showForm && (
          <ResponsibilityForm
            ppdId={ppdId}
            responsibility={selectedResponsibility}
            mode={selectedResponsibility ? 'edit' : 'create'}
            projectId={projectId}
            onSave={handleFormClose}
            onCancel={() => {
              setShowForm(false)
              setSelectedResponsibility(null)
            }}
          />
        )}

        {responsibilities.length === 0 ? (
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
            <Settings className="h-16 w-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              No Responsibilities Defined
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              Add specific acceptance responsibilities by role and stakeholder group
            </p>
            {mode !== 'view' && (
              <button
                onClick={handleAdd}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add First Responsibility
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {responsibilities.map((responsibility) => (
              <ResponsibilityCard
                key={responsibility.id}
                responsibility={responsibility}
                mode={mode}
                onEdit={mode !== 'view' ? () => handleEdit(responsibility) : null}
                onDelete={mode !== 'view' ? () => handleDelete(responsibility.id) : null}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
