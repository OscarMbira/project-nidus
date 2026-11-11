import { useState } from 'react'
import Modal from './Modal'

/**
 * Save as template (v1336) — name, description, and optionally replace one of the organisation's
 * existing templates for this register. Calls onSave({ name, description, templateId }).
 */
export default function SaveAsTemplateDialog({ isOpen, onClose, defaultName = '', organisationTemplates = [], busy = false, onSave }) {
  const [name, setName] = useState(defaultName)
  const [description, setDescription] = useState('')
  const [replaceId, setReplaceId] = useState('')

  const inputClass = 'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100'
  const chooseReplace = (id) => {
    setReplaceId(id)
    const t = organisationTemplates.find((x) => x.id === id)
    if (t) {
      setName(t.name)
      setDescription(t.description || '')
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Save as template"
      size="md"
      footer={(
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} disabled={busy} className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700">
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onSave({ name: name.trim(), description: description.trim(), templateId: replaceId || null })}
            disabled={busy || !name.trim()}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {busy ? 'Saving…' : replaceId ? 'Replace template' : 'Save template'}
          </button>
        </div>
      )}
    >
      <div className="space-y-3">
        <p className="text-sm text-gray-600 dark:text-gray-300">
          Saves every tab, the linked product records and the annexures as an organisation template that everyone in your organisation can use. Sign-off and history are not included.
        </p>
        {organisationTemplates.length > 0 && (
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Save as</span>
            <select value={replaceId} onChange={(e) => chooseReplace(e.target.value)} className={inputClass} aria-label="Save as">
              <option value="">A new template</option>
              {organisationTemplates.map((t) => (
                <option key={t.id} value={t.id}>Replace “{t.name}” (v{t.version})</option>
              ))}
            </select>
          </label>
        )}
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Template name *</span>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} className={inputClass} aria-label="Template name" />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Description</span>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className={inputClass} aria-label="Description" />
        </label>
      </div>
    </Modal>
  )
}
