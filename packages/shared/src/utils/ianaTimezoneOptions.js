/**
 * Build { value, label } options for IANA timezones (browser Intl when available).
 * Labels include city + UTC offset for easier scanning/search.
 * @returns {{ value: string, label: string }[]}
 */

const PRIORITY_ZONES = [
  'UTC',
  'Africa/Johannesburg',
  'Africa/Harare',
  'Africa/Nairobi',
  'Africa/Lagos',
  'Europe/London',
  'Europe/Paris',
  'Asia/Dubai',
  'Asia/Kolkata',
  'Asia/Singapore',
  'Asia/Tokyo',
  'Australia/Sydney',
  'Pacific/Auckland',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
]

function formatUtcOffset(timeZone) {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      timeZoneName: 'longOffset',
    }).formatToParts(new Date())
    const raw = parts.find((p) => p.type === 'timeZoneName')?.value || ''
    // "GMT", "GMT+2", "GMT+05:30" → normalise to UTC…
    if (!raw || raw === 'GMT') return 'UTC'
    return raw.replace(/^GMT/, 'UTC')
  } catch {
    return ''
  }
}

function friendlyCity(tz) {
  if (tz === 'UTC') return 'UTC'
  const city = tz.includes('/') ? tz.split('/').pop() : tz
  return city.replace(/_/g, ' ')
}

/**
 * @returns {{ value: string, label: string }[]}
 */
export function buildIanaTimezoneSelectOptions() {
  let ids = []
  try {
    if (typeof Intl !== 'undefined' && typeof Intl.supportedValuesOf === 'function') {
      ids = Intl.supportedValuesOf('timeZone')
    }
  } catch {
    ids = []
  }
  const unique = new Set(ids)
  unique.add('UTC')

  const toOption = (tz) => {
    const offset = formatUtcOffset(tz)
    const city = friendlyCity(tz)
    const label =
      tz === 'UTC'
        ? 'UTC (Coordinated Universal Time)'
        : offset
          ? `${city} — ${tz} (${offset})`
          : `${city} — ${tz}`
    return { value: tz, label }
  }

  const all = Array.from(unique)
  const priority = PRIORITY_ZONES.filter((z) => unique.has(z))
  const rest = all
    .filter((z) => !PRIORITY_ZONES.includes(z))
    .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))

  return [...priority, ...rest].map(toOption)
}
