import { useState, useEffect } from 'react'
import { FieldHelpScope } from '@nidus/shared/context/FieldHelpContext'
import FieldLabelWithHelp from '@nidus/ui/FieldLabelWithHelp'
import { FileText, User, Calendar } from 'lucide-react'
import { supabase } from '../../services/supabaseClient'

function CheckpointReportHeaderBody({ formData, onChange, errors, mode }) {
  const [users, setUsers] = useState([])

  useEffect(() => {
    loadUsers()
  }, [])

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
          Basic document metadata and identification information for the checkpoint report.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <FieldLabelWithHelp helpKey="public.checkpoint_reports.checkpoint_date" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2" required>
            <Calendar className="h-4 w-4 inline mr-1" />
            Checkpoint Date *
          </FieldLabelWithHelp>
          <input
            type="date"
            value={formData.checkpoint_date || ''}
            onChange={(e) => onChange('checkpoint_date', e.target.value)}
            required
            disabled={mode === 'view'}
            className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${
              errors.checkpoint_date
                ? 'border-red-500'
                : 'border-gray-300 dark:border-gray-600'
            } ${mode === 'view' ? 'opacity-50 cursor-not-allowed' : ''}`}
          />
          {errors.checkpoint_date && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.checkpoint_date}</p>
          )}
        </div>

        <div>
          <FieldLabelWithHelp helpKey="public.checkpoint_reports.report_title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Report Title
          </FieldLabelWithHelp>
          <input
            type="text"
            value={formData.report_title || ''}
            onChange={(e) => onChange('report_title', e.target.value)}
            disabled={mode === 'view'}
            placeholder="Checkpoint Report - Week X"
            className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${
              errors.report_title
                ? 'border-red-500'
                : 'border-gray-300 dark:border-gray-600'
            } ${mode === 'view' ? 'opacity-50 cursor-not-allowed' : ''}`}
          />
        </div>
      </div>

      <div>
        <FieldLabelWithHelp helpKey="public.checkpoint_reports.report_summary" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2" required>
          <FileText className="h-4 w-4 inline mr-1" />
          Report Summary *
        </FieldLabelWithHelp>
        <textarea
          value={formData.report_summary || ''}
          onChange={(e) => onChange('report_summary', e.target.value)}
          required
          disabled={mode === 'view'}
          rows={4}
          placeholder="Executive summary of the checkpoint report..."
          className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${
            errors.report_summary
              ? 'border-red-500'
              : 'border-gray-300 dark:border-gray-600'
          } ${mode === 'view' ? 'opacity-50 cursor-not-allowed' : ''}`}
        />
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          {(formData.report_summary || '').length} / 50 characters minimum
        </p>
        {errors.report_summary && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.report_summary}</p>
        )}
      </div>

      <div>
        <FieldLabelWithHelp helpKey="public.checkpoint_reports.progress_summary" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2" required>
          Progress Summary *
        </FieldLabelWithHelp>
        <textarea
          value={formData.progress_summary || ''}
          onChange={(e) => onChange('progress_summary', e.target.value)}
          required
          disabled={mode === 'view'}
          rows={4}
          placeholder="Summary of progress made during this reporting period..."
          className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${
            errors.progress_summary
              ? 'border-red-500'
              : 'border-gray-300 dark:border-gray-600'
          } ${mode === 'view' ? 'opacity-50 cursor-not-allowed' : ''}`}
        />
        {errors.progress_summary && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.progress_summary}</p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <FieldLabelWithHelp helpKey="public.checkpoint_reports.author_id" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2" listOptions={false}>
            <User className="h-4 w-4 inline mr-1" />
            Author
          </FieldLabelWithHelp>
          <select
            value={formData.author_id || ''}
            onChange={(e) => onChange('author_id', e.target.value || null)}
            disabled={mode === 'view'}
            className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${
              'border-gray-300 dark:border-gray-600'
            } ${mode === 'view' ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <option value="">Select author...</option>
            {users.map(user => (
              <option key={user.id} value={user.id}>
                {user.full_name || user.email}
              </option>
            ))}
          </select>
        </div>

        <div>
          <FieldLabelWithHelp helpKey="public.checkpoint_reports.owner_id" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2" listOptions={false}>
            Owner (Team Manager)
          </FieldLabelWithHelp>
          <select
            value={formData.owner_id || ''}
            onChange={(e) => onChange('owner_id', e.target.value || null)}
            disabled={mode === 'view'}
            className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${
              'border-gray-300 dark:border-gray-600'
            } ${mode === 'view' ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <option value="">Select owner...</option>
            {users.map(user => (
              <option key={user.id} value={user.id}>
                {user.full_name || user.email}
              </option>
            ))}
          </select>
        </div>

        <div>
          <FieldLabelWithHelp helpKey="public.checkpoint_reports.client_id" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2" listOptions={false}>
            Client (Project Manager)
          </FieldLabelWithHelp>
          <select
            value={formData.client_id || ''}
            onChange={(e) => onChange('client_id', e.target.value || null)}
            disabled={mode === 'view'}
            className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${
              'border-gray-300 dark:border-gray-600'
            } ${mode === 'view' ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <option value="">Select client...</option>
            {users.map(user => (
              <option key={user.id} value={user.id}>
                {user.full_name || user.email}
              </option>
            ))}
          </select>
        </div>
      </div>

      {formData.document_ref && (
        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500 dark:text-gray-400">Document Reference:</span>
              <p className="font-medium text-gray-900 dark:text-white">{formData.document_ref}</p>
            </div>
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

// v1345 slice 4: field help for this component (public.checkpoint_reports.<column>). It carries its own scope,
// so every page that renders it shows the help.
const HELP_KEYS = [
  'checkpoint_date', 'report_title', 'report_summary', 'progress_summary', 'author_id', 'owner_id',
  'client_id',
].map((name) => `public.checkpoint_reports.${name}`)

export default function CheckpointReportHeader(props) {
  return (
    <FieldHelpScope helpKeys={HELP_KEYS}>
      <CheckpointReportHeaderBody {...props} />
    </FieldHelpScope>
  )
}
