import { useMemo, useState } from 'react'
import { ArrowLeft, ChevronDown, ChevronUp, Plus } from 'lucide-react'
import MultiLineListInput from '@nidus/ui/MultiLineListInput'
import FieldImagePicker from './FieldImagePicker'
import RowActionButton from '@nidus/ui/RowActionButton'
import ViewToggle from '@nidus/ui/ViewToggle'
import RowNumberBadge from '@nidus/ui/RowNumberBadge'
import { TableRowNumberHeader, TableRowNumberCell } from '@nidus/ui/Table'
import { useViewMode } from '@nidus/shared/hooks/useViewMode'
import { getDisplayRowNumber } from '@nidus/shared/utils/tableRowNumberUtils'

function actionPreview(action) {
  const line = String(action || '').split('\n').map((part) => part.trim()).filter(Boolean)[0] || ''
  if (!line) return 'No action yet'
  return line.length > 140 ? `${line.slice(0, 137)}…` : line
}

export default function TestCaseStepEditor({ steps = [], onChange, projectId }) {
  const [viewMode, setViewMode] = useViewMode('testing-test-case-steps', 'list')
  const [query, setQuery] = useState('')
  const [panel, setPanel] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return steps
      .map((step, index) => ({ step, index }))
      .filter(({ step, index }) => {
        if (!q) return true
        const haystack = `step ${index + 1} ${step.action || ''}`.toLowerCase()
        return haystack.includes(q)
      })
  }, [steps, query])

  const addStep = () => {
    const next = [...steps, { action: '', expected_result: '', test_data: '' }]
    onChange(next)
    setConfirmDelete(null)
    setPanel({ index: next.length - 1, mode: 'edit' })
  }

  const updateStep = (index, field, value) => {
    onChange(steps.map((step, i) => (i === index ? { ...step, [field]: value } : step)))
  }

  const moveStep = (index, direction) => {
    const swapIndex = index + direction
    if (swapIndex < 0 || swapIndex >= steps.length) return
    const next = [...steps]
    ;[next[index], next[swapIndex]] = [next[swapIndex], next[index]]
    onChange(next)
  }

  const removeStep = (index) => {
    onChange(steps.filter((_, i) => i !== index))
    setConfirmDelete(null)
    setPanel(null)
  }

  const active = panel && steps[panel.index] ? { ...panel, step: steps[panel.index] } : null
  const searching = query.trim().length > 0

  if (active) {
    const readOnly = active.mode === 'view'
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setPanel(null)}
            className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to steps
          </button>
          <div className="flex items-center gap-1">
            {readOnly ? (
              <RowActionButton variant="edit" label="Edit step" onClick={() => setPanel({ index: active.index, mode: 'edit' })} />
            ) : (
              <RowActionButton variant="view" label="View step" onClick={() => setPanel({ index: active.index, mode: 'view' })} />
            )}
            <RowActionButton variant="delete" label="Delete step" onClick={() => setConfirmDelete(active.index)} />
          </div>
        </div>

        <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
          Step {active.index + 1}
          <span className="ml-2 text-sm font-normal text-gray-600 dark:text-gray-300">
            {readOnly ? 'View' : 'Edit'}
          </span>
        </h3>

        {confirmDelete === active.index && (
          <DeleteConfirm
            stepNumber={active.index + 1}
            onCancel={() => setConfirmDelete(null)}
            onConfirm={() => removeStep(active.index)}
          />
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
            Action {!readOnly && <span className="text-red-600 dark:text-red-400">*</span>}
          </label>
          {readOnly ? (
            <p className="whitespace-pre-wrap rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100">
              {active.step.action || 'No action yet'}
            </p>
          ) : (
            <textarea
              value={active.step.action}
              onChange={(e) => updateStep(active.index, 'action', e.target.value)}
              rows={3}
              placeholder="Describe what the tester should do…"
              className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          )}
          <FieldImagePicker
            images={active.step.action_images}
            onChange={(value) => updateStep(active.index, 'action_images', value)}
            projectId={projectId}
            fieldKey="action"
            disabled={readOnly}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Expected Result</label>
          <MultiLineListInput
            viewModeId="testing-test-case-step-expected-result"
            value={active.step.expected_result || ''}
            onChange={(value) => updateStep(active.index, 'expected_result', value)}
            itemColumnLabel="Expected result"
            placeholder="Add an expected result"
            ariaLabelPrefix="expected result"
            disabled={readOnly}
          />
          <FieldImagePicker
            images={active.step.expected_result_images}
            onChange={(value) => updateStep(active.index, 'expected_result_images', value)}
            projectId={projectId}
            fieldKey="expected-result"
            disabled={readOnly}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Test Data (optional)</label>
          <MultiLineListInput
            viewModeId="testing-test-case-step-test-data"
            value={active.step.test_data || ''}
            onChange={(value) => updateStep(active.index, 'test_data', value)}
            itemColumnLabel="Test data"
            placeholder="Add test data"
            ariaLabelPrefix="test data"
            disabled={readOnly}
          />
          <FieldImagePicker
            images={active.step.test_data_images}
            onChange={(value) => updateStep(active.index, 'test_data_images', value)}
            projectId={projectId}
            fieldKey="test-data"
            disabled={readOnly}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Test Steps</label>
        <div className="flex items-center gap-2">
          <ViewToggle value={viewMode} onChange={setViewMode} ariaLabel="Step list layout" />
          <button
            type="button"
            onClick={addStep}
            className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Add Step
          </button>
        </div>
      </div>

      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search steps"
        aria-label="Search steps"
        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
      />

      {confirmDelete != null && steps[confirmDelete] && (
        <DeleteConfirm
          stepNumber={confirmDelete + 1}
          onCancel={() => setConfirmDelete(null)}
          onConfirm={() => removeStep(confirmDelete)}
        />
      )}

      {steps.length === 0 && (
        <p className="text-sm text-gray-700 dark:text-gray-200">No steps yet. Add a step to describe what the tester does.</p>
      )}

      {steps.length > 0 && filtered.length === 0 && (
        <p className="text-sm text-gray-700 dark:text-gray-200">No steps match this search.</p>
      )}

      {filtered.length > 0 && viewMode === 'list' && (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-700 dark:bg-gray-700 dark:text-gray-200">
              <tr>
                <TableRowNumberHeader className="!normal-case" />
                <th className="p-3">Step</th>
                <th className="p-3">Action</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(({ step, index }, visibleIndex) => (
                <tr key={index} className="border-t border-gray-200 dark:border-gray-700">
                  <TableRowNumberCell number={getDisplayRowNumber(visibleIndex)} />
                  <td className="p-3 font-medium text-gray-900 dark:text-gray-100 whitespace-nowrap">Step {index + 1}</td>
                  <td className="p-3 text-gray-700 dark:text-gray-200">{actionPreview(step.action)}</td>
                  <td className="p-3">
                    <StepActions
                      index={index}
                      count={steps.length}
                      moveDisabled={searching}
                      onMove={moveStep}
                      onView={() => setPanel({ index, mode: 'view' })}
                      onEdit={() => setPanel({ index, mode: 'edit' })}
                      onDelete={() => setConfirmDelete(index)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {filtered.length > 0 && viewMode === 'grid' && (
        <div className="grid gap-3 sm:grid-cols-2">
          {filtered.map(({ step, index }, visibleIndex) => (
            <div key={index} className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
              <div className="mb-2 flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <RowNumberBadge number={getDisplayRowNumber(visibleIndex)} />
                  <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">Step {index + 1}</span>
                </div>
              </div>
              <p className="mb-3 text-sm text-gray-700 dark:text-gray-200">{actionPreview(step.action)}</p>
              <StepActions
                index={index}
                count={steps.length}
                moveDisabled={searching}
                onMove={moveStep}
                onView={() => setPanel({ index, mode: 'view' })}
                onEdit={() => setPanel({ index, mode: 'edit' })}
                onDelete={() => setConfirmDelete(index)}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function StepActions({ index, count, moveDisabled, onMove, onView, onEdit, onDelete }) {
  return (
    <div className="flex items-center justify-end gap-1">
      <button
        type="button"
        onClick={() => onMove(index, -1)}
        disabled={moveDisabled || index === 0}
        aria-label="Move step up"
        className="rounded p-2 text-gray-600 hover:bg-gray-100 hover:text-gray-900 disabled:opacity-30 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white"
      >
        <ChevronUp className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => onMove(index, 1)}
        disabled={moveDisabled || index === count - 1}
        aria-label="Move step down"
        className="rounded p-2 text-gray-600 hover:bg-gray-100 hover:text-gray-900 disabled:opacity-30 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white"
      >
        <ChevronDown className="h-4 w-4" />
      </button>
      <RowActionButton variant="view" label="View step" onClick={onView} />
      <RowActionButton variant="edit" label="Edit step" onClick={onEdit} />
      <RowActionButton variant="delete" label="Delete step" onClick={onDelete} />
    </div>
  )
}

function DeleteConfirm({ stepNumber, onCancel, onConfirm }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-300 bg-red-50 px-3 py-2 dark:border-red-700 dark:bg-red-950">
      <p className="text-sm font-medium text-red-950 dark:text-red-50">Delete Step {stepNumber}?</p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-800 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700"
        >
          Delete
        </button>
      </div>
    </div>
  )
}
