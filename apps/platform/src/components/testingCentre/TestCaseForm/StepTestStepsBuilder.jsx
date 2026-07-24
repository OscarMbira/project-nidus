import Textarea from '../../ui/Textarea'
import TestStepsBuilder from '../TestStepsBuilder'

export default function StepTestCaseSteps({ form, setForm }) {
  return (
    <div className="space-y-4 max-w-3xl">
      <Textarea
        label="Preconditions"
        value={form.preconditions}
        onChange={(e) => setForm((f) => ({ ...f, preconditions: e.target.value }))}
        rows={3}
      />
      <div>
        <span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Test steps</span>
        <TestStepsBuilder
          steps={form.test_steps}
          onChange={(test_steps) => setForm((f) => ({ ...f, test_steps }))}
        />
      </div>
    </div>
  )
}
