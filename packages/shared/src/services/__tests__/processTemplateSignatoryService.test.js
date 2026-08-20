/**
 * processTemplateSignatoryService unit tests (v868 — Process Template Document Signatories)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// assigned_user_id always FKs to public.users(id), even for sim.* signatory rows (no
// sim.users table exists) — buildUserLabelLookup always queries platformDb, never the
// schema-scoped `db` param, so it must be mocked separately from the `db` test double.
const { mockPlatformDb } = vi.hoisted(() => ({ mockPlatformDb: { from: vi.fn() } }))
vi.mock('@nidus/supabase', () => ({ platformDb: mockPlatformDb }))
vi.mock('../../utils/accountResolution', () => ({
  getCurrentUserInternalUserId: vi.fn().mockResolvedValue('user-1'),
}))

import {
  validateSignatureFile,
  saveSignatoryRequirements,
  saveSignatoryRequirementsForTables,
  getSignatoryRequirements,
  initializeSigningRound,
  resyncPendingSigningRoundOrder,
  deleteSavedSignature,
  declineSlot,
  restartSigningChain,
  isDocumentFullySigned,
  signSlot,
  resolveDocumentSignaturesForExport,
  normalizeRequirementSlots,
  areMandatorySlotsSigned,
  earlierMandatorySlotsSigned,
  slotIsMandatory,
  canLockRemainingOptionalSlots,
  lockRemainingOptionalSignatories,
  getDeclinedSignatoryCount,
  pickEffectiveSignatoryLevels,
  MAX_SIGNATURE_FILE_SIZE_BYTES,
} from '../processTemplateSignatoryService'

function makeFile({ name = 'signature.png', type = 'image/png', size = 1024 } = {}) {
  return { name, type, size }
}

/** A Supabase-query-builder-shaped stub: every method returns itself, and it's
 * thenable so `await` resolves at whichever point the code stops chaining. */
function chainable(result) {
  const obj = {}
  const methods = ['select', 'eq', 'is', 'in', 'order', 'limit', 'update', 'insert', 'upsert', 'delete', 'single', 'maybeSingle']
  methods.forEach((m) => { obj[m] = vi.fn(() => obj) })
  obj.then = (resolve) => Promise.resolve(result).then(resolve)
  return obj
}

function makeDb() {
  return { from: vi.fn(), storage: { from: vi.fn() }, auth: { getUser: vi.fn() } }
}

describe('validateSignatureFile', () => {
  it('rejects when no file is provided', () => {
    expect(validateSignatureFile(null)).toMatch(/no file/i)
  })

  it('accepts an allowed image file', () => {
    expect(validateSignatureFile(makeFile({ type: 'image/png' }))).toBeNull()
  })

  it('rejects a disallowed mime type', () => {
    expect(validateSignatureFile(makeFile({ type: 'application/pdf' }))).toMatch(/not allowed/i)
  })

  it('rejects a file over the max size', () => {
    const file = makeFile({ size: MAX_SIGNATURE_FILE_SIZE_BYTES + 1 })
    expect(validateSignatureFile(file)).toMatch(/too large/i)
  })
})

describe('pickEffectiveSignatoryLevels', () => {
  it('uses project custom before org', () => {
    const result = pickEffectiveSignatoryLevels([
      { scopeType: 'project', scopeId: 'p1', mode: 'custom', slots: [{ role_label: 'PM' }] },
      { scopeType: 'organisation', slots: [{ role_label: 'Org' }] },
    ])
    expect(result.source.mode).toBe('custom')
    expect(result.slots[0].role_label).toBe('PM')
  })

  it('honours none at project and skips parents', () => {
    const result = pickEffectiveSignatoryLevels([
      { scopeType: 'project', scopeId: 'p1', mode: 'none', slots: [] },
      { scopeType: 'organisation', slots: [{ role_label: 'Org' }] },
    ])
    expect(result.source.mode).toBe('none')
    expect(result.slots).toEqual([])
  })

  it('inherits to organisation when no policies', () => {
    const result = pickEffectiveSignatoryLevels([
      { scopeType: 'project', scopeId: 'p1', mode: null, slots: [] },
      { scopeType: 'organisation', slots: [{ role_label: 'Org' }] },
    ])
    expect(result.source.scopeType).toBe('organisation')
    expect(result.slots[0].role_label).toBe('Org')
  })
})

