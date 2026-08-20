import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { formInstanceStatusLabel } from '@nidus/shared/utils/formInstanceRegisterUtils.js'
import { bulkArchiveFormInstances } from '../../services/formEngineService'

function formatUpdatedAt(value) {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleString()
  } catch {
    return String(value)
  }
}

function draftTitle(d) {
  return (
    d?.display_title ||
    d?.title ||
    d?.instance_reference ||
    d?.template_name ||
    d?.template_code ||
    'Form draft'
  )
}

function draftReference(d) {
  return d?.instance_reference || d?.id || '—'
}

function draftSubtitle(d) {
  return [d?.instance_reference, d?.template_name].filter(Boolean).join(' · ')
}

/**
 * Resume / bulk-remove drafts.
 * Delete selected archives instances (same as records-table trash) so they leave the queue.
 */
export default function DraftFormQueue({
  drafts = [],
  onResume,
  onBulkDelete,
  onDeleted,
  mode = 'platform',
  busy: busyProp = false,
}) {
  const [selectedIds, setSelectedIds] = useState(() => new Set())
  const [internalBusy, setInternalBusy] = useState(false)
  const busy = busyProp || internalBusy

  const ids = useMemo(() => (drafts || []).map((d) => d.id).filter(Boolean), [drafts])

  useEffect(() => {
    setSelectedIds((prev) => {
      const allowed = new Set(ids)
      const next = new Set([...prev].filter((id) => allowed.has(id)))
      if (next.size === prev.size && [...next].every((id) => prev.has(id))) return prev
      return next
    })
  }, [ids])

  if (!drafts?.length) return null

  const selectedCount = selectedIds.size
  const allSelected = ids.length > 0 && ids.every((id) => selectedIds.has(id))
  const canDelete = selectedCount > 0 && !busy

  const toggleOne = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleAll = () => {
    if (allSelected) setSelectedIds(new Set())
    else setSelectedIds(new Set(ids))
  }

  const handleBulkDelete = async () => {
    if (!canDelete) return
    const idsToRemove = [...selectedIds]
    const confirmed = window.confirm(
      `Remove ${idsToRemove.length} draft${idsToRemove.length === 1 ? '' : 's'} from the queue? They will be archived.`,
    )
    if (!confirmed) return

    setInternalBusy(true)
    try {
      if (typeof onBulkDelete === 'function') {
        await onBulkDelete(idsToRemove)
      } else {
        const r = await bulkArchiveFormInstances(idsToRemove, mode)
        if (!r.success) throw new Error(r.message || 'Failed to remove drafts')
        const archived = r.data?.archived?.length || 0
        const failed = r.data?.errors?.length || 0
        if (failed) toast.error(`Removed ${archived}; ${failed} failed`)
        else toast.success(`Removed ${archived} draft${archived === 1 ? '' : 's'} from queue`)
        await onDeleted?.()
      }
      setSelectedIds(new Set())
    } catch (e) {
      toast.error(e?.message || 'Failed to remove drafts')
    } finally {
      setInternalBusy(false)
    }
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Draft Queue</h3>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
            Resume editing, or select drafts to remove them from this queue (archived).
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={toggleAll}
            disabled={busy || !ids.length}
            className="rounded border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-800 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 dark:hover:bg-gray-800"
          >
            {allSelected ? 'Clear selection' : `Select all (${ids.length})`}
          </button>
          <button
            type="button"
            onClick={handleBulkDelete}
            disabled={!canDelete}
            className={
              canDelete
                ? 'rounded bg-red-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-red-500'
                : 'cursor-not-allowed rounded bg-red-600/40 px-2.5 py-1.5 text-xs font-medium text-white/70'
            }
          >
            {busy ? 'Removing…' : `Delete selected (${selectedCount})`}
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th className="w-10 px-2 py-2 text-left">
                <input
                  type="checkbox"
                  aria-label="Select all drafts in queue"
                  checked={allSelected}
                  disabled={busy || !ids.length}
                  onChange={toggleAll}
                  className="rounded border-gray-300 dark:border-gray-600"
                />
              </th>
              <th className="w-12 px-2 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-200">
                #
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-200">
                Record
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-200">
                Reference
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-200">
                Status
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-200">
                Last updated
              </th>
              <th className="px-3 py-2 text-right text-xs font-medium text-gray-700 dark:text-gray-200">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {drafts.map((d, index) => (
              <tr
                key={d.id}
                className="border-t border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900"
              >
                <td className="px-2 py-2">
                  <input
                    type="checkbox"
                    aria-label={`Select ${draftReference(d)}`}
                    checked={selectedIds.has(d.id)}
                    disabled={busy}
                    onChange={() => toggleOne(d.id)}
                    className="rounded border-gray-300 dark:border-gray-600"
                  />
                </td>
                <td className="px-2 py-2 text-xs text-gray-500 dark:text-gray-400">{index + 1}</td>
                <td className="px-3 py-2 text-gray-900 dark:text-gray-100">
                  <div className="font-medium">{draftTitle(d)}</div>
                  {draftSubtitle(d) && (
                    <div className="text-xs text-gray-500 dark:text-gray-400">{draftSubtitle(d)}</div>
                  )}
                </td>
                <td className="px-3 py-2 font-mono text-xs text-gray-700 dark:text-gray-300">
                  {draftReference(d)}
                </td>
                <td className="px-3 py-2">
                  <span className="inline-flex rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900/40 dark:text-blue-200">
                    {formInstanceStatusLabel(d.status || 'draft')}
                  </span>
                </td>
                <td className="px-3 py-2 text-xs text-gray-600 dark:text-gray-300">
                  {formatUpdatedAt(d.updated_at || d.created_at)}
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-right">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => onResume?.(d)}
                    className="rounded bg-blue-600 px-2 py-1 text-xs text-white hover:bg-blue-500 disabled:opacity-40"
                  >
                    Resume
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
