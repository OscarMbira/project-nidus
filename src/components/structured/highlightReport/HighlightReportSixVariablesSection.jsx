import { TrendingUp, Clock, DollarSign, Award, Target, Shield, AlertTriangle } from 'lucide-react'

import { getDisplayRowNumber } from '../../../utils/tableRowNumberUtils'
const VAR_OPTIONS = [
  { value: '', label: '—' },
  { value: 'on_track', label: 'On track' },
  { value: 'at_risk', label: 'At risk' },
  { value: 'off_track', label: 'Off track' },
  { value: 'exception', label: 'Exception' }
]

const VARIABLES = [
  { key: 'time', label: 'Time', icon: Clock },
  { key: 'cost', label: 'Cost', icon: DollarSign },
  { key: 'quality', label: 'Quality', icon: Award },
  { key: 'scope', label: 'Scope', icon: Target },
  { key: 'benefits', label: 'Benefits', icon: TrendingUp },
  { key: 'risk', label: 'Risk', icon: Shield }
]

export default function HighlightReportSixVariablesSection({ formData, onChange, errors, mode }) {
  const disabled = mode === 'view'
  const inputClass = (name) =>
    `w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${
      errors?.[name] ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
    } ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2 flex items-center gap-2">
          <TrendingUp className="h-4 w-4" />
          Six Variables Status Review
        </h3>
        <p className="text-sm text-blue-700 dark:text-blue-300">
          PRINCE2 six performance variables: Time, Cost, Quality, Scope, Benefits, Risk.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {VARIABLES.map((v) => {
          const Icon = v.icon
          const statusKey = v.key === 'quality' ? 'quality_status_six' : `${v.key}_status`
          const summaryKey = `${v.key}_summary`
          const forecastKey = `${v.key}_forecast`
          return (
            <div key={v.key} className="rounded-lg border border-gray-200 dark:border-gray-600 p-4 space-y-3">
              <div className="flex items-center gap-2 font-medium text-gray-900 dark:text-white">
                <Icon className="h-4 w-4" />
                {v.label}
              </div>
              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Status</label>
                <select
                  value={formData[statusKey] || ''}
                  onChange={(e) => onChange(statusKey, e.target.value)}
                  disabled={disabled}
                  className={inputClass(statusKey)}
                >
                  {VAR_OPTIONS.map((o, index) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Summary</label>
                <textarea
                  value={formData[summaryKey] || ''}
                  onChange={(e) => onChange(summaryKey, e.target.value)}
                  disabled={disabled}
                  rows={2}
                  placeholder={`${v.label} performance summary`}
                  className={inputClass(summaryKey)}
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Forecast</label>
                <textarea
                  value={formData[forecastKey] || ''}
                  onChange={(e) => onChange(forecastKey, e.target.value)}
                  disabled={disabled}
                  rows={2}
                  placeholder={`${v.label} forecast`}
                  className={inputClass(forecastKey)}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
