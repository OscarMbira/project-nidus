export default function FormVersionHistory({ versions = [] }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
      <h3 className="mb-2 text-sm font-semibold text-gray-900 dark:text-gray-100">Version History</h3>
      {!versions.length ? (
        <p className="text-xs text-gray-500 dark:text-gray-400">No versions saved yet.</p>
      ) : (
        <ul className="space-y-2 text-xs text-gray-600 dark:text-gray-300">
          {versions.map((v) => (
            <li key={v.id || v.version_number}>
              v{v.version_number}
              {v.created_at ? ` — ${new Date(v.created_at).toLocaleString()}` : ''}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
