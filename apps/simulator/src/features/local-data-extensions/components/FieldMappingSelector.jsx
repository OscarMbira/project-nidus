import { useEffect, useState } from 'react'
import { fetchModules, fetchScreensForModule } from '../api/customFieldsApi'

export default function FieldMappingSelector({ platformDb, valueScreenId, onChange }) {
  const [modules, setModules] = useState([])
  const [screens, setScreens] = useState([])
  const [moduleId, setModuleId] = useState('')

  useEffect(() => {
    fetchModules(platformDb).then((res) => setModules(res.data || []))
  }, [platformDb])

  useEffect(() => {
    if (!moduleId) {
      setScreens([])
      return
    }
    fetchScreensForModule(platformDb, moduleId).then((res) => setScreens(res.data || []))
  }, [platformDb, moduleId])

  return (
    <div className="flex flex-wrap gap-3 items-end">
      <label className="text-sm">
        Module
        <select
          className="mt-1 block rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-2 py-1"
          value={moduleId}
          onChange={(e) => {
            setModuleId(e.target.value)
            onChange?.('')
          }}
        >
          <option value="">—</option>
          {modules.map((m) => (
            <option key={m.id} value={m.id}>
              {m.module_name}
            </option>
          ))}
        </select>
      </label>
      <label className="text-sm">
        Screen
        <select
          className="mt-1 block rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-2 py-1"
          value={valueScreenId || ''}
          disabled={!moduleId}
          onChange={(e) => onChange?.(e.target.value)}
        >
          <option value="">—</option>
          {screens.map((s) => (
            <option key={s.id} value={s.id}>
              {s.screen_name} ({s.entity_type})
            </option>
          ))}
        </select>
      </label>
    </div>
  )
}
