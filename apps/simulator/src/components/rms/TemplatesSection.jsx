/**
 * Templates & Forms Section Component
 * Simplified version
 */

import { useState, useEffect } from 'react'
import { getTemplates } from '../../services/rmsTemplatesFormsService'

export default function TemplatesSection({ rmsId, readOnly = false }) {
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (rmsId) {
      loadTemplates()
    }
  }, [rmsId])

  const loadTemplates = async () => {
    try {
      setLoading(true)
      const result = await getTemplates(rmsId)
      if (result.success) {
        setTemplates(result.data || [])
      }
    } catch (error) {
      console.error('Error loading templates:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Templates & Forms
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Risk management templates and forms
        </p>
      </div>

      {loading ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">Loading templates...</div>
      ) : templates.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900 rounded-lg">
          <p>No templates defined yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {templates.map((template) => (
            <div key={template.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
              <div className="flex items-center gap-2 mb-2">
                <h4 className="text-lg font-semibold text-gray-900 dark:text-white">{template.template_name}</h4>
                {template.is_mandatory && (
                  <span className="px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded text-xs">
                    Mandatory
                  </span>
                )}
              </div>
              {template.template_purpose && <p className="text-gray-700 dark:text-gray-300">{template.template_purpose}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
