/**
 * formFieldAttachmentService unit tests (v863 — Form Field Image & File Attachments)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  validateAttachmentFile,
  uploadFieldAttachment,
  replaceFieldAttachment,
  deleteFieldAttachment,
  MAX_ATTACHMENT_FILE_SIZE_BYTES,
} from '../formFieldAttachmentService'
import { platformDb } from '@nidus/supabase'
import { uploadFile } from '../fileUploadService'

vi.mock('@nidus/supabase', () => ({
  platformDb: { from: vi.fn(), storage: { from: vi.fn() } },
  simDb: { from: vi.fn(), storage: { from: vi.fn() } },
}))

vi.mock('../fileUploadService', () => ({
  uploadFile: vi.fn().mockResolvedValue({ path: 'mock/path', url: 'https://mock/url' }),
  formatFileSize: (bytes) => `${bytes} bytes`,
}))

function makeFile({ name = 'diagram.png', type = 'image/png', size = 1024 } = {}) {
  return { name, type, size }
}

describe('validateAttachmentFile', () => {
  it('rejects when no file is provided', () => {
    expect(validateAttachmentFile(null)).toMatch(/no file/i)
  })

  it('rejects a non-image file on an images-only field', () => {
    const file = makeFile({ type: 'application/pdf' })
    const error = validateAttachmentFile(file, { accept: 'image' })
    expect(error).toMatch(/only accepts image files/i)
  })

  it('accepts an image file on an images-only field', () => {
    const file = makeFile({ type: 'image/png' })
    expect(validateAttachmentFile(file, { accept: 'image' })).toBeNull()
  })

  it('accepts a document file on an any-file field', () => {
    const file = makeFile({ type: 'application/pdf' })
    expect(validateAttachmentFile(file, { accept: 'any' })).toBeNull()
  })

  it('rejects a disallowed mime type', () => {
    const file = makeFile({ type: 'application/x-msdownload' })
    expect(validateAttachmentFile(file, { accept: 'any' })).toMatch(/not allowed/i)
  })

  it('rejects a file over the max size', () => {
    const file = makeFile({ size: MAX_ATTACHMENT_FILE_SIZE_BYTES + 1 })
    expect(validateAttachmentFile(file, { accept: 'any' })).toMatch(/too large/i)
  })

  it('rejects when the field is already at its max file count', () => {
    const file = makeFile()
    const error = validateAttachmentFile(file, { accept: 'any', maxFiles: 2, currentCount: 2 })
    expect(error).toMatch(/maximum of 2/i)
  })
})

describe('uploadFieldAttachment', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('inserts a version-1 row with attachment_group_id equal to id, and uploads to storage first', async () => {
    const insertedRow = {
      id: 'group-1', attachment_group_id: 'group-1', version_number: 1, is_current: true, display_id: 'IMG-0001',
    }
    const single = vi.fn().mockResolvedValue({ data: insertedRow, error: null })
    const select = vi.fn().mockReturnValue({ single })
    const insert = vi.fn().mockReturnValue({ select })
    platformDb.from.mockReturnValue({ insert })

    const file = makeFile()
    const result = await uploadFieldAttachment(
      { formInstanceId: 'instance-1', fieldKey: 'diagram', file, uploadedByUserId: 'user-1' },
      'platform',
    )

    expect(uploadFile).toHaveBeenCalledTimes(1)
    expect(uploadFile.mock.invocationCallOrder[0]).toBeLessThan(insert.mock.invocationCallOrder[0])
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({
      version_number: 1,
      is_current: true,
      field_key: 'diagram',
      form_instance_id: 'instance-1',
    }))
    expect(result.success).toBe(true)
    expect(result.data.display_id).toBe('IMG-0001')
  })

  it('fails cleanly when the insert errors', async () => {
    const single = vi.fn().mockResolvedValue({ data: null, error: new Error('insert failed') })
    const select = vi.fn().mockReturnValue({ single })
    const insert = vi.fn().mockReturnValue({ select })
    platformDb.from.mockReturnValue({ insert })

    const result = await uploadFieldAttachment(
      { formInstanceId: 'instance-1', fieldKey: 'diagram', file: makeFile() },
      'platform',
    )
    expect(result.success).toBe(false)
  })
})

describe('replaceFieldAttachment', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('retires the current version and inserts version 2 with the same display_id', async () => {
    const current = {
      id: 'row-1', attachment_group_id: 'group-1', version_number: 1, is_current: true,
      form_instance_id: 'instance-1', field_key: 'diagram', display_id: 'IMG-0001', caption: 'old caption',
    }

    const currentSingle = vi.fn().mockResolvedValue({ data: current, error: null })
    const currentEq2 = vi.fn().mockReturnValue({ single: currentSingle })
    const currentEq1 = vi.fn().mockReturnValue({ eq: currentEq2 })
    const currentSelect = vi.fn().mockReturnValue({ eq: currentEq1 })

    const retireEq = vi.fn().mockResolvedValue({ error: null })
    const retireUpdate = vi.fn().mockReturnValue({ eq: retireEq })

    const insertedV2 = { ...current, id: 'row-2', version_number: 2, caption: 'old caption' }
    const insertSingle = vi.fn().mockResolvedValue({ data: insertedV2, error: null })
    const insertSelect = vi.fn().mockReturnValue({ single: insertSingle })
    const insert = vi.fn().mockReturnValue({ select: insertSelect })

    platformDb.from.mockReturnValue({ select: currentSelect, update: retireUpdate, insert })

    const result = await replaceFieldAttachment(
      { attachmentGroupId: 'group-1', file: makeFile({ name: 'diagram-v2.png' }) },
      'platform',
    )

    expect(retireUpdate).toHaveBeenCalledWith({ is_current: false })
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({
      version_number: 2,
      is_current: true,
      display_id: 'IMG-0001',
      caption: 'old caption',
    }))
    expect(result.success).toBe(true)
    expect(result.data.version_number).toBe(2)
  })
})

describe('deleteFieldAttachment', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('soft-deletes every version sharing the attachment_group_id', async () => {
    const eq = vi.fn().mockResolvedValue({ error: null })
    const update = vi.fn().mockReturnValue({ eq })
    platformDb.from.mockReturnValue({ update })

    const result = await deleteFieldAttachment({ attachmentGroupId: 'group-1', deletedByUserId: 'user-1' }, 'platform')

    expect(update).toHaveBeenCalledWith(expect.objectContaining({ is_deleted: true, is_current: false }))
    expect(eq).toHaveBeenCalledWith('attachment_group_id', 'group-1')
    expect(result.success).toBe(true)
  })
})
