import { useCallback, useEffect, useState } from 'react'
import { useLdeContext } from './LocalDataExtensionsRoutes'
import {
  listDefinitions,
  publishDefinition,
  listOptions,
} from '../api/customFieldsApi'
import CustomFieldAdminBuilder from '../components/CustomFieldAdminBuilder'
import { WORKFLOW_STATUS } from '../utils/customFieldConstants'
import { invalidateAllCustomFieldsCache } from '../hooks/useCustomFields'
import { TableRowNumberHeader, TableRowNumberCell } from '../../../components/ui/Table'
import { getDisplayRowNumber } from '../../../utils/tableRowNumberUtils'

export default function FieldDefinitionsPage() {
  const { platformDb, accountId, userInternalId } = useLdeContext()
  const [rows, setRows] = useState([])
  const [queueDrafts, setQueueDrafts] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)
  const [tab, setTab] = useState('all')

  const load = useCallback(async () => {
    if (!accountId) return
    setLoading(true)
    const all = await listDefinitions(platformDb, accountId)
    const drafts = await listDefinitions(platformDb, accountId, { workflowStatus: WORKFLOW_STATUS.DRAFT })
    setRows(all.data || [])
    setQueueDrafts(drafts.data || [])
    setLoading(false)
  }, [platformDb, accountId])

  useEffect(() => {
    load()
  }, [load])

  const openNew = () => setModal({})

  const openEdit = async (def) => {
    const o = await listOptions(platformDb, def.id)
    setModal({ ...def, options: o.data || [] })
  }

  const publish = async (def) => {
    const res = await publishDefinition(platformDb, def.id, userInternalId)
    if (!res.success) window.alert(res.error || 'Publish failed')
    else {
      invalidateAllCustomFieldsCache()
      load()
    }
  }

  const displayed = tab === 'drafts' ? queueDrafts : rows

  return (
    <div>
      <div className="flex flex-wrap gap-3 mb-4 items-center justify-between">
        <div className="flex gap-2">
          <button
            type="button"
            className={`px-3 py-1.5 rounded-lg text-sm ${tab === 'all' ? 'bg-emerald-600 text-white' : 'bg-gray-100 dark:bg-gray-800'}`}
            onClick={() => setTab('all')}
          >
            All definitions
          </button>
          <button
            type="button"
            className={`px-3 py-1.5 rounded-lg text-sm ${tab === 'drafts' ? 'bg-amber-600 text-white' : 'bg-gray-100 dark:bg-gray-800'}`}
            onClick={() => setTab('drafts')}
          >
            Draft queue ({queueDrafts.length})
          </button>
        </div>
        <button
          type="button"
          onClick={openNew}
          className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium"
        >
          New field
        </button>
      </div>

      {loading ? (
        <p className="text-gray-500">Loading…</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <TableRowNumberHeader className="!normal-case" />
                <th className="text-left p-2">Code</th>
                <th className="text-left p-2">Label</th>
                <th className="text-left p-2">Type</th>
                <th className="text-left p-2">Status</th>
                <th className="text-right p-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {displayed.map((r, index) => (
                <tr key={r.id} className="border-t border-gray-100 dark:border-gray-700">
                    <TableRowNumberCell number={getDisplayRowNumber(index)} />
                  <td className="p-2 font-mono text-xs">{r.field_code}</td>
                  <td className="p-2">{r.label}</td>
                  <td className="p-2">{r.field_type}</td>
                  <td className="p-2 capitalize">{r.workflow_status}</td>
                  <td className="p-2 text-right space-x-2 whitespace-nowrap">
                    <button type="button" className="text-blue-600 dark:text-blue-400" onClick={() => openEdit(r)}>
                      Edit
                    </button>
                    {r.workflow_status !== WORKFLOW_STATUS.PUBLISHED && (
                      <button type="button" className="text-emerald-600 dark:text-emerald-400" onClick={() => publish(r)}>
                        Publish
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {!displayed.length && (
                <tr>
                    <TableRowNumberCell number={getDisplayRowNumber(index)} />
                  <td colSpan={5} className="p-6 text-center text-gray-500">
                    No fields yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {modal != null && (
        <CustomFieldAdminBuilder
          platformDb={platformDb}
          accountId={accountId}
          userInternalId={userInternalId}
          initial={modal.id ? modal : undefined}
          onClose={() => setModal(null)}
          onSaved={() => {
            invalidateAllCustomFieldsCache()
            load()
          }}
        />
      )}
    </div>
  )
}
