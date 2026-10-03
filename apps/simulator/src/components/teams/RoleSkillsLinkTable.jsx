/**
 * Linked Role ↔ Required skills table for Create/Edit Team.
 * Enforces: every role must have at least one skill.
 * Pending draft (Role + skills above the list) is flushed on parent save via ref.flushPendingDraft().
 */

import { forwardRef, useImperativeHandle, useMemo, useState } from 'react'
import { Plus, X, Check } from 'lucide-react'
import { useViewMode } from '@nidus/shared/hooks/useViewMode'
import { getDisplayRowNumber } from '@nidus/shared/utils/tableRowNumberUtils'
import {
  parseRoleSkillsLinks,
  serializeRoleSkillsLinks,
  parseSkillsLines,
} from '@nidus/shared/utils/roleSkillsUtils'
import ViewToggle from '@nidus/ui/ViewToggle'
import RowActionButton from '@nidus/ui/RowActionButton'
import Modal from '@nidus/ui/Modal'
import MultiLineListInput from '@nidus/ui/MultiLineListInput'
import { TableRowNumberHeader, TableRowNumberCell } from '@nidus/ui/Table'

const RoleSkillsLinkTable = forwardRef(function RoleSkillsLinkTable(
  {
    value = '',
    onChange,
    disabled = false,
    viewModeId = 'team-role-skills-links',
    /** When false, hide the add-role composer (list / edit-in-place only). */
    showComposer = true,
    emptyMessage = 'No roles yet. Add a role and its required skills above.',
  },
  ref,
) {
  const rows = useMemo(() => {
    const parsed = parseRoleSkillsLinks(value)
    return [...parsed].sort((a, b) =>
      String(a.role || '').localeCompare(String(b.role || ''), undefined, {
        sensitivity: 'base',
      }),
    )
  }, [value])
  const [viewMode, setViewMode] = useViewMode(viewModeId, 'list')
  const [roleDraft, setRoleDraft] = useState('')
  const [skillsDraft, setSkillsDraft] = useState('')
  const [draftError, setDraftError] = useState('')
  const [editingIndex, setEditingIndex] = useState(null)
  const [editRole, setEditRole] = useState('')
  const [editSkills, setEditSkills] = useState('')
  const [editError, setEditError] = useState('')
  const [deleteIndex, setDeleteIndex] = useState(null)

  const commit = (nextRows) => {
    const serialized = serializeRoleSkillsLinks(nextRows)
    onChange?.(serialized)
    return serialized
  }

  const applyDraftToRows = (baseRows) => {
    const role = roleDraft.trim()
    const skills = skillsDraft
    if (!role && !parseSkillsLines(skills).length) {
      return { ok: true, rows: baseRows, flushed: false }
    }
    if (!role) {
      return {
        ok: false,
        error: 'Enter a role name for the skills you added.',
        rows: baseRows,
      }
    }
    if (!parseSkillsLines(skills).length) {
      return {
        ok: false,
        error: 'Add at least one required skill for this role.',
        rows: baseRows,
      }
    }
    const existingIdx = baseRows.findIndex(
      (r) => r.role.toLowerCase() === role.toLowerCase(),
    )
    const nextRows =
      existingIdx >= 0
        ? baseRows.map((r, i) => (i === existingIdx ? { role, skills } : r))
        : [...baseRows, { role, skills }]
    return { ok: true, rows: nextRows, flushed: true }
  }

  useImperativeHandle(ref, () => ({
    /**
     * Commit the in-progress Role + skills draft into the parent value.
     * Returns { ok, error?, value, flushed } so the parent can validate synchronously.
     */
    flushPendingDraft() {
      if (disabled) {
        return { ok: true, value: serializeRoleSkillsLinks(rows), flushed: false }
      }
      // Also flush inline edit if open
      if (editingIndex != null) {
        const role = editRole.trim()
        const skills = editSkills
        if (!role) {
          return { ok: false, error: 'Role name is required.', value: serializeRoleSkillsLinks(rows) }
        }
        if (!parseSkillsLines(skills).length) {
          return {
            ok: false,
            error: 'At least one required skill is required.',
            value: serializeRoleSkillsLinks(rows),
          }
        }
        if (
          rows.some(
            (r, i) => i !== editingIndex && r.role.toLowerCase() === role.toLowerCase(),
          )
        ) {
          return {
            ok: false,
            error: `Role "${role}" is already listed.`,
            value: serializeRoleSkillsLinks(rows),
          }
        }
        const edited = rows.map((r, i) => (i === editingIndex ? { role, skills } : r))
        const draftResult = applyDraftToRows(edited)
        if (!draftResult.ok) {
          return { ...draftResult, value: serializeRoleSkillsLinks(edited) }
        }
        const serialized = commit(draftResult.rows)
        setEditingIndex(null)
        setEditRole('')
        setEditSkills('')
        setEditError('')
        setRoleDraft('')
        setSkillsDraft('')
        setDraftError('')
        return { ok: true, value: serialized, flushed: true }
      }

      const draftResult = applyDraftToRows(rows)
      if (!draftResult.ok) {
        setDraftError(draftResult.error || '')
        return { ...draftResult, value: serializeRoleSkillsLinks(rows) }
      }
      if (!draftResult.flushed) {
        return { ok: true, value: serializeRoleSkillsLinks(rows), flushed: false }
      }
      const serialized = commit(draftResult.rows)
      setRoleDraft('')
      setSkillsDraft('')
      setDraftError('')
      return { ok: true, value: serialized, flushed: true }
    },
  }))

  const handleAdd = () => {
    if (disabled) return
    const result = applyDraftToRows(rows)
    setDraftError('')
    if (!result.ok) {
      setDraftError(result.error || '')
      return
    }
    if (!result.flushed) {
      setDraftError('Enter a role name.')
      return
    }
    commit(result.rows)
    setRoleDraft('')
    setSkillsDraft('')
  }

  const startEdit = (index) => {
    const row = rows[index]
    if (!row || disabled) return
    setViewMode('list')
    setEditingIndex(index)
    setEditRole(row.role || '')
    setEditSkills(row.skills || '')
    setEditError('')
  }

  const cancelEdit = () => {
    setEditingIndex(null)
    setEditRole('')
    setEditSkills('')
    setEditError('')
  }

  const saveEdit = () => {
    if (editingIndex == null || disabled) return
    const role = editRole.trim()
    const skills = editSkills
    setEditError('')
    if (!role) {
      setEditError('Role name is required.')
      return
    }
    if (!parseSkillsLines(skills).length) {
      setEditError('At least one required skill is required.')
      return
    }
    if (
      rows.some(
        (r, i) => i !== editingIndex && r.role.toLowerCase() === role.toLowerCase(),
      )
    ) {
      setEditError(`Role "${role}" is already listed.`)
      return
    }
    commit(rows.map((r, i) => (i === editingIndex ? { role, skills } : r)))
    cancelEdit()
  }

  const confirmDelete = () => {
    if (deleteIndex == null || disabled) return
    commit(rows.filter((_, i) => i !== deleteIndex))
    if (editingIndex === deleteIndex) cancelEdit()
    setDeleteIndex(null)
  }

  return (
    <div className="space-y-3">
      {!disabled && showComposer && (
        <div className="space-y-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 p-3">
          <label className="block text-xs text-gray-700 dark:text-gray-200">
            Role <span className="text-red-500">*</span>
            <input
              value={roleDraft}
              onChange={(e) => setRoleDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleAdd()
                }
              }}
              placeholder="e.g. Developer"
              className="mt-1 w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-3 py-2"
            />
          </label>
          <div>
            <span className="block text-xs text-gray-700 dark:text-gray-200 mb-1">
              Required Skills for This Role <span className="text-red-500">*</span>
            </span>
            <MultiLineListInput
              viewModeId={`${viewModeId}-draft-skills`}
              value={skillsDraft}
              onChange={setSkillsDraft}
              placeholder="Add a Skill…"
              itemColumnLabel="Skill"
              ariaLabelPrefix="required skill"
            />
          </div>
          {draftError ? (
            <p className="text-sm text-red-600 dark:text-red-400">{draftError}</p>
          ) : null}
          <button
            type="button"
            onClick={handleAdd}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded bg-blue-600 text-white text-sm"
          >
            <Plus className="h-4 w-4" />
            Add Role with Skills
          </button>
          <p className="text-xs text-gray-600 dark:text-gray-300">
            Click &quot;Add Role with Skills&quot; (or press Enter in Role) before saving — or Save will
            pick up this draft automatically.
          </p>
        </div>
      )}

      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-gray-700 dark:text-gray-200">
          {rows.length} Role{rows.length === 1 ? '' : 's'} Defined
        </p>
        <ViewToggle value={viewMode} onChange={setViewMode} />
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-gray-700 dark:text-gray-200 py-4 text-center">
          {emptyMessage}
        </p>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {rows.map((row, index) => (
            <div
              key={`${row.role}-${index}`}
              className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-xs text-gray-500 dark:text-gray-400">#{getDisplayRowNumber(index)}</span>
                  <h3 className="font-medium text-gray-900 dark:text-gray-100">{row.role}</h3>
                  <p className="mt-1 text-sm text-gray-700 dark:text-gray-200 whitespace-pre-wrap">
                    {row.skills || '—'}
                  </p>
                </div>
                {!disabled && (
                  <div className="flex gap-1">
                    <RowActionButton variant="edit" label="Edit role" onClick={() => startEdit(index)} />
                    <RowActionButton variant="delete" label="Delete role" onClick={() => setDeleteIndex(index)} />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <TableRowNumberHeader />
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-200">Role</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-200">Required Skills</th>
                {!disabled && (
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-700 dark:text-gray-200">Actions</th>
                )}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={`${row.role}-${index}`} className="border-t border-gray-200 dark:border-gray-700 align-top">
                  <TableRowNumberCell number={getDisplayRowNumber(index)} />
                  {editingIndex === index ? (
                    <>
                      <td className="px-3 py-2" colSpan={2}>
                        <div className="space-y-2">
                          <input
                            value={editRole}
                            onChange={(e) => setEditRole(e.target.value)}
                            className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-2 py-1.5"
                          />
                          <MultiLineListInput
                            viewModeId={`${viewModeId}-edit-skills-${index}`}
                            value={editSkills}
                            onChange={setEditSkills}
                            placeholder="Add a skill…"
                            itemColumnLabel="Skill"
                            ariaLabelPrefix="required skill"
                          />
                          {editError ? (
                            <p className="text-sm text-red-600 dark:text-red-400">{editError}</p>
                          ) : null}
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={saveEdit}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded bg-blue-600 text-white text-xs"
                            >
                              <Check className="h-3.5 w-3.5" /> Save
                            </button>
                            <button
                              type="button"
                              onClick={cancelEdit}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded border border-gray-300 dark:border-gray-600 text-xs text-gray-900 dark:text-gray-100"
                            >
                              <X className="h-3.5 w-3.5" /> Cancel
                            </button>
                          </div>
                        </div>
                      </td>
                      <td />
                    </>
                  ) : (
                    <>
                      <td className="px-3 py-2 text-gray-900 dark:text-gray-100 font-medium">{row.role}</td>
                      <td className="px-3 py-2 text-gray-700 dark:text-gray-200 whitespace-pre-wrap">
                        {row.skills || '—'}
                      </td>
                      {!disabled && (
                        <td className="px-3 py-2">
                          <div className="flex justify-end gap-1">
                            <RowActionButton variant="edit" label="Edit role" onClick={() => startEdit(index)} />
                            <RowActionButton variant="delete" label="Delete role" onClick={() => setDeleteIndex(index)} />
                          </div>
                        </td>
                      )}
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        isOpen={deleteIndex != null}
        onClose={() => setDeleteIndex(null)}
        title="Remove role?"
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setDeleteIndex(null)}
              className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={confirmDelete}
              className="px-3 py-1.5 bg-red-600 text-white rounded-lg"
            >
              Remove
            </button>
          </div>
        }
      >
        <p className="text-sm text-gray-700 dark:text-gray-200">
          Remove role &quot;{deleteIndex != null ? rows[deleteIndex]?.role : ''}&quot; and its required skills?
        </p>
      </Modal>
    </div>
  )
})

export default RoleSkillsLinkTable
