export default function ExportMenu({ onExport }) {
  const options = ['pdf', 'word-html', 'csv', 'json']
  return (
    <select
      className="rounded border border-gray-700 bg-gray-900 px-3 py-2 text-xs text-gray-100"
      defaultValue=""
      onChange={(e) => e.target.value && onExport?.(e.target.value)}
    >
      <option value="" disabled>Export form</option>
      {options.map((opt) => <option key={opt} value={opt}>{opt.toUpperCase()}</option>)}
    </select>
  )
}
