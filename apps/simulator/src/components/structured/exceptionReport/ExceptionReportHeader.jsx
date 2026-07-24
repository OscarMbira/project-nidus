import { useState, useEffect } from 'react'
import { supabase } from '../../../services/supabaseClient'
import { generateDocumentRef } from '../../../services/exceptionReportService'
import { User, Calendar, FileText } from 'lucide-react'

export default function ExceptionReportHeader({ formData, onChange, errors, mode, projectId }) {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchUsers()
    if (projectId && !formData.document_ref && mode === 'create') {
      generateRef()
    }
  }, [projectId, mode])

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, full_name, email')
        .eq('is_active', true)
        .order('full_name')

      if (error) throw error
      setUsers(data || [])
    } catch (error) {
      console.error('Error fetching users:', error)
    }
  }

  const generateRef = async () => {
    if (!projectId) return
    try {
      setLoading(true)
      const ref = await generateDocumentRef(projectId)
      onChange('document_ref', ref)
    } catch (error) {
      console.error('Error generating reference:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const setCurrentUser = async () => {
      if (mode === 'create' && !formData.author_id) {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          onChange('author_id', user.id)
        }
      }
    }
    setCurrentUser()
  }, [mode])

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Report Title *
          </label>
          <input
            type="text"
            value={formData.report_title || ''}
            onChange={(e) => onChange('report_title', e.target.value)}
            required
            disabled={mode === 'view'}
            placeholder="Exception Report - [Project Name]"
            className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${
              errors.report_title ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
            }`}
          />
          {errors.report_title && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.report_title}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Report Date *
          </label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="date"
              value={formData.report_date || ''}
              onChange={(e) => onChange('report_date', e.target.value)}
              required
              disabled={mode === 'view'}
              max={new Date().toISOString().split('T')[0]}
              className={`w-full pl-10 pr-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${
                errors.report_date ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
              }`}
            />
          </div>
          {errors.report_date && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.report_date}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Document Reference
          </label>
          <div className="relative">
            <FileText className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={formData.document_ref || ''}
              readOnly
              className="w-full pl-10 pr-3 py-2 border rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-300 dark:border-gray-600"
            />
          </div>
          {loading && (
            <p className="mt-1 text-xs text-gray-500">Generating reference...</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Version Number
          </label>
          <input
            type="text"
            value={formData.version_no || '1.0'}
            onChange={(e) => onChange('version_no', e.target.value)}
            disabled={mode === 'view'}
            className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Urgency *
          </label>
          <select
            value={formData.urgency || 'medium'}
            onChange={(e) => onChange('urgency', e.target.value)}
            required
            disabled={mode === 'view'}
            className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600"
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Author *
          </label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <select
              value={formData.author_id || ''}
              onChange={(e) => onChange('author_id', e.target.value || null)}
              required
              disabled={mode === 'view'}
              className={`w-full pl-10 pr-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${
                errors.author_id ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
              }`}
            >
              <option value="">Select Author</option>
              {users.map(user => (
                <option key={user.id} value={user.id}>
                  {user.full_name || user.email}
                </option>
              ))}
            </select>
          </div>
          {errors.author_id && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.author_id}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Owner
          </label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <select
              value={formData.owner_id || ''}
              onChange={(e) => onChange('owner_id', e.target.value || null)}
              disabled={mode === 'view'}
              className="w-full pl-10 pr-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600"
            >
              <option value="">Select Owner</option>
              {users.map(user => (
                <option key={user.id} value={user.id}>
                  {user.full_name || user.email}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Client
          </label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <select
              value={formData.client_id || ''}
              onChange={(e) => onChange('client_id', e.target.value || null)}
              disabled={mode === 'view'}
              className="w-full pl-10 pr-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600"
            >
              <option value="">Select Client</option>
              {users.map(user => (
                <option key={user.id} value={user.id}>
                  {user.full_name || user.email}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Date of This Revision
          </label>
          <input
            type="date"
            value={formData.date_of_this_revision || ''}
            onChange={(e) => onChange('date_of_this_revision', e.target.value)}
            disabled={mode === 'view'}
            className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Date of Next Revision
          </label>
          <input
            type="date"
            value={formData.date_of_next_revision || ''}
            onChange={(e) => onChange('date_of_next_revision', e.target.value || null)}
            disabled={mode === 'view'}
            className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600"
          />
        </div>
      </div>
    </div>
  )
}
