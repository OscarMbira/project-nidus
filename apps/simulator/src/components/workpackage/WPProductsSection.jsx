/**
 * Work Package Products Section Component
 * Displays and manages Work Package products/deliverables
 */

import { useState, useEffect } from 'react'
import { Plus, Package } from 'lucide-react'
import { getProducts, deleteProduct } from '../../services/wpProductsService'
import WPProductCard from './WPProductCard'
import WPProductForm from './WPProductForm'

export default function WPProductsSection({ wpId, mode = 'view' }) {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState(null)

  useEffect(() => {
    if (wpId) {
      loadProducts()
    }
  }, [wpId])

  const loadProducts = async () => {
    try {
      setLoading(true)
      const result = await getProducts(wpId)
      if (result.success) {
        setProducts(result.data || [])
      }
    } catch (error) {
      console.error('Error loading products:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = () => {
    setSelectedProduct(null)
    setShowForm(true)
  }

  const handleEdit = (product) => {
    setSelectedProduct(product)
    setShowForm(true)
  }

  const handleDelete = async (productId) => {
    if (!confirm('Are you sure you want to delete this product?')) {
      return
    }

    try {
      const result = await deleteProduct(productId)
      if (result.success) {
        await loadProducts()
      } else {
        alert('Error deleting product: ' + result.error)
      }
    } catch (error) {
      console.error('Error deleting product:', error)
      alert('Error deleting product: ' + error.message)
    }
  }

  const handleFormClose = () => {
    setShowForm(false)
    setSelectedProduct(null)
    loadProducts()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading products...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Products/Deliverables</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Products and deliverables to be produced by this work package
          </p>
        </div>
        {mode !== 'view' && (
          <button
            onClick={handleAdd}
            className="flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Product
          </button>
        )}
      </div>

      {showForm && (
        <WPProductForm
          wpId={wpId}
          product={selectedProduct}
          mode={selectedProduct ? 'edit' : 'create'}
          onSave={handleFormClose}
          onCancel={() => {
            setShowForm(false)
            setSelectedProduct(null)
          }}
        />
      )}

      {products.length === 0 ? (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
          <Package className="h-16 w-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            No Products Defined
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            Add products and deliverables that will be produced by this work package
          </p>
          {mode !== 'view' && (
            <button
              onClick={handleAdd}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add First Product
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {products.map((product) => (
            <WPProductCard
              key={product.id}
              product={product}
              mode={mode}
              onEdit={mode !== 'view' ? () => handleEdit(product) : null}
              onDelete={mode !== 'view' ? () => handleDelete(product.id) : null}
            />
          ))}
        </div>
      )}
    </div>
  )
}