describe('getSignatoryRequirements', () => {
  it('returns active, ordered requirement slots', async () => {
    const db = makeDb()
    const rows = [
      { slot_order: 1, role_label: 'Project Manager' },
      { slot_order: 2, role_label: 'Sponsor' },
    ]
    db.from.mockReturnValue(chainable({ data: rows, error: null }))

    const result = await getSignatoryRequirements(db, 'account-1', 'project_charters')

    expect(db.from).toHaveBeenCalledWith('process_template_signatory_requirements')
    expect(result.success).toBe(true)
    expect(result.data).toEqual(rows)
  })
})

describe('initializeSigningRound', () => {
  it('recovers from uq_ptds_slot when a concurrent init already inserted rows', async () => {
    const db = makeDb()
    const emptyRound = chainable({ data: [], error: null })
    const reqs = chainable({
      data: [
        { slot_order: 1, role_label: 'Sponsor' },
        { slot_order: 2, role_label: 'Project Manager' },
      ],
      error: null,
    })
    const insertFail = chainable({
      data: null,
      error: { code: '23505', message: 'duplicate key value violates unique constraint "uq_ptds_slot"' },
    })
    const existingRound = chainable({ data: [{ signing_round: 1 }], error: null })
    const existingRows = [
      { slot_order: 1, role_label: 'Sponsor', status: 'pending', signing_round: 1 },
      { slot_order: 2, role_label: 'Project Manager', status: 'pending', signing_round: 1 },
    ]
    const existingSelect = chainable({ data: existingRows, error: null })

    db.from
      .mockReturnValueOnce(emptyRound) // getCurrentRoundNumber → no round yet
      .mockReturnValueOnce(reqs) // getSignatoryRequirements
      .mockReturnValueOnce(insertFail) // insert races and loses
      .mockReturnValueOnce(existingRound) // re-fetch round
      .mockReturnValueOnce(existingSelect) // re-fetch slots

    const result = await initializeSigningRound(db, {
      templateNodeId: 'node-1',
      accountId: 'account-1',
      documentTable: 'project_charters',
    })

    expect(result.success).toBe(true)
    expect(result.data).toEqual(existingRows)
  })
})

