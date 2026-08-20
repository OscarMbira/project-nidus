/**
 * Editable multi-item field: bulleted items only (one item per line).
 * Legacy packed values that include an intro are folded into the first bullet on load.
 *
 * When 2+ distinct "Label:" prefixes appear (e.g. In scope: / Out of scope:), each
 * label becomes its own multi-row group. Storage stays newline lines prefixed with
 * the label so existing save/export paths keep working.
 *
 * Empty draft rows (from "+ Add item") must survive the value round-trip — do not run
 * editor state through splitMultiItemFieldText for newline-delimited values, because that
 * path trims and drops blank lines.
 *
 * Federated modules alias @nidus/ui → apps shell components/ui — keep in sync with
 * packages/ui/src/MultiItemTextField.jsx
 */

import { useEffect, useRef, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import {
  itemHasOwnListMarker,
  splitMultiItemFieldText,
  formatMultiItemStorage,
} from '@nidus/shared/utils/exportUtils'

const LABEL_PREFIX_RE = /^([A-Z][A-Za-z0-9 /&-]{1,40}:)\s*(.*)$/

const DEFAULT_GROUP_LABEL_CLASS =
  'text-sm font-bold text-gray-700 dark:text-gray-300'

const ADD_BUTTON_CLASS =
  'inline-flex items-center gap-1.5 rounded-md border-2 border-emerald-400 bg-emerald-600 px-3 py-1.5 text-sm font-bold text-white shadow-sm hover:bg-emerald-500 hover:border-emerald-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 disabled:opacity-40 dark:border-emerald-400 dark:bg-emerald-600 dark:text-white dark:hover:bg-emerald-500'

function linesFromValue(value) {
  const raw = String(value ?? '')
  if (!raw) return ['']

  // Newline-delimited editor storage — keep trailing / middle empty rows for drafting.
  if (raw.includes('\n')) {
    return raw.split(/\r?\n/)
  }

  // Packed legacy shapes (em-dash / semicolon / etc.) → expand once into bullets.
  const multi = splitMultiItemFieldText(raw)
  if (multi) {
    const items = [...(multi.items || [])]
    if (multi.intro) items.unshift(multi.intro)
    return items.length ? items : ['']
  }

  return [raw]
}

/** Split newline rows into labelled groups when 2+ distinct "Label:" prefixes exist. */
export function parseLabelledItemGroups(lines) {
  const labels = []
  for (const line of lines) {
    const match = String(line).match(LABEL_PREFIX_RE)
    if (match && !labels.includes(match[1])) labels.push(match[1])
  }
  if (labels.length < 2) return null

  const groups = labels.map((label) => ({ label, items: [] }))
  let currentIdx = 0

  for (const line of lines) {
    const raw = String(line)
    const match = raw.match(LABEL_PREFIX_RE)
    if (match && labels.includes(match[1])) {
      currentIdx = labels.indexOf(match[1])
      groups[currentIdx].items.push(match[2])
    } else {
      groups[currentIdx].items.push(raw)
    }
  }

  for (const group of groups) {
    if (group.items.length === 0) group.items = ['']
  }
  return groups
}

/** Persist groups as `Label: content` lines (empty draft rows keep the label + trailing space). */
export function serializeLabelledItemGroups(groups) {
  const lines = []
  for (const group of groups) {
    for (const item of group.items) {
      const content = String(item ?? '')
      if (content.startsWith(group.label)) {
        lines.push(content)
      } else if (content.trim() === '') {
        // Trailing space so the line is a real draft row, not dropped as a bare heading.
        lines.push(`${group.label} `)
      } else {
        lines.push(`${group.label} ${content}`)
      }
    }
  }
  return lines.join('\n')
}

function ItemRows({
  items,
  disabled,
  inputClassName,
  ariaPrefix,
  onUpdate,
  onRemove,
}) {
  return (
    <ul className="space-y-2" role="list">
      {items.map((row, idx) => {
        const hasMarker = itemHasOwnListMarker(row)
        return (
          <li key={idx} className="flex items-start gap-2">
            <span
              className="mt-2 w-5 shrink-0 text-center text-sm text-gray-500 dark:text-gray-400 select-none"
              aria-hidden="true"
            >
              {hasMarker ? '' : '•'}
            </span>
            <input
              type="text"
              disabled={disabled}
              className={inputClassName}
              value={row}
              onChange={(e) => onUpdate(idx, e.target.value)}
              aria-label={`${ariaPrefix} ${idx + 1}`}
            />
            <button
              type="button"
              disabled={disabled}
              onClick={() => onRemove(idx)}
              className="mt-1.5 shrink-0 rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-red-600 disabled:opacity-40 dark:hover:bg-gray-800 dark:hover:text-red-400"
              title="Remove item"
              aria-label={`Remove ${ariaPrefix.toLowerCase()} ${idx + 1}`}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </li>
        )
      })}
    </ul>
  )
}

function AddItemButton({ disabled, onClick, label, ariaLabel }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={(event) => {
        event.preventDefault()
        event.stopPropagation()
        onClick()
      }}
      aria-label={ariaLabel || label}
      className={ADD_BUTTON_CLASS}
    >
      <Plus className="h-4 w-4" strokeWidth={2.5} />
      {label}
    </button>
  )
}

