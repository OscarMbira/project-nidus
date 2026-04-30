export default function DynamicTableSection({ sectionKey, rows = [], onChange }) {
  const updateRow = (index, next) => {
    const copy = [...rows]
    copy[index] = next
    onChange(sectionKey, copy)
  }

  const addRow = () => onChange(sectionKey, [...rows, {}])
  const removeRow = (index) => onChange(sectionKey, rows.filter((_, i) => i !== index))

  return (
    <div className="space-y-2">
      {rows.map((row, idx) => (
        <div key={`${sectionKey}-${idx}`} className="rounded border border-gray-700 p-2">
          <textarea
            className="w-full rounded border border-gray-700 bg-gray-950 p-2 text-xs text-gray-100"
            rows={3}
            value={JSON.stringify(row, null, 2)}
            onChange={(e) => updateRow(idx, { raw: e.target.value })}
          />
          <button type="button" className="mt-2 text-xs text-red-300" onClick={() => removeRow(idx)}>Remove row</button>
        </div>
      ))}
      <button type="button" className="rounded bg-blue-600 px-3 py-1 text-xs text-white" onClick={addRow}>Add row</button>
    </div>
  )
}