describe('resyncPendingSigningRoundOrder', () => {
  it('re-orders an all-pending round to match a re-ordered config, preserving assignments', async () => {
    const db = makeDb()
    const currentSlots = [
      { id: 'row-sponsor', slot_order: 1, role_label: 'Sponsor', status: 'pending', assigned_user_id: 'user-2' },
      { id: 'row-pm', slot_order: 2, role_label: 'Project Manager', status: 'pending', assigned_user_id: 'user-1' },
    ]
    const roundNumber = chainable({ data: [{ signing_round: 1 }], error: null })
    const currentRows = chainable({ data: currentSlots, error: null })
    const reqs = chainable({
      data: [
        { role_label: 'Project Manager', is_mandatory: true },
        { role_label: 'Sponsor', is_mandatory: true },
      ],
      error: null,
    })
    const stagedSponsor = chainable({ data: { id: 'row-sponsor' }, error: null })
    const stagedPm = chainable({ data: { id: 'row-pm' }, error: null })
    const updatedPm = chainable({ data: { ...currentSlots[1], slot_order: 1 }, error: null })
    const updatedSponsor = chainable({ data: { ...currentSlots[0], slot_order: 2 }, error: null })

    db.from
      .mockReturnValueOnce(roundNumber) // getCurrentRoundNumber
      .mockReturnValueOnce(currentRows) // getDocumentSignatories select
      .mockReturnValueOnce(reqs) // resolveEffectiveSignatoryRequirements → org fallback
      .mockReturnValueOnce(stagedSponsor) // stage row-sponsor onto a temp slot_order
      .mockReturnValueOnce(stagedPm) // stage row-pm onto a temp slot_order
      .mockReturnValueOnce(updatedPm) // update Project Manager row to its final position
      .mockReturnValueOnce(updatedSponsor) // update Sponsor row to its final position

    const result = await resyncPendingSigningRoundOrder(db, {
      templateNodeId: 'node-1',
      accountId: 'account-1',
      documentTable: 'project_charters',
    })

    expect(result.success).toBe(true)
    expect(result.data.map((s) => [s.slot_order, s.role_label, s.assigned_user_id])).toEqual([
      [1, 'Project Manager', 'user-1'],
      [2, 'Sponsor', 'user-2'],
    ])
    // Regression guard: staging must land on a large positive value, never a value the
    // chk_ptds_slot_order (>= 1) / uq_ptds_slot constraints could reject or collide with.
    const [[stagePayload1], [stagePayload2]] = [stagedSponsor.update.mock.calls, stagedPm.update.mock.calls]
    expect(stagePayload1[0].slot_order).toBeGreaterThan(currentSlots.length)
    expect(stagePayload2[0].slot_order).toBeGreaterThan(currentSlots.length)
  })

  it('leaves a round untouched once any slot has been signed', async () => {
    const db = makeDb()
    const currentSlots = [
      { id: 'row-sponsor', slot_order: 1, role_label: 'Sponsor', status: 'signed', assigned_user_id: 'user-2' },
      { id: 'row-pm', slot_order: 2, role_label: 'Project Manager', status: 'pending', assigned_user_id: 'user-1' },
    ]
    const roundNumber = chainable({ data: [{ signing_round: 1 }], error: null })
    const currentRows = chainable({ data: currentSlots, error: null })

    db.from
      .mockReturnValueOnce(roundNumber)
      .mockReturnValueOnce(currentRows)

    const result = await resyncPendingSigningRoundOrder(db, {
      templateNodeId: 'node-1',
      accountId: 'account-1',
      documentTable: 'project_charters',
    })

    expect(result.success).toBe(true)
    expect(result.data).toEqual(currentSlots)
    expect(db.from).toHaveBeenCalledTimes(2) // no requirements lookup, no update
  })

  it('recovers instead of erroring when a concurrent resync wins the race on uq_ptds_slot', async () => {
    // Two overlapping calls (e.g. React StrictMode's double-mount) can both decide a
    // reorder is needed and race on the same unique constraint while staging. The loser
    // should re-fetch and succeed with whatever the winner already wrote, not surface
    // the raw Postgres error to the user.
    const db = makeDb()
    const currentSlots = [
      { id: 'row-sponsor', slot_order: 1, role_label: 'Sponsor', status: 'pending', assigned_user_id: 'user-2' },
      { id: 'row-pm', slot_order: 2, role_label: 'Project Manager', status: 'pending', assigned_user_id: 'user-1' },
    ]
    const winnerResult = [
      { id: 'row-pm', slot_order: 1, role_label: 'Project Manager', status: 'pending', assigned_user_id: 'user-1' },
      { id: 'row-sponsor', slot_order: 2, role_label: 'Sponsor', status: 'pending', assigned_user_id: 'user-2' },
    ]
    const roundNumber = chainable({ data: [{ signing_round: 1 }], error: null })
    const currentRows = chainable({ data: currentSlots, error: null })
    const reqs = chainable({
      data: [
        { role_label: 'Project Manager', is_mandatory: true },
        { role_label: 'Sponsor', is_mandatory: true },
      ],
      error: null,
    })
    const dupKeyError = { code: '23505', message: 'duplicate key value violates unique constraint "uq_ptds_slot"' }
    const stageFails = chainable({ data: null, error: dupKeyError })
    const stageOk = chainable({ data: { id: 'row-pm' }, error: null })
    const recheckRoundNumber = chainable({ data: [{ signing_round: 1 }], error: null })
    const recheckRows = chainable({ data: winnerResult, error: null })

    db.from
      .mockReturnValueOnce(roundNumber) // getCurrentRoundNumber
      .mockReturnValueOnce(currentRows) // getDocumentSignatories select
      .mockReturnValueOnce(reqs) // resolveEffectiveSignatoryRequirements → org fallback
      .mockReturnValueOnce(stageOk) // stage row-sponsor succeeds
      .mockReturnValueOnce(stageFails) // stage row-pm loses the race
      .mockReturnValueOnce(recheckRoundNumber) // recheckAfterRaceOrThrow → getCurrentRoundNumber
      .mockReturnValueOnce(recheckRows) // recheckAfterRaceOrThrow → getDocumentSignatories select

    const result = await resyncPendingSigningRoundOrder(db, {
      templateNodeId: 'node-1',
      accountId: 'account-1',
      documentTable: 'project_charters',
    })

    expect(result.success).toBe(true)
    expect(result.data).toEqual(winnerResult)
  })
})

