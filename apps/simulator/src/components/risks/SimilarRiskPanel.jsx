/**
 * Similar catalogue names and risks, shown after the user pauses while typing.
 */
export default function SimilarRiskPanel({ names = [], risks = [], onPickName, onOpenRisk }) {
  if (!names.length && !risks.length) return null
  return (
    <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-gray-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-gray-100">
      <p className="font-medium text-amber-900 dark:text-amber-200">Similar items already exist</p>
      {names.length > 0 && (
        <ul className="mt-2 space-y-1">
          {names.map((item) => (
            <li key={item.value || item.name}>
              <button
                type="button"
                className="text-left text-blue-700 hover:underline dark:text-blue-300"
                onClick={() => onPickName?.(item)}
              >
                Use {item.name}
              </button>
            </li>
          ))}
        </ul>
      )}
      {risks.length > 0 && (
        <ul className="mt-2 space-y-1">
          {risks.map((risk) => (
            <li key={risk.id}>
              <button
                type="button"
                className="text-left text-blue-700 hover:underline dark:text-blue-300"
                onClick={() => onOpenRisk?.(risk)}
              >
                {risk.risk_title}
                {risk.project_name ? ` — ${risk.project_name}` : ''}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
