/**
 * v1355 — the figures a saved run shows: chance of the target, P-values, charts, criticality,
 * contingency. Presentational so tests can render it without a database.
 */
import { HistogramChart, SCurveChart, TornadoChart } from './QraCharts.jsx'

function Stat({ label, value }) {
  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
      <p className="text-sm text-gray-600 dark:text-gray-300">{label}</p>
      <p className="mt-1 text-xl font-semibold text-gray-900 dark:text-gray-100">{value}</p>
    </div>
  )
}

export function QraSummary({ summary, formatDate, formatMoney, onAdopt, adopting = false, scheduleOnly = false }) {
  if (!summary) return null
  const s = summary.schedule || {}
  const c = summary.cost
  const cont = summary.contingency || {}
  const money = (n) => (n == null ? '—' : formatMoney ? formatMoney(n) : Number(n).toLocaleString())
  const date = (d) => (d ? (formatDate ? formatDate(d) : d) : '—')
  const chance = (value) => (value == null ? '—' : `${Math.round(value * 100)}%`)
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="Chance of the target date" value={chance(s.chance)} />
        <Stat label="50% chance of finishing by" value={date(s.p50)} />
        <Stat label={`${summary.confidence || 80}% chance of finishing by`} value={date(s.p80)} />
        <Stat label="90% chance of finishing by" value={date(s.p90)} />
      </div>
      {!scheduleOnly && c && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Stat label="Chance of the budget" value={chance(c.chance)} />
          <Stat label="50% cost" value={money(c.p50)} />
          <Stat label={`${summary.confidence || 80}% cost`} value={money(c.p80)} />
          <Stat label="90% cost" value={money(c.p90)} />
        </div>
      )}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <section className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
          <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Finish dates</h3>
          <HistogramChart bins={s.histogram} label="Finish date histogram" />
          <SCurveChart points={s.sCurve} />
        </section>
        <section className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
          <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-2">What moves the finish</h3>
          <TornadoChart rows={s.tornado} />
        </section>
      </div>
      {!scheduleOnly && c && (
        <section className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
          <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-2">What moves the cost</h3>
          <TornadoChart rows={c.tornado} />
        </section>
      )}
      <section className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
        <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Tasks most often critical</h3>
        <ul className="divide-y divide-gray-200 dark:divide-gray-700">
          {(summary.criticality || []).slice(0, 8).map((row) => (
            <li key={row.taskId} className="flex justify-between py-2 text-sm text-gray-800 dark:text-gray-100">
              <span>{row.label}</span>
              <span className="tabular-nums">{Math.round(row.criticality * 100)}%</span>
            </li>
          ))}
          {(summary.criticality || []).length === 0 && <li className="py-2 text-sm text-gray-700 dark:text-gray-200">No task was critical in this run.</li>}
        </ul>
      </section>
      <section className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 space-y-2">
        <h3 className="font-medium text-gray-900 dark:text-gray-100">Contingency</h3>
        <p className="text-sm text-gray-800 dark:text-gray-100">
          Recommended schedule contingency: {cont.recommendedScheduleDays == null ? '—' : `${Math.round(cont.recommendedScheduleDays)} working days`}.
          Planned finish {date(s.plannedFinish)}, {summary.confidence || 80}% finish {date(cont.pFinish)}.
        </p>
        {!scheduleOnly && (
          <p className="text-sm text-gray-800 dark:text-gray-100">
            Recommended cost contingency {money(cont.recommendedCost)}. Held {money(cont.held)}. Gap {money(cont.gap)}.
          </p>
        )}
        {!scheduleOnly && onAdopt && cont.recommendedCost != null && (
          <button type="button" onClick={onAdopt} disabled={adopting} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm disabled:opacity-50">
            {adopting ? 'Adopting…' : 'Adopt into the plan'}
          </button>
        )}
      </section>
    </div>
  )
}