describe('deleteSavedSignature', () => {
  it('removes the storage object and the user_signature_images row', async () => {
    const db = makeDb()
    db.auth.getUser.mockResolvedValue({ data: { user: { id: 'auth-1' } }, error: null })
    const removeMock = vi.fn().mockResolvedValue({ error: null })
    db.storage.from.mockReturnValue({ remove: removeMock })
    db.from
      .mockReturnValueOnce(chainable({ // getSavedSignature
        data: { storage_bucket: 'user-signatures', storage_path: 'auth-1/signature.png' },
        error: null,
      }))
      .mockReturnValueOnce(chainable({ data: null, error: null })) // delete

    const result = await deleteSavedSignature(db)

    expect(result.success).toBe(true)
    expect(db.storage.from).toHaveBeenCalledWith('user-signatures')
    expect(removeMock).toHaveBeenCalledWith(['auth-1/signature.png'])
  })

  it('is a no-op when no signature is currently saved', async () => {
    const db = makeDb()
    db.auth.getUser.mockResolvedValue({ data: { user: { id: 'auth-1' } }, error: null })
    db.from.mockReturnValueOnce(chainable({ data: null, error: null })) // getSavedSignature

    const result = await deleteSavedSignature(db)

    expect(result.success).toBe(true)
    expect(db.storage.from).not.toHaveBeenCalled()
  })
})

describe('resolveDocumentSignaturesForExport', () => {
  beforeEach(() => {
    mockPlatformDb.from.mockReset()
  })

  it('includes mime_type/file_name/caption on a signed asset so export renderers embed it as an image', async () => {
    // Regression test: the Word/PPT/PDF renderers decide "embed as image" purely from
    // asset.mime_type (see apps/platform/src/utils/exportUtils.js isEmbeddableImageAsset).
    // Without mime_type on the returned asset, a real signed signature silently rendered
    // as a blank "Attachment" caption instead of the actual image.
    const db = makeDb()
    const roundNumber = chainable({ data: [{ signing_round: 1 }], error: null })
    const signedRow = {
      id: 'row-1',
      slot_order: 1,
      role_label: 'Project Manager',
      status: 'signed',
      is_mandatory: true,
      assigned_user_id: 'user-1',
      storage_path: 'platform/node-1/1/1/signature.png',
      file_name: 'signature.png',
      mime_type: 'image/png',
      display_id: 'PPTD-001',
      signed_at: '2026-08-16T10:26:03Z',
    }
    const rows = chainable({ data: [signedRow], error: null })
    const users = chainable({ data: [{ id: 'user-1', full_name: 'Jane Doe', email: 'jane@example.com' }], error: null })
    db.from
      .mockReturnValueOnce(roundNumber) // getCurrentRoundNumber
      .mockReturnValueOnce(rows) // getDocumentSignatories select
    mockPlatformDb.from.mockReturnValueOnce(users) // buildUserLabelLookup: always platformDb, even when db=simDb
    db.storage.from.mockReturnValue({
      createSignedUrl: vi.fn().mockResolvedValue({ data: { signedUrl: 'https://signed.example/sig.png' }, error: null }),
    })

    const result = await resolveDocumentSignaturesForExport(db, 'node-1')

    expect(result.success).toBe(true)
    expect(result.data.assets).toHaveLength(1)
    const asset = result.data.assets[0]
    expect(asset.mime_type).toBe('image/png')
    expect(asset.file_name).toBe('signature.png')
    expect(asset.url).toBe('https://signed.example/sig.png')
    // Regression: the caption/signer_label must show the resolved display name, not the
    // raw assigned_user_id UUID, since that's what the export/preview surfaces to users.
    expect(asset.signer_label).toBe('Jane Doe')
    expect(asset.caption).toContain('Jane Doe')
    expect(asset.caption).not.toContain('user-1')
    expect(asset.caption).toContain('Project Manager')
    expect(asset.caption).toContain('signed')
  })

  it('falls back to a role-based file_name when the row has none', async () => {
    const db = makeDb()
    const roundNumber = chainable({ data: [{ signing_round: 1 }], error: null })
    const signedRow = {
      id: 'row-1',
      slot_order: 1,
      role_label: 'Sponsor',
      status: 'signed',
      is_mandatory: true,
      storage_path: 'platform/node-1/1/1/signature.png',
      file_name: null,
      mime_type: 'image/jpeg',
    }
    const rows = chainable({ data: [signedRow], error: null })
    db.from.mockReturnValueOnce(roundNumber).mockReturnValueOnce(rows)
    db.storage.from.mockReturnValue({
      createSignedUrl: vi.fn().mockResolvedValue({ data: { signedUrl: 'https://signed.example/sig.jpg' }, error: null }),
    })

    const result = await resolveDocumentSignaturesForExport(db, 'node-1')

    expect(result.data.assets[0].file_name).toBe('Sponsor signature')
  })

  it('describes pending, declined, and optional-unsigned slots as text only (no asset)', async () => {
    const db = makeDb()
    const roundNumber = chainable({ data: [{ signing_round: 1 }], error: null })
    const rowsData = [
      { id: 'r1', slot_order: 1, role_label: 'PMO Admin', status: 'pending', is_mandatory: true },
      { id: 'r2', slot_order: 2, role_label: 'Sponsor', status: 'declined', decline_reason: 'Out of office', is_mandatory: true },
      { id: 'r3', slot_order: 3, role_label: 'Portfolio Manager', status: 'pending', is_mandatory: false },
    ]
    const rows = chainable({ data: rowsData, error: null })
    db.from.mockReturnValueOnce(roundNumber).mockReturnValueOnce(rows)

    const result = await resolveDocumentSignaturesForExport(db, 'node-1')

    expect(result.data.assets).toHaveLength(0)
    expect(result.data.textValues).toEqual([
      'PMO Admin: Pending',
      'Sponsor: Declined — Out of office',
      'Portfolio Manager: Optional — not signed',
    ])
  })
})

