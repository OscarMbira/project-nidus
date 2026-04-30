export default function FormVersionHistory({ versions = [] }) {
  return (
    <div className="rounded-lg border border-gray-700 bg-gray-900 p-4">
      <h3 className="mb-2 text-sm font-semibold text-gray-100">Version History</h3>
      <ul className="space-y-2 text-xs text-gray-300">
        {versions.map((v) => <li key={v.id || v.version_number}>v{v.version_number} - {v.created_at || 'now'}</li>)}
      </ul>
    </div>
  )
}
