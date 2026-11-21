/**
 * Project Plan Quality Section
 */

import PlanListTable from '@nidus/ui/PlanListTable'
import { useState, useEffect } from 'react'
import FieldLabelWithHelp from '@nidus/ui/FieldLabelWithHelp'
import { FieldHelpScope } from '@nidus/shared/context/FieldHelpContext'
import { platformDb } from '@nidus/supabase'

function ProjectPlanQualitySectionBody({ formData, onChange, mode, projectId }) {
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
        <FieldLabelWithHelp helpKey="sim.project_plans.quality_management_strategy_id" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2" listOptions={false}>
          Link to Quality Management Strategy
        </FieldLabelWithHelp>
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
        <FieldLabelWithHelp helpKey="sim.project_plans.quality_summary" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Quality Summary
        </FieldLabelWithHelp>
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
        <FieldLabelWithHelp helpKey="sim.project_plans.quality_standards" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Quality Standards
        </FieldLabelWithHelp>
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
        <FieldLabelWithHelp helpKey="sim.project_plans.quality_gates" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Quality Gates
        </FieldLabelWithHelp>
        <PlanListTable
          kind="project"
          listKey="quality_gates"
          value={formData.quality_gates}
          onChange={(rows) => onChange('quality_gates', rows)}
          disabled={mode === 'view'}
        />
      </div>
    </div>
  )
}

// v1345 slice 4 Simulator parity: field help (sim.* keys aliased to the Platform help).
const HELP_KEYS = [
  'sim.project_plans.quality_management_strategy_id',
  'sim.project_plans.quality_summary',
  'sim.project_plans.quality_standards',
  'sim.project_plans.quality_gates',
]

export default function ProjectPlanQualitySection(props) {
  return (
    <FieldHelpScope helpKeys={HELP_KEYS}>
      <ProjectPlanQualitySectionBody {...props} />
    </FieldHelpScope>
  )
}
