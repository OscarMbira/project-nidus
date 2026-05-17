import { useState, useEffect, useMemo } from 'react'
import { FIELD_TYPES } from '../utils/fieldTypeRegistry'
import { WORKFLOW_STATUS } from '../utils/customFieldConstants'
import FieldOptionsEditor from './FieldOptionsEditor'
import ValidationRuleBuilder from './ValidationRuleBuilder'
import FieldPreviewPanel from './FieldPreviewPanel'
import {
  upsertDefinition,
  replaceOptions,
  appendAudit,
} from '../api/customFieldsApi'
import { isOptionBackedType } from '../utils/fieldTypeRegistry'

export default function CustomFieldAdminBuilder({
  platformDb,
  accountId,
  userInternalId,
  initial,
  onClose,
  onSaved,
}) {
  const [tab, setTab] = useState('basic')
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(() => ({
    field_code: initial?.field_code || '',
    label: initial?.label || '',
    description: initial?.description || '',
    field_type: initial?.field_type || 'text',
    workflow_status: initial?.workflow_status || WORKFLOW_STATUS.DRAFT,
    validation_rules: initial?.validation_rules || {},
    include_in_export: initial?.include_in_export !== false,
    is_sensitive: !!initial?.is_sensitive,
    display_sort_order: initial?.display_sort_order ?? 0,
    options: [],
  }))

  const initialSyncKey = useMemo(
    () =>
      `${initial?.id || 'new'}:${JSON.stringify(initial?.options || [])}:${initial?.updated_at || ''}:${initial?.workflow_status || ''}`,
    [initial?.id, initial?.options, initial?.updated_at, initial?.workflow_status]
  )

  useEffect(() => {
    setForm({
      field_code: initial?.field_code || '',
      label: initial?.label || '',
      description: initial?.description || '',
      field_type: initial?.field_type || 'text',
      workflow_status: initial?.workflow_status || WORKFLOW_STATUS.DRAFT,
      validation_rules: initial?.validation_rules || {},
      include_in_export: initial?.include_in_export !== false,
      is_sensitive: !!initial?.is_sensitive,
      display_sort_order: initial?.display_sort_order ?? 0,
      options: Array.isArray(initial?.options)
        ? initial.options.map((o, idx) => ({
            option_value: o.option_value,
            option_label: o.option_label ?? o.option_value,
            sort_order: o.sort_order ?? idx,
          }))
        : [],
    })
  }, [initialSyncKey])

  const draftPreview = {
    ...form,
    id: 'preview',
    options: form.options || [],
  }

  const save = async (asDraft = false) => {
    if (!form.field_code.trim() || !form.label.trim()) {
      window.alert('Code and label are required.')
      return
    }
    setSaving(true)
    try {
      const workflow_status = asDraft ? WORKFLOW_STATUS.DRAFT : form.workflow_status
      const payload = {
        ...initial,
        account_id: accountId,
        field_code: form.field_code.trim(),
        label: form.label.trim(),
        description: form.description?.trim() || null,
        field_type: form.field_type,
        workflow_status,
        validation_rules: form.validation_rules,
        include_in_export: form.include_in_export,
        is_sensitive: form.is_sensitive,
        display_sort_order: Number(form.display_sort_order) || 0,
      }
      const res = await upsertDefinition(platformDb, payload, userInternalId)
      if (!res.success) {
        window.alert(res.error || 'Save failed')
        return
      }
      const def = res.data
      if (isOptionBackedType(form.field_type)) {
        const optRes = await replaceOptions(platformDb, def.id, form.options || [], userInternalId)
        if (!optRes.success) {
          window.alert(optRes.error || 'Could not save options')
          return
        }
      }
      await appendAudit(platformDb, {
        accountId,
        userInternalId,
        action: initial?.id ? 'definition_update' : 'definition_create',
        table: 'custom_field_definitions',
        entityId: def.id,
        payload: { field_code: def.field_code, workflow_status: def.workflow_status },
      })
      onSaved?.(def)
      onClose?.()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-gray-700">
        <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {initial?.id ? 'Edit field' : 'New field'}
          </h2>
          <button type="button" className="text-gray-500 hover:text-gray-800 dark:hover:text-gray-200" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="flex gap-1 px-4 pt-3 border-b border-gray-100 dark:border-gray-800">
          {['basic', 'validation', 'options', 'preview'].map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`px-3 py-2 text-sm capitalize rounded-t-lg ${
                tab === t ? 'bg-emerald-600 text-white' : 'text-gray-600 dark:text-gray-400'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        <div className="p-4 space-y-4">
          {tab === 'basic' && (
            <>
              <label className="block text-sm">
                Field code (unique)
                <input
                  className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
                  value={form.field_code}
                  disabled={!!initial?.id}
                  onChange={(e) => setForm((f) => ({ ...f, field_code: e.target.value }))}
                />
              </label>
              <label className="block text-sm">
                Label
                <input
                  className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
                  value={form.label}
                  onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
                />
              </label>
              <label className="block text-sm">
                Description
                <textarea
                  className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
                  rows={2}
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                />
              </label>
              <label className="block text-sm">
                Type
                <select
                  className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
                  value={form.field_type}
                  onChange={(e) => setForm((f) => ({ ...f, field_type: e.target.value }))}
                >
                  {FIELD_TYPES.map((ft) => (
                    <option key={ft} value={ft}>
                      {ft}
                    </option>
                  ))}
                </select>
              </label>
              <label className="inline-flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.include_in_export}
                  onChange={(e) => setForm((f) => ({ ...f, include_in_export: e.target.checked }))}
                />
                Include in exports
              </label>
              <label className="inline-flex items-center gap-2 text-sm ml-4">
                <input
                  type="checkbox"
                  checked={form.is_sensitive}
                  onChange={(e) => setForm((f) => ({ ...f, is_sensitive: e.target.checked }))}
                />
                Sensitive (mask when read-only)
              </label>
              <label className="block text-sm">
                Workflow status
                <select
                  className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
                  value={form.workflow_status}
                  onChange={(e) => setForm((f) => ({ ...f, workflow_status: e.target.value }))}
                >
                  {Object.values(WORKFLOW_STATUS).map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </label>
            </>
          )}
          {tab === 'validation' && (
            <ValidationRuleBuilder
              rules={form.validation_rules}
              onChange={(rules) => setForm((f) => ({ ...f, validation_rules: rules }))}
            />
          )}
          {tab === 'options' &&
            (isOptionBackedType(form.field_type) ? (
              <FieldOptionsEditor
                options={form.options}
                onChange={(opts) => setForm((f) => ({ ...f, options: opts }))}
              />
            ) : (
              <p className="text-sm text-gray-500">Options apply to dropdown / multi-select types only.</p>
            ))}
          {tab === 'preview' && <FieldPreviewPanel draft={draftPreview} />}
        </div>
        <div className="sticky bottom-0 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-4 py-3 flex flex-wrap gap-2 justify-end">
          <button type="button" className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-sm font-medium"
            disabled={saving}
            onClick={() => save(true)}
          >
            Save draft
          </button>
          <button
            type="button"
            className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium disabled:opacity-50"
            disabled={saving}
            onClick={() => save(false)}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}
