import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'

import { usePlatformProjectId } from '../../hooks/usePlatformProjectId.js'
import { supabase } from '../../services/supabaseClient'
import { format } from 'date-fns'
import { Plus, Package, CheckCircle, Clock, AlertCircle, FileText, CheckSquare, Link as LinkIcon, ExternalLink, BarChart3 } from 'lucide-react'
import ProductForm from '../../components/structured/ProductForm'
import QualityCriteria from '../../components/structured/QualityCriteria'
import { getProductDeliverables, createProductDescriptionFromDeliverable } from '../../services/productDeliverableService'
import { createPSAForProductDeliverable } from '../../services/productStatusAccountService'

export default function ManagingProductDelivery() {
  const { projectId, routeKey } = usePlatformProjectId()
  const navigate = useNavigate()
  const [project, setProject] = useState(null)
  const [workPackages, setWorkPackages] = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showProductForm, setShowProductForm] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [selectedWorkPackage, setSelectedWorkPackage] = useState(null)
  const [activeTab, setActiveTab] = useState('products') // 'products', 'quality', 'acceptance', 'handover'

  useEffect(() => {
    fetchData()
  }, [projectId])

  const fetchData = async () => {
    try {
      setLoading(true)

      // Fetch project
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('id, project_name, project_code')
        .eq('id', projectId)
        .eq('is_deleted', false)
        .single()

      if (projectError) throw projectError
      setProject(projectData)

      // Fetch work packages
      const { data: packagesData, error: packagesError } = await supabase
        .from('work_packages')
        .select('id, work_package_name, work_package_code')
        .eq('project_id', projectId)
        .eq('is_deleted', false)
        .order('work_package_name', { ascending: true })

      if (packagesError) throw packagesError
      setWorkPackages(packagesData || [])

      // Fetch products with Product Description links
      const productsResult = await getProductDeliverables(projectId)
      if (!productsResult.success) throw new Error(productsResult.error)
      setProducts(productsResult.data || [])

    } catch (error) {
      console.error('Error fetching data:', error)
      alert('Error: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateProduct = () => {
    setSelectedProduct(null)
    setShowProductForm(true)
  }

  const handleEditProduct = (product) => {
    setSelectedProduct(product)
    setShowProductForm(true)
  }

  const handleProductSaved = () => {
    setShowProductForm(false)
    setSelectedProduct(null)
    fetchData()
  }

  const handleWorkPackageFilter = (workPackageId) => {
    setSelectedWorkPackage(workPackageId)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading Managing Product Delivery...</p>
        </div>
      </div>
    )
  }

  const filteredProducts = selectedWorkPackage
    ? products.filter(p => p.work_package_id === selectedWorkPackage)
    : products

  const stats = {
    total: filteredProducts.length,
    inProgress: filteredProducts.filter(p => p.status === 'in_progress').length,
    completed: filteredProducts.filter(p => p.status === 'completed').length,
    accepted: filteredProducts.filter(p => p.status === 'accepted').length,
    handedOver: filteredProducts.filter(p => p.status === 'handed_over').length,
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <button
        onClick={() => navigate(`/projects/${projectId}`)}
        className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4"
      >
        ← Back to Project
      </button>

      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Managing Product Delivery
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          {project?.project_name} - Product Delivery Management
        </p>
      </div>

      {/* Work Package Filter */}
      {workPackages.length > 0 && (
        <div className="mb-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Filter by Work Package:
          </label>
          <select
            value={selectedWorkPackage || ''}
            onChange={(e) => handleWorkPackageFilter(e.target.value || null)}
            className="w-full md:w-auto px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          >
            <option value="">All Work Packages</option>
            {workPackages.map((wp) => (
              <option key={wp.id} value={wp.id}>
                {wp.work_package_code || wp.work_package_name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Products</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
            </div>
            <Package className="h-8 w-8 text-blue-500" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">In Progress</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.inProgress}</p>
            </div>
            <Clock className="h-8 w-8 text-yellow-500" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Completed</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.completed}</p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-500" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Accepted</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.accepted}</p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Handed Over</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.handedOver}</p>
            </div>
            <FileText className="h-8 w-8 text-purple-500" />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200 dark:border-gray-700">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('products')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'products'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            <Package className="h-4 w-4 inline mr-2" />
            Products
          </button>
          <button
            onClick={() => setActiveTab('quality')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'quality'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            <CheckSquare className="h-4 w-4 inline mr-2" />
            Quality
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'products' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Product Deliverables
            </h2>
            <button
              onClick={handleCreateProduct}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Create Product
            </button>
          </div>
          <ProductList
            products={filteredProducts}
            onEdit={handleEditProduct}
            onRefresh={fetchData}
            projectId={projectId}
            onCreateProductDescription={async (deliverableId) => {
              try {
                const { data: { user } } = await supabase.auth.getUser()
                if (!user) throw new Error('User not authenticated')
                
                // Get user ID from users table
                const { data: userData } = await supabase
                  .from('users')
                  .select('id')
                  .eq('auth_user_id', user.id)
                  .eq('is_deleted', false)
                  .single()

                if (!userData) throw new Error('User not found')

                const result = await createProductDescriptionFromDeliverable(deliverableId, userData.id)
                if (result.success) {
                  alert('Product Description created successfully!')
                  fetchData()
                } else {
                  alert('Error creating Product Description: ' + result.error)
                }
              } catch (error) {
                console.error('Error creating Product Description:', error)
                alert('Error: ' + error.message)
              }
            }}
          />
        </div>
      )}

      {activeTab === 'quality' && (
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Quality Criteria
          </h2>
          {selectedProduct ? (
            <QualityCriteria productId={selectedProduct.id} projectId={projectId} />
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-8 text-center text-gray-500 dark:text-gray-400">
              Select a product to view quality criteria
            </div>
          )}
        </div>
      )}

      {/* Product Form Modal */}
      {showProductForm && (
        <ProductForm
          product={selectedProduct}
          projectId={projectId}
          workPackages={workPackages}
          onSave={handleProductSaved}
          onCancel={() => {
            setShowProductForm(false)
            setSelectedProduct(null)
          }}
        />
      )}
    </div>
  )
}

// Product List Component
function ProductList({ products, onEdit, onRefresh, projectId, onCreateProductDescription }) {
  const [deletingId, setDeletingId] = useState(null)

  const handleDelete = async (productId) => {
    if (!confirm('Are you sure you want to delete this product?')) return

    try {
      setDeletingId(productId)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      const { error } = await supabase
        .from('product_deliverables')
        .update({
          is_deleted: true,
          deleted_by: user.id,
          deleted_at: new Date().toISOString(),
        })
        .eq('id', productId)

      if (error) throw error
      onRefresh()
    } catch (error) {
      console.error('Error deleting product:', error)
      alert('Error deleting product: ' + error.message)
    } finally {
      setDeletingId(null)
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'accepted':
      case 'handed_over':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
      case 'completed':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
      case 'rejected':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
    }
  }

  if (products.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
        <Package className="h-16 w-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          No Products yet
        </h3>
        <p className="text-gray-500 dark:text-gray-400">
          Create your first product deliverable to start managing product delivery
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {products.map((product) => (
        <div
          key={product.id}
          className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow"
        >
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {product.product_name}
                </h3>
                {product.product_code && (
                  <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded text-xs font-mono">
                    {product.product_code}
                  </span>
                )}
                <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(product.status)}`}>
                  {product.status.replace('_', ' ')}
                </span>
              </div>
              {product.product_description && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  {product.product_description}
                </p>
              )}
              {product.work_package && (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Work Package: {product.work_package.work_package_code || product.work_package.work_package_name}
                </p>
              )}
              {product.product_description && (
                <div className="mt-2 flex items-center gap-2">
                  <LinkIcon className="h-4 w-4 text-blue-500" />
                  <span className="text-xs text-blue-600 dark:text-blue-400">
                    Product Description: {product.product_description.pd_reference}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded ${
                    product.product_description.status === 'approved' 
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                      : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                  }`}>
                    {product.product_description.status}
                  </span>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={async () => {
                  try {
                    const { data: { user } } = await supabase.auth.getUser()
                    if (user) {
                      const { data: userData } = await supabase
                        .from('users')
                        .select('id')
                        .eq('auth_user_id', user.id)
                        .eq('is_deleted', false)
                        .single()
                      
                      if (userData) {
                        const result = await createPSAForProductDeliverable(product.id, null, userData.id)
                        if (result.success) {
                          alert('Product Status Account created successfully!')
                          window.location.href = `/app/projects/${projectId}/product-status-accounts/${result.data.id}`
                        } else {
                          alert('Error: ' + result.error)
                        }
                      }
                    }
                  } catch (error) {
                    console.error('Error creating Product Status Account:', error)
                    alert('Error: ' + error.message)
                  }
                }}
                className="p-2 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded"
                title="Create/View Product Status Account"
              >
                <BarChart3 className="h-4 w-4" />
              </button>
              {product.product_description ? (
                <button
                  onClick={() => window.location.href = `/app/projects/${projectId}/product-descriptions/${product.product_description.id}`}
                  className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
                  title="View Product Description"
                >
                  <ExternalLink className="h-4 w-4" />
                </button>
              ) : (
                <button
                  onClick={() => onCreateProductDescription && onCreateProductDescription(product.id)}
                  className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded"
                  title="Create Product Description"
                >
                  <Plus className="h-4 w-4" />
                </button>
              )}
              <button
                onClick={() => onEdit(product)}
                className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
                title="Edit Product"
              >
                <FileText className="h-4 w-4" />
              </button>
              <button
                onClick={() => handleDelete(product.id)}
                disabled={deletingId === product.id}
                className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded disabled:opacity-50"
                title="Delete Product"
              >
                <AlertCircle className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

