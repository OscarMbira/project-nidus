/**
 * Stakeholder Analysis Form – power/interest, attitude, strategy.
 * Auto-calculates matrix quadrant from power + interest (1–5).
 */

import { useState, useEffect } from 'react'
import { X, Save } from 'lucide-react'
import { salienceClassFromPLU } from '../../utils/salienceUtils'

function quadrantFromPowerInterest(power, interest) {
  const high = (v) => v >= 4
  const low = (v) => v <= 2
  if (high(power) && high(interest)) return 'manage-closely'
  if (high(power) && low(interest)) return 'keep-satisfied'
  if (low(power) && high(interest)) return 'keep-informed'
  return 'monitor'
}

const ATTITUDES = ['champion', 'supporter', 'neutral', 'critic', 'blocker']
const PRIORITIES = ['critical', 'high', 'medium', 'low']
const POWER_SOURCES = ['budget', 'authority', 'expertise', 'information', 'relationships']

export default function StakeholderAnalysisForm({ analysis, stakeholderId, projectId, stakeholders = [], onSave, onCancel }) {
  const [formData, setFormData] = useState({
    stakeholder_id: stakeholderId || '',
    project_id: projectId || '',
    power_level: 3,
    interest_level: 3,
    legitimacy_level: 3,
    urgency_level: 3,
    matrix_quadrant: 'monitor',
    salience_class: 'latent',
    current_attitude: 'neutral',
    desired_attitude: 'neutral',
    impact_on_project: null,
    power_sources: [],
    key_messages: '',
    engagement_strategy: '',
    engagement_priority: 'medium',
    analysis_date: new Date().toISOString().split('T')[0],
    analysis_period: '',
    notes: '',
  })

  useEffect(() => {
    if (analysis) {
      const p = analysis.power_level ?? 3
      const l = analysis.legitimacy_level ?? 3
      const u = analysis.urgency_level ?? 3
      setFormData({
        stakeholder_id: analysis.stakeholder_id,
        project_id: analysis.project_id,
        power_level: p,
        interest_level: analysis.interest_level ?? 3,
        legitimacy_level: l,
        urgency_level: u,
        matrix_quadrant: analysis.matrix_quadrant || quadrantFromPowerInterest(p, analysis.interest_level ?? 3),
        salience_class: analysis.salience_class || salienceClassFromPLU(p, l, u),
        current_attitude: analysis.current_attitude || 'neutral',
        desired_attitude: analysis.desired_attitude || 'neutral',
        impact_on_project: analysis.impact_on_project ?? null,
        power_sources: Array.isArray(analysis.power_sources) ? analysis.power_sources : [],
        key_messages: analysis.key_messages || '',
        engagement_strategy: analysis.engagement_strategy || '',
        engagement_priority: analysis.engagement_priority || 'medium',
        analysis_date: analysis.analysis_date || new Date().toISOString().split('T')[0],
        analysis_period: analysis.analysis_period || '',
        notes: analysis.notes || '',
      })
    } else if (stakeholderId) {
      setFormData(prev => ({ ...prev, stakeholder_id: stakeholderId, project_id: projectId }))
    }
  }, [analysis, stakeholderId, projectId])

  const handleChange = (e) => {
    const { name, value, type } = e.target
    setFormData(prev => ({ ...prev, [name]: type === 'number' ? (value ? parseInt(value, 10) : null) : value }))
  }

  const togglePowerSource = (src) => {
    setFormData(prev => ({
      ...prev,
      power_sources: prev.power_sources.includes(src) ? prev.power_sources.filter(s => s !== src) : [...prev.power_sources, src],
    }))
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
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{analysis ? 'Edit Analysis' : 'Add Analysis'}</h2>
            <button type="button" onClick={onCancel} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"><X className="h-5 w-5" /></button>
          </div>
          <form onSubmit={handleSubmit} className="p-4 space-y-4">
            {!analysis && stakeholders.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Stakeholder</label>
                <select name="stakeholder_id" value={formData.stakeholder_id} onChange={handleChange} required className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700">
                  <option value="">Select</option>
                  {stakeholders.map(s => (
                    <option key={s.id} value={s.id}>{s.stakeholder_name} {s.stakeholder_organization ? `(${s.stakeholder_organization})` : ''}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Power (1–5)</label>
                <input type="range" min="1" max="5" value={formData.power_level} onChange={(e) => { const v = parseInt(e.target.value, 10); setFormData(prev => ({ ...prev, power_level: v, matrix_quadrant: quadrantFromPowerInterest(v, prev.interest_level), salience_class: salienceClassFromPLU(v, prev.legitimacy_level, prev.urgency_level) })) }} className="w-full" />
                <span className="text-sm text-gray-500">{formData.power_level}</span>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Interest (1–5)</label>
                <input type="range" min="1" max="5" value={formData.interest_level} onChange={(e) => { const v = parseInt(e.target.value, 10); setFormData(prev => ({ ...prev, interest_level: v, matrix_quadrant: quadrantFromPowerInterest(prev.power_level, v) })) }} className="w-full" />
                <span className="text-sm text-gray-500">{formData.interest_level}</span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Matrix quadrant (auto)</label>
              <p className="px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg capitalize">{formData.matrix_quadrant?.replace('-', ' ')}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Legitimacy (1–5)</label>
                <input type="range" min="1" max="5" value={formData.legitimacy_level ?? 3} onChange={(e) => { const v = parseInt(e.target.value, 10); setFormData(prev => ({ ...prev, legitimacy_level: v, salience_class: salienceClassFromPLU(prev.power_level, v, prev.urgency_level) })) }} className="w-full" />
                <span className="text-sm text-gray-500">{formData.legitimacy_level ?? 3}</span>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Urgency (1–5)</label>
                <input type="range" min="1" max="5" value={formData.urgency_level ?? 3} onChange={(e) => { const v = parseInt(e.target.value, 10); setFormData(prev => ({ ...prev, urgency_level: v, salience_class: salienceClassFromPLU(prev.power_level, prev.legitimacy_level, v) })) }} className="w-full" />
                <span className="text-sm text-gray-500">{formData.urgency_level ?? 3}</span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Salience class (auto)</label>
              <p className="px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg capitalize">{formData.salience_class || '—'}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Current attitude</label>
                <select name="current_attitude" value={formData.current_attitude} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700">
                  {ATTITUDES.map(a => (<option key={a} value={a}>{a}</option>))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Desired attitude</label>
                <select name="desired_attitude" value={formData.desired_attitude} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700">
                  {ATTITUDES.map(a => (<option key={a} value={a}>{a}</option>))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Engagement priority</label>
              <select name="engagement_priority" value={formData.engagement_priority} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700">
                {PRIORITIES.map(p => (<option key={p} value={p}>{p}</option>))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Power sources</label>
              <div className="flex flex-wrap gap-2">
                {POWER_SOURCES.map(src => (
                  <label key={src} className="inline-flex items-center gap-1">
                    <input type="checkbox" checked={formData.power_sources.includes(src)} onChange={() => togglePowerSource(src)} />
                    <span className="capitalize">{src}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Key messages</label>
              <textarea name="key_messages" value={formData.key_messages} onChange={handleChange} rows={2} className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Engagement strategy</label>
              <textarea name="engagement_strategy" value={formData.engagement_strategy} onChange={handleChange} rows={2} className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Analysis date</label>
                <input type="date" name="analysis_date" value={formData.analysis_date} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Period</label>
                <input type="text" name="analysis_period" value={formData.analysis_period} onChange={handleChange} placeholder="e.g. initiation" className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700" />
              </div>
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
