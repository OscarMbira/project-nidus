import { Settings, Calendar, User } from 'lucide-react'
import { useState, useEffect } from 'react'

export default function IssueReportDecisionSection({
  formData,
  onChange,
  errors = {},
  readOnly = false
}) {
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
        <Settings className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Decision</h3>
      </div>

      {/* Decision Required */}
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={formData.decision_required || false}
            onChange={(e) => onChange('decision_required', e.target.checked)}
            disabled={readOnly}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <span className="text-sm font-medium text-gray-900 dark:text-white">
            Decision Required
          </span>
        </label>
      </div>

      {formData.decision_required && (
        <div className="space-y-6">
          {/* Decision By */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Decision By <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.decision_by || ''}
              onChange={(e) => onChange('decision_by', e.target.value)}
              readOnly={readOnly}
              className={`w-full px-3 py-2 border rounded-lg ${
                readOnly
                  ? 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                  : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white'
              } ${errors.decision_by ? 'border-red-500' : ''}`}
              placeholder="e.g., Project Board Executive"
            />
            {errors.decision_by && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.decision_by}</p>
            )}
          </div>

          {/* Decision Made */}
          {formData.report_status === 'closed' || formData.decision_date ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <Calendar className="w-4 h-4 inline mr-1" />
                  Decision Date
                </label>
                <input
                  type="date"
                  value={formData.decision_date || ''}
                  onChange={(e) => onChange('decision_date', e.target.value)}
                  readOnly={readOnly}
                  className={`w-full px-3 py-2 border rounded-lg ${
                    readOnly
                      ? 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                      : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white'
                  }`}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Decision Made <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={formData.decision_made || ''}
                  onChange={(e) => onChange('decision_made', e.target.value)}
                  readOnly={readOnly}
                  rows={4}
                  className={`w-full px-3 py-2 border rounded-lg ${
                    readOnly
                      ? 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                      : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white'
                  } ${errors.decision_made ? 'border-red-500' : ''}`}
                  placeholder="What decision was made..."
                />
                {errors.decision_made && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.decision_made}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <User className="w-4 h-4 inline mr-1" />
                  Decision Made By
                </label>
                <select
                  value={formData.decision_made_by_id || ''}
                  onChange={(e) => onChange('decision_made_by_id', e.target.value || null)}
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
                {!formData.decision_made_by_id && (
                  <input
                    type="text"
                    value={formData.decision_made_by_name || ''}
                    onChange={(e) => onChange('decision_made_by_name', e.target.value)}
                    readOnly={readOnly}
                    placeholder="External decision maker name"
                    className={`w-full mt-2 px-3 py-2 border rounded-lg ${
                      readOnly
                        ? 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                        : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white'
                    }`}
                  />
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Decision Conditions
                </label>
                <textarea
                  value={formData.decision_conditions || ''}
                  onChange={(e) => onChange('decision_conditions', e.target.value)}
                  readOnly={readOnly}
                  rows={4}
                  className={`w-full px-3 py-2 border rounded-lg ${
                    readOnly
                      ? 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                      : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white'
                  }`}
                  placeholder="Any conditions attached to the decision..."
                />
              </div>
            </div>
          ) : (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                Decision will be recorded when the report is approved or closed.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
