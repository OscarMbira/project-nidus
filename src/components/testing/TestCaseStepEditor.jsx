import { useState } from 'react'
import { Plus, Trash2, GripVertical, ChevronUp, ChevronDown } from 'lucide-react'

export default function TestCaseStepEditor({ steps = [], onChange }) {
  const addStep = () => {
    onChange([...steps, { action: '', expected_result: '', test_data: '' }])
  }

  const removeStep = index => {
    onChange(steps.filter((_, i) => i !== index))
  }

  const updateStep = (index, field, value) => {
    const updated = steps.map((s, i) => i === index ? { ...s, [field]: value } : s)
    onChange(updated)
  }

  const moveStep = (index, direction) => {
    const newSteps = [...steps]
    const swapIndex = index + direction
    if (swapIndex < 0 || swapIndex >= newSteps.length) return
    ;[newSteps[index], newSteps[swapIndex]] = [newSteps[swapIndex], newSteps[index]]
    onChange(newSteps)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-300">Test Steps</label>
        <button type="button" onClick={addStep}
          className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300">
          <Plus className="w-3 h-3" /> Add Step
        </button>
      </div>

      {steps.length === 0 && (
        <p className="text-xs text-gray-500 italic">No steps added yet. Click "Add Step" to begin.</p>
      )}

      {steps.map((step, index) => (
        <div key={index} className="bg-gray-750 border border-gray-600 rounded-lg p-3 space-y-2">
          {/* Step header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <GripVertical className="w-4 h-4 text-gray-500" />
              <span className="text-xs font-semibold text-gray-400">Step {index + 1}</span>
            </div>
            <div className="flex items-center gap-1">
              <button type="button" onClick={() => moveStep(index, -1)}
                disabled={index === 0}
                className="text-gray-500 hover:text-gray-300 disabled:opacity-30">
                <ChevronUp className="w-4 h-4" />
              </button>
              <button type="button" onClick={() => moveStep(index, 1)}
                disabled={index === steps.length - 1}
                className="text-gray-500 hover:text-gray-300 disabled:opacity-30">
                <ChevronDown className="w-4 h-4" />
              </button>
              <button type="button" onClick={() => removeStep(index)}
                className="text-red-400 hover:text-red-300 ml-1">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Action */}
          <div>
            <label className="block text-xs text-gray-400 mb-1">
              Action <span className="text-red-400">*</span>
            </label>
            <textarea
              value={step.action}
              onChange={e => updateStep(index, 'action', e.target.value)}
              rows={2}
              placeholder="Describe what the tester should do…"
              className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-white text-xs
                focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
            />
          </div>

          {/* Expected Result */}
          <div>
            <label className="block text-xs text-gray-400 mb-1">Expected Result</label>
            <textarea
              value={step.expected_result}
              onChange={e => updateStep(index, 'expected_result', e.target.value)}
              rows={2}
              placeholder="What should happen after this action…"
              className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-white text-xs
                focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
            />
          </div>

          {/* Test Data */}
          <div>
            <label className="block text-xs text-gray-400 mb-1">Test Data (optional)</label>
            <input
              type="text"
              value={step.test_data}
              onChange={e => updateStep(index, 'test_data', e.target.value)}
              placeholder="e.g. Username: admin@test.com"
              className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-white text-xs
                focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>
      ))}

      {steps.length > 0 && (
        <button type="button" onClick={addStep}
          className="w-full py-2 border border-dashed border-gray-600 rounded-lg text-xs text-gray-400
            hover:border-blue-500 hover:text-blue-400 transition-colors">
          + Add Another Step
        </button>
      )}
    </div>
  )
}
