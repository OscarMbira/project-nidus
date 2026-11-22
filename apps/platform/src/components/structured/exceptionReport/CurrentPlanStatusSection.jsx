import { useEffect } from 'react'
import { FieldHelpScope } from '@nidus/shared/context/FieldHelpContext'
import FieldLabelWithHelp from '@nidus/ui/FieldLabelWithHelp'
import { TrendingUp, TrendingDown, Calendar, DollarSign } from 'lucide-react'
import { getCurrentPlanStatus } from '../../../services/exceptionReportService'
import RegionalDateInput from '@nidus/ui/RegionalDateInput'

function CurrentPlanStatusSectionBody({ formData, onChange, errors, mode, projectId }) {
  useEffect(() => {
    if (projectId && mode === 'create' && !formData.time_baseline_end_date) {
      loadPlanStatus()
    }
  }, [projectId, mode])

  const loadPlanStatus = async () => {
    if (!projectId) return
    try {
      const status = await getCurrentPlanStatus(projectId)
      if (status) {
        onChange('time_baseline_end_date', status.time_baseline_end_date)
        onChange('time_current_forecast_date', status.time_current_forecast)
        onChange('time_variance_days', status.time_variance_days)
        onChange('cost_baseline_budget', status.cost_baseline_budget)
        onChange('cost_current_forecast', status.cost_current_forecast)
        onChange('cost_variance_amount', status.cost_variance)
        onChange('cost_variance_percentage', status.cost_variance_percentage)
        onChange('scope_status', status.scope_status || '')
        onChange('quality_status', status.quality_status || '')
      }
    } catch (error) {
      console.error('Error loading plan status:', error)
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
          <div>
            <h3 className="text-sm font-medium text-blue-900 dark:text-blue-100">Current Plan Status Snapshot</h3>
            <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
              Current time and cost performance at the time of exception
            </p>
          </div>
        </div>
      </div>

      {/* Time Performance */}
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
          <Calendar className="h-4 w-4 mr-2" />
          Time Performance
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <FieldLabelWithHelp helpKey="public.exception_reports.time_baseline_end_date" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Baseline End Date
            </FieldLabelWithHelp>
            <RegionalDateInput eventStyle
              value={formData.time_baseline_end_date || ''}
              onChange={(e) => onChange('time_baseline_end_date', e.target.value || null)}
              disabled={mode === 'view'}
              className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600"
            />
          </div>
          <div>
            <FieldLabelWithHelp helpKey="public.exception_reports.time_current_forecast_date" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Current Forecast Date
            </FieldLabelWithHelp>
            <RegionalDateInput eventStyle
              value={formData.time_current_forecast_date || ''}
              onChange={(e) => onChange('time_current_forecast_date', e.target.value || null)}
              disabled={mode === 'view'}
              className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600"
            />
          </div>
          <div>
            <FieldLabelWithHelp helpKey="public.exception_reports.time_variance_days" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Variance (Days)
            </FieldLabelWithHelp>
            <div className="relative">
              {formData.time_variance_days !== null && formData.time_variance_days !== undefined && (
                formData.time_variance_days >= 0 ? (
                  <TrendingUp className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-red-500" />
                ) : (
                  <TrendingDown className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-green-500" />
                )
              )}
              <input
                type="number"
                value={formData.time_variance_days || ''}
                onChange={(e) => onChange('time_variance_days', e.target.value ? parseInt(e.target.value) : null)}
                disabled={mode === 'view'}
                className={`w-full ${formData.time_variance_days !== null ? 'pl-10' : 'pl-3'} pr-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600`}
              />
            </div>
          </div>
        </div>
        <div className="mt-4">
          <FieldLabelWithHelp helpKey="public.exception_reports.time_performance_status" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Time Performance Status
          </FieldLabelWithHelp>
          <textarea
            value={formData.time_performance_status || ''}
            onChange={(e) => onChange('time_performance_status', e.target.value)}
            disabled={mode === 'view'}
            rows={3}
            placeholder="Describe current time performance status..."
            className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600"
          />
        </div>
      </div>

      {/* Cost Performance */}
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
          <DollarSign className="h-4 w-4 mr-2" />
          Cost Performance
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <FieldLabelWithHelp helpKey="public.exception_reports.cost_baseline_budget" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2" isAmount>
              Baseline Budget
            </FieldLabelWithHelp>
            <input
              type="number"
              step="0.01"
              value={formData.cost_baseline_budget || ''}
              onChange={(e) => onChange('cost_baseline_budget', e.target.value ? parseFloat(e.target.value) : null)}
              disabled={mode === 'view'}
              className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600"
            />
          </div>
          <div>
            <FieldLabelWithHelp helpKey="public.exception_reports.cost_current_forecast" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2" isAmount>
              Current Forecast
            </FieldLabelWithHelp>
            <input
              type="number"
              step="0.01"
              value={formData.cost_current_forecast || ''}
              onChange={(e) => onChange('cost_current_forecast', e.target.value ? parseFloat(e.target.value) : null)}
              disabled={mode === 'view'}
              className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600"
            />
          </div>
          <div>
            <FieldLabelWithHelp helpKey="public.exception_reports.cost_variance_amount" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2" isAmount>
              Variance Amount
            </FieldLabelWithHelp>
            <div className="relative">
              {formData.cost_variance_amount !== null && formData.cost_variance_amount !== undefined && (
                formData.cost_variance_amount >= 0 ? (
                  <TrendingUp className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-red-500" />
                ) : (
                  <TrendingDown className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-green-500" />
                )
              )}
              <input
                type="number"
                step="0.01"
                value={formData.cost_variance_amount || ''}
                onChange={(e) => onChange('cost_variance_amount', e.target.value ? parseFloat(e.target.value) : null)}
                disabled={mode === 'view'}
                className={`w-full ${formData.cost_variance_amount !== null ? 'pl-10' : 'pl-3'} pr-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600`}
              />
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div>
            <FieldLabelWithHelp helpKey="public.exception_reports.cost_variance_percentage" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Variance Percentage (%)
            </FieldLabelWithHelp>
            <input
              type="number"
              step="0.01"
              value={formData.cost_variance_percentage || ''}
              onChange={(e) => onChange('cost_variance_percentage', e.target.value ? parseFloat(e.target.value) : null)}
              disabled={mode === 'view'}
              className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600"
            />
          </div>
        </div>
        <div className="mt-4">
          <FieldLabelWithHelp helpKey="public.exception_reports.cost_performance_status" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Cost Performance Status
          </FieldLabelWithHelp>
          <textarea
            value={formData.cost_performance_status || ''}
            onChange={(e) => onChange('cost_performance_status', e.target.value)}
            disabled={mode === 'view'}
            rows={3}
            placeholder="Describe current cost performance status..."
            className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600"
          />
        </div>
      </div>

      {/* Scope and Quality Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <FieldLabelWithHelp helpKey="public.exception_reports.scope_status" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Scope Status
          </FieldLabelWithHelp>
          <textarea
            value={formData.scope_status || ''}
            onChange={(e) => onChange('scope_status', e.target.value)}
            disabled={mode === 'view'}
            rows={3}
            placeholder="Current scope status..."
            className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600"
          />
        </div>
        <div>
          <FieldLabelWithHelp helpKey="public.exception_reports.quality_status" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Quality Status
          </FieldLabelWithHelp>
          <textarea
            value={formData.quality_status || ''}
            onChange={(e) => onChange('quality_status', e.target.value)}
            disabled={mode === 'view'}
            rows={3}
            placeholder="Current quality status..."
            className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600"
          />
        </div>
      </div>
    </div>
  )
}

// v1345 slice 4: field help for this component (public.exception_reports.<column>). It carries its own scope,
// so every page that renders it shows the help.
const HELP_KEYS = [
  'time_baseline_end_date', 'time_current_forecast_date', 'time_variance_days', 'time_performance_status',
  'cost_baseline_budget', 'cost_current_forecast', 'cost_variance_amount', 'cost_variance_percentage',
  'cost_performance_status', 'scope_status', 'quality_status',
].map((name) => `public.exception_reports.${name}`)

export default function CurrentPlanStatusSection(props) {
  return (
    <FieldHelpScope helpKeys={HELP_KEYS}>
      <CurrentPlanStatusSectionBody {...props} />
    </FieldHelpScope>
  )
}
