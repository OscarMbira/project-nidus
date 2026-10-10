import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import DefectAttachmentUploader from '../DefectAttachmentUploader'
import toast from 'react-hot-toast'

vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}))

function renderUploader(overrides = {}) {
  const getAttachments = overrides.getAttachments || vi.fn().mockResolvedValue([])
  const uploadAttachment = overrides.uploadAttachment || vi.fn().mockResolvedValue({ attachment: { id: 'att-1' } })
  const deleteAttachment = overrides.deleteAttachment || vi.fn().mockResolvedValue({})
  const utils = render(
    <DefectAttachmentUploader
      projectId="proj-1"
      defectId="def-1"
      uploadedByUserId="user-1"
      getAttachments={getAttachments}
      uploadAttachment={uploadAttachment}
      deleteAttachment={deleteAttachment}
    />,
  )
  return { ...utils, getAttachments, uploadAttachment, deleteAttachment }
}

describe('DefectAttachmentUploader — save confirmation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('confirms with a success toast once an image upload finishes', async () => {
    const { uploadAttachment } = renderUploader()
    const file = new File(['abc'], 'proof.png', { type: 'image/png' })
    const input = document.querySelector('input[type="file"]')

    fireEvent.change(input, { target: { files: [file] } })

    await waitFor(() => expect(uploadAttachment).toHaveBeenCalled())
    await waitFor(() => expect(toast.success).toHaveBeenCalled())
  })

  it('shows a toast when the upload fails', async () => {
    const uploadAttachment = vi.fn().mockRejectedValue(new Error('network error'))
    renderUploader({ uploadAttachment })
    const file = new File(['abc'], 'proof.png', { type: 'image/png' })
    const input = document.querySelector('input[type="file"]')

    fireEvent.change(input, { target: { files: [file] } })

    await waitFor(() => expect(toast.error).toHaveBeenCalled())
  })

  it('confirms with a success toast once an image is removed', async () => {
    const getAttachments = vi.fn().mockResolvedValue([
      { id: 'att-1', file_name: 'proof.png', is_screenshot: true, preview_url: 'https://files.example/proof.png' },
    ])
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
    const { deleteAttachment } = renderUploader({ getAttachments })
    const removeBtn = await screen.findByRole('button', { name: 'Remove image' })

    fireEvent.click(removeBtn)

    await waitFor(() => expect(deleteAttachment).toHaveBeenCalledWith('att-1'))
    await waitFor(() => expect(toast.success).toHaveBeenCalled())
    confirmSpy.mockRestore()
  })

  it('shows a toast when removing an image fails', async () => {
    const getAttachments = vi.fn().mockResolvedValue([
      { id: 'att-1', file_name: 'proof.png', is_screenshot: true, preview_url: 'https://files.example/proof.png' },
    ])
    const deleteAttachment = vi.fn().mockRejectedValue(new Error('network error'))
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
    renderUploader({ getAttachments, deleteAttachment })
    const removeBtn = await screen.findByRole('button', { name: 'Remove image' })

    fireEvent.click(removeBtn)

    await waitFor(() => expect(toast.error).toHaveBeenCalled())
    confirmSpy.mockRestore()
  })
})

describe('DefectAttachmentUploader — performance (rule 66: no redundant round trips)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('uploads several files in parallel instead of one at a time', async () => {
    let resolveFirst
    let resolveSecond
    const uploadAttachment = vi
      .fn()
      .mockImplementationOnce(() => new Promise((r) => { resolveFirst = r }))
      .mockImplementationOnce(() => new Promise((r) => { resolveSecond = r }))
    renderUploader({ uploadAttachment })
    const fileA = new File(['a'], 'a.png', { type: 'image/png' })
    const fileB = new File(['b'], 'b.png', { type: 'image/png' })
    const input = document.querySelector('input[type="file"]')

    fireEvent.change(input, { target: { files: [fileA, fileB] } })

    // Both uploads must have started before either has resolved — a sequential
    // for-await loop would only have started the first.
    await waitFor(() => expect(uploadAttachment).toHaveBeenCalledTimes(2))

    resolveFirst({ attachment: { id: 'att-a', file_name: 'a.png', is_screenshot: true } })
    resolveSecond({ attachment: { id: 'att-b', file_name: 'b.png', is_screenshot: true } })
    await waitFor(() => expect(toast.success).toHaveBeenCalled())
  })

  it('does not re-fetch the whole list after a successful upload — it merges the new file in locally', async () => {
    const getAttachments = vi.fn().mockResolvedValue([])
    const uploadAttachment = vi.fn().mockResolvedValue({
      attachment: { id: 'att-new', file_name: 'new-proof.png', is_screenshot: true },
    })
    renderUploader({ getAttachments, uploadAttachment })
    await waitFor(() => expect(getAttachments).toHaveBeenCalledTimes(1))
    const file = new File(['abc'], 'new-proof.png', { type: 'image/png' })
    const input = document.querySelector('input[type="file"]')

    fireEvent.change(input, { target: { files: [file] } })

    await screen.findByText('new-proof.png')
    expect(getAttachments).toHaveBeenCalledTimes(1)
  })

  it('does not re-fetch the whole list after removing a file — it drops it locally', async () => {
    const getAttachments = vi.fn().mockResolvedValue([
      { id: 'att-1', file_name: 'proof.png', is_screenshot: true, preview_url: 'https://files.example/proof.png' },
    ])
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
    renderUploader({ getAttachments })
    await screen.findByText('proof.png')
    expect(getAttachments).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole('button', { name: 'Remove image' }))

    await waitFor(() => expect(screen.queryByText('proof.png')).toBeNull())
    expect(getAttachments).toHaveBeenCalledTimes(1)
    confirmSpy.mockRestore()
  })
})
