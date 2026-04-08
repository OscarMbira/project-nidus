/**
 * Stage Plan Risk Section
 */

export default function StagePlanRiskSection({ formData, onChange, mode, projectId }) {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Risk & Quality Summary</h2>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Stage Risk Summary
        </label>
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
