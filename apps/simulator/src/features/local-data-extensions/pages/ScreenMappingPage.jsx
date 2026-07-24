import { useCallback, useEffect, useState } from 'react'
import { useLdeContext } from './LocalDataExtensionsRoutes'
import { listDefinitions, listScreenMaps, attachScreen, detachScreen } from '../api/customFieldsApi'
import FieldMappingSelector from '../components/FieldMappingSelector'
import { WORKFLOW_STATUS } from '../utils/customFieldConstants'

export default function ScreenMappingPage() {
  const { platformDb, accountId, userInternalId } = useLdeContext()
  const [defs, setDefs] = useState([])
  const [fieldId, setFieldId] = useState('')
  const [maps, setMaps] = useState([])
  const [pickedScreen, setPickedScreen] = useState('')

  const loadDefs = useCallback(async () => {
    const res = await listDefinitions(platformDb, accountId)
    const published = (res.data || []).filter((d) => d.workflow_status === WORKFLOW_STATUS.PUBLISHED)
    setDefs(published)
  }, [platformDb, accountId])

  const refreshMaps = useCallback(async () => {
    if (!fieldId) {
      setMaps([])
      return
    }
    const res = await listScreenMaps(platformDb, fieldId)
    setMaps(res.data || [])
  }, [platformDb, fieldId])

  useEffect(() => {
    loadDefs()
  }, [loadDefs])

  useEffect(() => {
    refreshMaps()
  }, [refreshMaps])

  const attach = async () => {
    if (!fieldId || !pickedScreen) return
    const res = await attachScreen(platformDb, fieldId, pickedScreen, userInternalId, accountId)
    if (!res.success) window.alert(res.error || 'Attach failed')
    else refreshMaps()
  }

  const detach = async (mapId) => {
    const res = await detachScreen(platformDb, mapId, userInternalId, accountId, fieldId)
    if (!res.success) window.alert(res.error || 'Detach failed')
    else refreshMaps()
  }

  return (
    <div className="space-y-6">
      <label className="block text-sm max-w-lg">
        Published field
        <select
          className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2"
          value={fieldId}
          onChange={(e) => setFieldId(e.target.value)}
        >
          <option value="">— Select —</option>
          {defs.map((d) => (
            <option key={d.id} value={d.id}>
              {d.label} ({d.field_code})
            </option>
          ))}
        </select>
      </label>

      <FieldMappingSelector platformDb={platformDb} valueScreenId={pickedScreen} onChange={setPickedScreen} />

      <button
        type="button"
        disabled={!fieldId || !pickedScreen}
        onClick={attach}
        className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm disabled:opacity-50"
      >
        Attach to screen
      </button>

      <div>
        <h3 className="font-medium text-gray-900 dark:text-white mb-2">Mapped screens</h3>
        <ul className="divide-y divide-gray-200 dark:divide-gray-700 border border-gray-200 dark:border-gray-700 rounded-lg">
          {maps.map((m) => (
            <li key={m.id} className="flex justify-between items-center px-3 py-2 text-sm">
              <span>
                {m.system_screens?.screen_name || m.screen_id}{' '}
                <span className="text-gray-400">({m.system_screens?.screen_code})</span>
              </span>
              <button type="button" className="text-red-600 text-xs" onClick={() => detach(m.id)}>
                Remove
              </button>
            </li>
          ))}
          {!maps.length && <li className="px-3 py-4 text-gray-500 text-sm">No mappings.</li>}
        </ul>
      </div>
    </div>
  )
}
