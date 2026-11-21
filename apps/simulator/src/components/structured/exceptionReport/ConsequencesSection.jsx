import { AlertTriangle } from 'lucide-react'
import FieldLabelWithHelp from '@nidus/ui/FieldLabelWithHelp'
import { FieldHelpScope } from '@nidus/shared/context/FieldHelpContext'

function ConsequencesSectionBody({ formData, onChange, errors, mode }) {
  return (
    <div className="space-y-6">
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <AlertTriangle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
          <div>
            <h3 className="text-sm font-medium text-blue-900 dark:text-blue-100">Section 5: Consequences</h3>
            <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
              Assess the implications of the exception at different levels
            </p>
          </div>
        </div>
      </div>

      <div>
        <FieldLabelWithHelp helpKey="sim.exception_reports.project_consequences" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2" required>
          Project Consequences *
        </FieldLabelWithHelp>
        <textarea
          value={formData.project_consequences || ''}
          onChange={(e) => onChange('project_consequences', e.target.value)}
          required
          disabled={mode === 'view'}
          rows={5}
          placeholder="Describe implications for the project..."
          className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${
            errors.project_consequences ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
          }`}
        />
        {errors.project_consequences && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.project_consequences}</p>
        )}
        <p className="mt-1 text-xs text-gray-500">Minimum 50 characters required</p>
      </div>

      <div>
        <FieldLabelWithHelp helpKey="sim.exception_reports.programme_consequences" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Programme Consequences
        </FieldLabelWithHelp>
        <textarea
          value={formData.programme_consequences || ''}
          onChange={(e) => onChange('programme_consequences', e.target.value)}
          disabled={mode === 'view'}
          rows={4}
          placeholder="Describe implications for the programme..."
          className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600"
        />
      </div>

      <div>
        <FieldLabelWithHelp helpKey="sim.exception_reports.corporate_consequences" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Corporate Consequences
        </FieldLabelWithHelp>
        <textarea
          value={formData.corporate_consequences || ''}
          onChange={(e) => onChange('corporate_consequences', e.target.value)}
          disabled={mode === 'view'}
          rows={4}
          placeholder="Describe implications for the organization..."
          className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600"
        />
      </div>

      <div>
        <FieldLabelWithHelp helpKey="sim.exception_reports.consequences_if_not_addressed" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Consequences if Not Addressed
        </FieldLabelWithHelp>
        <textarea
          value={formData.consequences_if_not_addressed || ''}
          onChange={(e) => onChange('consequences_if_not_addressed', e.target.value)}
          disabled={mode === 'view'}
          rows={4}
          placeholder="What happens if the deviation is not addressed..."
          className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <FieldLabelWithHelp helpKey="sim.exception_reports.impact_on_business_case" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Impact on Business Case
          </FieldLabelWithHelp>
          <textarea
            value={formData.impact_on_business_case || ''}
            onChange={(e) => onChange('impact_on_business_case', e.target.value)}
            disabled={mode === 'view'}
            rows={5}
            placeholder="Assess impact on business case..."
            className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600"
          />
        </div>
        <div>
          <FieldLabelWithHelp helpKey="sim.exception_reports.impact_on_project_plan" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Impact on Project Plan
          </FieldLabelWithHelp>
          <textarea
            value={formData.impact_on_project_plan || ''}
            onChange={(e) => onChange('impact_on_project_plan', e.target.value)}
            disabled={mode === 'view'}
            rows={5}
            placeholder="Assess impact on project plan..."
            className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600"
          />
        </div>
      </div>
    </div>
  )
}

// v1345 slice 4 Simulator parity: field help (sim.* keys aliased to the Platform help).
const HELP_KEYS = [
  'sim.exception_reports.project_consequences',
  'sim.exception_reports.programme_consequences',
  'sim.exception_reports.corporate_consequences',
  'sim.exception_reports.consequences_if_not_addressed',
  'sim.exception_reports.impact_on_business_case',
  'sim.exception_reports.impact_on_project_plan',
]

export default function ConsequencesSection(props) {
  return (
    <FieldHelpScope helpKeys={HELP_KEYS}>
      <ConsequencesSectionBody {...props} />
    </FieldHelpScope>
  )
}
