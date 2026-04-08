/**
 * Product Description Template Selector Component
 * Select from organizational templates
 */

import { useState, useEffect } from 'react'
import { FileText, Loader, Star, CheckCircle } from 'lucide-react'
import { getTemplates, getDefaultTemplate } from '../../services/productDescriptionTemplateService'
import { supabase } from '../../services/supabaseClient'

export default function PDTemplateSelector({ onSelect, selectedTemplateId = null, accountId = null }) {
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(false)
  const [defaultTemplate, setDefaultTemplate] = useState(null)

  useEffect(() => {
    loadTemplates()
  }, [accountId])

  const loadTemplates = async () => {
    try {
      setLoading(true)
      
      // Get account ID if not provided
      let orgAccountId = accountId
      if (!orgAccountId) {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data: userData } = await supabase
            .from('users')
            .select('account_id')
            .eq('auth_user_id', user.id)
            .eq('is_deleted', false)
            .single()
          
          if (userData) {
            orgAccountId = userData.account_id
          }
        }
      }

      if (!orgAccountId) {
        setTemplates([])
        return
      }

      // Get default template
      const defaultResult = await getDefaultTemplate(orgAccountId)
      if (defaultResult.success && defaultResult.data) {
        setDefaultTemplate(defaultResult.data)
      }

      // Get all templates
      const result = await getTemplates(orgAccountId)
      if (result.success) {
        setTemplates(result.data || [])
      }
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
        <p>No templates available</p>
        <p className="text-sm mt-1">PMO Admins can create templates in the template management page</p>
      </div>
    )
  }

  // Sort templates: default first, then by name
  const sortedTemplates = [...templates].sort((a, b) => {
    if (a.is_default && !b.is_default) return -1
    if (!a.is_default && b.is_default) return 1
    return a.template_name.localeCompare(b.template_name)
  })

  return (
    <div className="space-y-2">
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
        Select a template to use:
      </p>
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {sortedTemplates.map((template) => (
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
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-gray-900 dark:text-white">
                    {template.template_name}
                  </p>
                  {template.is_default && (
                    <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" title="Default template" />
                  )}
                  {template.is_active && (
                    <CheckCircle className="w-4 h-4 text-green-500" title="Active" />
                  )}
                </div>
                {template.template_description && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                    {template.template_description}
                  </p>
                )}
                {template.template_category && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Category: {template.template_category}
                  </p>
                )}
              </div>
              <FileText className="w-5 h-5 text-gray-400" />
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
