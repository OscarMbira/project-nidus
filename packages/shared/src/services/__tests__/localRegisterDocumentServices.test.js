import { describe, it, expect, vi } from 'vitest'

vi.mock('@nidus/supabase', () => ({ platformDb: { from: vi.fn() } }))

const {
  registerDocumentType,
  isRegisterDocumentType,
  isRecordLockedForSignoff,
  selectableRecordStatuses,
  startRecordSignoff,
  restartRecordSignoff,
} = await import('../localRegisterSignoffService')
const { defaultAnnexureTitle, annexureLetter, localRegisterAttachmentPanelService } = await import('../localRegisterAttachmentService')

const WORKFLOW = [
  { key: 'draft', label: 'Draft' },
  { key: 'in_review', label: 'In Review' },
  { key: 'approved', label: 'Approved' },
  { key: 'superseded', label: 'Superseded' },
]

describe('localRegisterSignoffService helpers', () => {
  it('builds and recognises register document types', () => {
    expect(registerDocumentType('fin_migration_strategy')).toBe('local_register:fin_migration_strategy')
    expect(isRegisterDocumentType('local_register:x')).toBe(true)
    expect(isRegisterDocumentType('project_charters')).toBe(false)
  })

  it('treats in-progress and complete records as locked', () => {
    expect(isRecordLockedForSignoff({ signoff_state: 'none' })).toBe(false)
    expect(isRecordLockedForSignoff({ signoff_state: 'in_progress' })).toBe(true)
    expect(isRecordLockedForSignoff({ signoff_state: 'complete' })).toBe(true)
    expect(isRecordLockedForSignoff(null)).toBe(false)
  })

  it('leaves the sign-off statuses out of the form on document registers only', () => {
    expect(selectableRecordStatuses({ is_document: true, status_workflow: WORKFLOW }, 'draft').map((s) => s.key)).toEqual(['draft', 'superseded'])
    expect(selectableRecordStatuses({ is_document: true, status_workflow: WORKFLOW }, 'approved').map((s) => s.key)).toEqual(['draft', 'approved', 'superseded'])
    expect(selectableRecordStatuses({ is_document: false, status_workflow: WORKFLOW }, 'draft')).toHaveLength(4)
  })
})

describe('sign-off actions call the database functions', () => {
  it('refuses to start while a mandatory role has no person', async () => {
    const db = { rpc: vi.fn() }
    const result = await startRecordSignoff(db, { recordId: 'r1', slots: [{ role_label: 'Sponsor', is_mandatory: true }] })
    expect(result.success).toBe(false)
    expect(result.message).toMatch(/Choose a person for "Sponsor"/)
    expect(db.rpc).not.toHaveBeenCalled()
  })

  it('starts with the ordered slots', async () => {
    const db = { rpc: vi.fn(async () => ({ data: [{ slot_order: 1 }], error: null })) }
    const result = await startRecordSignoff(db, {
      recordId: 'r1',
      slots: [{ role_label: 'PM', is_mandatory: true, assigned_user_id: 'u1' }, { role_label: 'Observer', is_mandatory: false, assigned_user_id: '' }],
    })
    expect(result.success).toBe(true)
    expect(db.rpc).toHaveBeenCalledWith('local_register_signoff_start', {
      p_record_id: 'r1',
      p_slots: [
        { role_label: 'PM', is_mandatory: true, assigned_user_id: 'u1' },
        { role_label: 'Observer', is_mandatory: false, assigned_user_id: null },
      ],
    })
  })

  it('needs a reason to restart and passes database errors back', async () => {
    const db = { rpc: vi.fn(async () => ({ data: null, error: { message: 'You do not have access to this record.' } })) }
    expect((await restartRecordSignoff(db, { recordId: 'r1', reason: ' ' })).success).toBe(false)
    const result = await restartRecordSignoff(db, { recordId: 'r1', reason: 'Changes' })
    expect(result).toMatchObject({ success: false, message: 'You do not have access to this record.' })
  })
})

