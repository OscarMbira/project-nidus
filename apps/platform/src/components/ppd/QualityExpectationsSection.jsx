/**
 * PPD Quality Expectations Section Component
 * Displays and manages quality expectations
 */

import { useState, useEffect } from 'react'
import { Plus, Award } from 'lucide-react'
import { getExpectations, deleteExpectation } from '../../services/ppdQualityExpectationsService'
import QualityExpectationCard from './QualityExpectationCard'
import QualityExpectationForm from './QualityExpectationForm'

export default function QualityExpectationsSection({ ppdId, mode = 'view', formData, onChange }) {
  const [expectations, setExpectations] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [selectedExpectation, setSelectedExpectation] = useState(null)

  useEffect(() => {
    if (ppdId) {
      loadExpectations()
    }
  }, [ppdId])

  const loadExpectations = async () => {
    try {
      setLoading(true)
      const result = await getExpectations(ppdId)
      if (result.success) {
        setExpectations(result.data || [])
      }
    } catch (error) {
      console.error('Error loading quality expectations:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = () => {
    setSelectedExpectation(null)
    setShowForm(true)
  }

  const handleEdit = (expectation) => {
    setSelectedExpectation(expectation)
    setShowForm(true)
  }

  const handleDelete = async (expectationId) => {
    if (!confirm('Are you sure you want to delete this quality expectation?')) {
      return
    }

    try {
      const result = await deleteExpectation(expectationId)
      if (result.success) {
        await loadExpectations()
      } else {
        alert('Error deleting expectation: ' + result.error)
      }
    } catch (error) {
      console.error('Error deleting expectation:', error)
      alert('Error deleting expectation: ' + error.message)
    }
  }

  const handleFormClose = () => {
    setShowForm(false)
    setSelectedExpectation(null)
    loadExpectations()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading quality expectations...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Customer Quality Expectations (Text Field) */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Customer Quality Expectations
        </label>
        {mode === 'view' ? (
          <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
            {formData?.customer_quality_expectations || 'Not defined'}
          </p>
        ) : (
          <textarea
            value={formData?.customer_quality_expectations || ''}
            onChange={(e) => onChange && onChange('customer_quality_expectations', e.target.value)}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="Describe quality expected and standards/processes"
          />
        )}
      </div>

      {/* Quality Characteristics */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Quality Characteristics
        </label>
        {mode === 'view' ? (
          <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
            {formData?.quality_characteristics || 'Not defined'}
          </p>
        ) : (
          <textarea
            value={formData?.quality_characteristics || ''}
            onChange={(e) => onChange && onChange('quality_characteristics', e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="Key quality characteristics (fast/slow, large/small, etc.)"
          />
        )}
      </div>

      {/* Detailed Quality Expectations */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Detailed Quality Expectations</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Specific quality expectations categorized by type
            </p>
          </div>
          {mode !== 'view' && (
            <button
              onClick={handleAdd}
              className="flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Expectation
            </button>
          )}
        </div>

        {showForm && (
          <QualityExpectationForm
            ppdId={ppdId}
            expectation={selectedExpectation}
            mode={selectedExpectation ? 'edit' : 'create'}
            onSave={handleFormClose}
            onCancel={() => {
              setShowForm(false)
              setSelectedExpectation(null)
            }}
          />
        )}

        {expectations.length === 0 ? (
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
            <Award className="h-16 w-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              No Quality Expectations
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              Add specific quality expectations categorized by type
            </p>
            {mode !== 'view' && (
              <button
                onClick={handleAdd}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add First Expectation
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {expectations.map((expectation) => (
              <QualityExpectationCard
                key={expectation.id}
                expectation={expectation}
                mode={mode}
                onEdit={mode !== 'view' ? () => handleEdit(expectation) : null}
                onDelete={mode !== 'view' ? () => handleDelete(expectation.id) : null}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
