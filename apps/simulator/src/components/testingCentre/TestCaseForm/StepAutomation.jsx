import Input from '../../ui/Input'

export default function StepAutomation({ form, setForm }) {
  return (
    <div className="space-y-4 max-w-2xl">
      <Input
        label="Automation key"
        value={form.automation_key}
        onChange={(e) => setForm((f) => ({ ...f, automation_key: e.target.value }))}
        className="font-mono text-sm"
      />
      <Input
        label="Playwright spec path"
        value={form.playwright_spec_path}
        onChange={(e) => setForm((f) => ({ ...f, playwright_spec_path: e.target.value }))}
        placeholder="tests/e2e/.../*.spec.ts"
        className="font-mono text-sm"
      />
      <Input
        label="Vitest spec path"
        value={form.vitest_spec_path}
        onChange={(e) => setForm((f) => ({ ...f, vitest_spec_path: e.target.value }))}
        placeholder="tests/unit/.../*.test.ts"
        className="font-mono text-sm"
      />
      <Input
        label="DB / SQL test path"
        value={form.database_test_path}
        onChange={(e) => setForm((f) => ({ ...f, database_test_path: e.target.value }))}
        className="font-mono text-sm"
      />
    </div>
  )
}
