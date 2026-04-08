/**
 * Tailor Document Modal
 * 
 * Modal for creating a tailored (project-specific) copy of a PMO baseline document
 */

import { useState, useEffect } from 'react'
import { X, GitFork, AlertCircle } from 'lucide-react'
import { createTailoredCopy } from '../../services/documentTailoringService'
import { getMyProjects } from '../../services/projectService'
import { platformDb } from '../../services/supabase/supabaseClient'
import toast from 'react-hot-toast'

export default function TailorDocumentModal({ 
  isOpen, 
  onClose, 
  documentType, 
  baselineDocument,
  onSuccess 
}) {
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    projectId: '',
    justification: ''
  })
  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (isOpen) {
      loadProjects()
      setFormData({ projectId: '', justification: '' })
      setErrors({})
    }
  }, [isOpen])

  const loadProjects = async () => {
    try {
      setLoading(true)
      const { data: { user } } = await platformDb.auth.getUser()
      if (!user) return

      const { data: userRecord } = await platformDb
        .from('users')
        .select('id')
        .eq('auth_user_id', user.id)
        .single()

      if (userRecord) {
        const result = await getMyProjects(userRecord.id)
        if (result.success) {
          setProjects(result.data || [])
        }
      }
    } catch (error) {
      console.error('Error loading projects:', error)
      toast.error('Failed to load projects')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // Validation
    const newErrors = {}
    if (!formData.projectId) {
      newErrors.projectId = 'Please select a project'
    }
    if (!formData.justification || formData.justification.trim().length < 20) {
      newErrors.justification = 'Please provide a justification (minimum 20 characters)'
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    try {
      setSubmitting(true)
      await createTailoredCopy(
        documentType,
        baselineDocument.id,
        formData.projectId,
        formData.justification.trim()
      )
      
      toast.success('Tailored document created successfully')
      onSuccess?.()
      onClose()
    } catch (error) {
      console.error('Error creating tailored copy:', error)
      toast.error(error.message || 'Failed to create tailored document')
    } finally {
      setSubmitting(false)
    }
  }

  if (!isOpen) return null

  const documentTypeLabels = {
    'mandate': 'Project Mandate',
    'communication-strategy': 'Communication Management Strategy',
    'configuration-strategy': 'Configuration Management Strategy',
    'quality-strategy': 'Quality Management Strategy',
    'risk-strategy': 'Risk Management Strategy'
  }

  const documentLabel = documentTypeLabels[documentType] || documentType

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                <GitFork className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Tailor {documentLabel}
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Create a project-specific copy of this baseline document
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Baseline Document Info */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <h3 className="font-medium text-blue-900 dark:text-blue-200 mb-1">
                    Baseline Document
                  </h3>
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    {baselineDocument?.document_name || baselineDocument?.title || 'Baseline Document'}
                  </p>
                  {baselineDocument?.version_number && (
                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                      Version: {baselineDocument.version_number}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Project Selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Select Project *
              </label>
              <select
                value={formData.projectId}
                onChange={(e) => {
                  setFormData({ ...formData, projectId: e.target.value })
                  setErrors({ ...errors, projectId: '' })
                }}
                className={`w-full px-4 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.projectId
                    ? 'border-red-500'
                    : 'border-gray-300 dark:border-gray-600'
                }`}
                disabled={loading || submitting}
              >
                <option value="">{loading ? 'Loading projects...' : 'Select a project'}</option>
                {projects.map(project => (
                  <option key={project.id} value={project.id}>
                    {project.project_name} {project.project_code ? `(${project.project_code})` : ''}
                  </option>
                ))}
              </select>
              {errors.projectId && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.projectId}</p>
              )}
              {projects.length === 0 && !loading && (
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  No projects available. Please create a project first.
                </p>
              )}
            </div>

            {/* Justification */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Justification for Tailoring *
              </label>
              <textarea
                value={formData.justification}
                onChange={(e) => {
                  setFormData({ ...formData, justification: e.target.value })
                  setErrors({ ...errors, justification: '' })
                }}
                rows={4}
                placeholder="Explain why this baseline document needs to be tailored for the selected project. What project-specific requirements or constraints necessitate changes?"
                className={`w-full px-4 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none ${
                  errors.justification
                    ? 'border-red-500'
                    : 'border-gray-300 dark:border-gray-600'
                }`}
                disabled={submitting}
              />
              {errors.justification && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.justification}</p>
              )}
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Minimum 20 characters required
              </p>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || loading || projects.length === 0}
                className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <GitFork className="h-4 w-4" />
                {submitting ? 'Creating...' : 'Create Tailored Copy'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
