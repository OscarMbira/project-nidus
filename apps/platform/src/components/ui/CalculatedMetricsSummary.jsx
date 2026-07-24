import { formatLocaleNumber } from '@nidus/shared/utils/localeFormat'

const EVM_LABELS = {
  sv: 'Schedule variance (SV)',
  cv: 'Cost variance (CV)',
  spi: 'Schedule performance index (SPI)',
  cpi: 'Cost performance index (CPI)',
  eac: 'Estimate at completion (EAC)',
  etc: 'Estimate to complete (ETC)',
  vac: 'Variance at completion (VAC)',
  tcpi: 'To-complete performance index (TCPI)',
}

function MetricItem({ label, value, languageCode }) {
  const formatted = formatLocaleNumber(value, languageCode) ?? String(value ?? '—')
  return (
    <div className="rounded border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950/50 px-3 py-2">
      <dt className="text-xs text-gray-500 dark:text-gray-400">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium text-gray-900 dark:text-gray-100">{formatted}</dd>
    </div>
  )
}

export default function CalculatedMetricsSummary({ calculated, languageCode }) {
  if (!calculated) return null

  const { risk_score: riskScore, three_point_duration: threePointDuration, evm } = calculated

  return (
    <section className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Calculated values</h3>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          Read-only metrics derived from the fields above. These update automatically as you enter data.
        </p>
      </div>

      <dl className="grid gap-3 sm:grid-cols-2">
        <MetricItem label="Risk score" value={riskScore} languageCode={languageCode} />
        <MetricItem label="Three-point duration" value={threePointDuration} languageCode={languageCode} />
      </dl>

      {evm && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Earned value metrics
          </h4>
          <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {Object.entries(EVM_LABELS).map(([key, label]) => (
              <MetricItem key={key} label={label} value={evm[key]} languageCode={languageCode} />
            ))}
          </dl>
        </div>
      )}
    </section>
  )
}
