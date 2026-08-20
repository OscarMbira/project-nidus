import { useEffect, useState } from 'react'
import DynamicFormRenderer from '../../components/forms/DynamicFormRenderer'
import {
  createInstanceTemplate,
  deleteInstanceTemplate,
  listInstanceTemplatesForScope,
} from '../../services/formEngineService'
import RowActionButton from './RowActionButton'

/**
 * Author "completed" example instances for a shared form template — reused at every tier
 * (PMO/org-wide, Portfolio, Programme, Project), one component built once (decision 15/16).
 * Not a real form_instances row: no project, no owner, no workflow status (finding #7) — saves
 * straight to form_instance_templates via createInstanceTemplate/deleteInstanceTemplate.
 */
export default function CompletedExampleManager({
  mode = 'platform',
  accountId,
  templateId,
  schema,
  scopeEntityType = null,
  scopeEntityId = null,
}) {
  const [examples, setExamples] = useState([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [values, setValues] = useState({})
  const [rows, setRows] = useState({})

  async function load() {
    if (!accountId || !templateId) return
    setLoading(true)
    setErr(null)
    const result = await listInstanceTemplatesForScope(accountId, templateId, scopeEntityType, scopeEntityId, mode)
    setLoading(false)
    if (!result.success) { setErr(result.message); return }
    setExamples(result.data)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountId, templateId, scopeEntityType, scopeEntityId, mode])

  async function handleSave() {
    if (!name.trim()) {
      setErr('A name is required to save this example.')
      return
    }
    setBusy(true)
    setErr(null)
    const result = await createInstanceTemplate(
      {
        organisationId: accountId,
        templateId,
        name,
        description,
        values,
        rows,
        scopeEntityType,
        scopeEntityId,
      },
      mode,
    )
    setBusy(false)
    if (!result.success) { setErr(result.message); return }
    setExamples((prev) => [result.data, ...prev])
    setCreating(false)
    setName('')
    setDescription('')
    setValues({})
    setRows({})
  }

  async function handleDelete(id) {
    setBusy(true)
    setErr(null)
    const result = await deleteInstanceTemplate(id, mode)
    setBusy(false)
    if (!result.success) { setErr(result.message); return }
    setExamples((prev) => prev.filter((e) => e.id !== id))
  }

  if (!accountId || !templateId) return null

  return (
    <div className="space-y-4">
      {err && <p className="text-sm text-red-600 dark:text-red-400" role="alert">{err}</p>}

      {loading ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">Loading…</p>
      ) : (
        <ul className="divide-y divide-gray-100 dark:divide-gray-800 rounded border border-gray-100 dark:border-gray-800">
          {examples.map((example) => (
            <li key={example.id} className="flex flex-wrap items-center justify-between gap-3 px-3 py-2 text-sm">
              <div>
                <span className="font-medium text-gray-900 dark:text-gray-100">{example.name}</span>
                {example.description && (
                  <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">{example.description}</span>
                )}
              </div>
              <RowActionButton
                variant="delete"
                label={`Delete example ${example.name}`}
                onClick={() => handleDelete(example.id)}
                disabled={busy}
              />
            </li>
          ))}
          {examples.length === 0 && (
            <li className="px-3 py-4 text-center text-sm text-gray-500 dark:text-gray-400">No completed examples published yet.</li>
          )}
        </ul>
      )}

      {!creating ? (
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="rounded bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-500"
        >
          Author a new completed example
        </button>
      ) : (
        <div className="space-y-4 rounded border border-dashed border-gray-300 dark:border-gray-700 p-4">
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">Name</label>
              <input
                className="w-full rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Well-formed Business Case example"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">Description (optional)</label>
              <input
                className="w-full rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>

          <DynamicFormRenderer
            schema={schema}
            values={values}
            rows={rows}
            onValueChange={(k, v) => setValues((prev) => ({ ...prev, [k]: v }))}
            onRowsChange={(sectionKey, nextRows) => setRows((prev) => ({ ...prev, [sectionKey]: nextRows }))}
          />

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={busy}
              className="rounded bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-500 disabled:opacity-50"
            >
              {busy ? 'Saving…' : 'Save example'}
            </button>
            <button
              type="button"
              onClick={() => setCreating(false)}
              disabled={busy}
              className="rounded border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-xs hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
