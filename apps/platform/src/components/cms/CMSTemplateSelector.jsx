/**
 * CMS Template Selector Component
 * Select from organizational templates
 */

import { useState, useEffect } from 'react'
import { FileText, Loader } from 'lucide-react'
import { platformDb } from '../../services/supabaseClient'

export default function CMSTemplateSelector({ onSelect, selectedTemplateId = null }) {
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadTemplates()
  }, [])

  const loadTemplates = async () => {
    try {
      setLoading(true)
      const { data, error } = await platformDb
        .from('communication_management_strategies')
        .select('id, cms_reference, title, version_number, created_at')
        .eq('is_deleted', false)
        .eq('status', 'approved')
        .order('created_at', { ascending: false })
        .limit(20)

      if (error) throw error
      setTemplates(data || [])
    } catch (error) {
      console.error('Error loading templates:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSelect = (template) => {
    if (onSelect) {
      onSelect(template)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader className="w-5 h-5 animate-spin text-gray-400" />
        <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">Loading templates...</span>
      </div>
    )
  }

  if (templates.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        <FileText className="w-12 h-12 mx-auto mb-3 text-gray-400" />
        <p>No approved templates available</p>
        <p className="text-sm mt-1">Create a new CMS or use approved strategies as templates</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
        Select a template to use:
      </p>
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {templates.map((template) => (
          <button
            key={template.id}
            onClick={() => handleSelect(template)}
            className={`w-full text-left p-3 rounded-lg border transition-colors ${
              selectedTemplateId === template.id
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900 dark:text-white">
                  {template.title || template.cms_reference || 'Untitled CMS'}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Version {template.version_number || '1.0'} • {new Date(template.created_at).toLocaleDateString()}
                </p>
              </div>
              <FileText className="w-5 h-5 text-gray-400" />
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
