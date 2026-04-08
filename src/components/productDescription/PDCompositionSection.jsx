/**
 * Product Description Composition Section
 */

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { addCompositionItem, deleteCompositionItem } from '../../services/pdCompositionItemsService'
import CompositionItemForm from './CompositionItemForm'
import CompositionItemCard from './CompositionItemCard'

export default function PDCompositionSection({ compositionItems, setCompositionItems, pdId, mode, projectId }) {
  const [showForm, setShowForm] = useState(false)
  const [editingItem, setEditingItem] = useState(null)

  const handleAddItem = async (itemData) => {
    if (!pdId) {
      alert('Please save the product description first before adding composition items')
      return
    }

    try {
      const result = await addCompositionItem(pdId, itemData)
      if (result.success) {
        setCompositionItems([...compositionItems, result.data])
        setShowForm(false)
      } else {
        alert('Error adding composition item: ' + result.error)
      }
    } catch (error) {
      console.error('Error adding composition item:', error)
      alert('Error adding composition item: ' + error.message)
    }
  }

  const handleDeleteItem = async (itemId) => {
    if (!confirm('Are you sure you want to delete this composition item?')) return

    try {
      const result = await deleteCompositionItem(itemId)
      if (result.success) {
        setCompositionItems(compositionItems.filter(item => item.id !== itemId))
      } else {
        alert('Error deleting composition item: ' + result.error)
      }
    } catch (error) {
      console.error('Error deleting composition item:', error)
      alert('Error deleting composition item: ' + error.message)
    }
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Product Composition</h2>

      <div>
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            If this product is composite (made up of sub-products), list them here.
          </p>
          {mode !== 'view' && pdId && (
            <button
              onClick={() => {
                setEditingItem(null)
                setShowForm(true)
              }}
              className="flex items-center px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Sub-Product
            </button>
          )}
        </div>

        {showForm && (
          <div className="mb-4 p-4 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800">
            <CompositionItemForm
              item={editingItem}
              onSubmit={handleAddItem}
              onCancel={() => {
                setShowForm(false)
                setEditingItem(null)
              }}
              projectId={projectId}
            />
          </div>
        )}

        {compositionItems.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">
            No composition items added yet. {mode !== 'view' && pdId && 'Click "Add Sub-Product" to add one.'}
          </p>
        ) : (
          <div className="space-y-3">
            {compositionItems.map(item => (
              <CompositionItemCard
                key={item.id}
                item={item}
                onDelete={mode !== 'view' ? () => handleDeleteItem(item.id) : null}
                onEdit={mode !== 'view' ? () => {
                  setEditingItem(item)
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
