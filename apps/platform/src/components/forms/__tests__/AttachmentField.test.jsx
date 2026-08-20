import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import AttachmentField from '../AttachmentField'

const mockAttachment = {
  id: 'row-1',
  attachment_group_id: 'group-1',
  version_number: 1,
  is_current: true,
  file_name: 'diagram.png',
  mime_type: 'image/png',
  file_size: 2048,
  caption: '',
  display_id: 'IMG-0001',
  storage_path: 'platform/instance-1/diagram_field/group-1-v1-diagram.png',
}

const listFieldAttachments = vi.fn()
const uploadFieldAttachment = vi.fn()
const deleteFieldAttachment = vi.fn()
const replaceFieldAttachment = vi.fn()
const restoreAttachmentVersion = vi.fn()
const updateFieldAttachmentCaption = vi.fn()
const listAttachmentVersionHistory = vi.fn()
const getAttachmentSignedUrl = vi.fn()

vi.mock('../../../services/formFieldAttachmentService', async () => {
  const actual = await vi.importActual('../../../services/formFieldAttachmentService')
  return {
    ...actual,
    listFieldAttachments: (...args) => listFieldAttachments(...args),
    uploadFieldAttachment: (...args) => uploadFieldAttachment(...args),
    deleteFieldAttachment: (...args) => deleteFieldAttachment(...args),
    replaceFieldAttachment: (...args) => replaceFieldAttachment(...args),
    restoreAttachmentVersion: (...args) => restoreAttachmentVersion(...args),
    updateFieldAttachmentCaption: (...args) => updateFieldAttachmentCaption(...args),
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

describe('AttachmentField', () => {
  const field = { key: 'diagram_field', label: 'Process Diagram', type: 'attachment', accept: 'any', maxFiles: 3 }

  beforeEach(() => {
    vi.clearAllMocks()
    listFieldAttachments.mockResolvedValue({ success: true, data: [] })
    getAttachmentSignedUrl.mockResolvedValue({ success: true, data: 'https://signed.example/file' })
  })

  it('shows a placeholder message when there is no formInstanceId yet', () => {
    render(<AttachmentField field={field} formInstanceId={null} onChange={vi.fn()} />)
    expect(screen.getByText(/setting up this field for attachments/i)).toBeInTheDocument()
  })

  it('loads and renders existing attachments for the field', async () => {
    listFieldAttachments.mockResolvedValue({ success: true, data: [mockAttachment] })
    render(<AttachmentField field={field} formInstanceId="instance-1" onChange={vi.fn()} />)

    await waitFor(() => expect(listFieldAttachments).toHaveBeenCalledWith('instance-1', 'diagram_field', 'platform'))
    expect(await screen.findByText('diagram.png')).toBeInTheDocument()
  })

  it('uploads a picked file and reports the new attachment group id via onChange', async () => {
    const onChange = vi.fn()
    uploadFieldAttachment.mockResolvedValue({ success: true, data: mockAttachment })
    render(<AttachmentField field={field} formInstanceId="instance-1" onChange={onChange} />)

    await waitFor(() => expect(listFieldAttachments).toHaveBeenCalled())

    const file = new File(['bytes'], 'diagram.png', { type: 'image/png' })
    const input = document.querySelector('input[type="file"]:not([capture])')
    fireEvent.change(input, { target: { files: [file] } })

    await waitFor(() => expect(uploadFieldAttachment).toHaveBeenCalledWith(
      expect.objectContaining({ formInstanceId: 'instance-1', fieldKey: 'diagram_field' }),
      'platform',
    ))
    await waitFor(() => expect(onChange).toHaveBeenCalledWith('diagram_field', ['group-1']))
  })

  it('rejects an oversized file client-side without calling the upload service', async () => {
    render(<AttachmentField field={field} formInstanceId="instance-1" onChange={vi.fn()} />)
    await waitFor(() => expect(listFieldAttachments).toHaveBeenCalled())

    const bigFile = new File(['x'], 'huge.png', { type: 'image/png' })
    Object.defineProperty(bigFile, 'size', { value: 11 * 1024 * 1024 })
    const input = document.querySelector('input[type="file"]:not([capture])')
    fireEvent.change(input, { target: { files: [bigFile] } })

    await waitFor(() => expect(screen.getByText(/too large/i)).toBeInTheDocument())
    expect(uploadFieldAttachment).not.toHaveBeenCalled()
  })

  it('deletes an attachment and reports the removal via onChange', async () => {
    const onChange = vi.fn()
    listFieldAttachments.mockResolvedValue({ success: true, data: [mockAttachment] })
    deleteFieldAttachment.mockResolvedValue({ success: true, data: { deleted: true } })
    vi.spyOn(window, 'confirm').mockReturnValue(true)

    render(<AttachmentField field={field} formInstanceId="instance-1" onChange={onChange} />)
    await screen.findByText('diagram.png')

    fireEvent.click(screen.getByTitle('Delete'))

    await waitFor(() => expect(deleteFieldAttachment).toHaveBeenCalledWith(
      expect.objectContaining({ attachmentGroupId: 'group-1' }),
      'platform',
    ))
    await waitFor(() => expect(onChange).toHaveBeenCalledWith('diagram_field', []))
  })

  it('hides add/replace/delete controls when disabled', async () => {
    listFieldAttachments.mockResolvedValue({ success: true, data: [mockAttachment] })
    render(<AttachmentField field={field} formInstanceId="instance-1" onChange={vi.fn()} disabled />)
    await screen.findByText('diagram.png')

    expect(screen.queryByText(/add file/i)).not.toBeInTheDocument()
    expect(screen.queryByTitle('Delete')).not.toBeInTheDocument()
  })
})
