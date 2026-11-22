import { CheckCircle, Calendar, User, FileText } from 'lucide-react'
import { FieldHelpScope } from '@nidus/shared/context/FieldHelpContext'
import FieldLabelWithHelp from '@nidus/ui/FieldLabelWithHelp'
import { useState, useEffect } from 'react'
import RegionalDateInput from '@nidus/ui/RegionalDateInput'

function IssueReportClosureSectionBody({
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
        <CheckCircle className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Closure</h3>
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
        <p className="text-sm text-blue-800 dark:text-blue-200">
          Complete this section when closing the Issue Report after the issue has been resolved.
        </p>
      </div>

      <div className="space-y-6">
        {/* Closure Date */}
        <div>
          <FieldLabelWithHelp helpKey="public.issue_reports.closure_date" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2" required>
            <Calendar className="w-4 h-4 inline mr-1" />
            Closure Date <span className="text-red-500">*</span>
          </FieldLabelWithHelp>
          <RegionalDateInput eventStyle
            value={formData.closure_date || ''}
            onChange={(e) => onChange('closure_date', e.target.value)}
            readOnly={readOnly}
            className={`w-full px-3 py-2 border rounded-lg ${
              readOnly
                ? 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white'
            } ${errors.closure_date ? 'border-red-500' : ''}`}
          />
          {errors.closure_date && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.closure_date}</p>
          )}
        </div>

        {/* Closure Outcome */}
        <div>
          <FieldLabelWithHelp helpKey="public.issue_reports.closure_outcome" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2" required>
            Closure Outcome <span className="text-red-500">*</span>
          </FieldLabelWithHelp>
          <textarea
            value={formData.closure_outcome || ''}
            onChange={(e) => onChange('closure_outcome', e.target.value)}
            readOnly={readOnly}
            rows={6}
            className={`w-full px-3 py-2 border rounded-lg ${
              readOnly
                ? 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white'
            } ${errors.closure_outcome ? 'border-red-500' : ''}`}
            placeholder="Describe the outcome of the issue resolution..."
          />
          {errors.closure_outcome && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.closure_outcome}</p>
          )}
        </div>

        {/* Closure Verified By */}
        <div>
          <FieldLabelWithHelp helpKey="public.issue_reports.closure_verified_by_id" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2" listOptions={false}>
            <User className="w-4 h-4 inline mr-1" />
            Closure Verified By
          </FieldLabelWithHelp>
          <select
            value={formData.closure_verified_by_id || ''}
            onChange={(e) => onChange('closure_verified_by_id', e.target.value || null)}
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
        </div>

        {/* Follow-up Required */}
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <FieldLabelWithHelp helpKey="public.issue_reports.follow_up_required" className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.follow_up_required || false}
              onChange={(e) => onChange('follow_up_required', e.target.checked)}
              disabled={readOnly}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              Follow-up Required
            </span>
          </FieldLabelWithHelp>

          {formData.follow_up_required && (
            <div className="mt-4">
              <FieldLabelWithHelp helpKey="public.issue_reports.follow_up_details" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Follow-up Details
              </FieldLabelWithHelp>
              <textarea
                value={formData.follow_up_details || ''}
                onChange={(e) => onChange('follow_up_details', e.target.value)}
                readOnly={readOnly}
                rows={4}
                className={`w-full px-3 py-2 border rounded-lg ${
                  readOnly
                    ? 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                    : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white'
                }`}
                placeholder="Describe what follow-up actions are needed..."
              />
            </div>
          )}
        </div>

        {/* Lessons Learned */}
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <FieldLabelWithHelp helpKey="public.issue_reports.lessons_captured" className="flex items-center gap-2 mb-4">
            <input
              type="checkbox"
              checked={formData.lessons_captured || false}
              onChange={(e) => onChange('lessons_captured', e.target.checked)}
              disabled={readOnly}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              <FileText className="w-4 h-4 inline mr-1" />
              Lessons Captured
            </span>
          </FieldLabelWithHelp>

          {formData.lessons_captured && (
            <div>
              <FieldLabelWithHelp helpKey="public.issue_reports.lessons_summary" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Lessons Summary
              </FieldLabelWithHelp>
              <textarea
                value={formData.lessons_summary || ''}
                onChange={(e) => onChange('lessons_summary', e.target.value)}
                readOnly={readOnly}
                rows={6}
                className={`w-full px-3 py-2 border rounded-lg ${
                  readOnly
                    ? 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                    : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white'
                }`}
                placeholder="Summarize lessons learned from handling this issue..."
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// v1345 slice 4: field help for this component (public.issue_reports.<column>). It carries its own scope,
// so every page that renders it shows the help.
const HELP_KEYS = [
  'closure_date', 'closure_outcome', 'closure_verified_by_id', 'follow_up_required', 'follow_up_details',
  'lessons_captured', 'lessons_summary',
].map((name) => `public.issue_reports.${name}`)

export default function IssueReportClosureSection(props) {
  return (
    <FieldHelpScope helpKeys={HELP_KEYS}>
      <IssueReportClosureSectionBody {...props} />
    </FieldHelpScope>
  )
}
