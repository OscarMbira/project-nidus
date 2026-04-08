/**
 * Project Plan Quality Section
 */

import { useState, useEffect } from 'react'
import { platformDb } from '../../services/supabase/supabaseClient'

export default function ProjectPlanQualitySection({ formData, onChange, mode, projectId }) {
  const [qualityStrategies, setQualityStrategies] = useState([])

  useEffect(() => {
    if (projectId) {
      loadQualityStrategies()
    }
  }, [projectId])

  const loadQualityStrategies = async () => {
    try {
      const { data } = await platformDb
        .from('quality_management_strategies')
        .select('id, qms_reference')
        .eq('project_id', projectId)
        .eq('is_deleted', false)
      setQualityStrategies(data || [])
    } catch (error) {
      console.error('Error loading quality strategies:', error)
    }
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Quality Summary</h2>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Link to Quality Management Strategy
        </label>
        <select
          value={formData.quality_management_strategy_id || ''}
          onChange={(e) => onChange('quality_management_strategy_id', e.target.value || null)}
          disabled={mode === 'view'}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        >
          <option value="">None</option>
          {qualityStrategies.map(qms => (
            <option key={qms.id} value={qms.id}>
              {qms.qms_reference}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Quality Summary
        </label>
        <textarea
          value={formData.quality_summary || ''}
          onChange={(e) => onChange('quality_summary', e.target.value)}
          disabled={mode === 'view'}
          rows={6}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          placeholder="Enter quality management summary"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Quality Standards
        </label>
        <textarea
          value={formData.quality_standards || ''}
          onChange={(e) => onChange('quality_standards', e.target.value)}
          disabled={mode === 'view'}
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          placeholder="Enter quality standards"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Quality Gates (JSON Array)
        </label>
        <textarea
          value={formData.quality_gates ? JSON.stringify(formData.quality_gates, null, 2) : ''}
          onChange={(e) => {
            try {
              const parsed = JSON.parse(e.target.value)
              onChange('quality_gates', parsed)
            } catch {
              // Invalid JSON, ignore
            }
          }}
          disabled={mode === 'view'}
          rows={6}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-sm"
          placeholder='[{"gate_name": "...", "gate_date": "..."}, ...]'
        />
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          Enter quality gates as JSON array
        </p>
      </div>
    </div>
  )
}
