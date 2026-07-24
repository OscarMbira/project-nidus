import Input from '../../ui/Input'
import SearchableSelect from '../../ui/SearchableSelect'

const REUSE = [
  { value: 'true', label: 'Yes' },
  { value: 'false', label: 'No' },
]

const OWNER_ROLES = [
  { value: '', label: '—' },
  { value: 'system_admin', label: 'System admin' },
  { value: 'pmo_admin', label: 'PMO admin' },
  { value: 'project_manager', label: 'Project manager' },
  { value: 'scrum_master', label: 'Scrum master' },
  { value: 'tester', label: 'Tester' },
  { value: 'viewer', label: 'Viewer' },
]

export default function StepEvidenceTags({ form, setForm }) {
  const tagsStr = (form.tags || []).join(', ')
  return (
    <div className="space-y-4 max-w-2xl">
      <p className="text-sm text-gray-600 dark:text-gray-400">
        Expected screenshot can be set after a baseline run. Tags help filter in the case library.
      </p>
      <Input
        label="Tags (comma-separated)"
        value={tagsStr}
        onChange={(e) =>
          setForm((f) => ({
            ...f,
            tags: e.target.value
              .split(',')
              .map((t) => t.trim())
              .filter(Boolean),
          }))
        }
        placeholder="auth, login, negative"
      />
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Default owner role</label>
        <SearchableSelect
          options={OWNER_ROLES}
          value={form.owner_role || ''}
          onChange={(v) => setForm((f) => ({ ...f, owner_role: v || null }))}
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Reusable in multiple suites</label>
        <SearchableSelect
          options={REUSE}
          value={form.is_reusable ? 'true' : 'false'}
          onChange={(v) => setForm((f) => ({ ...f, is_reusable: v === 'true' }))}
        />
      </div>
    </div>
  )
}
