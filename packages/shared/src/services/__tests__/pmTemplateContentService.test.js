import { describe, it, expect, vi } from 'vitest'
import { getNodeContent, updateOpaContent, updateProcessTemplateContent } from '../pmTemplateContentService.js'

describe('getNodeContent', () => {
  it('returns none for a null node', async () => {
    const result = await getNodeContent({}, null)
    expect(result).toEqual({ kind: 'none', content: null })
  })

  it('fetches organisational_process_assets content for opa domain', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: { id: 'opa-1', name: 'OPA row' }, error: null })
    const db = {
      from: vi.fn((table) => {
        expect(table).toBe('organisational_process_assets')
        return { select: () => ({ eq: () => ({ maybeSingle }) }) }
      }),
    }
    const result = await getNodeContent(db, { domain: 'opa', domain_ref_id: 'opa-1' })
    expect(result.kind).toBe('opa')
    expect(result.content.id).toBe('opa-1')
  })

  it('level templates (portfolio/programme/project) have no separate content row', async () => {
    const result = await getNodeContent({}, { domain: 'project_template', domain_ref_id: null })
    expect(result).toEqual({ kind: 'level_template', content: null })
  })

  it('finds process_template content via the process_template_node_links join table first', async () => {
    const db = {
      from: vi.fn((table) => {
        if (table === 'process_template_node_links') {
          return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { document_table: 'quality_checklists' } }) }) }) }
        }
        if (table === 'quality_checklists') {
          return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { id: 'pt-1', title: 'QC' } }) }) }) }
        }
        throw new Error(`unexpected table ${table}`)
      }),
    }
    const result = await getNodeContent(db, { domain: 'process_template', domain_ref_id: 'pt-1' })
    expect(result.kind).toBe('process_template')
    expect(result.table).toBe('quality_checklists')
    expect(result.content.title).toBe('QC')
  })

  it('fetches form_templates row + its current version schema for form_template domain', async () => {
    const db = {
      from: vi.fn((table) => {
        if (table === 'form_templates') {
          return {
            select: () => ({
              eq: () => ({ maybeSingle: async () => ({ data: { id: 'ft-1', name: 'Benefits Review Plan' }, error: null }) }),
            }),
          }
        }
        if (table === 'form_template_versions') {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  maybeSingle: async () => ({
                    data: { schema: { title: 'Benefits Review Plan', sections: [{ key: 's1', title: 'Section 1', fields: [] }] } },
                    error: null,
                  }),
                }),
              }),
            }),
          }
        }
        throw new Error(`unexpected table ${table}`)
      }),
    }
    const result = await getNodeContent(db, { domain: 'form_template', domain_ref_id: 'ft-1' })
    expect(result.kind).toBe('form_template')
    expect(result.content.id).toBe('ft-1')
    expect(result.content.schema.sections[0].title).toBe('Section 1')
  })

  it('returns form_template with null content when the row no longer exists', async () => {
    const db = {
      from: vi.fn(() => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }) })),
    }
    const result = await getNodeContent(db, { domain: 'form_template', domain_ref_id: 'missing-1' })
    expect(result).toEqual({ kind: 'form_template', content: null })
  })
})

describe('updateOpaContent / updateProcessTemplateContent', () => {
  it('updateOpaContent only patches provided fields', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: { id: 'opa-1', name: 'x' }, error: null })
    const select = vi.fn(() => ({ maybeSingle }))
    const eq = vi.fn(() => ({ select }))
    const update = vi.fn(() => ({ eq }))
    const db = { from: vi.fn(() => ({ update })) }

    await updateOpaContent(db, 'opa-1', { name: 'x' })
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ name: 'x' }))
    expect(update.mock.calls[0][0]).not.toHaveProperty('description')
  })

  it('updateProcessTemplateContent writes to the given table', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: { id: 'pt-1' }, error: null })
    const select = vi.fn(() => ({ maybeSingle }))
    const eq = vi.fn(() => ({ select }))
    const update = vi.fn(() => ({ eq }))
    const db = { from: vi.fn((t) => { expect(t).toBe('quality_checklists'); return { update } }) }

    await updateProcessTemplateContent(db, 'quality_checklists', 'pt-1', { title: 'New title' })
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ title: 'New title' }))
  })
})
