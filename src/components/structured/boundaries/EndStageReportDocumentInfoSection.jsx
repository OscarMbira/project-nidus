import { useState, useEffect } from 'react'
import { FileText, User, Calendar, Users } from 'lucide-react'
import { supabase } from '../../../services/supabaseClient'
import { generateReportReference } from '../../../services/endStageReportService'

export default function EndStageReportDocumentInfoSection({ formData, onChange, errors, mode, projectId, stageNumber }) {
  const [users, setUsers] = useState([])

  useEffect(() => {
    loadUsers()
  }, [])

  useEffect(() => {
    // Auto-generate reference if not set
    if (!formData.report_reference && projectId && stageNumber && mode === 'create') {
      generateReportReference(projectId, stageNumber).then(ref => {
        onChange('report_reference', ref)
      }).catch(err => {
        console.error('Error generating reference:', err)
      })
    }
  }, [projectId, stageNumber, mode])

  const loadUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, full_name, email')
        .eq('is_deleted', false)
        .order('full_name')

      if (error) throw error
      setUsers(data || [])
    } catch (error) {
      console.error('Error loading users:', error)
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">Document Information</h3>
        <p className="text-sm text-blue-700 dark:text-blue-300">
          Document metadata, version control, and distribution information for the End Stage Report.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            placeholder="End Stage Report - [Stage Name]"
            className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${
              errors.report_title
                ? 'border-red-500'
                : 'border-gray-300 dark:border-gray-600'
            } ${mode === 'view' ? 'opacity-50 cursor-not-allowed' : ''}`}
          />
          {errors.report_title && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.report_title}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            <Calendar className="h-4 w-4 inline mr-1" />
            Report Date *
          </label>
          <input
            type="date"
            value={formData.report_date || ''}
            onChange={(e) => onChange('report_date', e.target.value)}
            required
            disabled={mode === 'view'}
            max={new Date().toISOString().split('T')[0]}
            className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${
              errors.report_date
                ? 'border-red-500'
                : 'border-gray-300 dark:border-gray-600'
            } ${mode === 'view' ? 'opacity-50 cursor-not-allowed' : ''}`}
          />
          {errors.report_date && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.report_date}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Reporting Period Start
          </label>
          <input
            type="date"
            value={formData.reporting_period_start || ''}
            onChange={(e) => onChange('reporting_period_start', e.target.value || null)}
            disabled={mode === 'view'}
            className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${
              'border-gray-300 dark:border-gray-600'
            } ${mode === 'view' ? 'opacity-50 cursor-not-allowed' : ''}`}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Reporting Period End
          </label>
          <input
            type="date"
            value={formData.reporting_period_end || ''}
            onChange={(e) => onChange('reporting_period_end', e.target.value || null)}
            disabled={mode === 'view'}
            min={formData.reporting_period_start || undefined}
            className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${
              'border-gray-300 dark:border-gray-600'
            } ${mode === 'view' ? 'opacity-50 cursor-not-allowed' : ''}`}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            <User className="h-4 w-4 inline mr-1" />
            Prepared By
          </label>
          <select
            value={formData.prepared_by || ''}
            onChange={(e) => onChange('prepared_by', e.target.value || null)}
            disabled={mode === 'view'}
            className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${
              'border-gray-300 dark:border-gray-600'
            } ${mode === 'view' ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <option value="">Select user...</option>
            {users.map(user => (
              <option key={user.id} value={user.id}>
                {user.full_name || user.email}
              </option>
            ))}
          </select>
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
            placeholder="1.0"
            className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${
              'border-gray-300 dark:border-gray-600'
            } ${mode === 'view' ? 'opacity-50 cursor-not-allowed' : ''}`}
          />
        </div>
      </div>

      {(formData.report_reference || formData.version_no) && (
        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            {formData.report_reference && (
              <div>
                <span className="text-gray-500 dark:text-gray-400">Report Reference:</span>
                <p className="font-medium text-gray-900 dark:text-white">{formData.report_reference}</p>
              </div>
            )}
            <div>
              <span className="text-gray-500 dark:text-gray-400">Version:</span>
              <p className="font-medium text-gray-900 dark:text-white">{formData.version_no || '1.0'}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
