/**
 * Product Description Templates Page
 * Manage Product Description templates (PMO Admin)
 */

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../services/supabaseClient'
import { Shield, Search, Filter, Eye, Plus, Edit2, Trash2, Star, StarOff, FileText } from 'lucide-react'
import { getTemplates, getDefaultTemplate, setAsDefault, deleteTemplate } from '../../services/productDescriptionTemplateService'

export default function ProductDescriptionTemplates() {
  const navigate = useNavigate()
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [accountId, setAccountId] = useState(null)
  const [deletingTemplate, setDeletingTemplate] = useState(null)

  useEffect(() => {
    fetchAccountId()
  }, [])

  useEffect(() => {
    if (accountId) {
      fetchTemplates()
    }
  }, [accountId, categoryFilter])

  const fetchAccountId = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: userData } = await supabase
        .from('users')
        .select('id, account_id')
        .eq('auth_user_id', user.id)
        .eq('is_deleted', false)
        .single()

      if (userData?.account_id) {
        setAccountId(userData.account_id)
      } else {
        // Try as account owner
        const { data: accountData } = await supabase
          .from('accounts')
          .select('id')
          .eq('owner_user_id', userData.id)
          .eq('is_deleted', false)
          .limit(1)
          .single()

        if (accountData) {
          setAccountId(accountData.id)
        }
      }
    } catch (error) {
      console.error('Error fetching account ID:', error)
    }
  }

  const fetchTemplates = async () => {
    try {
      setLoading(true)
      const result = await getTemplates(accountId)
      if (result.success) {
        setTemplates(result.data || [])
      } else {
        alert('Error: ' + result.error)
      }
    } catch (error) {
      console.error('Error fetching templates:', error)
      alert('Error: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSetDefault = async (templateId) => {
    try {
      const result = await setAsDefault(templateId, accountId)
      if (result.success) {
        await fetchTemplates()
        alert('Template set as default successfully')
      } else {
        alert('Error: ' + result.error)
      }
    } catch (error) {
      console.error('Error setting default template:', error)
      alert('Error: ' + error.message)
    }
  }

  const handleDeleteTemplate = async (template) => {
    if (!confirm(`Are you sure you want to delete template "${template.template_name}"? This action cannot be undone.`)) {
      return
    }

    try {
      setDeletingTemplate(template.id)
      const result = await deleteTemplate(template.id)
      if (result.success) {
        alert('Template deleted successfully')
        fetchTemplates()
      } else {
        alert('Error: ' + result.error)
      }
    } catch (error) {
      console.error('Error deleting template:', error)
      alert('Error deleting template: ' + error.message)
    } finally {
      setDeletingTemplate(null)
    }
  }

  // Filter templates
  const filteredTemplates = templates.filter(template => {
    if (searchTerm) {
      const search = searchTerm.toLowerCase()
      return (
        template.template_name.toLowerCase().includes(search) ||
        (template.template_description && template.template_description.toLowerCase().includes(search))
      )
    }
    if (categoryFilter !== 'all') {
      return template.template_category === categoryFilter
    }
    return true
  })

  // Get unique categories
  const categories = ['all', ...new Set(templates.map(t => t.template_category).filter(Boolean))]

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading Product Description templates...</p>
        </div>
      </div>
    )
  }

  if (!accountId) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
          <Shield className="h-16 w-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            No Organization Found
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            You must be part of an organization to manage Product Description templates.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Product Description Templates
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Manage organization-level templates for Product Descriptions
        </p>
      </div>

      {/* Search and Filter */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search templates..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-5 w-5 text-gray-400" />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          >
            {categories.map(cat => (
              <option key={cat} value={cat}>
                {cat === 'all' ? 'All Categories' : cat}
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={() => navigate('/platform/pmo-admin/product-description-templates/create')}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Create Template
        </button>
      </div>

      {/* Templates List */}
      {filteredTemplates.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
          <FileText className="h-16 w-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            No Templates Found
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            {searchTerm || categoryFilter !== 'all'
              ? 'No templates match your search criteria.'
              : 'Create your first Product Description template to get started.'}
          </p>
          {!searchTerm && categoryFilter === 'all' && (
            <button
              onClick={() => navigate('/platform/pmo-admin/product-description-templates/create')}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg inline-flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Create Template
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredTemplates.map((template) => (
            <div
              key={template.id}
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {template.template_name}
                    </h3>
                    {template.is_default && (
                      <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" title="Default template" />
                    )}
                    {template.is_active ? (
                      <span className="px-2 py-1 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 rounded text-xs">
                        Active
                      </span>
                    ) : (
                      <span className="px-2 py-1 bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300 rounded text-xs">
                        Inactive
                      </span>
                    )}
                    {template.is_public && (
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 rounded text-xs">
                        Public
                      </span>
                    )}
                  </div>
                  {template.template_description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      {template.template_description}
                    </p>
                  )}
                  <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                    {template.template_category && (
                      <span>Category: {template.template_category}</span>
                    )}
                    <span>Created: {new Date(template.created_at).toLocaleDateString()}</span>
                  </div>
                  {template.product_title && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                      <span className="font-medium">Product Title:</span> {template.product_title}
                    </p>
                  )}
                </div>
                <div className="ml-4 flex gap-2">
                  <button
                    onClick={() => navigate(`/platform/pmo-admin/product-description-templates/${template.id}`)}
                    className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
                    title="View Template"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => navigate(`/platform/pmo-admin/product-description-templates/${template.id}/edit`)}
                    className="p-2 text-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 rounded"
                    title="Edit Template"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  {!template.is_default && (
                    <button
                      onClick={() => handleSetDefault(template.id)}
                      className="p-2 text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 rounded"
                      title="Set as Default"
                    >
                      <StarOff className="h-4 w-4" />
                    </button>
                  )}
                  <button
                    onClick={() => handleDeleteTemplate(template)}
                    disabled={deletingTemplate === template.id}
                    className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded disabled:opacity-50"
                    title="Delete Template"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
