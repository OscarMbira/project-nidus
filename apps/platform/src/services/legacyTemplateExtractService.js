/**
 * Track B text extraction via officeparser (Word / PDF / PowerPoint).
 */
export async function extractTextFromOfficeFile(file) {
  if (!file) return ''
  const name = String(file.name || '').toLowerCase()
  const isOffice =
    /\.(docx?|pptx?|pdf|odt|odp)$/i.test(name)
    || (file.type || '').includes('pdf')
    || (file.type || '').includes('word')
    || (file.type || '').includes('presentation')

  if (!isOffice) {
    if (name.endsWith('.txt') || (file.type || '').startsWith('text/')) {
      return file.text()
    }
    return ''
  }

  try {
    const officeparser = await import('officeparser')
    const parseFn =
      officeparser.parseOffice
      || officeparser.parseOfficeAsync
      || officeparser.default?.parseOffice
      || officeparser.default?.parseOfficeAsync
      || officeparser.default
    const buffer = await file.arrayBuffer()
    const input = typeof Buffer !== 'undefined' ? Buffer.from(buffer) : new Uint8Array(buffer)
    const result = typeof parseFn === 'function' ? await parseFn(input) : ''
    if (typeof result === 'string') return result
    if (result?.toText) return await result.toText()
    if (result?.text) return String(result.text)
    return String(result || '')
  } catch (err) {
    console.warn('officeparser extract failed:', err)
    return ''
  }
}
