/**
 * PPD Acceptance Criteria Section Component
 * Displays and manages acceptance criteria
 */

import { useState, useEffect } from 'react'
import { Plus, Target, CheckCircle, AlertCircle, XCircle } from 'lucide-react'
import { getCriteria, deleteCriteria } from '../../services/ppdAcceptanceCriteriaService'
import AcceptanceCriteriaCard from './AcceptanceCriteriaCard'
import AcceptanceCriteriaForm from './AcceptanceCriteriaForm'
import CriteriaMeasurabilityChecker from './CriteriaMeasurabilityChecker'
import CriteriaConsistencyChecker from './CriteriaConsistencyChecker'

export default function AcceptanceCriteriaSection({ ppdId, mode = 'view' }) {
  const [criteria, setCriteria] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [selectedCriterion, setSelectedCriterion] = useState(null)
  const [validationResults, setValidationResults] = useState(null)
  const [conflicts, setConflicts] = useState([])
  const [showValidation, setShowValidation] = useState(false)
  const [showConsistency, setShowConsistency] = useState(false)

  useEffect(() => {
    if (ppdId) {
      loadCriteria()
      if (showValidation || showConsistency) {
        loadValidationData()
      }
    }
  }, [ppdId, showValidation, showConsistency])

  const loadCriteria = async () => {
    try {
      setLoading(true)
      const data = await getCriteria(ppdId)
      setCriteria(data || [])
    } catch (error) {
      console.error('Error loading acceptance criteria:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadValidationData = async () => {
    // Validation and consistency checks will be loaded when components mount
  }

  const handleAdd = () => {
    setSelectedCriterion(null)
    setShowForm(true)
  }

  const handleEdit = (criterion) => {
    setSelectedCriterion(criterion)
    setShowForm(true)
  }

  const handleDelete = async (criteriaId) => {
    if (!confirm('Are you sure you want to delete this acceptance criterion?')) {
      return
    }

    try {
      await deleteCriteria(criteriaId)
      await loadCriteria()
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
            Define measurable acceptance criteria that the project product must meet
          </p>
        </div>
        {mode !== 'view' && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowConsistency(!showConsistency)}
              className="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Check Consistency
            </button>
            <button
              onClick={() => setShowValidation(!showValidation)}
              className="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Validate All
            </button>
            <button
              onClick={handleAdd}
              className="flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Criterion
            </button>
          </div>
        )}
      </div>

      {/* Validation Results */}
      {showValidation && (
        <CriteriaMeasurabilityChecker
          ppdId={ppdId}
          onValidationComplete={(results) => setValidationResults(results)}
        />
      )}

      {/* Consistency Check */}
      {showConsistency && (
        <CriteriaConsistencyChecker
          ppdId={ppdId}
          onConsistencyCheck={(conflicts) => setConflicts(conflicts)}
        />
      )}

      {showForm && (
        <AcceptanceCriteriaForm
          ppdId={ppdId}
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
          <Target className="h-16 w-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            No Acceptance Criteria
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            Add acceptance criteria that define what "done" looks like for this project product
          </p>
          {mode !== 'view' && (
            <button
              onClick={handleAdd}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add First Criterion
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {criteria.map((criterion) => (
            <AcceptanceCriteriaCard
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
