import { useEffect, useState } from 'react'
import { fetchModules, fetchScreensForModule } from '../api/customFieldsApi'
import FieldLabelWithHelp from '@nidus/ui/FieldLabelWithHelp'

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
      <div className="text-sm">
        <FieldLabelWithHelp helpKey="sim.custom_field_screen_map.module_code" htmlFor="fh-custom-field-screen-map-module-code">Module</FieldLabelWithHelp>
        <select id="fh-custom-field-screen-map-module-code"
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
      </div>
      <div className="text-sm">
        <FieldLabelWithHelp helpKey="sim.custom_field_screen_map.screen_code" htmlFor="fh-custom-field-screen-map-screen-code">Screen</FieldLabelWithHelp>
        <select id="fh-custom-field-screen-map-screen-code"
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
      </div>
    </div>
  )
}
