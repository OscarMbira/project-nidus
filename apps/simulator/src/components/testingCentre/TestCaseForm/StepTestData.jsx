import Textarea from '../../ui/Textarea'

export default function StepTestData({ form, setForm }) {
  return (
    <div className="space-y-4 max-w-3xl">
      <Textarea
        label="Test data (JSON object)"
        helperText='Valid JSON object, e.g. { "key": "value" }'
        value={form._testDataJson}
        onChange={(e) => setForm((f) => ({ ...f, _testDataJson: e.target.value }))}
        rows={8}
        className="font-mono text-xs"
      />
      <Textarea
        label="Expected result"
        value={form.expected_result}
        onChange={(e) => setForm((f) => ({ ...f, expected_result: e.target.value }))}
        rows={5}
        required
      />
    </div>
  )
}
