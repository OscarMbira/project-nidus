/**
 * Build { value, label } options for IANA timezones (browser Intl when available).
 * @returns {{ value: string, label: string }[]}
 */
export function buildIanaTimezoneSelectOptions() {
  let ids = [];
  try {
    if (typeof Intl !== 'undefined' && typeof Intl.supportedValuesOf === 'function') {
      ids = Intl.supportedValuesOf('timeZone');
    }
  } catch {
    ids = [];
  }
  const unique = new Set(ids);
  unique.add('UTC');
  return Array.from(unique)
    .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
    .map((tz) => ({ value: tz, label: tz }));
}