describe('normalizeRequirementSlots / mandatory helpers', () => {
  it('defaults string slots to mandatory', () => {
    expect(normalizeRequirementSlots(['PM', '  ', { role_label: 'Sponsor', is_mandatory: false }])).toEqual([
      { role_label: 'PM', is_mandatory: true },
      { role_label: 'Sponsor', is_mandatory: false },
    ])
  })

  it('treats missing is_mandatory as mandatory', () => {
    expect(slotIsMandatory({ role_label: 'PM' })).toBe(true)
    expect(slotIsMandatory({ role_label: 'PMO', is_mandatory: false })).toBe(false)
  })

  it('areMandatorySlotsSigned ignores unsigned optional slots', () => {
    expect(areMandatorySlotsSigned([
      { status: 'signed', is_mandatory: true },
      { status: 'pending', is_mandatory: false },
    ])).toBe(true)
    expect(areMandatorySlotsSigned([
      { status: 'pending', is_mandatory: true },
      { status: 'signed', is_mandatory: false },
    ])).toBe(false)
  })

  it('earlierMandatorySlotsSigned skips earlier optional gaps', () => {
    const slots = [
      { slot_order: 1, status: 'signed', is_mandatory: true },
      { slot_order: 2, status: 'pending', is_mandatory: false },
      { slot_order: 3, status: 'pending', is_mandatory: true },
    ]
    expect(earlierMandatorySlotsSigned(slots, 3)).toBe(true)
    expect(earlierMandatorySlotsSigned([
      { slot_order: 1, status: 'pending', is_mandatory: true },
      { slot_order: 2, status: 'pending', is_mandatory: true },
    ], 2)).toBe(false)
  })
})

