import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../services/supabaseClient'
import { Shield, Search, Filter, Eye, Plus, Edit2, Trash2, Star, StarOff } from 'lucide-react'
import { getTemplates, getDefaultTemplate, setAsDefault, deleteTemplate } from '../services/qmsTemplateService'

export default function QMSTemplates() {
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
      // Get user's account (via projects)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: userData } = await supabase
        .from('users')
        .select('id')
        .eq('auth_user_id', user.id)
        .single()

      if (!userData) return

      // Get first project the user is a member of to get account_id
      const { data: projectData } = await supabase
        .from('user_projects')
        .select('project:projects(id, account_id)')
        .eq('user_id', userData.id)
        .eq('is_deleted', false)
        .limit(1)
        .single()

      if (projectData?.project?.account_id) {
        setAccountId(projectData.project.account_id)
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
      const templatesData = await getTemplates(accountId)
      setTemplates(templatesData || [])
    } catch (error) {
      console.error('Error fetching templates:', error)
      alert('Error: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSetDefault = async (templateId) => {
    try {
      await setAsDefault(templateId)
      await fetchTemplates() // Refresh list
      alert('Template set as default successfully')
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
      await deleteTemplate(template.id)
      alert('Template deleted successfully')
      fetchTemplates() // Refresh list
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading QMS templates...</p>
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
            You must be part of an organization to manage QMS templates.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            QMS Templates
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Manage organization-level Quality Management Strategy templates
          </p>
        </div>
        <button
          onClick={() => navigate('/app/qms/list')}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 transition-colors"
        >
          <Plus className="h-5 w-5" />
          Create Template
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search templates..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
          </div>

          {/* Category Filter */}
          <div className="sm:w-48">
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 appearance-none"
              >
                <option value="all">All Categories</option>
                <option value="default">Default</option>
                <option value="industry">Industry</option>
                <option value="project_type">Project Type</option>
                <option value="custom">Custom</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Templates List */}
      {filteredTemplates.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
          <Shield className="h-16 w-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            No QMS Templates
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            {searchTerm || categoryFilter !== 'all' 
              ? 'No templates match your filters'
              : 'No quality management strategy templates have been created yet'}
          </p>
          {!searchTerm && categoryFilter === 'all' && (
            <button
              onClick={() => navigate('/app/qms/list')}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 mx-auto transition-colors"
            >
              <Plus className="h-5 w-5" />
              Create Your First Template
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTemplates.map((template, index) => (
            <div
              key={template.id}
              className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {template.template_name}
                    </h3>
                    {template.is_default && (
                      <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                    )}
                  </div>
                  {template.template_category && (
                    <span className="inline-block px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-xs">
                      {template.template_category}
                    </span>
                  )}
                </div>
              </div>

              {template.template_description && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-3">
                  {template.template_description}
                </p>
              )}

              <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2">
                  {!template.is_default && (
                    <button
                      onClick={() => handleSetDefault(template.id)}
                      className="text-yellow-600 hover:text-yellow-700 dark:text-yellow-400 dark:hover:text-yellow-300"
                      title="Set as default"
                    >
                      <StarOff className="h-4 w-4" />
                    </button>
                  )}
                  <button
                    onClick={() => handleDeleteTemplate(template)}
                    disabled={deletingTemplate === template.id}
                    className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 disabled:opacity-50"
                    title="Delete template"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <button
                  onClick={() => navigate(`/app/qms/templates/${template.id}`)}
                  className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1 text-sm"
                >
                  <Eye className="h-4 w-4" />
                  View
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
