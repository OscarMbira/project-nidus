/**
 * Work Package Acceptance Criteria Section Component
 * Displays and manages Work Package acceptance criteria
 */

import { useState, useEffect } from 'react'
import { Plus, CheckSquare } from 'lucide-react'
import { getAcceptanceCriteria, deleteAcceptanceCriterion } from '../../services/wpAcceptanceCriteriaService'
import WPAcceptanceCriterionCard from './WPAcceptanceCriterionCard'
import WPAcceptanceCriterionForm from './WPAcceptanceCriterionForm'

export default function WPAcceptanceCriteriaSection({ wpId, mode = 'view' }) {
  const [criteria, setCriteria] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [selectedCriterion, setSelectedCriterion] = useState(null)

  useEffect(() => {
    if (wpId) {
      loadCriteria()
    }
  }, [wpId])

  const loadCriteria = async () => {
    try {
      setLoading(true)
      const result = await getAcceptanceCriteria(wpId)
      if (result.success) {
        setCriteria(result.data || [])
      }
    } catch (error) {
      console.error('Error loading acceptance criteria:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = () => {
    setSelectedCriterion(null)
    setShowForm(true)
  }

  const handleEdit = (criterion) => {
    setSelectedCriterion(criterion)
    setShowForm(true)
  }

  const handleDelete = async (criterionId) => {
    if (!confirm('Are you sure you want to delete this acceptance criterion?')) {
      return
    }

    try {
      const result = await deleteAcceptanceCriterion(criterionId)
      if (result.success) {
        await loadCriteria()
      } else {
        alert('Error deleting criterion: ' + result.error)
      }
    } catch (error) {
      console.error('Error deleting criterion:', error)
      alert('Error deleting criterion: ' + error.message)
    }
  }

  const handleFormClose = () => {
    setShowForm(false)
    setSelectedCriterion(null)
    loadCriteria()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading acceptance criteria...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Acceptance Criteria</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Criteria that must be met for the work package to be accepted
          </p>
        </div>
        {mode !== 'view' && (
          <button
            onClick={handleAdd}
            className="flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Acceptance Criterion
          </button>
        )}
      </div>

      {showForm && (
        <WPAcceptanceCriterionForm
          wpId={wpId}
          criterion={selectedCriterion}
          mode={selectedCriterion ? 'edit' : 'create'}
          onSave={handleFormClose}
          onCancel={() => {
            setShowForm(false)
            setSelectedCriterion(null)
          }}
        />
      )}

      {criteria.length === 0 ? (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
          <CheckSquare className="h-16 w-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            No Acceptance Criteria Defined
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            Add acceptance criteria that define when the work package will be accepted
          </p>
          {mode !== 'view' && (
            <button
              onClick={handleAdd}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add First Acceptance Criterion
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {criteria.map((criterion) => (
            <WPAcceptanceCriterionCard
              key={criterion.id}
              criterion={criterion}
              mode={mode}
              onEdit={mode !== 'view' ? () => handleEdit(criterion) : null}
              onDelete={mode !== 'view' ? () => handleDelete(criterion.id) : null}
            />
          ))}
        </div>
      )}
    </div>
  )
}
