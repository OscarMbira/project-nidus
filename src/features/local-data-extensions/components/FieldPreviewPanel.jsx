import { useState, useEffect } from 'react'
import CustomFieldInput from './CustomFieldInput'

function usePreviewValue(fieldType) {
  const initial = fieldType === 'boolean' ? false : fieldType === 'multi_select' ? [] : ''
  const [val, setVal] = useState(initial)
  useEffect(() => {
    setVal(fieldType === 'boolean' ? false : fieldType === 'multi_select' ? [] : '')
  }, [fieldType])
  return [val, setVal]
}

export default function FieldPreviewPanel({ draft }) {
  if (!draft?.label) {
    return <p className="text-sm text-gray-500 dark:text-gray-400">Fill basic info to preview.</p>
  }
  const def = {
    ...draft,
    id: 'preview',
    validation_rules: draft.validation_rules || {},
    options: draft.options || [],
  }
  return (
    <div className="rounded-lg border border-dashed border-gray-300 dark:border-gray-600 p-4 bg-gray-50 dark:bg-gray-900/40">
      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-3">Live preview</p>
      <PreviewInner def={def} />
    </div>
  )
}

function PreviewInner({ def }) {
  const [val, setVal] = usePreviewValue(def.field_type)
  return <CustomFieldInput definition={def} value={val} onChange={setVal} />
}
