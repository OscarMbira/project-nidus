/**
 * Product Description Acceptance Criteria Section
 */

import { useState } from 'react'
import { Plus, AlertCircle, CheckCircle, XCircle } from 'lucide-react'
import { addAcceptanceCriterion, deleteAcceptanceCriterion } from '../../services/pdAcceptanceCriteriaService'
import AcceptanceCriterionForm from './AcceptanceCriterionForm'
import AcceptanceCriterionCard from './AcceptanceCriterionCard'

export default function PDAcceptanceCriteriaSection({ acceptanceCriteria, setAcceptanceCriteria, pdId, mode, criteriaQuality }) {
  const [showForm, setShowForm] = useState(false)
  const [editingCriterion, setEditingCriterion] = useState(null)

  const handleAddCriterion = async (criterionData) => {
    if (!pdId) {
      alert('Please save the product description first before adding acceptance criteria')
      return
    }

    try {
      const result = await addAcceptanceCriterion(pdId, criterionData)
      if (result.success) {
        setAcceptanceCriteria([...acceptanceCriteria, result.data])
        setShowForm(false)
      } else {
        alert('Error adding acceptance criterion: ' + result.error)
      }
    } catch (error) {
      console.error('Error adding acceptance criterion:', error)
      alert('Error adding acceptance criterion: ' + error.message)
    }
  }

  const handleDeleteCriterion = async (criterionId) => {
    if (!confirm('Are you sure you want to delete this acceptance criterion?')) return

    try {
      const result = await deleteAcceptanceCriterion(criterionId)
      if (result.success) {
        setAcceptanceCriteria(acceptanceCriteria.filter(c => c.id !== criterionId))
      } else {
        alert('Error deleting acceptance criterion: ' + result.error)
      }
    } catch (error) {
      console.error('Error deleting acceptance criterion:', error)
      alert('Error deleting acceptance criterion: ' + error.message)
    }
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Acceptance Criteria</h2>

      {criteriaQuality && criteriaQuality.length > 0 && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <div className="flex items-center mb-2">
            <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mr-2" />
            <h3 className="font-semibold text-yellow-900 dark:text-yellow-100">Quality Validation</h3>
          </div>
          <div className="space-y-2 text-sm">
            {criteriaQuality.map((item, index) => (
              <div key={index} className="flex items-start">
                {item.is_measurable && item.is_realistic && item.is_provable ? (
                  <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400 mr-2 mt-0.5" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-600 dark:text-red-400 mr-2 mt-0.5" />
                )}
                <div>
                  <p className="font-medium text-yellow-900 dark:text-yellow-100">
                    {item.criteria_reference}: {item.criteria_title}
                  </p>
                  {item.issues && item.issues.length > 0 && (
                    <ul className="list-disc list-inside text-yellow-800 dark:text-yellow-200">
                      {item.issues.map((issue, i) => (
                        <li key={i}>{issue}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Define measurable acceptance criteria that the product must meet.
          </p>
          {mode !== 'view' && pdId && (
            <button
              onClick={() => {
                setEditingCriterion(null)
                setShowForm(true)
              }}
              className="flex items-center px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Criterion
            </button>
          )}
        </div>

        {showForm && (
          <div className="mb-4 p-4 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800">
            <AcceptanceCriterionForm
              criterion={editingCriterion}
              onSubmit={handleAddCriterion}
              onCancel={() => {
                setShowForm(false)
                setEditingCriterion(null)
              }}
            />
          </div>
        )}

        {acceptanceCriteria.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">
            No acceptance criteria added yet. {mode !== 'view' && pdId && 'Click "Add Criterion" to add one.'}
          </p>
        ) : (
          <div className="space-y-3">
            {acceptanceCriteria.map(criterion => (
              <AcceptanceCriterionCard
                key={criterion.id}
                criterion={criterion}
                onDelete={mode !== 'view' ? () => handleDeleteCriterion(criterion.id) : null}
                onEdit={mode !== 'view' ? () => {
                  setEditingCriterion(criterion)
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