describe('saveSignatoryRequirements', () => {
  it('retires existing rows then inserts the new ordered list', async () => {
    const db = makeDb()
    const retireChain = chainable({ error: null })
    const insertedRows = [
      { slot_order: 1, role_label: 'Project Manager', is_mandatory: true },
      { slot_order: 2, role_label: 'Sponsor', is_mandatory: true },
    ]
    const insertChain = chainable({ data: insertedRows, error: null })
    db.from
      .mockReturnValueOnce(retireChain) // retire
      .mockReturnValueOnce(insertChain) // insert

    const result = await saveSignatoryRequirements(db, {
      accountId: 'account-1',
      documentTable: 'project_charters',
      slots: ['Project Manager', 'Sponsor'],
      userId: 'user-1',
    })

    expect(retireChain.update).toHaveBeenCalledWith(expect.objectContaining({ is_deleted: true }))
    expect(insertChain.insert).toHaveBeenCalledWith([
      expect.objectContaining({ slot_order: 1, role_label: 'Project Manager', is_mandatory: true, account_id: 'account-1', document_table: 'project_charters' }),
      expect.objectContaining({ slot_order: 2, role_label: 'Sponsor', is_mandatory: true }),
    ])
    expect(result.success).toBe(true)
    expect(result.data).toHaveLength(2)
  })

  it('persists is_mandatory false for optional slots', async () => {
    const db = makeDb()
    const retireChain = chainable({ error: null })
    const insertChain = chainable({
      data: [
        { slot_order: 1, role_label: 'Sponsor', is_mandatory: true },
        { slot_order: 2, role_label: 'PMO Admin', is_mandatory: false },
      ],
      error: null,
    })
    db.from.mockReturnValueOnce(retireChain).mockReturnValueOnce(insertChain)

    const result = await saveSignatoryRequirements(db, {
      accountId: 'account-1',
      documentTable: 'project_charters',
      slots: [
        { role_label: 'Sponsor', is_mandatory: true },
        { role_label: 'PMO Admin', is_mandatory: false },
      ],
    })

    expect(result.success).toBe(true)
    expect(insertChain.insert).toHaveBeenCalledWith([
      expect.objectContaining({ role_label: 'Sponsor', is_mandatory: true }),
      expect.objectContaining({ role_label: 'PMO Admin', is_mandatory: false }),
    ])
  })

  it('rejects an all-optional slot list', async () => {
    const db = makeDb()
    const result = await saveSignatoryRequirements(db, {
      accountId: 'account-1',
      documentTable: 'project_charters',
      slots: [
        { role_label: 'PMO Admin', is_mandatory: false },
        { role_label: 'Portfolio Manager', is_mandatory: false },
      ],
    })
    expect(result.success).toBe(false)
    expect(result.message).toMatch(/at least one.*mandatory/i)
    expect(db.from).not.toHaveBeenCalled()
  })

  it('drops blank slot labels before saving', async () => {
    const db = makeDb()
    const retireChain = chainable({ error: null })
    const insertChain = chainable({ data: [{ slot_order: 1, role_label: 'Project Manager', is_mandatory: true }], error: null })
    db.from.mockReturnValueOnce(retireChain).mockReturnValueOnce(insertChain)

    await saveSignatoryRequirements(db, {
      accountId: 'account-1', documentTable: 'project_charters', slots: ['Project Manager', '   ', ''],
    })

    expect(insertChain.insert).toHaveBeenCalledWith([
      expect.objectContaining({ slot_order: 1, role_label: 'Project Manager', is_mandatory: true }),
    ])
  })
})

describe('saveSignatoryRequirementsForTables', () => {
  it('overwrites each selected document type with the same slots', async () => {
    const db = makeDb()
    const retire1 = chainable({ error: null })
    const insert1 = chainable({ data: [{ slot_order: 1, role_label: 'Sponsor' }], error: null })
    const retire2 = chainable({ error: null })
    const insert2 = chainable({ data: [{ slot_order: 1, role_label: 'Sponsor' }], error: null })
    db.from
      .mockReturnValueOnce(retire1)
      .mockReturnValueOnce(insert1)
      .mockReturnValueOnce(retire2)
      .mockReturnValueOnce(insert2)

    const result = await saveSignatoryRequirementsForTables(db, {
      accountId: 'account-1',
      documentTables: ['project_charters', 'project_management_plans'],
      slots: ['Sponsor'],
      userId: 'user-1',
    })

    expect(result.success).toBe(true)
    expect(result.data).toHaveLength(2)
    expect(insert1.insert).toHaveBeenCalledWith([
      expect.objectContaining({ document_table: 'project_charters', role_label: 'Sponsor' }),
    ])
    expect(insert2.insert).toHaveBeenCalledWith([
      expect.objectContaining({ document_table: 'project_management_plans', role_label: 'Sponsor' }),
    ])
  })

  it('rejects an empty document-type list', async () => {
    const result = await saveSignatoryRequirementsForTables(makeDb(), {
      accountId: 'account-1',
      documentTables: [],
      slots: ['Sponsor'],
    })
    expect(result.success).toBe(false)
  })
})

describe('signSlot', () => {
  it('uploads and updates without a round lookup when file and signingRound are provided', async () => {
    const db = makeDb()
    const upload = vi.fn().mockResolvedValue({ error: null })
    db.storage.from.mockReturnValue({ upload })
    const updateChain = chainable({ data: { id: 'row-1', status: 'signed' }, error: null })
    db.from.mockReturnValue(updateChain)

    const result = await signSlot(db, {
      templateNodeId: 'node-1',
      slotOrder: 1,
      file: makeFile(),
      signingRound: 1,
    })

    expect(result.success).toBe(true)
    expect(db.storage.from).toHaveBeenCalledWith('process-template-signatures')
    expect(upload).toHaveBeenCalled()
    expect(updateChain.update).toHaveBeenCalledWith(expect.objectContaining({ status: 'signed' }))
    expect(db.from).toHaveBeenCalledTimes(1)
  })
})

