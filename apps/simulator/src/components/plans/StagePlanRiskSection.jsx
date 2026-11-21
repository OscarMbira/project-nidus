import PlanListTable from '@nidus/ui/PlanListTable'
/**
 * Stage Plan Risk Section
 */

function StagePlanRiskSectionBody({ formData, onChange, mode, projectId }) {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Risk & Quality Summary</h2>

      <div>
        <FieldLabelWithHelp helpKey="sim.stage_plans.risk_summary" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Stage Risk Summary
        </FieldLabelWithHelp>
        <textarea
          value={formData.risk_summary || ''}
          onChange={(e) => onChange('risk_summary', e.target.value)}
          disabled={mode === 'view'}
          rows={6}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          placeholder="Enter stage risk summary"
        />
      </div>

      <div>
        <FieldLabelWithHelp helpKey="sim.stage_plans.key_risks" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Key Risks
        </FieldLabelWithHelp>
        <PlanListTable
          kind="stage"
          listKey="key_risks"
          value={formData.key_risks}
          onChange={(rows) => onChange('key_risks', rows)}
          disabled={mode === 'view'}
        />
      </div>

      <div>
        <FieldLabelWithHelp helpKey="sim.stage_plans.quality_summary" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
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
        <FieldLabelWithHelp helpKey="sim.stage_plans.quality_gates" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Quality Gates
        </FieldLabelWithHelp>
        <PlanListTable
          kind="stage"
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
  'sim.stage_plans.risk_summary',
  'sim.stage_plans.key_risks',
  'sim.stage_plans.quality_summary',
  'sim.stage_plans.quality_gates',
]

export default function StagePlanRiskSection(props) {
  return (
    <FieldHelpScope helpKeys={HELP_KEYS}>
      <StagePlanRiskSectionBody {...props} />
    </FieldHelpScope>
  )
}
