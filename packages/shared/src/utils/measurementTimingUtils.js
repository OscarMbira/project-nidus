/**
 * Parse / serialize Benefits Review Plan measurement timing links.
 * Stored in measurement_timing_rationale (TEXT): JSON array of { point, timing }.
 * Legacy plain newline text → timing-only rows (point blank).
 */

export function parseMeasurementTimingLinks(value) {
  if (value == null || value === '') return []
  if (Array.isArray(value)) {
    return value
      .map((row) => ({
        point: String(row?.point ?? row?.measurement_point ?? '').trim(),
        timing: String(row?.timing ?? row?.measurement_timing ?? row?.rationale ?? '').trim(),
      }))
      .filter((row) => row.point || row.timing)
  }

  const raw = String(value).trim()
  if (!raw) return []

  if (raw.startsWith('[')) {
    try {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) return parseMeasurementTimingLinks(parsed)
    } catch {
      /* fall through to legacy lines */
    }
  }

  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((timing) => ({ point: '', timing }))
}

export function serializeMeasurementTimingLinks(rows) {
  const cleaned = (Array.isArray(rows) ? rows : [])
    .map((row) => ({
      point: String(row?.point ?? '').trim(),
      timing: String(row?.timing ?? '').trim(),
    }))
    .filter((row) => row.point || row.timing)
  if (!cleaned.length) return ''
  return JSON.stringify(cleaned)
}

export function formatMeasurementTimingLinksForDisplay(value) {
  const rows = parseMeasurementTimingLinks(value)
  if (!rows.length) return ''
  return rows
    .map((row) => (row.point ? `${row.point}: ${row.timing}` : row.timing))
    .filter(Boolean)
    .join('\n')
}

export function parseMeasurementPoints(approachValue) {
  if (!approachValue || typeof approachValue !== 'string') return []
  return approachValue
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
}
