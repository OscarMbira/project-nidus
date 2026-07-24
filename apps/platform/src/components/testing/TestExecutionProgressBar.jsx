export default function TestExecutionProgressBar({ summary }) {
  const s = summary && typeof summary === 'object' ? summary : {}
  const total = Number(s.total) || 0
  const passed = Number(s.passed) || 0
  const failed = Number(s.failed) || 0
  const blocked = Number(s.blocked) || 0
  const skipped = Number(s.skipped) || 0
  const done = passed + failed + blocked + skipped
  const pct = total > 0 ? Math.round((done / total) * 100) : 0

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-xs text-gray-400">
        <span>Progress</span>
        <span>
          {done} / {total} ({pct}%)
        </span>
      </div>
      <div className="h-3 rounded-full bg-gray-800 overflow-hidden flex">
        {total > 0 && (
          <>
            <div
              className="bg-emerald-600 h-full"
              style={{ width: `${(passed / total) * 100}%` }}
              title={`Passed: ${passed}`}
            />
            <div
              className="bg-red-600 h-full"
              style={{ width: `${(failed / total) * 100}%` }}
              title={`Failed: ${failed}`}
            />
            <div
              className="bg-amber-600 h-full"
              style={{ width: `${(blocked / total) * 100}%` }}
              title={`Blocked: ${blocked}`}
            />
            <div
              className="bg-gray-600 h-full"
              style={{ width: `${(skipped / total) * 100}%` }}
              title={`Skipped: ${skipped}`}
            />
          </>
        )}
      </div>
    </div>
  )
}
