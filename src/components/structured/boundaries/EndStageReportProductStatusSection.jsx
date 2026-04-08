import { useState } from 'react'
import { Package, Plus, Edit2, Trash2, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import { addProductStatus, updateProductStatus, deleteProductStatus, syncProductsFromStage } from '../../../services/endStageReportProductService'

export default function EndStageReportProductStatusSection({ reportId, productStatuses, onProductStatusesChange, mode, stageId }) {
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [syncing, setSyncing] = useState(false)

  const handleSync = async () => {
    if (!stageId) {
      alert('Stage ID is required to sync products')
      return
    }

    try {
      setSyncing(true)
      const synced = await syncProductsFromStage(reportId, stageId)
      onProductStatusesChange([...productStatuses, ...synced])
      alert(`Synced ${synced.length} products from stage`)
    } catch (error) {
      console.error('Error syncing products:', error)
      alert('Error syncing products: ' + error.message)
    } finally {
      setSyncing(false)
    }
  }

  const handleAdd = async (productData) => {
    try {
      const added = await addProductStatus(reportId, productData)
      onProductStatusesChange([...productStatuses, added])
      setShowAddForm(false)
    } catch (error) {
      console.error('Error adding product status:', error)
      alert('Error adding product status: ' + error.message)
    }
  }

  const handleUpdate = async (productStatusId, updates) => {
    try {
      const updated = await updateProductStatus(productStatusId, updates)
      onProductStatusesChange(productStatuses.map(p => p.id === productStatusId ? updated : p))
      setEditingId(null)
    } catch (error) {
      console.error('Error updating product status:', error)
      alert('Error updating product status: ' + error.message)
    }
  }

  const handleDelete = async (productStatusId) => {
    if (!confirm('Delete this product status?')) return

    try {
      await deleteProductStatus(productStatusId)
      onProductStatusesChange(productStatuses.filter(p => p.id !== productStatusId))
    } catch (error) {
      console.error('Error deleting product status:', error)
      alert('Error deleting product status: ' + error.message)
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'in-progress':
        return <AlertCircle className="h-4 w-4 text-yellow-600" />
      case 'cancelled':
        return <XCircle className="h-4 w-4 text-red-600" />
      default:
        return <Package className="h-4 w-4 text-gray-400" />
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">Product/Deliverable Status</h3>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              Track the status of products and deliverables for this stage.
            </p>
          </div>
          {mode !== 'view' && (
            <div className="flex gap-2">
              {stageId && (
                <button
                  onClick={handleSync}
                  disabled={syncing}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm disabled:opacity-50"
                >
                  {syncing ? 'Syncing...' : 'Sync from Stage'}
                </button>
              )}
              <button
                onClick={() => setShowAddForm(true)}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center gap-2 text-sm"
              >
                <Plus className="h-4 w-4" />
                Add Product
              </button>
            </div>
          )}
        </div>
      </div>

      {productStatuses.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No products added yet.</p>
          {mode !== 'view' && stageId && (
            <button
              onClick={handleSync}
              className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm"
            >
              Sync Products from Stage
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {productStatuses.map((product) => (
            <div key={product.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    {getStatusIcon(product.completion_status)}
                    <h4 className="font-semibold text-gray-900 dark:text-white">{product.product_name}</h4>
                    <span className={`px-2 py-1 rounded text-xs ${
                      product.completion_status === 'completed'
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                        : product.completion_status === 'in-progress'
                        ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                    }`}>
                      {product.completion_status}
                    </span>
                    <span className={`px-2 py-1 rounded text-xs ${
                      product.quality_status === 'approved'
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                        : product.quality_status === 'off-specification'
                        ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                        : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                    }`}>
                      {product.quality_status}
                    </span>
                  </div>
                  {product.product_description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{product.product_description}</p>
                  )}
                  <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                    {product.approval_date && (
                      <span>Approved: {new Date(product.approval_date).toLocaleDateString()}</span>
                    )}
                    {product.handover_date && (
                      <span>Handover: {new Date(product.handover_date).toLocaleDateString()}</span>
                    )}
                  </div>
                </div>
                {mode !== 'view' && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setEditingId(product.id)}
                      className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(product.id)}
                      className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Form Modal would go here */}
    </div>
  )
}
