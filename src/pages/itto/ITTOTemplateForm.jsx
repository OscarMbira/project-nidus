import { useState, useEffect } from 'react'
import { X, Plus, Trash2, ChevronRight, ChevronLeft } from 'lucide-react'
import toast from 'react-hot-toast'
import { ITTO_PROCESS_GROUPS, ITTO_KNOWLEDGE_AREAS } from '../../constants/ittoConstants'

const emptyInput = () => ({
  id: crypto.randomUUID(),
  name: '',
  description: '',
  source: '',
})
const emptyTool = () => ({
  id: crypto.randomUUID(),
  name: '',
  type: 'Technique',
  description: '',
})
const emptyOutput = () => ({
  id: crypto.randomUUID(),
  name: '',
  description: '',
  destination: '',
})

export default function ITTOTemplateForm({
  open,
  onClose,
  onSaved,
  organisationId,
  userId,
  initial,
  saveFn,
}) {
  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const [name, setName] = useState('')
  const [processGroup, setProcessGroup] = useState('Planning')
  const [knowledgeArea, setKnowledgeArea] = useState('Integration')
  const [description, setDescription] = useState('')
  const [tags, setTags] = useState('')
  const [status, setStatus] = useState('draft')
  const [isDraft, setIsDraft] = useState(true)
  const [draftExpiresAt, setDraftExpiresAt] = useState('')
  const [inputs, setInputs] = useState([emptyInput()])
  const [tools, setTools] = useState([emptyTool()])
  const [outputs, setOutputs] = useState([emptyOutput()])

  useEffect(() => {
    if (!open) return
    setStep(1)
    if (initial) {
      setName(initial.name || '')
      setProcessGroup(initial.process_group || 'Planning')
      setKnowledgeArea(initial.knowledge_area || 'Integration')
      setDescription(initial.description || '')
      setTags((initial.tags || []).join(', '))
      setStatus(initial.status || 'draft')
      setIsDraft(!!initial.is_draft)
      setDraftExpiresAt(initial.draft_expires_at ? initial.draft_expires_at.slice(0, 16) : '')
      setInputs((initial.inputs?.length ? initial.inputs : [emptyInput()]).map((r) => ({ ...r, id: r.id || crypto.randomUUID() })))
      setTools((initial.tools_techniques?.length ? initial.tools_techniques : [emptyTool()]).map((r) => ({ ...r, id: r.id || crypto.randomUUID() })))
      setOutputs((initial.outputs?.length ? initial.outputs : [emptyOutput()]).map((r) => ({ ...r, id: r.id || crypto.randomUUID() })))
    } else {
      setName('')
      setProcessGroup('Planning')
      setKnowledgeArea('Integration')
      setDescription('')
      setTags('')
      setStatus('draft')
      setIsDraft(true)
      setDraftExpiresAt('')
      setInputs([emptyInput()])
      setTools([emptyTool()])
      setOutputs([emptyOutput()])
    }
  }, [open, initial])

  if (!open) return null

  const tagArr = tags
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean)

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Name is required')
      setStep(1)
      return
    }
    if (!organisationId || !userId) {
      toast.error('Missing organisation or user context')
      return
    }
    setSaving(true)
    try {
      const payload = {
        organisation_id: organisationId,
        name: name.trim(),
        process_group: processGroup,
        knowledge_area: knowledgeArea,
        description: description.trim() || null,
        inputs,
        tools_techniques: tools,
        outputs,
        tags: tagArr,
        status: isDraft ? 'draft' : status === 'archived' ? 'archived' : 'active',
        is_draft: isDraft,
        draft_expires_at: draftExpiresAt ? new Date(draftExpiresAt).toISOString() : null,
        created_by: userId,
      }
      let row
      if (initial?.id) {
        row = await saveFn.update(initial.id, {
          ...payload,
          created_by: undefined,
        })
        toast.success(`Template updated — ID ${row.id}`)
      } else {
        row = await saveFn.create({
          ...payload,
        })
        toast.success(`Template created — ID ${row.id}`)
      }
      onSaved?.(row)
      onClose()
    } catch (e) {
      toast.error(e?.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const modal = (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
      <div
        className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="itto-template-form-title"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-900 z-10">
          <h2 id="itto-template-form-title" className="text-lg font-semibold text-gray-900 dark:text-white">
            {initial?.id ? 'Edit ITTO template' : 'New ITTO template'}
          </h2>
          <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800" aria-label="Close">
            <X className="h-5 w-5 text-gray-600 dark:text-gray-300" />
          </button>
        </div>

        <div className="p-4">
          <div className="flex gap-2 mb-6 text-sm">
            {[1, 2, 3, 4].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStep(s)}
                className={`px-3 py-1 rounded-lg border ${
                  step === s
                    ? 'border-sky-600 bg-sky-50 dark:bg-sky-900/30 text-sky-800 dark:text-sky-200'
                    : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300'
                }`}
              >
                Step {s}
              </button>
            ))}
          </div>

          {step === 1 && (
            <div className="space-y-4">
              <label className="block">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Name</span>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-gray-900 dark:text-white"
                />
              </label>
              <div className="grid sm:grid-cols-2 gap-4">
                <label className="block">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Process group</span>
                  <select
                    value={processGroup}
                    onChange={(e) => setProcessGroup(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-gray-900 dark:text-white"
                  >
                    {ITTO_PROCESS_GROUPS.map((pg) => (
                      <option key={pg} value={pg}>
                        {pg}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Knowledge area</span>
                  <select
                    value={knowledgeArea}
                    onChange={(e) => setKnowledgeArea(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-gray-900 dark:text-white"
                  >
                    {ITTO_KNOWLEDGE_AREAS.map((k) => (
                      <option key={k} value={k}>
                        {k}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <label className="block">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Description</span>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-gray-900 dark:text-white"
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Tags (comma-separated)</span>
                <input
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-gray-900 dark:text-white"
                />
              </label>
              <div className="flex flex-wrap gap-4 items-center">
                <label className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <input type="checkbox" checked={isDraft} onChange={(e) => setIsDraft(e.target.checked)} />
                  Save as draft (on hold)
                </label>
                {!isDraft && (
                  <label className="block">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Status</span>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      className="ml-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1 text-gray-900 dark:text-white"
                    >
                      <option value="active">active</option>
                      <option value="archived">archived</option>
                    </select>
                  </label>
                )}
              </div>
              {isDraft && (
                <label className="block">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Draft expiry (optional)</span>
                  <input
                    type="datetime-local"
                    value={draftExpiresAt}
                    onChange={(e) => setDraftExpiresAt(e.target.value)}
                    className="mt-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-gray-900 dark:text-white"
                  />
                </label>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              <p className="text-sm text-gray-600 dark:text-gray-400">Inputs — documents and information used.</p>
              {inputs.map((row, idx) => (
                <div key={row.id} className="p-3 rounded-lg border border-gray-200 dark:border-gray-700 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-medium text-gray-500">Input {idx + 1}</span>
                    <button
                      type="button"
                      onClick={() => setInputs((prev) => prev.filter((_, i) => i !== idx))}
                      className="text-red-600 dark:text-red-400 p-1"
                      aria-label="Remove row"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <input
                    placeholder="Name"
                    value={row.name}
                    onChange={(e) => {
                      const v = e.target.value
                      setInputs((prev) => prev.map((r, i) => (i === idx ? { ...r, name: v } : r)))
                    }}
                    className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1 text-sm text-gray-900 dark:text-white"
                  />
                  <input
                    placeholder="Description"
                    value={row.description}
                    onChange={(e) => {
                      const v = e.target.value
                      setInputs((prev) => prev.map((r, i) => (i === idx ? { ...r, description: v } : r)))
                    }}
                    className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1 text-sm text-gray-900 dark:text-white"
                  />
                  <input
                    placeholder="Source"
                    value={row.source}
                    onChange={(e) => {
                      const v = e.target.value
                      setInputs((prev) => prev.map((r, i) => (i === idx ? { ...r, source: v } : r)))
                    }}
                    className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1 text-sm text-gray-900 dark:text-white"
                  />
                </div>
              ))}
              <button
                type="button"
                onClick={() => setInputs((prev) => [...prev, emptyInput()])}
                className="inline-flex items-center gap-2 text-sm text-sky-600 dark:text-sky-400"
              >
                <Plus className="h-4 w-4" /> Add input
              </button>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-3">
              <p className="text-sm text-gray-600 dark:text-gray-400">Tools & techniques</p>
              {tools.map((row, idx) => (
                <div key={row.id} className="p-3 rounded-lg border border-gray-200 dark:border-gray-700 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-medium text-gray-500">Item {idx + 1}</span>
                    <button
                      type="button"
                      onClick={() => setTools((prev) => prev.filter((_, i) => i !== idx))}
                      className="text-red-600 dark:text-red-400 p-1"
                      aria-label="Remove row"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <input
                    placeholder="Name"
                    value={row.name}
                    onChange={(e) => {
                      const v = e.target.value
                      setTools((prev) => prev.map((r, i) => (i === idx ? { ...r, name: v } : r)))
                    }}
                    className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1 text-sm text-gray-900 dark:text-white"
                  />
                  <input
                    placeholder="Type (e.g. Tool, Technique)"
                    value={row.type}
                    onChange={(e) => {
                      const v = e.target.value
                      setTools((prev) => prev.map((r, i) => (i === idx ? { ...r, type: v } : r)))
                    }}
                    className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1 text-sm text-gray-900 dark:text-white"
                  />
                  <input
                    placeholder="Description"
                    value={row.description}
                    onChange={(e) => {
                      const v = e.target.value
                      setTools((prev) => prev.map((r, i) => (i === idx ? { ...r, description: v } : r)))
                    }}
                    className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1 text-sm text-gray-900 dark:text-white"
                  />
                </div>
              ))}
              <button
                type="button"
                onClick={() => setTools((prev) => [...prev, emptyTool()])}
                className="inline-flex items-center gap-2 text-sm text-sky-600 dark:text-sky-400"
              >
                <Plus className="h-4 w-4" /> Add row
              </button>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-3">
              <p className="text-sm text-gray-600 dark:text-gray-400">Outputs</p>
              {outputs.map((row, idx) => (
                <div key={row.id} className="p-3 rounded-lg border border-gray-200 dark:border-gray-700 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-medium text-gray-500">Output {idx + 1}</span>
                    <button
                      type="button"
                      onClick={() => setOutputs((prev) => prev.filter((_, i) => i !== idx))}
                      className="text-red-600 dark:text-red-400 p-1"
                      aria-label="Remove row"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <input
                    placeholder="Name"
                    value={row.name}
                    onChange={(e) => {
                      const v = e.target.value
                      setOutputs((prev) => prev.map((r, i) => (i === idx ? { ...r, name: v } : r)))
                    }}
                    className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1 text-sm text-gray-900 dark:text-white"
                  />
                  <input
                    placeholder="Description"
                    value={row.description}
                    onChange={(e) => {
                      const v = e.target.value
                      setOutputs((prev) => prev.map((r, i) => (i === idx ? { ...r, description: v } : r)))
                    }}
                    className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1 text-sm text-gray-900 dark:text-white"
                  />
                  <input
                    placeholder="Destination"
                    value={row.destination}
                    onChange={(e) => {
                      const v = e.target.value
                      setOutputs((prev) => prev.map((r, i) => (i === idx ? { ...r, destination: v } : r)))
                    }}
                    className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1 text-sm text-gray-900 dark:text-white"
                  />
                </div>
              ))}
              <button
                type="button"
                onClick={() => setOutputs((prev) => [...prev, emptyOutput()])}
                className="inline-flex items-center gap-2 text-sm text-sky-600 dark:text-sky-400"
              >
                <Plus className="h-4 w-4" /> Add output
              </button>
            </div>
          )}

          <div className="flex flex-wrap justify-between gap-2 mt-8 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex gap-2">
              {step > 1 && (
                <button
                  type="button"
                  onClick={() => setStep((s) => s - 1)}
                  className="inline-flex items-center gap-1 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-200"
                >
                  <ChevronLeft className="h-4 w-4" /> Back
                </button>
              )}
              {step < 4 && (
                <button
                  type="button"
                  onClick={() => setStep((s) => s + 1)}
                  className="inline-flex items-center gap-1 px-4 py-2 rounded-lg bg-sky-600 text-white"
                >
                  Next <ChevronRight className="h-4 w-4" />
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 rounded-lg bg-emerald-600 text-white disabled:opacity-50 min-h-[44px]"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  return modal
}
