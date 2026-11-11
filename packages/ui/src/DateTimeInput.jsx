/**
 * DateTimeInput — date and time to the minute for a Local Register "Date & Time" field (v1337).
 * Entered in the organisation's time zone (Regional & Format Settings, rule 68), stored as ISO UTC.
 * "Now" stamps the current moment, e.g. when a runbook step starts on the night.
 */
import { Clock, X } from 'lucide-react'
import { fromDateTimeInputValue, nowDateTimeValue, toDateTimeInputValue } from '@nidus/shared/utils/registerDateTime'

const INPUT_CLASS =
  'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm'

/**
 * @param {object} props
 * @param {string} props.value             stored ISO value ('' when empty)
 * @param {(next: string) => void} props.onChange
 * @param {object} [props.settings]        resolved Regional & Format settings (time zone)
 * @param {string} [props.ariaLabel]
 * @param {boolean} [props.disabled]
 */
export default function DateTimeInput({ value, onChange, settings = null, ariaLabel = 'Date and time', disabled = false }) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="datetime-local"
        value={toDateTimeInputValue(value, settings)}
        onChange={(e) => onChange(fromDateTimeInputValue(e.target.value, settings))}
        className={INPUT_CLASS}
        aria-label={ariaLabel}
        disabled={disabled}
      />
      {!disabled && (
        <>
          <button
            type="button"
            onClick={() => onChange(nowDateTimeValue())}
            className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
            aria-label={`${ariaLabel}: now`}
            title="Set to now"
          >
            <Clock className="h-4 w-4" /> Now
          </button>
          {value ? (
            <button
              type="button"
              onClick={() => onChange('')}
              className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
              aria-label={`Clear ${ariaLabel}`}
              title="Clear"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </>
      )}
    </div>
  )
}
