export default function ScreenshotComparisonPanel({ baselineUrl, actualUrl, status, summary }) {
  return (
    <div className="grid md:grid-cols-2 gap-2 p-3 rounded border border-gray-700 bg-gray-900/80 text-gray-100 text-sm">
      <div>
        <div className="text-xs text-gray-500 mb-1">Baseline</div>
        {baselineUrl ? <img src={baselineUrl} alt="" className="w-full rounded border border-gray-700" /> : <p className="text-gray-500">—</p>}
      </div>
      <div>
        <div className="text-xs text-gray-500 mb-1">Actual</div>
        {actualUrl ? <img src={actualUrl} alt="" className="w-full rounded border border-gray-700" /> : <p className="text-gray-500">—</p>}
      </div>
      {status && <p className="md:col-span-2 text-xs">Status: {status}{summary ? ` — ${summary}` : ''}</p>}
    </div>
  )
}
