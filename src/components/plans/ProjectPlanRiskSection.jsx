/**
 * Project Plan Risk Section
 */

import { useState, useEffect } from 'react'
import { platformDb } from '../../services/supabase/supabaseClient'

export default function ProjectPlanRiskSection({ formData, onChange, mode, projectId }) {
  const [riskStrategies, setRiskStrategies] = useState([])

  useEffect(() => {
    if (projectId) {
      loadRiskStrategies()
    }
  }, [projectId])

  const loadRiskStrategies = async () => {
    try {
      const { data } = await platformDb
        .from('risk_management_strategies')
        .select('id, rms_reference')
        .eq('project_id', projectId)
        .eq('is_deleted', false)
      setRiskStrategies(data || [])
    } catch (error) {
      console.error('Error loading risk strategies:', error)
    }
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Risk Summary</h2>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Link to Risk Management Strategy
        </label>
        <select
          value={formData.risk_management_strategy_id || ''}
          onChange={(e) => onChange('risk_management_strategy_id', e.target.value || null)}
          disabled={mode === 'view'}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        >
          <option value="">None</option>
          {riskStrategies.map(rms => (
            <option key={rms.id} value={rms.id}>
              {rms.rms_reference}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Risk Summary
        </label>
        <textarea
          value={formData.risk_summary || ''}
          onChange={(e) => onChange('risk_summary', e.target.value)}
          disabled={mode === 'view'}
          rows={6}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          placeholder="Enter risk management summary"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Key Risks (JSON Array)
        </label>
        <textarea
          value={formData.key_risks ? JSON.stringify(formData.key_risks, null, 2) : ''}
          onChange={(e) => {
            try {
              const parsed = JSON.parse(e.target.value)
              onChange('key_risks', parsed)
            } catch {
              // Invalid JSON, ignore
            }
          }}
          disabled={mode === 'view'}
          rows={6}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-sm"
          placeholder='[{"risk_id": "...", "risk_title": "..."}, ...]'
        />
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          Enter key risks as JSON array (can be populated from risk register)
        </p>
      </div>
    </div>
  )
}
