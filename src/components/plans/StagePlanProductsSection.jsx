/**
 * Stage Plan Products Section
 */

import { useState, useEffect } from 'react'
import { Plus } from 'lucide-react'
import { platformDb } from '../../services/supabase/supabaseClient'
import { addProduct, deleteProduct } from '../../services/stagePlanProductService'
import ProductForm from './ProductForm'
import ProductCard from './ProductCard'

export default function StagePlanProductsSection({ 
  formData, 
  onChange, 
  products, 
  setProducts, 
  planId, 
  mode,
  projectId
}) {
  const [showProductForm, setShowProductForm] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  const [workPackages, setWorkPackages] = useState([])
  const [ppdCompositionItems, setPpdCompositionItems] = useState([])

  useEffect(() => {
    if (projectId) {
      loadRelatedData()
    }
  }, [projectId])

  const loadRelatedData = async () => {
    try {
      const { data: wpData } = await platformDb
        .from('work_packages')
        .select('id, work_package_name')
        .eq('project_id', projectId)
        .eq('is_deleted', false)
      setWorkPackages(wpData || [])

      // Load PPD composition items if PPD exists
      const { data: ppdData } = await platformDb
        .from('project_product_descriptions')
        .select('id')
        .eq('project_id', projectId)
        .eq('is_deleted', false)
        .limit(1)
        .maybeSingle()

      if (ppdData) {
        const { data: compData } = await platformDb
          .from('ppd_composition_items')
          .select('id, product_name')
          .eq('ppd_id', ppdData.id)
          .eq('is_deleted', false)
        setPpdCompositionItems(compData || [])
      }
    } catch (error) {
      console.error('Error loading related data:', error)
    }
  }

  const handleAddProduct = async (productData) => {
    if (!planId) {
      alert('Please save the plan first before adding products')
      return
    }

    try {
      const result = await addProduct(planId, productData)
      if (result.success) {
        setProducts([...products, result.data])
        setShowProductForm(false)
      } else {
        alert('Error adding product: ' + result.error)
      }
    } catch (error) {
      console.error('Error adding product:', error)
      alert('Error adding product: ' + error.message)
    }
  }

  const handleDeleteProduct = async (productId) => {
    if (!confirm('Are you sure you want to delete this product?')) return

    try {
      const result = await deleteProduct(productId)
      if (result.success) {
        setProducts(products.filter(p => p.id !== productId))
      } else {
        alert('Error deleting product: ' + result.error)
      }
    } catch (error) {
      console.error('Error deleting product:', error)
      alert('Error deleting product: ' + error.message)
    }
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Products & Deliverables</h2>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Products Summary
        </label>
        <textarea
          value={formData.products_summary || ''}
          onChange={(e) => onChange('products_summary', e.target.value)}
          disabled={mode === 'view'}
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          placeholder="Enter products summary"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Acceptance Criteria
        </label>
        <textarea
          value={formData.acceptance_criteria || ''}
          onChange={(e) => onChange('acceptance_criteria', e.target.value)}
          disabled={mode === 'view'}
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          placeholder="Enter acceptance criteria"
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">Product Details</h3>
          {mode !== 'view' && planId && (
            <button
              onClick={() => {
                setEditingProduct(null)
                setShowProductForm(true)
              }}
              className="flex items-center px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Product
            </button>
          )}
        </div>

        {showProductForm && (
          <div className="mb-4 p-4 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800">
            <ProductForm
              product={editingProduct}
              onSubmit={handleAddProduct}
              onCancel={() => {
                setShowProductForm(false)
                setEditingProduct(null)
              }}
              workPackages={workPackages}
              ppdCompositionItems={ppdCompositionItems}
            />
          </div>
        )}

        {products.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">
            No products added yet. {mode !== 'view' && planId && 'Click "Add Product" to add one.'}
          </p>
        ) : (
          <div className="space-y-3">
            {products.map(product => (
              <ProductCard
                key={product.id}
                product={product}
                onDelete={mode !== 'view' ? () => handleDeleteProduct(product.id) : null}
                onEdit={mode !== 'view' ? () => {
                  setEditingProduct(product)
                  setShowProductForm(true)
                } : null}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
