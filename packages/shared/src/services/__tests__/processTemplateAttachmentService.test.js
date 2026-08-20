/**
 * processTemplateAttachmentService unit tests (v867 — Process Template Document Attachments)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  validateAttachmentFile,
  uploadDocumentAttachment,
  replaceDocumentAttachment,
  deleteDocumentAttachment,
  MAX_ATTACHMENT_FILE_SIZE_BYTES,
} from '../processTemplateAttachmentService'

function makeFile({ name = 'diagram.png', type = 'image/png', size = 1024 } = {}) {
  return { name, type, size }
}

function makeDb() {
  return { from: vi.fn(), storage: { from: vi.fn() } }
}

describe('validateAttachmentFile', () => {
  it('rejects when no file is provided', () => {
    expect(validateAttachmentFile(null)).toMatch(/no file/i)
  })

  it('accepts an allowed image file', () => {
    expect(validateAttachmentFile(makeFile({ type: 'image/png' }))).toBeNull()
  })

  it('accepts an allowed document file', () => {
    expect(validateAttachmentFile(makeFile({ type: 'application/pdf' }))).toBeNull()
  })

  it('rejects a disallowed mime type', () => {
    expect(validateAttachmentFile(makeFile({ type: 'application/x-msdownload' }))).toMatch(/not allowed/i)
  })

  it('rejects a file over the max size', () => {
    const file = makeFile({ size: MAX_ATTACHMENT_FILE_SIZE_BYTES + 1 })
    expect(validateAttachmentFile(file)).toMatch(/too large/i)
  })

  it('rejects when already at the max file count', () => {
    const error = validateAttachmentFile(makeFile(), { maxFiles: 2, currentCount: 2 })
    expect(error).toMatch(/maximum of 2/i)
  })
})

describe('uploadDocumentAttachment', () => {
  let db
  beforeEach(() => {
    db = makeDb()
  })

  it('uploads to storage before inserting a version-1 row with attachment_group_id equal to id', async () => {
    const insertedRow = {
      id: 'group-1', attachment_group_id: 'group-1', version_number: 1, is_current: true, display_id: 'DAT-0001',
    }
    const single = vi.fn().mockResolvedValue({ data: insertedRow, error: null })
    const select = vi.fn().mockReturnValue({ single })
    const insert = vi.fn().mockReturnValue({ select })
    db.from.mockReturnValue({ insert })
    const upload = vi.fn().mockResolvedValue({ error: null })
    db.storage.from.mockReturnValue({ upload })

    const file = makeFile()
    const result = await uploadDocumentAttachment(db, {
      templateNodeId: 'node-1', file, uploadedByUserId: 'user-1', mode: 'platform',
    })

    expect(db.storage.from).toHaveBeenCalledWith('process-template-attachments')
    expect(upload).toHaveBeenCalledTimes(1)
    expect(upload.mock.invocationCallOrder[0]).toBeLessThan(insert.mock.invocationCallOrder[0])
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({
      version_number: 1,
      is_current: true,
      template_node_id: 'node-1',
    }))
    expect(result.success).toBe(true)
    expect(result.data.display_id).toBe('DAT-0001')
  })

  it('fails cleanly when the storage upload errors', async () => {
    db.storage.from.mockReturnValue({ upload: vi.fn().mockResolvedValue({ error: new Error('storage down') }) })
    const result = await uploadDocumentAttachment(db, { templateNodeId: 'node-1', file: makeFile() })
    expect(result.success).toBe(false)
  })
})

describe('replaceDocumentAttachment', () => {
  let db
  beforeEach(() => {
    db = makeDb()
  })

  it('retires the current version and inserts version 2 with the same display_id', async () => {
    const current = {
      id: 'row-1', attachment_group_id: 'group-1', version_number: 1, is_current: true,
      template_node_id: 'node-1', display_id: 'DAT-0001', caption: 'old caption',
    }
    const currentSingle = vi.fn().mockResolvedValue({ data: current, error: null })
    const currentEq2 = vi.fn().mockReturnValue({ single: currentSingle })
    const currentEq1 = vi.fn().mockReturnValue({ eq: currentEq2 })
    const currentSelect = vi.fn().mockReturnValue({ eq: currentEq1 })

    const retireEq = vi.fn().mockResolvedValue({ error: null })
    const retireUpdate = vi.fn().mockReturnValue({ eq: retireEq })

    const insertedV2 = { ...current, id: 'row-2', version_number: 2 }
    const insertSingle = vi.fn().mockResolvedValue({ data: insertedV2, error: null })
    const insertSelect = vi.fn().mockReturnValue({ single: insertSingle })
    const insert = vi.fn().mockReturnValue({ select: insertSelect })

    db.from.mockReturnValue({ select: currentSelect, update: retireUpdate, insert })
    db.storage.from.mockReturnValue({ upload: vi.fn().mockResolvedValue({ error: null }) })

    const result = await replaceDocumentAttachment(db, {
      attachmentGroupId: 'group-1', file: makeFile({ name: 'diagram-v2.png' }), mode: 'platform',
    })

    expect(retireUpdate).toHaveBeenCalledWith({ is_current: false })
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({
      version_number: 2,
      is_current: true,
      display_id: 'DAT-0001',
      caption: 'old caption',
    }))
    expect(result.success).toBe(true)
    expect(result.data.version_number).toBe(2)
  })
})

describe('deleteDocumentAttachment', () => {
  it('soft-deletes every version sharing the attachment_group_id', async () => {
    const db = makeDb()
    const eq = vi.fn().mockResolvedValue({ error: null })
    const update = vi.fn().mockReturnValue({ eq })
    db.from.mockReturnValue({ update })

    const result = await deleteDocumentAttachment(db, { attachmentGroupId: 'group-1', deletedByUserId: 'user-1' })

    expect(update).toHaveBeenCalledWith(expect.objectContaining({ is_deleted: true, is_current: false }))
    expect(eq).toHaveBeenCalledWith('attachment_group_id', 'group-1')
    expect(result.success).toBe(true)
  })
})
