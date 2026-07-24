/**
 * PPD Derivation Section Component
 * Displays and manages derivations (source products/documents)
 */

import { useState, useEffect } from 'react'
import { Plus, Trash2, Edit2, ExternalLink, BookOpen } from 'lucide-react'
import { getDerivations, deleteDerivation } from '../../services/ppdDerivationsService'
import DerivationItemCard from './DerivationItemCard'
import DerivationItemForm from './DerivationItemForm'

export default function DerivationSection({ ppdId, mode = 'view', projectId }) {
  const [derivations, setDerivations] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [selectedDerivation, setSelectedDerivation] = useState(null)

  useEffect(() => {
    if (ppdId) {
      loadDerivations()
    }
  }, [ppdId])

  const loadDerivations = async () => {
    try {
      setLoading(true)
      const result = await getDerivations(ppdId)
      if (result.success) {
        setDerivations(result.data || [])
      }
    } catch (error) {
      console.error('Error loading derivations:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = () => {
    setSelectedDerivation(null)
    setShowForm(true)
  }

  const handleEdit = (derivation) => {
    setSelectedDerivation(derivation)
    setShowForm(true)
  }

  const handleDelete = async (derivationId) => {
    if (!confirm('Are you sure you want to delete this derivation?')) {
      return
    }

    try {
      const result = await deleteDerivation(derivationId)
      if (result.success) {
        await loadDerivations()
      } else {
        alert('Error deleting derivation: ' + result.error)
      }
    } catch (error) {
      console.error('Error deleting derivation:', error)
      alert('Error deleting derivation: ' + error.message)
    }
  }

  const handleFormClose = () => {
    setShowForm(false)
    setSelectedDerivation(null)
    loadDerivations()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading derivations...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Derivations</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Source products and documents from which this project product is derived
          </p>
        </div>
        {mode !== 'view' && (
          <button
            onClick={handleAdd}
            className="flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Derivation
          </button>
        )}
      </div>

      {showForm && (
        <DerivationItemForm
          ppdId={ppdId}
          derivation={selectedDerivation}
          mode={selectedDerivation ? 'edit' : 'create'}
          projectId={projectId}
          onSave={handleFormClose}
          onCancel={() => {
            setShowForm(false)
            setSelectedDerivation(null)
          }}
        />
      )}

      {derivations.length === 0 ? (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
          <BookOpen className="h-16 w-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            No Derivations
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            Add source products and documents from which this project product is derived
          </p>
          {mode !== 'view' && (
            <button
              onClick={handleAdd}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add First Derivation
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {derivations.map((derivation) => (
            <DerivationItemCard
              key={derivation.id}
              derivation={derivation}
              mode={mode}
              onEdit={mode !== 'view' ? () => handleEdit(derivation) : null}
              onDelete={mode !== 'view' ? () => handleDelete(derivation.id) : null}
              projectId={projectId}
            />
          ))}
        </div>
      )}
    </div>
  )
}
