import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import SignatureCaptureControl, {
  fileFromClipboardData,
  fileFromDataUrl,
  normalizeSignatureFile,
} from '../SignatureCaptureControl'

const getSavedSignature = vi.fn()
const saveSignatureImage = vi.fn()

vi.mock('@nidus/shared/services/processTemplateSignatoryService', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    getSavedSignature: (...args) => getSavedSignature(...args),
    saveSignatureImage: (...args) => saveSignatureImage(...args),
  }
})

vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}))

const TINY_PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='

describe('fileFromClipboardData (Simulator)', () => {
  it('returns the first image file from clipboard items', async () => {
    const image = new File(['sig'], 'sig.png', { type: 'image/png' })
    const file = await fileFromClipboardData({
      items: [
        { kind: 'string', type: 'text/plain', getAsFile: () => null },
        { kind: 'file', type: 'image/png', getAsFile: () => image },
      ],
    })
    expect(file).toBeInstanceOf(File)
    expect(file.type).toBe('image/png')
  })

  it('accepts a Windows paste with an empty MIME type', async () => {
    const image = new File(['sig'], 'signature.png', { type: '' })
    const file = await fileFromClipboardData({
      items: [{ kind: 'file', type: '', getAsFile: () => image }],
    })
    expect(file.type).toBe('image/png')
    expect(file.name).toBe('signature.png')
  })

  it('falls back to clipboardData.files', async () => {
    const image = new File(['sig'], 'sig.png', { type: 'image/png' })
    const file = await fileFromClipboardData({ files: [image] })
    expect(file.type).toBe('image/png')
  })

  it('reads an image from HTML clipboard markup', async () => {
    const file = await fileFromClipboardData({
      getData: (type) => (type === 'text/html' ? `<img src="${TINY_PNG}">` : ''),
    })
    expect(file).toBeInstanceOf(File)
    expect(file.type).toBe('image/png')
  })

  it('returns null when there is no image', async () => {
    expect(await fileFromClipboardData({ items: [{ kind: 'string', type: 'text/plain', getAsFile: () => null }] })).toBeNull()
    expect(await fileFromClipboardData(null)).toBeNull()
  })
})

describe('fileFromDataUrl / normalizeSignatureFile (Simulator)', () => {
  it('decodes a PNG data URL', () => {
    const file = fileFromDataUrl(TINY_PNG)
    expect(file.type).toBe('image/png')
    expect(file.size).toBeGreaterThan(0)
  })

  it('fills in image/png when the File has no type', () => {
    const file = normalizeSignatureFile(new File(['sig'], 'signature.png', { type: '' }))
    expect(file.type).toBe('image/png')
  })
})

describe('SignatureCaptureControl (Simulator)', () => {
  const db = {}
  const onSign = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    getSavedSignature.mockResolvedValue({ success: true, data: null })
    saveSignatureImage.mockResolvedValue({ success: true, data: { id: 'saved-1' } })
  })

  it('shows upload and paste options when there is no saved signature', async () => {
    render(<SignatureCaptureControl db={db} accountId="acc-1" onSign={onSign} />)
    expect(await screen.findByText('Upload signature image')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /paste signature/i })).toBeInTheDocument()
  })

  it('opens a paste box and keeps the Paste signature label', async () => {
    render(<SignatureCaptureControl db={db} accountId="acc-1" onSign={onSign} />)
    fireEvent.click(await screen.findByRole('button', { name: /paste signature/i }))
    expect(await screen.findByRole('textbox', { name: /paste signature image/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Paste signature$/ })).toBeInTheDocument()
    expect(screen.queryByText('Pasting…')).not.toBeInTheDocument()
  })

  it('shows a preview of a pasted image and only signs after confirmation', async () => {
    const image = new File(['sig'], 'sig.png', { type: 'image/png' })
    render(<SignatureCaptureControl db={db} accountId="acc-1" onSign={onSign} />)
    fireEvent.click(await screen.findByRole('button', { name: /paste signature/i }))
    await screen.findByRole('textbox', { name: /paste signature image/i })
    fireEvent.paste(document, {
      clipboardData: {
        items: [{ kind: 'file', type: 'image/png', getAsFile: () => image }],
      },
    })
    expect(await screen.findByAltText('Pasted signature preview')).toBeInTheDocument()
    expect(onSign).not.toHaveBeenCalled()
    expect(saveSignatureImage).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: /use this signature/i }))
    await waitFor(() => expect(onSign).toHaveBeenCalled())
    await waitFor(() => expect(saveSignatureImage).toHaveBeenCalled())
  })

  it('still signs when saving the reusable signature fails', async () => {
    saveSignatureImage.mockResolvedValue({ success: false, message: 'Storage unavailable' })
    const image = new File(['sig'], 'sig.png', { type: 'image/png' })
    render(<SignatureCaptureControl db={db} accountId="acc-1" onSign={onSign} />)
    fireEvent.click(await screen.findByRole('button', { name: /paste signature/i }))
    await screen.findByRole('textbox', { name: /paste signature image/i })
    fireEvent.paste(document, {
      clipboardData: {
        items: [{ kind: 'file', type: 'image/png', getAsFile: () => image }],
      },
    })
    fireEvent.click(await screen.findByRole('button', { name: /use this signature/i }))
    await waitFor(() => expect(onSign).toHaveBeenCalled())
  })

  it('passes a prefetched saved-signature file on one-click sign', async () => {
    const image = new File(['sig'], 'sig.png', { type: 'image/png' })
    getSavedSignature.mockResolvedValue({
      success: true,
      data: { storage_path: 'auth-1/signature.png', file_name: 'sig.png', mime_type: 'image/png' },
    })
    const dbWithStorage = {
      storage: {
        from: vi.fn(() => ({
          download: vi.fn().mockResolvedValue({ data: image, error: null }),
        })),
      },
    }
    render(<SignatureCaptureControl db={dbWithStorage} accountId="acc-1" onSign={onSign} />)
    fireEvent.click(await screen.findByRole('button', { name: /sign with my saved signature/i }))
    await waitFor(() => expect(onSign).toHaveBeenCalled())
    expect(onSign.mock.calls[0][0]).toBeInstanceOf(File)
  })
})
