/**
 * Product Description Quality Expectations Section
 */

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { addQualityExpectation, deleteQualityExpectation } from '../../services/pdQualityExpectationsService'
import QualityExpectationForm from './QualityExpectationForm'
import QualityExpectationCard from './QualityExpectationCard'

export default function PDQualityExpectationsSection({ qualityExpectations, setQualityExpectations, formData, onChange, pdId, mode }) {
  const [showForm, setShowForm] = useState(false)
  const [editingExpectation, setEditingExpectation] = useState(null)

  const handleAddExpectation = async (expectationData) => {
    if (!pdId) {
      alert('Please save the product description first before adding quality expectations')
      return
    }

    try {
      const result = await addQualityExpectation(pdId, expectationData)
      if (result.success) {
        setQualityExpectations([...qualityExpectations, result.data])
        setShowForm(false)
      } else {
        alert('Error adding quality expectation: ' + result.error)
      }
    } catch (error) {
      console.error('Error adding quality expectation:', error)
      alert('Error adding quality expectation: ' + error.message)
    }
  }

  const handleDeleteExpectation = async (expectationId) => {
    if (!confirm('Are you sure you want to delete this quality expectation?')) return

    try {
      const result = await deleteQualityExpectation(expectationId)
      if (result.success) {
        setQualityExpectations(qualityExpectations.filter(e => e.id !== expectationId))
      } else {
        alert('Error deleting quality expectation: ' + result.error)
      }
    } catch (error) {
      console.error('Error deleting quality expectation:', error)
      alert('Error deleting quality expectation: ' + error.message)
    }
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Quality Expectations</h2>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Customer Quality Expectations
        </label>
        <textarea
          value={formData.customer_quality_expectations || ''}
          onChange={(e) => onChange('customer_quality_expectations', e.target.value)}
          disabled={mode === 'view'}
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          placeholder="Describe quality expected and standards/processes"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Quality Characteristics
        </label>
        <textarea
          value={formData.quality_characteristics || ''}
          onChange={(e) => onChange('quality_characteristics', e.target.value)}
          disabled={mode === 'view'}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          placeholder="Key quality characteristics (fast/slow, large/small, etc.)"
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">Detailed Quality Expectations</h3>
          {mode !== 'view' && pdId && (
            <button
              onClick={() => {
                setEditingExpectation(null)
                setShowForm(true)
              }}
              className="flex items-center px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Expectation
            </button>
          )}
        </div>

        {showForm && (
          <div className="mb-4 p-4 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800">
            <QualityExpectationForm
              expectation={editingExpectation}
              onSubmit={handleAddExpectation}
              onCancel={() => {
                setShowForm(false)
                setEditingExpectation(null)
              }}
            />
          </div>
        )}

        {qualityExpectations.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">
            No detailed quality expectations added yet. {mode !== 'view' && pdId && 'Click "Add Expectation" to add one.'}
          </p>
        ) : (
          <div className="space-y-3">
            {qualityExpectations.map(expectation => (
              <QualityExpectationCard
                key={expectation.id}
                expectation={expectation}
                onDelete={mode !== 'view' ? () => handleDeleteExpectation(expectation.id) : null}
                onEdit={mode !== 'view' ? () => {
                  setEditingExpectation(expectation)
                  setShowForm(true)
                } : null}
              />
            ))}
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Applicable Standards
        </label>
        <textarea
          value={formData.applicable_standards || ''}
          onChange={(e) => onChange('applicable_standards', e.target.value)}
          disabled={mode === 'view'}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          placeholder="Other standards to apply"
        />
      </div>
    </div>
  )
}
