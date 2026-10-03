/** Stable lookup code from a label. Stored on communication plans, so edits do not change it. */
export function communicationOptionCodeFromLabel(label) {
  return String(label || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 50)
}
