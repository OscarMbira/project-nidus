/**
 * Project Plan Risk Section
 */

import PlanListTable from '@nidus/ui/PlanListTable'
import { useState, useEffect } from 'react'
import FieldLabelWithHelp from '@nidus/ui/FieldLabelWithHelp'
import { FieldHelpScope } from '@nidus/shared/context/FieldHelpContext'
import { platformDb } from '@nidus/supabase'

function ProjectPlanRiskSectionBody({ formData, onChange, mode, projectId }) {
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
        <FieldLabelWithHelp helpKey="sim.project_plans.risk_management_strategy_id" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2" listOptions={false}>
          Link to Risk Management Strategy
        </FieldLabelWithHelp>
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
        <FieldLabelWithHelp helpKey="sim.project_plans.risk_summary" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Risk Summary
        </FieldLabelWithHelp>
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
        <FieldLabelWithHelp helpKey="sim.project_plans.key_risks" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Key Risks
        </FieldLabelWithHelp>
        <PlanListTable
          kind="project"
          listKey="key_risks"
          value={formData.key_risks}
          onChange={(rows) => onChange('key_risks', rows)}
          disabled={mode === 'view'}
        />
      </div>
    </div>
  )
}

// v1345 slice 4 Simulator parity: field help (sim.* keys aliased to the Platform help).
const HELP_KEYS = [
  'sim.project_plans.risk_management_strategy_id',
  'sim.project_plans.risk_summary',
  'sim.project_plans.key_risks',
]

export default function ProjectPlanRiskSection(props) {
  return (
    <FieldHelpScope helpKeys={HELP_KEYS}>
      <ProjectPlanRiskSectionBody {...props} />
    </FieldHelpScope>
  )
}
