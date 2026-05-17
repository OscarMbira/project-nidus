import { useCallback, useEffect, useState } from 'react'
import { useLdeContext } from './LocalDataExtensionsRoutes'
import { listGroups, upsertGroup } from '../api/customFieldGroupsApi'
import { WORKFLOW_STATUS } from '../utils/customFieldConstants'

export default function FieldGroupsPage() {
  const { platformDb, accountId, userInternalId } = useLdeContext()
  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({
    group_code: '',
    label: '',
    description: '',
    min_rows: 0,
    max_rows: 20,
    workflow_status: WORKFLOW_STATUS.DRAFT,
  })

  const load = useCallback(async () => {
    if (!accountId) return
    setLoading(true)
    const res = await listGroups(platformDb, accountId)
    setGroups(res.data || [])
    setLoading(false)
  }, [platformDb, accountId])

  useEffect(() => {
    load()
  }, [load])

  const saveNew = async () => {
    if (!form.group_code.trim() || !form.label.trim()) {
      window.alert('Group code and label required')
      return
    }
    const res = await upsertGroup(
      platformDb,
      {
        account_id: accountId,
        group_code: form.group_code.trim(),
        label: form.label.trim(),
        description: form.description || null,
        min_rows: Number(form.min_rows) || 0,
        max_rows: Number(form.max_rows) || 20,
        workflow_status: form.workflow_status,
      },
      userInternalId
    )
    if (!res.success) window.alert(res.error || 'Save failed')
    else {
      setForm({
        group_code: '',
        label: '',
        description: '',
        min_rows: 0,
        max_rows: 20,
        workflow_status: WORKFLOW_STATUS.DRAFT,
      })
      load()
    }
  }

  return (
    <div className="space-y-8">
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-gray-800/40">
        <h2 className="font-semibold text-gray-900 dark:text-white mb-3">Create repeating group</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input
            className="rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
            placeholder="Group code"
            value={form.group_code}
            onChange={(e) => setForm((f) => ({ ...f, group_code: e.target.value }))}
          />
          <input
            className="rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
            placeholder="Label"
            value={form.label}
            onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
          />
          <textarea
            className="md:col-span-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
            placeholder="Description"
            rows={2}
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          />
          <label className="text-sm flex items-center gap-2">
            Min rows
            <input
              type="number"
              className="rounded border border-gray-300 dark:border-gray-600 px-2 py-1 w-24"
              value={form.min_rows}
              onChange={(e) => setForm((f) => ({ ...f, min_rows: e.target.value }))}
            />
          </label>
          <label className="text-sm flex items-center gap-2">
            Max rows
            <input
              type="number"
              className="rounded border border-gray-300 dark:border-gray-600 px-2 py-1 w-24"
              value={form.max_rows}
              onChange={(e) => setForm((f) => ({ ...f, max_rows: e.target.value }))}
            />
          </label>
          <select
            className="rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
            value={form.workflow_status}
            onChange={(e) => setForm((f) => ({ ...f, workflow_status: e.target.value }))}
          >
            {Object.values(WORKFLOW_STATUS).map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          onClick={saveNew}
          className="mt-3 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium"
        >
          Save group
        </button>
      </div>

      {loading ? (
        <p className="text-gray-500">Loading…</p>
      ) : (
        <table className="min-w-full text-sm border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th className="text-left p-2">Code</th>
              <th className="text-left p-2">Label</th>
              <th className="text-left p-2">Rows min/max</th>
              <th className="text-left p-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {groups.map((g) => (
              <tr key={g.id} className="border-t border-gray-100 dark:border-gray-700">
                <td className="p-2 font-mono text-xs">{g.group_code}</td>
                <td className="p-2">{g.label}</td>
                <td className="p-2">
                  {g.min_rows} – {g.max_rows}
                </td>
                <td className="p-2 capitalize">{g.workflow_status}</td>
              </tr>
            ))}
            {!groups.length && (
              <tr>
                <td colSpan={4} className="p-6 text-center text-gray-500">
                  No groups yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  )
}
