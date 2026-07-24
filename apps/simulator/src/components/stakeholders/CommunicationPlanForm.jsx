/**
 * Communication Plan Form – plan title, type, audience, channel, frequency, etc.
 */

import { useState, useEffect } from 'react'
import { X, Save } from 'lucide-react'

const COMM_TYPES = ['update', 'report', 'meeting', 'newsletter', 'briefing', 'consultation', 'survey', 'other']
const CHANNELS = ['email', 'teams', 'phone', 'in-person', 'video-call', 'portal', 'notice-board']
const FREQUENCIES = ['daily', 'weekly', 'fortnightly', 'monthly', 'quarterly', 'event-driven', 'one-off']
const STATUSES = ['draft', 'active', 'completed', 'cancelled']

export default function CommunicationPlanForm({ plan, projectId, onSave, onCancel }) {
  const [formData, setFormData] = useState({
    project_id: projectId || '',
    plan_name: '',
    plan_description: '',
    plan_status: 'draft',
    communication_objectives: '',
    key_messages: '',
    target_stakeholder_groups: [],
    primary_channels: [],
    plan_start_date: new Date().toISOString().split('T')[0],
    plan_end_date: '',
    notes: '',
  })

  useEffect(() => {
    if (plan) {
      setFormData({
        project_id: plan.project_id,
        plan_name: plan.plan_name || '',
        plan_description: plan.plan_description || '',
        plan_status: plan.plan_status || 'draft',
        communication_objectives: plan.communication_objectives || '',
        key_messages: plan.key_messages || '',
        target_stakeholder_groups: Array.isArray(plan.target_stakeholder_groups) ? plan.target_stakeholder_groups : [],
        primary_channels: Array.isArray(plan.primary_channels) ? plan.primary_channels : [],
        plan_start_date: plan.plan_start_date || '',
        plan_end_date: plan.plan_end_date || '',
        notes: plan.notes || '',
      })
    } else if (projectId) {
      setFormData(prev => ({ ...prev, project_id: projectId }))
    }
  }, [plan, projectId])

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
        <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="sticky top-0 flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{plan ? 'Edit Communication Plan' : 'Add Communication Plan'}</h2>
            <button type="button" onClick={onCancel} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"><X className="h-5 w-5" /></button>
          </div>
          <form onSubmit={handleSubmit} className="p-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Plan name</label>
              <input type="text" name="plan_name" value={formData.plan_name} onChange={handleChange} required className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
              <textarea name="plan_description" value={formData.plan_description} onChange={handleChange} rows={2} className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
                <select name="plan_status" value={formData.plan_status} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700">
                  {STATUSES.map(s => (<option key={s} value={s}>{s}</option>))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Start date</label>
                <input type="date" name="plan_start_date" value={formData.plan_start_date} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Objectives</label>
              <textarea name="communication_objectives" value={formData.communication_objectives} onChange={handleChange} rows={2} className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Key messages</label>
              <textarea name="key_messages" value={formData.key_messages} onChange={handleChange} rows={2} className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700" />
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
