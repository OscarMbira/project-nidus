import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import DocumentAttachmentsPanel from '../DocumentAttachmentsPanel'

const mockAttachment = {
  id: 'row-1',
  attachment_group_id: 'group-1',
  version_number: 1,
  is_current: true,
  file_name: 'charter-diagram.png',
  mime_type: 'image/png',
  file_size: 2048,
  caption: '',
  display_id: 'DAT-0001',
  storage_path: 'platform/node-1/group-1-v1-charter-diagram.png',
}

const listDocumentAttachments = vi.fn()
const uploadDocumentAttachment = vi.fn()
const deleteDocumentAttachment = vi.fn()
const replaceDocumentAttachment = vi.fn()
const restoreAttachmentVersion = vi.fn()
const updateAttachmentCaption = vi.fn()
const listAttachmentVersionHistory = vi.fn()
const getAttachmentSignedUrl = vi.fn()

vi.mock('@nidus/shared/services/processTemplateAttachmentService', async () => {
  const actual = await vi.importActual('@nidus/shared/services/processTemplateAttachmentService')
  return {
    ...actual,
    listDocumentAttachments: (...args) => listDocumentAttachments(...args),
    uploadDocumentAttachment: (...args) => uploadDocumentAttachment(...args),
    deleteDocumentAttachment: (...args) => deleteDocumentAttachment(...args),
    replaceDocumentAttachment: (...args) => replaceDocumentAttachment(...args),
    restoreAttachmentVersion: (...args) => restoreAttachmentVersion(...args),
    updateAttachmentCaption: (...args) => updateAttachmentCaption(...args),
    listAttachmentVersionHistory: (...args) => listAttachmentVersionHistory(...args),
    getAttachmentSignedUrl: (...args) => getAttachmentSignedUrl(...args),
  }
})

vi.mock('@nidus/shared/utils/accountResolution', () => ({
  getCurrentUserInternalUserId: vi.fn().mockResolvedValue('user-1'),
}))

vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}))

describe('DocumentAttachmentsPanel', () => {
  const db = { from: vi.fn(), storage: { from: vi.fn() } }

  beforeEach(() => {
    vi.clearAllMocks()
    listDocumentAttachments.mockResolvedValue({ success: true, data: [] })
    getAttachmentSignedUrl.mockResolvedValue({ success: true, data: 'https://signed.example/file' })
  })

  it('renders nothing when there is no templateNodeId', () => {
    const { container } = render(<DocumentAttachmentsPanel db={db} templateNodeId={null} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('loads and renders existing attachments for the document', async () => {
    listDocumentAttachments.mockResolvedValue({ success: true, data: [mockAttachment] })
    render(<DocumentAttachmentsPanel db={db} templateNodeId="node-1" mode="platform" />)

    await waitFor(() => expect(listDocumentAttachments).toHaveBeenCalledWith(db, 'node-1'))
    expect(await screen.findByText('charter-diagram.png')).toBeInTheDocument()
  })

  it('uploads a picked file via the service', async () => {
    uploadDocumentAttachment.mockResolvedValue({ success: true, data: mockAttachment })
    render(<DocumentAttachmentsPanel db={db} templateNodeId="node-1" mode="platform" />)

    await waitFor(() => expect(listDocumentAttachments).toHaveBeenCalled())

    const file = new File(['bytes'], 'charter-diagram.png', { type: 'image/png' })
    const input = document.querySelector('input[type="file"]:not([capture])')
    fireEvent.change(input, { target: { files: [file] } })

    await waitFor(() => expect(uploadDocumentAttachment).toHaveBeenCalledWith(db, expect.objectContaining({
      templateNodeId: 'node-1', mode: 'platform',
    })))
  })

  it('rejects an oversized file client-side without calling the upload service', async () => {
    render(<DocumentAttachmentsPanel db={db} templateNodeId="node-1" mode="platform" />)
    await waitFor(() => expect(listDocumentAttachments).toHaveBeenCalled())

    const bigFile = new File(['x'], 'huge.png', { type: 'image/png' })
    Object.defineProperty(bigFile, 'size', { value: 11 * 1024 * 1024 })
    const input = document.querySelector('input[type="file"]:not([capture])')
    fireEvent.change(input, { target: { files: [bigFile] } })

    await waitFor(() => expect(screen.getByText(/too large/i)).toBeInTheDocument())
    expect(uploadDocumentAttachment).not.toHaveBeenCalled()
  })

  it('deletes an attachment via the service', async () => {
    listDocumentAttachments.mockResolvedValue({ success: true, data: [mockAttachment] })
    deleteDocumentAttachment.mockResolvedValue({ success: true, data: { deleted: true } })
    vi.spyOn(window, 'confirm').mockReturnValue(true)

    render(<DocumentAttachmentsPanel db={db} templateNodeId="node-1" mode="platform" />)
    await screen.findByText('charter-diagram.png')

    fireEvent.click(screen.getByTitle('Delete'))

    await waitFor(() => expect(deleteDocumentAttachment).toHaveBeenCalledWith(db, expect.objectContaining({
      attachmentGroupId: 'group-1',
    })))
  })

  it('hides add/replace/delete controls when disabled', async () => {
    listDocumentAttachments.mockResolvedValue({ success: true, data: [mockAttachment] })
    render(<DocumentAttachmentsPanel db={db} templateNodeId="node-1" mode="platform" disabled />)
    await screen.findByText('charter-diagram.png')

    expect(screen.queryByText(/add file/i)).not.toBeInTheDocument()
    expect(screen.queryByTitle('Delete')).not.toBeInTheDocument()
  })
})
