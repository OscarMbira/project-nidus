import { beforeEach, describe, expect, it, vi } from 'vitest'

const platformDb = { from: vi.fn() }
vi.mock('@nidus/supabase', () => ({ platformDb }))

const { listRegisterTemplates, resetRegisterTemplateSchemaCache } = await import('../localRegisterTemplateService')

const missing = { data: null, error: { code: '42P01', message: 'relation "public.local_register_templates" does not exist' } }

function stubMissingTable() {
  let calls = 0
  const query = {
    select: () => query,
    eq: () => query,
    then: (resolve, reject) => {
      calls += 1
      return Promise.resolve(missing).then(resolve, reject)
    },
  }
  platformDb.from.mockImplementation(() => query)
  return { calls: () => calls }
}

describe('listRegisterTemplates when the templates table is not installed', () => {
  beforeEach(() => {
    resetRegisterTemplateSchemaCache()
    platformDb.from.mockReset()
  })

  it('returns an empty list instead of the missing-relation error', async () => {
    stubMissingTable()
    const result = await listRegisterTemplates(platformDb, 'ict_technology_roadmap', { includeArchived: true })
    expect(result).toEqual({ success: true, data: [] })
  })

  it('does not ask the database again after the relation is known to be missing', async () => {
    const db = stubMissingTable()
    await listRegisterTemplates(platformDb, 'ict_technology_roadmap', { includeArchived: true })
    const second = await listRegisterTemplates(platformDb, 'ict_technology_roadmap', { includeArchived: true })
    expect(second).toEqual({ success: true, data: [] })
    expect(db.calls()).toBe(1)
  })
})
