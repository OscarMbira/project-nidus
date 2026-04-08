import { useState, useEffect } from 'react'
import { Package, Plus, X, Edit2 } from 'lucide-react'
import { getProductsByReport, addProduct, updateProduct, deleteProduct } from '../../services/checkpointReportProductsService'
import { getWorkPackage } from '../../services/controllingStageService'

export default function CurrentPeriodProductsSection({ reportId, products, onProductsChange, workPackageId, mode }) {
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [wpProducts, setWpProducts] = useState([])
  const [newProduct, setNewProduct] = useState({
    product_name: '',
    product_description: '',
    product_status: 'in_development',
    period_type: 'current',
    quality_status: 'not_started',
    planned_start_date: null,
    planned_end_date: null
  })

  useEffect(() => {
    if (workPackageId) {
      loadWorkPackageProducts()
    }
  }, [workPackageId])

  useEffect(() => {
    if (reportId && products.length === 0) {
      loadProducts()
    }
  }, [reportId])

  const loadWorkPackageProducts = async () => {
    try {
      const wp = await getWorkPackage(workPackageId)
      if (wp?.products_deliverables) {
        setWpProducts(wp.products_deliverables)
      }
    } catch (error) {
      console.error('Error loading work package products:', error)
    }
  }

  const loadProducts = async () => {
    try {
      const data = await getProductsByReport(reportId, 'current')
      onProductsChange(data)
    } catch (error) {
      console.error('Error loading products:', error)
    }
  }

  const handleAdd = async () => {
    if (!newProduct.product_name.trim()) return

    try {
      const added = await addProduct(reportId, newProduct)
      onProductsChange([...products, added])
      setNewProduct({
        product_name: '',
        product_description: '',
        product_status: 'in_development',
        period_type: 'current',
        quality_status: 'not_started',
        planned_start_date: null,
        planned_end_date: null
      })
      setShowAddForm(false)
    } catch (error) {
      console.error('Error adding product:', error)
      alert('Error adding product: ' + error.message)
    }
  }

  const handleUpdate = async (productId, updates) => {
    try {
      const updated = await updateProduct(productId, updates)
      onProductsChange(products.map(p => p.id === productId ? updated : p))
      setEditingId(null)
    } catch (error) {
      console.error('Error updating product:', error)
      alert('Error updating product: ' + error.message)
    }
  }

  const handleDelete = async (productId) => {
    if (!confirm('Delete this product?')) return

    try {
      await deleteProduct(productId)
      onProductsChange(products.filter(p => p.id !== productId))
    } catch (error) {
      console.error('Error deleting product:', error)
      alert('Error deleting product: ' + error.message)
    }
  }

  const handleAddFromWP = async (productName) => {
    try {
      const added = await addProduct(reportId, {
        product_name: productName,
        product_status: 'in_development',
        period_type: 'current',
        quality_status: 'not_started'
      })
      onProductsChange([...products, added])
    } catch (error) {
      console.error('Error adding product from WP:', error)
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">Products & Deliverables</h3>
        <p className="text-sm text-blue-700 dark:text-blue-300">
          Track products being developed or completed during this reporting period.
        </p>
      </div>

      {wpProducts.length > 0 && products.length === 0 && mode !== 'view' && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <p className="text-sm text-yellow-800 dark:text-yellow-200 mb-3">
            Work Package has {wpProducts.length} product(s) defined. Add them to this report:
          </p>
          <div className="flex flex-wrap gap-2">
            {wpProducts.map((productName, idx) => (
              <button
                key={idx}
                onClick={() => handleAddFromWP(productName)}
                className="px-3 py-1 bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 rounded-lg text-sm hover:bg-yellow-200 dark:hover:bg-yellow-800"
              >
                + {productName}
              </button>
            ))}
          </div>
        </div>
      )}

      {products.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No products added yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {products.map((product) => (
            <div
              key={product.id}
              className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-800"
            >
              {editingId === product.id ? (
                <ProductEditForm
                  product={product}
                  onSave={(updates) => handleUpdate(product.id, updates)}
                  onCancel={() => setEditingId(null)}
                />
              ) : (
                <>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-semibold text-gray-900 dark:text-white">{product.product_name}</h4>
                        <span className={`px-2 py-1 text-xs rounded ${
                          product.product_status === 'completed'
                            ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                            : product.product_status === 'quality_check'
                            ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200'
                            : 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200'
                        }`}>
                          {product.product_status.replace('_', ' ')}
                        </span>
                        <span className={`px-2 py-1 text-xs rounded ${
                          product.quality_status === 'passed'
                            ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                            : product.quality_status === 'failed'
                            ? 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                        }`}>
                          Quality: {product.quality_status.replace('_', ' ')}
                        </span>
                      </div>
                      {product.product_description && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{product.product_description}</p>
                      )}
                      {product.planned_end_date && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Planned end: {new Date(product.planned_end_date).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    {mode !== 'view' && (
                      <div className="flex gap-2 ml-4">
                        <button
                          onClick={() => setEditingId(product.id)}
                          className="p-2 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(product.id)}
                          className="p-2 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 rounded"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {mode !== 'view' && (
        <>
          {showAddForm ? (
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-900">
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Product Name *
                  </label>
                  <input
                    type="text"
                    value={newProduct.product_name}
                    onChange={(e) => setNewProduct({ ...newProduct, product_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    placeholder="Product/deliverable name..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Description
                  </label>
                  <textarea
                    value={newProduct.product_description}
                    onChange={(e) => setNewProduct({ ...newProduct, product_description: e.target.value })}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Status
                    </label>
                    <select
                      value={newProduct.product_status}
                      onChange={(e) => setNewProduct({ ...newProduct, product_status: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    >
                      <option value="in_development">In Development</option>
                      <option value="completed">Completed</option>
                      <option value="quality_check">Quality Check</option>
                      <option value="approved">Approved</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Quality Status
                    </label>
                    <select
                      value={newProduct.quality_status}
                      onChange={(e) => setNewProduct({ ...newProduct, quality_status: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    >
                      <option value="not_started">Not Started</option>
                      <option value="in_progress">In Progress</option>
                      <option value="passed">Passed</option>
                      <option value="failed">Failed</option>
                      <option value="waived">Waived</option>
                    </select>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleAdd}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                  >
                    Add
                  </button>
                  <button
                    onClick={() => setShowAddForm(false)}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowAddForm(true)}
              className="w-full px-4 py-2 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-400 hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 flex items-center justify-center gap-2"
            >
              <Plus className="h-5 w-5" />
              Add Product
            </button>
          )}
        </>
      )}
    </div>
  )
}

function ProductEditForm({ product, onSave, onCancel }) {
  const [formData, setFormData] = useState(product)

  return (
    <div className="space-y-3">
      <input
        type="text"
        value={formData.product_name}
        onChange={(e) => setFormData({ ...formData, product_name: e.target.value })}
        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
      />
      <div className="grid grid-cols-2 gap-2">
        <select
          value={formData.product_status}
          onChange={(e) => setFormData({ ...formData, product_status: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
        >
          <option value="in_development">In Development</option>
          <option value="completed">Completed</option>
          <option value="quality_check">Quality Check</option>
          <option value="approved">Approved</option>
        </select>
        <select
          value={formData.quality_status}
          onChange={(e) => setFormData({ ...formData, quality_status: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
        >
          <option value="not_started">Not Started</option>
          <option value="in_progress">In Progress</option>
          <option value="passed">Passed</option>
          <option value="failed">Failed</option>
          <option value="waived">Waived</option>
        </select>
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => onSave(formData)}
          className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm"
        >
          Save
        </button>
        <button
          onClick={onCancel}
          className="px-3 py-1 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded text-sm hover:bg-gray-50 dark:hover:bg-gray-700"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
