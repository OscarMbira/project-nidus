/**
 * Local Register "Date & Time" field type (v1337) — a moment to the minute, e.g. when a runbook step
 * started. Stored as an ISO 8601 UTC string; entered and shown in the organisation's time zone, date
 * format and 12h / 24h time (Regional & Format Settings, rule 68).
 */
import { formatRegionalDate } from './formatRegionalSettings.js'
import { REGIONAL_FORMAT_DEFAULTS } from './regionalFormatConstants.js'

const pad = (n) => String(n).padStart(2, '0')

function zone(settings) {
  return settings?.time_zone || REGIONAL_FORMAT_DEFAULTS.time_zone
}

/** Wall-clock parts of a moment in a time zone. */
function partsIn(date, timeZone) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(date)
  const get = (t) => Number(parts.find((p) => p.type === t)?.value)
  return { year: get('year'), month: get('month'), day: get('day'), hour: get('hour') % 24, minute: get('minute') }
}

function parse(value) {
  if (value === null || value === undefined || value === '') return null
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

/** Stored value → the "YYYY-MM-DDTHH:mm" an <input type="datetime-local"> shows, in the organisation's zone. */
export function toDateTimeInputValue(value, settings) {
  const date = parse(value)
  if (!date) return ''
  const p = partsIn(date, zone(settings))
  return `${p.year}-${pad(p.month)}-${pad(p.day)}T${pad(p.hour)}:${pad(p.minute)}`
}

/** "YYYY-MM-DDTHH:mm" typed in the organisation's zone → stored ISO (UTC); '' when empty or invalid. */
export function fromDateTimeInputValue(local, settings) {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(String(local || ''))
  if (!m) return ''
  const [year, month, day, hour, minute] = m.slice(1).map(Number)
  const wanted = Date.UTC(year, month - 1, day, hour, minute)
  // Shift by the zone's offset at that moment (twice, so a daylight-saving change is respected).
  let guess = wanted
  for (let i = 0; i < 2; i += 1) {
    const p = partsIn(new Date(guess), zone(settings))
    const shown = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute)
    guess += wanted - shown
  }
  return new Date(guess).toISOString()
}

/** The current moment, as stored (whole minutes). */
export function nowDateTimeValue(now = new Date()) {
  const d = new Date(now.getTime())
  d.setUTCSeconds(0, 0)
  return d.toISOString()
}

/** Readable date and time in the organisation's format and zone, e.g. "10 Apr 2027 18:05". */
export function formatRegionalDateTime(value, settings) {
  const date = parse(value)
  if (!date) return value ? String(value) : ''
  const s = { ...REGIONAL_FORMAT_DEFAULTS, ...(settings || {}) }
  const p = partsIn(date, s.time_zone)
  const time = s.time_format === '12h'
    ? `${p.hour % 12 || 12}:${pad(p.minute)} ${p.hour < 12 ? 'AM' : 'PM'}`
    : `${pad(p.hour)}:${pad(p.minute)}`
  return `${formatRegionalDate(date, s)} ${time}`
}

/** Whole minutes from start to end; null when either is missing or end is before start. */
export function minutesBetween(start, end) {
  const a = parse(start)
  const b = parse(end)
  if (!a || !b || b < a) return null
  return Math.round((b.getTime() - a.getTime()) / 60000)
}

/** 127 → "2h 07m"; 45 → "45m"; negative values keep their sign. */
export function formatMinutes(minutes) {
  if (minutes === null || minutes === undefined || minutes === '' || Number.isNaN(Number(minutes))) return ''
  const n = Math.round(Number(minutes))
  const sign = n < 0 ? '-' : ''
  const abs = Math.abs(n)
  const h = Math.floor(abs / 60)
  return h ? `${sign}${h}h ${pad(abs % 60)}m` : `${sign}${abs}m`
}