describe('declineSlot', () => {
  it('rejects an empty reason without calling the database', async () => {
    const db = makeDb()
    const result = await declineSlot(db, { templateNodeId: 'node-1', slotOrder: 1, reason: '   ' })
    expect(result.success).toBe(false)
    expect(db.from).not.toHaveBeenCalled()
  })

  it('sets status to declined with the reason when signing has started', async () => {
    const db = makeDb()
    const roundChain = chainable({ data: [{ signing_round: 1 }], error: null })
    const declined = { id: 'row-1', status: 'declined', decline_reason: 'Missing budget detail' }
    const updateChain = chainable({ data: declined, error: null })
    db.from
      .mockReturnValueOnce(roundChain) // getCurrentRoundNumber
      .mockReturnValueOnce(updateChain) // the decline update

    const result = await declineSlot(db, { templateNodeId: 'node-1', slotOrder: 2, reason: 'Missing budget detail' })

    expect(updateChain.update).toHaveBeenCalledWith(expect.objectContaining({
      status: 'declined', decline_reason: 'Missing budget detail',
    }))
    expect(result.success).toBe(true)
    expect(result.data.status).toBe('declined')
  })
})

describe('restartSigningChain', () => {
  it('inserts a new round preserving assignments and resetting status to pending', async () => {
    const db = makeDb()
    const roundChain = chainable({ data: [{ signing_round: 1 }], error: null })
    const priorRows = [
      { template_node_id: 'node-1', signing_round: 1, slot_order: 1, role_label: 'Project Manager', assigned_user_id: 'user-1', status: 'signed', is_mandatory: true },
      { template_node_id: 'node-1', signing_round: 1, slot_order: 2, role_label: 'Sponsor', assigned_user_id: 'user-2', status: 'declined', is_mandatory: false },
    ]
    const priorChain = chainable({ data: priorRows, error: null })
    const newRoundRows = priorRows.map((r) => ({ ...r, signing_round: 2, status: 'pending' }))
    const insertChain = chainable({ data: newRoundRows, error: null })
    db.from
      .mockReturnValueOnce(roundChain) // getCurrentRoundNumber
      .mockReturnValueOnce(priorChain) // select prior round rows
      .mockReturnValueOnce(insertChain) // insert new round

    const result = await restartSigningChain(db, { templateNodeId: 'node-1' })

    expect(insertChain.insert).toHaveBeenCalledWith([
      expect.objectContaining({ signing_round: 2, slot_order: 1, assigned_user_id: 'user-1', status: 'pending', is_mandatory: true }),
      expect.objectContaining({ signing_round: 2, slot_order: 2, assigned_user_id: 'user-2', status: 'pending', is_mandatory: false }),
    ])
    expect(result.success).toBe(true)
    expect(result.data.every((r) => r.status === 'pending')).toBe(true)
  })
})

describe('isDocumentFullySigned', () => {
  it('is false when no signing round has started', async () => {
    const db = makeDb()
    db.from.mockReturnValue(chainable({ data: [], error: null }))
    expect(await isDocumentFullySigned(db, 'node-1')).toBe(false)
  })

  it('is false when any slot is still pending or declined', async () => {
    const db = makeDb()
    const roundChain = chainable({ data: [{ signing_round: 1 }], error: null })
    const slotsChain = chainable({
      data: [{ status: 'signed', is_mandatory: true }, { status: 'pending', is_mandatory: true }],
      error: null,
    })
    db.from.mockReturnValueOnce(roundChain).mockReturnValueOnce(slotsChain)
    expect(await isDocumentFullySigned(db, 'node-1')).toBe(false)
  })

  it('is true when every mandatory slot is signed even if optional remain pending', async () => {
    const db = makeDb()
    const roundChain = chainable({ data: [{ signing_round: 1 }], error: null })
    const slotsChain = chainable({
      data: [
        { status: 'signed', is_mandatory: true },
        { status: 'pending', is_mandatory: false },
      ],
      error: null,
    })
    db.from.mockReturnValueOnce(roundChain).mockReturnValueOnce(slotsChain)
    expect(await isDocumentFullySigned(db, 'node-1')).toBe(true)
  })

  it('is true when every slot in the current round is signed', async () => {
    const db = makeDb()
    const roundChain = chainable({ data: [{ signing_round: 1 }], error: null })
    const slotsChain = chainable({
      data: [{ status: 'signed', is_mandatory: true }, { status: 'signed', is_mandatory: true }],
      error: null,
    })
    db.from.mockReturnValueOnce(roundChain).mockReturnValueOnce(slotsChain)
    expect(await isDocumentFullySigned(db, 'node-1')).toBe(true)
  })
})

