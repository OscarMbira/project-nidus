/**
 * Engagement Plan Form – strategy, method, frequency, attitude gap.
 */

import { useState, useEffect } from 'react'
import { X, Save } from 'lucide-react'

const ENGAGEMENT_LEVELS = ['leading', 'supportive', 'neutral', 'unsupportive', 'blocking']
const METHODS = ['email', 'meeting', 'workshop', 'report', 'presentation', 'informal', 'survey']
const FREQUENCIES = ['daily', 'weekly', 'fortnightly', 'monthly', 'quarterly', 'as-needed']

export default function EngagementPlanForm({ plan, stakeholderId, projectId, stakeholders = [], onSave, onCancel }) {
  const [formData, setFormData] = useState({
    stakeholder_id: stakeholderId || '',
    project_id: projectId || '',
    engagement_level: 'neutral',
    target_engagement_level: 'supportive',
    engagement_strategy: '',
    preferred_communication_method: 'email',
    preferred_communication_frequency: 'monthly',
    notes: '',
  })

  useEffect(() => {
    if (plan) {
      setFormData({
        stakeholder_id: plan.stakeholder_id,
        project_id: plan.project_id,
        engagement_level: plan.engagement_level || 'neutral',
        target_engagement_level: plan.target_engagement_level || 'supportive',
        engagement_strategy: plan.engagement_strategy || '',
        preferred_communication_method: plan.preferred_communication_method || 'email',
        preferred_communication_frequency: plan.preferred_communication_frequency || 'monthly',
        notes: plan.notes || '',
      })
    } else if (stakeholderId) {
      setFormData(prev => ({ ...prev, stakeholder_id: stakeholderId, project_id: projectId }))
    }
  }, [plan, stakeholderId, projectId])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    onSave(formData)
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/50" onClick={onCancel} />
        <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
          <div className="sticky top-0 flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{plan ? 'Edit Engagement Plan' : 'Add Engagement Plan'}</h2>
            <button type="button" onClick={onCancel} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"><X className="h-5 w-5" /></button>
          </div>
          <form onSubmit={handleSubmit} className="p-4 space-y-4">
            {!plan && stakeholders.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Stakeholder</label>
                <select name="stakeholder_id" value={formData.stakeholder_id} onChange={handleChange} required className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700">
                  <option value="">Select</option>
                  {stakeholders.map(s => (<option key={s.id} value={s.id}>{s.stakeholder_name}</option>))}
                </select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Current level</label>
                <select name="engagement_level" value={formData.engagement_level} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700">
                  {ENGAGEMENT_LEVELS.map(l => (<option key={l} value={l}>{l}</option>))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Target level</label>
                <select name="target_engagement_level" value={formData.target_engagement_level} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700">
                  {ENGAGEMENT_LEVELS.map(l => (<option key={l} value={l}>{l}</option>))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Engagement strategy</label>
              <textarea name="engagement_strategy" value={formData.engagement_strategy} onChange={handleChange} rows={3} className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Method</label>
                <select name="preferred_communication_method" value={formData.preferred_communication_method} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700">
                  {METHODS.map(m => (<option key={m} value={m}>{m}</option>))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Frequency</label>
                <select name="preferred_communication_frequency" value={formData.preferred_communication_frequency} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700">
                  {FREQUENCIES.map(f => (<option key={f} value={f}>{f}</option>))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
              <textarea name="notes" value={formData.notes} onChange={handleChange} rows={2} className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700" />
            </div>
            <div className="flex justify-end gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button type="button" onClick={onCancel} className="px-4 py-2 border rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">Cancel</button>
              <button type="submit" className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"><Save className="h-4 w-4" />Save</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
