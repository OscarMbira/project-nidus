import { useState } from 'react'
import { FileText, LayoutTemplate, Eye } from 'lucide-react'
import Modal from './Modal'

/**
 * New → Blank or From template (v1336). Using a template asks for the new record's title, then
 * calls onUse(template, title). Rendered inline on the routed "New …" page (rule 65, v1361); the
 * dialog form remains for callers that pass isOpen.
 *
 * @param {object} props
 * @param {boolean} [props.inline]  render as page content instead of a dialog
 * @param {boolean} [props.isOpen]
 * @param {() => void} [props.onClose]
 * @param {string} props.registerLabel
 * @param {object[]} props.templates   local_register_templates rows (+ child_count)
 * @param {boolean} [props.loading]
 * @param {boolean} [props.busy]
 * @param {() => void} props.onBlank
 * @param {(template: object, title: string) => void} props.onUse
 * @param {(template: object) => void} [props.onPreview]
 */
export default function RegisterTemplatePicker({ inline = false, isOpen = false, onClose = () => {}, registerLabel, templates = [], loading = false, busy = false, onBlank, onUse, onPreview }) {
  const [chosen, setChosen] = useState(null)
  const [title, setTitle] = useState('')

  const close = () => {
    setChosen(null)
    setTitle('')
    onClose()
  }
  const pick = (template) => {
    setChosen(template)
    setTitle(template.record_title || '')
  }

  const footer = chosen ? (
    <div className="flex justify-end gap-2">
      <button type="button" onClick={() => setChosen(null)} disabled={busy} className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700">
        Back
      </button>
      <button
        type="button"
        onClick={() => onUse(chosen, title.trim())}
        disabled={busy || !title.trim()}
        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {busy ? 'Creating…' : 'Create from template'}
      </button>
    </div>
  ) : null

  const body = chosen ? (
    <div className="space-y-3">
      <p className="text-sm text-gray-600 dark:text-gray-300">
        The new {registerLabel.toLowerCase()} copies every tab of the template
        {chosen.child_count ? `, ${chosen.child_count} linked product records` : ''} and its annexures. Replace the [placeholders] afterwards.
      </p>
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Title *</span>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
          aria-label="Title"
          autoFocus
        />
      </label>
    </div>
  ) : (
    <div className="space-y-4">
      <button
        type="button"
        onClick={onBlank}
        className="flex w-full items-center gap-3 rounded-lg border border-gray-200 p-4 text-left hover:border-blue-400 hover:bg-blue-50 dark:border-gray-700 dark:hover:border-blue-500 dark:hover:bg-blue-950/20"
      >
        <FileText className="h-6 w-6 text-gray-500 dark:text-gray-400" />
        <span>
          <span className="block text-sm font-semibold text-gray-900 dark:text-gray-100">Blank</span>
          <span className="block text-xs text-gray-500 dark:text-gray-400">Start with an empty form.</span>
        </span>
      </button>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">From a template</p>
        {loading && <p className="text-sm text-gray-500 dark:text-gray-400">Loading templates…</p>}
        {!loading && templates.length === 0 && (
          <p className="text-sm text-gray-500 dark:text-gray-400">No templates for this register yet.</p>
        )}
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {templates.map((t) => (
            <li key={t.id} className="flex flex-col rounded-lg border border-gray-200 p-4 dark:border-gray-700">
              <div className="flex items-start gap-2">
                <LayoutTemplate className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-600 dark:text-blue-400" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{t.name}</p>
                  <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                    {t.template_scope === 'system' ? 'System template' : 'Organisation template'} · v{t.version}
                    {t.child_count ? ` · ${t.child_count} products` : ''}
                  </p>
                </div>
              </div>
              {t.description && <p className="mt-2 line-clamp-3 text-xs text-gray-600 dark:text-gray-300">{t.description}</p>}
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" onClick={() => pick(t)} className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700">
                  Use template
                </button>
                {onPreview && (
                  <button type="button" onClick={() => onPreview(t)} className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700">
                    <Eye className="h-3.5 w-3.5" /> Preview
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )

  if (inline) {
    return (
      <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
        {chosen && (
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">From “{chosen.name}”</h2>
        )}
        {body}
        {footer}
      </div>
    )
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={close}
      title={chosen ? `New ${registerLabel} from “${chosen.name}”` : `New ${registerLabel}`}
      size="lg"
      footer={footer}
    >
      {body}
    </Modal>
  )
}