describe('canLockRemainingOptionalSlots', () => {
  const mandatorySignedByUser1 = { slot_order: 1, is_mandatory: true, status: 'signed', assigned_user_id: 'user-1' }
  const optionalPending = { slot_order: 2, is_mandatory: false, status: 'pending', assigned_user_id: 'user-2' }

  it('is false without a userId', () => {
    expect(canLockRemainingOptionalSlots([mandatorySignedByUser1, optionalPending], null)).toBe(false)
  })

  it('is false when not every mandatory slot is signed yet', () => {
    const laterMandatoryPending = { slot_order: 3, is_mandatory: true, status: 'pending', assigned_user_id: 'user-3' }
    expect(canLockRemainingOptionalSlots([mandatorySignedByUser1, optionalPending, laterMandatoryPending], 'user-1')).toBe(false)
  })

  it('is false when the caller did not sign a mandatory slot themselves', () => {
    expect(canLockRemainingOptionalSlots([mandatorySignedByUser1, optionalPending], 'user-2')).toBe(false)
  })

  it('is false when there is no pending optional slot left to lock', () => {
    const optionalSigned = { ...optionalPending, status: 'signed' }
    expect(canLockRemainingOptionalSlots([mandatorySignedByUser1, optionalSigned], 'user-1')).toBe(false)
  })

  it('is true for a signed mandatory signatory once all mandatory slots are signed and an optional slot is pending', () => {
    expect(canLockRemainingOptionalSlots([mandatorySignedByUser1, optionalPending], 'user-1')).toBe(true)
  })
})

describe('lockRemainingOptionalSignatories', () => {
  it('rejects an empty reason without calling the database', async () => {
    const db = makeDb()
    const result = await lockRemainingOptionalSignatories(db, { templateNodeId: 'node-1', reason: '   ' })
    expect(result.success).toBe(false)
    expect(db.from).not.toHaveBeenCalled()
  })

  it('flips every pending optional slot in the current round to expired, leaving mandatory slots untouched', async () => {
    const db = makeDb()
    const roundChain = chainable({ data: [{ signing_round: 2 }], error: null })
    const expiredRows = [{ id: 'row-2', slot_order: 2, status: 'expired', lock_reason: 'Waited two weeks' }]
    const updateChain = chainable({ data: expiredRows, error: null })
    db.from
      .mockReturnValueOnce(roundChain) // getCurrentRoundNumber
      .mockReturnValueOnce(updateChain) // the lock update

    const result = await lockRemainingOptionalSignatories(db, { templateNodeId: 'node-1', reason: 'Waited two weeks' })

    expect(updateChain.update).toHaveBeenCalledWith(expect.objectContaining({
      status: 'expired', lock_reason: 'Waited two weeks', locked_by: 'user-1',
    }))
    expect(updateChain.eq).toHaveBeenCalledWith('status', 'pending')
    expect(updateChain.eq).toHaveBeenCalledWith('is_mandatory', false)
    expect(result.success).toBe(true)
    expect(result.data).toEqual(expiredRows)
  })
})

describe('getDeclinedSignatoryCount', () => {
  it('returns the count of declined rows across every round', async () => {
    const db = makeDb()
    db.from.mockReturnValue(chainable({ count: 3, error: null }))
    const result = await getDeclinedSignatoryCount(db, 'node-1')
    expect(result.success).toBe(true)
    expect(result.data).toBe(3)
  })

  it('returns 0 when nothing has ever been declined', async () => {
    const db = makeDb()
    db.from.mockReturnValue(chainable({ count: 0, error: null }))
    const result = await getDeclinedSignatoryCount(db, 'node-1')
    expect(result.success).toBe(true)
    expect(result.data).toBe(0)
  })
})
