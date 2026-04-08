import { useState, useEffect } from 'react'
import { FileText, User, Calendar, RefreshCw } from 'lucide-react'
import { useThemeContext } from '../../context/ThemeContext'

export default function IssueReportDocumentInfoSection({
  formData,
  onChange,
  errors = {},
  readOnly = false
}) {
  const { theme } = useThemeContext()
  const [users, setUsers] = useState([])

  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    try {
      const { supabase } = await import('../../services/supabaseClient')
      const { data } = await supabase
        .from('users')
        .select('id, full_name, email')
        .eq('is_deleted', false)
        .order('full_name')

      setUsers(data || [])
    } catch (error) {
      console.error('Error loading users:', error)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Document Information</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Report Reference */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Report Reference <span className="text-red-500">*</span>
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={formData.report_reference || ''}
              onChange={(e) => onChange('report_reference', e.target.value)}
              readOnly={readOnly}
              className={`w-full px-3 py-2 border rounded-lg ${
                readOnly
                  ? 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                  : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white'
              } ${errors.report_reference ? 'border-red-500' : ''}`}
              placeholder="ISR-PROJ001-ISS-001"
            />
            {!readOnly && (
              <button
                type="button"
                onClick={async () => {
                  // Auto-generate reference if issueId is available
                  try {
                    const { generateReportReference } = await import('../../services/issueReportService')
                    // This would need issueId from parent - for now just placeholder
                  } catch (error) {
                    console.error('Error generating reference:', error)
                  }
                }}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                title="Generate Reference"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            )}
          </div>
          {errors.report_reference && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.report_reference}</p>
          )}
        </div>

        {/* Version Number */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Version Number <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.version_no || '1.0'}
            onChange={(e) => onChange('version_no', e.target.value)}
            readOnly={readOnly}
            className={`w-full px-3 py-2 border rounded-lg ${
              readOnly
                ? 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white'
            } ${errors.version_no ? 'border-red-500' : ''}`}
            placeholder="1.0"
          />
          {errors.version_no && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.version_no}</p>
          )}
        </div>

        {/* Report Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            <Calendar className="w-4 h-4 inline mr-1" />
            Report Date <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            value={formData.report_date || ''}
            onChange={(e) => onChange('report_date', e.target.value)}
            readOnly={readOnly}
            className={`w-full px-3 py-2 border rounded-lg ${
              readOnly
                ? 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white'
            } ${errors.report_date ? 'border-red-500' : ''}`}
          />
          {errors.report_date && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.report_date}</p>
          )}
        </div>

        {/* Report Status */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Report Status
          </label>
          <select
            value={formData.report_status || 'draft'}
            onChange={(e) => onChange('report_status', e.target.value)}
            disabled={readOnly}
            className={`w-full px-3 py-2 border rounded-lg ${
              readOnly
                ? 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white'
            }`}
          >
            <option value="draft">Draft</option>
            <option value="submitted">Submitted</option>
            <option value="under_review">Under Review</option>
            <option value="approved">Approved</option>
            <option value="distributed">Distributed</option>
            <option value="closed">Closed</option>
          </select>
        </div>
      </div>

      <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
        <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <User className="w-4 h-4" />
          Author & Responsibility
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Author */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Author <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.author_id || ''}
              onChange={(e) => onChange('author_id', e.target.value || null)}
              disabled={readOnly}
              className={`w-full px-3 py-2 border rounded-lg ${
                readOnly
                  ? 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                  : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white'
              }`}
            >
              <option value="">Select Author</option>
              {users.map(user => (
                <option key={user.id} value={user.id}>
                  {user.full_name || user.email}
                </option>
              ))}
            </select>
            {!formData.author_id && (
              <input
                type="text"
                value={formData.author_name || ''}
                onChange={(e) => onChange('author_name', e.target.value)}
                readOnly={readOnly}
                placeholder="External author name"
                className={`w-full mt-2 px-3 py-2 border rounded-lg ${
                  readOnly
                    ? 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                    : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white'
                }`}
              />
            )}
          </div>

          {/* Prepared By */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Prepared By
            </label>
            <select
              value={formData.prepared_by_id || ''}
              onChange={(e) => onChange('prepared_by_id', e.target.value || null)}
              disabled={readOnly}
              className={`w-full px-3 py-2 border rounded-lg ${
                readOnly
                  ? 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                  : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white'
              }`}
            >
              <option value="">Select User</option>
              {users.map(user => (
                <option key={user.id} value={user.id}>
                  {user.full_name || user.email}
                </option>
              ))}
            </select>
            {!formData.prepared_by_id && (
              <input
                type="text"
                value={formData.prepared_by_name || ''}
                onChange={(e) => onChange('prepared_by_name', e.target.value)}
                readOnly={readOnly}
                placeholder="External preparer name"
                className={`w-full mt-2 px-3 py-2 border rounded-lg ${
                  readOnly
                    ? 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                    : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white'
                }`}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
