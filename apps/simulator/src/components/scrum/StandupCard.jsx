import { useState } from 'react'
import { format } from 'date-fns'
import { CheckCircle, Clock, AlertTriangle, Save, Edit2 } from 'lucide-react'

export default function StandupCard({ member, standupNote, selectedDate, onSave, currentUserId }) {
  const [isEditing, setIsEditing] = useState(!standupNote)
  const [formData, setFormData] = useState({
    what_did_i_do_yesterday: standupNote?.what_did_i_do_yesterday || '',
    what_will_i_do_today: standupNote?.what_will_i_do_today || '',
    any_blockers: standupNote?.any_blockers || '',
    additional_notes: standupNote?.additional_notes || '',
  })
  const [saving, setSaving] = useState(false)

  const isCurrentUser = currentUserId === member?.id
  const hasBlockers = standupNote?.blockers?.some(b => !b.is_resolved && !b.is_deleted) || false

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await onSave({
        ...formData,
        is_completed: true,
        completed_at: new Date().toISOString(),
      })
      setIsEditing(false)
    } catch (error) {
      console.error('Error saving standup:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    if (standupNote) {
      setFormData({
        what_did_i_do_yesterday: standupNote.what_did_i_do_yesterday || '',
        what_will_i_do_today: standupNote.what_will_i_do_today || '',
        any_blockers: standupNote.any_blockers || '',
        additional_notes: standupNote.additional_notes || '',
      })
    }
    setIsEditing(false)
  }

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg border p-6 ${
      standupNote?.is_completed
        ? 'border-green-300 dark:border-green-700'
        : 'border-gray-200 dark:border-gray-700'
    }`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
            <span className="text-blue-600 dark:text-blue-400 font-medium">
              {member?.full_name?.charAt(0) || member?.email?.charAt(0) || 'U'}
            </span>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">
              {member?.full_name || member?.email || 'Unknown User'}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {format(selectedDate, 'MMM dd, yyyy')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {standupNote?.is_completed ? (
            <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
          ) : (
            <Clock className="h-5 w-5 text-gray-400 dark:text-gray-500" />
          )}
          {hasBlockers && (
            <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
          )}
        </div>
      </div>

      {isEditing ? (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              What did I do yesterday?
            </label>
            <textarea
              name="what_did_i_do_yesterday"
              value={formData.what_did_i_do_yesterday}
              onChange={handleChange}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              placeholder="Describe what you accomplished yesterday..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              What will I do today?
            </label>
            <textarea
              name="what_will_i_do_today"
              value={formData.what_will_i_do_today}
              onChange={handleChange}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              placeholder="Describe what you plan to accomplish today..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Any blockers?
            </label>
            <textarea
              name="any_blockers"
              value={formData.any_blockers}
              onChange={handleChange}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              placeholder="List any blockers or impediments..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Additional Notes (optional)
            </label>
            <textarea
              name="additional_notes"
              value={formData.additional_notes}
              onChange={handleChange}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              placeholder="Any additional notes..."
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {saving ? 'Saving...' : 'Save Standup'}
            </button>
            {standupNote && (
              <button
                onClick={handleCancel}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              What did I do yesterday?
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
              {standupNote?.what_did_i_do_yesterday || <span className="italic text-gray-400">Not provided</span>}
            </p>
          </div>

          <div>
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              What will I do today?
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
              {standupNote?.what_will_i_do_today || <span className="italic text-gray-400">Not provided</span>}
            </p>
          </div>

          <div>
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Any blockers?
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
              {standupNote?.any_blockers || <span className="italic text-gray-400">None</span>}
            </p>
          </div>

          {standupNote?.additional_notes && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Additional Notes
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                {standupNote.additional_notes}
              </p>
            </div>
          )}

          {isCurrentUser && (
            <button
              onClick={() => setIsEditing(true)}
              className="w-full mt-4 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center justify-center gap-2"
            >
              <Edit2 className="h-4 w-4" />
              Edit Standup
            </button>
          )}
        </div>
      )}
    </div>
  )
}