describe('localRegisterAttachmentService helpers', () => {
  it('defaults the annexure title to the file name and letters annexures', () => {
    expect(defaultAnnexureTitle('Process flow.v2.png')).toBe('Process flow.v2')
    expect(defaultAnnexureTitle('')).toBe('Attachment')
    expect([annexureLetter(0), annexureLetter(1), annexureLetter(26)]).toEqual(['A', 'B', 'AA'])
  })

  it('panel adapter maps the record id and the annexure title to the panel shape', async () => {
    const rows = [{ id: 'a1', annexure_title: 'Process flow' }]
    const chain = { select: () => chain, eq: () => chain, order: async () => ({ data: rows, error: null }) }
    const db = { from: vi.fn(() => chain) }
    const result = await localRegisterAttachmentPanelService.listDocumentAttachments(db, 'rec-1')
    expect(db.from).toHaveBeenCalledWith('local_register_record_attachments')
    expect(result.data[0]).toMatchObject({ caption: 'Process flow' })
  })
})

describe('attachment links are fetched in one batch and cached (v1336)', () => {
  it('signs every thumbnail with one request, then reads from the cache', async () => {
    const { primeRecordAttachmentUrls, getRecordAttachmentSignedUrl } = await import('../localRegisterAttachmentService')
    const { clearSignedImageCache } = await import('../signedImageCache')
    clearSignedImageCache()
    globalThis.fetch = vi.fn(async () => ({ ok: false }))
    const createSignedUrls = vi.fn(async (paths) => ({ data: paths.map((path) => ({ path, signedUrl: `https://x/${path}?t=1`, error: null })), error: null }))
    const createSignedUrl = vi.fn()
    const db = { storage: { from: () => ({ createSignedUrls, createSignedUrl }) } }
    const rows = [{ storage_path: 'platform/r/a.png' }, { storage_path: 'platform/r/b.png' }]

    const pending = primeRecordAttachmentUrls(db, rows)
    const [a, b] = await Promise.all(rows.map((r) => getRecordAttachmentSignedUrl(db, r.storage_path)))
    await pending
    expect(createSignedUrls).toHaveBeenCalledTimes(1)
    expect(createSignedUrl).not.toHaveBeenCalled()
    expect([a.data, b.data]).toEqual(['https://x/platform/r/a.png?t=1', 'https://x/platform/r/b.png?t=1'])

    await primeRecordAttachmentUrls(db, rows)
    expect(createSignedUrls).toHaveBeenCalledTimes(1)
  })
})

describe('New from template (v1336)', () => {
  it('creates the record through the database, then copies each annexure in order', async () => {
    const { createRecordFromTemplate } = await import('../localRegisterTemplateService')
    const uploads = []
    const inserts = []
    const db = {
      rpc: vi.fn(async () => ({
        data: {
          record_id: 'rec-9',
          children: 2,
          attachments: [
            { annexure_title: 'Timeline', storage_bucket: 'local-register-templates', storage_path: 'platform/t1/a.png', file_name: 'a.png', mime_type: 'image/png', file_size: 3 },
            { annexure_title: 'RACI', storage_bucket: 'local-register-templates', storage_path: 'platform/t1/b.xlsx', file_name: 'b.xlsx', mime_type: 'application/vnd.ms-excel', file_size: 3 },
          ],
        },
        error: null,
      })),
      storage: {
        from: (bucket) => ({
          download: async (path) => ({ data: new Blob(['abc']), error: null, path }),
          upload: async (path) => { uploads.push(`${bucket}:${path.split('/')[1]}`); return { error: null } },
        }),
      },
      from: () => ({
        insert: (row) => { inserts.push(row.annexure_title); return { select: () => ({ single: async () => ({ data: row, error: null }) }) } },
      }),
    }
    const result = await createRecordFromTemplate(db, { templateId: 't1', projectId: 'p1', title: 'DMSD', mode: 'platform' })
    expect(db.rpc).toHaveBeenCalledWith('local_register_template_create_record', { p_template_id: 't1', p_project_id: 'p1', p_title: 'DMSD', p_account_id: null })
    expect(result).toEqual({ success: true, data: { recordId: 'rec-9', children: 2, copied: 2, failedFiles: [] } })
    expect(uploads).toEqual(['local-register-attachments:rec-9', 'local-register-attachments:rec-9'])
    expect(inserts).toEqual(['Timeline', 'RACI'])
  })

  it('reports an existing strategy in the project instead of failing silently', async () => {
    const { createRecordFromTemplate } = await import('../localRegisterTemplateService')
    const db = { rpc: vi.fn(async () => ({ data: null, error: { message: 'This project already has a Data Migration Strategy — open it instead.', details: 'rec-1' } })) }
    const result = await createRecordFromTemplate(db, { templateId: 't1', projectId: 'p1' })
    expect(result).toMatchObject({ success: false, code: 'exists', existingRecordId: 'rec-1' })
  })
})
