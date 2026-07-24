/**
 * CMS Templates Page
 * Manage CMS templates (PMO Admin)
 */

import { useState, useEffect } from 'react'
import { FileText, Plus, Search, Filter } from 'lucide-react'
import { platformDb } from '../services/supabaseClient'
import CMSTemplateSelector from '../components/cms/CMSTemplateSelector'

export default function CMSTemplates() {
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    loadTemplates()
  }, [searchTerm])

  const loadTemplates = async () => {
    try {
      setLoading(true)
      let query = platformDb
        .from('communication_management_strategies')
        .select(`
          *,
          project:project_id(id, project_name, project_code)
        `)
        .eq('is_deleted', false)
        .eq('status', 'approved')

      if (searchTerm) {
        query = query.or(`cms_reference.ilike.%${searchTerm}%,title.ilike.%${searchTerm}%,project.project_name.ilike.%${searchTerm}%`)
      }

      const { data, error } = await query.order('created_at', { ascending: false })

      if (error) throw error
      setTemplates(data || [])
    } catch (error) {
      console.error('Error loading templates:', error)
      alert('Error loading templates: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleTemplateSelect = (template) => {
    // In a full implementation, this could navigate to a create page with template data
    console.log('Template selected:', template)
    alert(`Template "${template.cms_reference || template.title}" selected. In full implementation, this would pre-fill a new CMS.`)
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          CMS Templates
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Manage approved Communication Management Strategy templates for use across projects
        </p>
      </div>

      {/* Search */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search templates..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>
      </div>

      {/* Templates */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading templates...</p>
        </div>
      ) : templates.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 dark:bg-gray-900 rounded-lg">
          <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            No Templates Available
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            Approved CMS documents will appear here as templates
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {templates.map((template) => (
            <div
              key={template.id}
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                    {template.title || template.cms_reference || 'Untitled CMS'}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {template.project?.project_name || 'Unknown Project'} • Version {template.version_number || '1.0'}
                  </p>
                  {template.purpose && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 line-clamp-2">
                      {template.purpose}
                    </p>
                  )}
                </div>
                <div className="ml-4">
                  <button
                    onClick={() => handleTemplateSelect(template)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm"
                  >
                    Use Template
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
