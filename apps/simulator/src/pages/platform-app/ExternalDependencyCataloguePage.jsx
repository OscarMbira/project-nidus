/**
 * Organisation list of internal and external dependency parties.
 * Route: /platform/dependency-parties
 */
import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useCurrentProject } from '../../lib/CurrentProjectContext'
import { RowActionButton } from '@nidus/ui'
import { TableRowNumberHeader, TableRowNumberCell } from '@nidus/ui/Table'
import { useSuccessModal } from '@nidus/shared/hooks/useSuccessModal'
import { getDisplayRowNumber } from '@nidus/shared/utils/tableRowNumberUtils'
import {
  addExternalDependencyItem,
  listExternalDependencyItems,
  removeExternalDependencyItem,
  resolveExternalDependencyAccountId,
} from '../../services/externalDependencyCatalogueService'

export default function ExternalDependencyCataloguePage() {
  const navigate = useNavigate()
  const { currentProjectId } = useCurrentProject()
  const { showSuccess, modal } = useSuccessModal()
  const [accountId, setAccountId] = useState(null)
  const [items, setItems] = useState([])
  const [name, setName] = useState('')
  const [partyKind, setPartyKind] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const id = await resolveExternalDependencyAccountId(currentProjectId)
      setAccountId(id)
      setItems(await listExternalDependencyItems(id))
    } catch (err) {
      setError(err?.message || 'Could not load dependency parties')
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [currentProjectId])

  useEffect(() => {
    load()
  }, [load])

  const handleAdd = async (event) => {
    event.preventDefault()
    const trimmed = name.trim()
    if (!trimmed || !accountId || !partyKind) return
    setSaving(true)
    setError(null)
    try {
      const created = await addExternalDependencyItem(accountId, trimmed, partyKind)
      setName('')
      setPartyKind('')
      await load()
      showSuccess({
        recordId: created?.item_name || trimmed,
        operation: 'created',
        message: `Saved ${created?.item_name || trimmed} for this organisation. Every project in the organisation can select it.`,
      })
    } catch (err) {
      setError(err?.message || 'Could not add that name')
    } finally {
      setSaving(false)
    }
  }

  const handleRemove = async (item) => {
    if (!window.confirm(`Remove "${item.item_name}" from the list?`)) return
    try {
      await removeExternalDependencyItem(item.id)
      showSuccess({
        recordId: item.item_name,
        operation: 'deleted',
        message: `Removed dependency party ${item.item_name}.`,
      })
      await load()
    } catch (err) {
      setError(err?.message || 'Could not remove that name')
    }
  }

  return (
    <div className="w-full px-3 sm:px-4 lg:px-5 xl:px-6 py-6">
      <div className="max-w-3xl mx-auto">
        <button onClick={() => navigate(-1)} className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4 flex items-center gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Dependency Parties</h1>
        <p className="mt-2 text-sm text-gray-700 dark:text-gray-200">
          One list for this organisation. A party added here, or while capturing a dependency on any of its projects, is stored once and can be selected on every project in the organisation. Mark each one internal or external.
        </p>

        <form onSubmit={handleAdd} className="mt-6 flex flex-col gap-3 sm:flex-row">
          <input
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={200}
            placeholder="Party name"
            className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
          />
          <select
            value={partyKind}
            onChange={(event) => setPartyKind(event.target.value)}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
          >
            <option value="">Internal or external</option>
            <option value="internal">Internal</option>
            <option value="external">External</option>
          </select>
          <button
            type="submit"
            disabled={saving || !name.trim() || !partyKind || !accountId}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Adding…' : 'Add'}
          </button>
        </form>

        {error && (
          <p className="mt-4 text-sm text-red-700 dark:text-red-300">{error}</p>
        )}

        <div className="mt-6 overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
          {loading ? (
            <p className="px-4 py-8 text-center text-sm text-gray-700 dark:text-gray-200">Loading…</p>
          ) : items.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-gray-700 dark:text-gray-200">No dependency parties yet.</p>
          ) : (
            <table className="w-full table-fixed">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <TableRowNumberHeader />
                  <th className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-700 dark:text-gray-200">Name</th>
                  <th className="w-28 px-3 py-2 text-left text-xs font-medium uppercase text-gray-700 dark:text-gray-200">Party type</th>
                  <th className="w-20 px-3 py-2 text-right text-xs font-medium uppercase text-gray-700 dark:text-gray-200">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {items.map((item, index) => (
                  <tr key={item.id}>
                    <TableRowNumberCell number={getDisplayRowNumber(index)} />
                    <td className="px-3 py-2 text-sm text-gray-900 dark:text-gray-100 break-words">{item.item_name}</td>
                    <td className="px-3 py-2 text-sm text-gray-900 dark:text-gray-100">
                      {item.party_kind === 'internal' ? 'Internal' : 'External'}
                    </td>
                    <td className="px-2 py-2 text-right">
                      <RowActionButton variant="delete" label="Remove dependency party" onClick={() => handleRemove(item)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
      {modal}
    </div>
  )
}
