import Input from '../../ui/Input'
import Textarea from '../../ui/Textarea'
import SearchableSelect from '../../ui/SearchableSelect'

const METH = [
  { value: 'system', label: 'System' },
  { value: 'predictive', label: 'Predictive' },
  { value: 'agile', label: 'Agile' },
  { value: 'hybrid', label: 'Hybrid' },
]
const TTYPE = [
  { value: 'manual', label: 'Manual' },
  { value: 'ui', label: 'UI' },
  { value: 'api', label: 'API' },
  { value: 'database', label: 'Database' },
  { value: 'automated', label: 'Automated' },
]
const SCEN = [
  { value: 'positive', label: 'Positive' },
  { value: 'negative', label: 'Negative' },
  { value: 'edge_case', label: 'Edge case' },
]
const PRIO = ['critical', 'high', 'medium', 'low'].map((p) => ({ value: p, label: p }))

export default function StepGeneralInfo({ form, setForm, moduleOptions, onRegenerateCode, readOnlyCode = false }) {
  const opts = (moduleOptions || []).map((m) => ({ value: m.id, label: `${m.code} — ${m.name}` }))

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="flex flex-wrap items-end gap-2">
        <div className="flex-1 min-w-[12rem]">
          <Input
            label="Test case code"
            value={form.test_case_code}
            onChange={(e) => setForm((f) => ({ ...f, test_case_code: e.target.value }))}
            disabled={readOnlyCode}
            required
            className="font-mono text-sm"
          />
        </div>
        {!readOnlyCode && onRegenerateCode && (
          <button
            type="button"
            onClick={onRegenerateCode}
            className="text-sm px-3 py-2 rounded border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200"
          >
            Regenerate code
          </button>
        )}
      </div>
      <Input
        label="Title"
        required
        value={form.title}
        onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
      />
      <Textarea
        label="Description"
        value={form.description}
        onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
        rows={3}
      />
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Module</label>
        <SearchableSelect
          options={opts}
          value={form.module_id || ''}
          onChange={(v) => setForm((f) => ({ ...f, module_id: v || null }))}
          placeholder="Select module"
        />
      </div>
      <Input
        label="Feature name"
        value={form.feature_name}
        onChange={(e) => setForm((f) => ({ ...f, feature_name: e.target.value }))}
      />
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Methodology</label>
          <SearchableSelect
            options={METH}
            value={form.methodology_type}
            onChange={(v) => setForm((f) => ({ ...f, methodology_type: v }))}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Test type</label>
          <SearchableSelect
            options={TTYPE}
            value={form.test_type}
            onChange={(v) => setForm((f) => ({ ...f, test_type: v }))}
          />
        </div>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Scenario</label>
          <SearchableSelect
            options={SCEN}
            value={form.scenario_type}
            onChange={(v) => setForm((f) => ({ ...f, scenario_type: v }))}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Priority</label>
          <SearchableSelect
            options={PRIO}
            value={form.priority}
            onChange={(v) => setForm((f) => ({ ...f, priority: v }))}
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Severity if failed</label>
        <SearchableSelect
          options={PRIO}
          value={form.severity_if_failed}
          onChange={(v) => setForm((f) => ({ ...f, severity_if_failed: v }))}
        />
      </div>
    </div>
  )
}