export default function MultiItemTextField({
  value = '',
  onChange,
  inputClassName = '',
  groupLabelClassName = DEFAULT_GROUP_LABEL_CLASS,
  disabled = false,
  addLabel = 'Add item',
}) {
  const [draft, setDraft] = useState(() => String(value ?? ''))
  const lastPushed = useRef(String(value ?? ''))

  useEffect(() => {
    const next = String(value ?? '')
    if (next === lastPushed.current) return
    lastPushed.current = next
    setDraft(next)
  }, [value])

  const commit = (next) => {
    lastPushed.current = next
    setDraft(next)
    onChange?.(next)
  }

  const items = linesFromValue(draft)
  const groups = parseLabelledItemGroups(items)

  if (groups) {
    const updateGroupItem = (groupIdx, itemIdx, text) => {
      commit(
        serializeLabelledItemGroups(
          groups.map((group, gi) =>
            gi === groupIdx
              ? { ...group, items: group.items.map((item, ii) => (ii === itemIdx ? text : item)) }
              : group,
          ),
        ),
      )
    }

    const addGroupItem = (groupIdx) => {
      commit(
        serializeLabelledItemGroups(
          groups.map((group, gi) =>
            gi === groupIdx ? { ...group, items: [...group.items, ''] } : group,
          ),
        ),
      )
    }

    const removeGroupItem = (groupIdx, itemIdx) => {
      commit(
        serializeLabelledItemGroups(
          groups.map((group, gi) => {
            if (gi !== groupIdx) return group
            if (group.items.length <= 1) return { ...group, items: [''] }
            return { ...group, items: group.items.filter((_, i) => i !== itemIdx) }
          }),
        ),
      )
    }

    return (
      <div className="space-y-4">
        {groups.map((group, groupIdx) => (
          <div key={group.label} className="space-y-2">
            <div className={groupLabelClassName}>{group.label}</div>
            <ItemRows
              items={group.items}
              disabled={disabled}
              inputClassName={inputClassName}
              ariaPrefix={`${group.label.replace(/:$/, '')} item`}
              onUpdate={(idx, text) => updateGroupItem(groupIdx, idx, text)}
              onRemove={(idx) => removeGroupItem(groupIdx, idx)}
            />
            <AddItemButton
              disabled={disabled}
              onClick={() => addGroupItem(groupIdx)}
              label={addLabel}
              ariaLabel={`${addLabel} under ${group.label}`}
            />
          </div>
        ))}
      </div>
    )
  }

  const updateItem = (idx, text) => {
    const next = [...items]
    next[idx] = text
    commit(next.join('\n'))
  }

  const addItem = () => commit([...items, ''].join('\n'))

  const removeItem = (idx) => {
    if (items.length <= 1) {
      commit('')
      return
    }
    commit(items.filter((_, i) => i !== idx).join('\n'))
  }

  return (
    <div className="space-y-2">
      <ItemRows
        items={items}
        disabled={disabled}
        inputClassName={inputClassName}
        ariaPrefix="Item"
        onUpdate={updateItem}
        onRemove={removeItem}
      />
      <AddItemButton disabled={disabled} onClick={addItem} label={addLabel} />
    </div>
  )
}

/** True when a document_data value should use the list editor (not a prose textarea). */
export function isMultiItemFieldValue(value, type) {
  if (type === 'object' || type === 'boolean' || type === 'number') return false
  if (type === 'array') return true
  const lines = String(value ?? '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
  if (lines.length >= 2) return true
  const multi = splitMultiItemFieldText(value)
  return Boolean(multi && multi.items.length >= 1 && (multi.intro || multi.items.length >= 2))
}

/** Normalize packed list text for the list editor (bullets only). */
export function normalizeMultiItemFieldValue(value) {
  const multi = splitMultiItemFieldText(value)
  if (!multi) return String(value ?? '')
  const items = [...(multi.items || [])]
  if (multi.intro) items.unshift(multi.intro)
  return formatMultiItemStorage({ intro: null, items })
}
