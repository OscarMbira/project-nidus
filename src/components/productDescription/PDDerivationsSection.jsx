/**
 * Product Description Derivations Section
 */

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { addDerivation, deleteDerivation } from '../../services/pdDerivationsService'
import DerivationForm from './DerivationForm'
import DerivationCard from './DerivationCard'

export default function PDDerivationsSection({ derivations, setDerivations, pdId, mode, projectId }) {
  const [showForm, setShowForm] = useState(false)
  const [editingDerivation, setEditingDerivation] = useState(null)

  const handleAddDerivation = async (derivationData) => {
    if (!pdId) {
      alert('Please save the product description first before adding derivations')
      return
    }

    try {
      const result = await addDerivation(pdId, derivationData)
      if (result.success) {
        setDerivations([...derivations, result.data])
        setShowForm(false)
      } else {
        alert('Error adding derivation: ' + result.error)
      }
    } catch (error) {
      console.error('Error adding derivation:', error)
      alert('Error adding derivation: ' + error.message)
    }
  }

  const handleDeleteDerivation = async (derivationId) => {
    if (!confirm('Are you sure you want to delete this derivation?')) return

    try {
      const result = await deleteDerivation(derivationId)
      if (result.success) {
        setDerivations(derivations.filter(d => d.id !== derivationId))
      } else {
        alert('Error deleting derivation: ' + result.error)
      }
    } catch (error) {
      console.error('Error deleting derivation:', error)
      alert('Error deleting derivation: ' + error.message)
    }
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Derivation</h2>

      <div>
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            List source products, specifications, or documents from which this product is derived.
          </p>
          {mode !== 'view' && pdId && (
            <button
              onClick={() => {
                setEditingDerivation(null)
                setShowForm(true)
              }}
              className="flex items-center px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Derivation
            </button>
          )}
        </div>

        {showForm && (
          <div className="mb-4 p-4 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800">
            <DerivationForm
              derivation={editingDerivation}
              onSubmit={handleAddDerivation}
              onCancel={() => {
                setShowForm(false)
                setEditingDerivation(null)
              }}
              projectId={projectId}
            />
          </div>
        )}

        {derivations.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">
            No derivations added yet. {mode !== 'view' && pdId && 'Click "Add Derivation" to add one.'}
          </p>
        ) : (
          <div className="space-y-3">
            {derivations.map(derivation => (
              <DerivationCard
                key={derivation.id}
                derivation={derivation}
                onDelete={mode !== 'view' ? () => handleDeleteDerivation(derivation.id) : null}
                onEdit={mode !== 'view' ? () => {
                  setEditingDerivation(derivation)
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
