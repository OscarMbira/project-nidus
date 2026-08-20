import { describe, expect, it } from 'vitest'
import {
  summarizeFormTemplateDefaultsSave,
  summarizeFormTemplateSaveChanges,
} from '../formTemplateSaveSummary.js'

const base = {
  template_code: 'FT-1',
  name: 'Plan',
  process_group: 'planning',
  is_active: true,
  sections: [
    {
      key: 'general',
      title: 'General',
      fields: [
        { key: 'title', label: 'Title', type: 'text', required: false, options: [] },
      ],
    },
  ],
}

describe('summarizeFormTemplateSaveChanges', () => {
  it('summarises create with section/field counts', () => {
    const msg = summarizeFormTemplateSaveChanges(null, base, {
      isCreate: true,
      templateCode: 'FT-1',
      versionNumber: 1,
    })
    expect(msg).toContain('Created template FT-1 successfully (version 1).')
    expect(msg).toContain('Added 1 section and 1 field')
  })

  it('lists added and removed fields', () => {
    const after = {
      ...base,
      sections: [
        {
          key: 'general',
          title: 'General',
          fields: [
            { key: 'title', label: 'Title', type: 'text', options: [] },
            { key: 'owner', label: 'Owner', type: 'text', options: [] },
          ],
        },
      ],
    }
    const msg = summarizeFormTemplateSaveChanges(base, after, {
      templateCode: 'FT-1',
      versionNumber: 3,
    })
    expect(msg).toContain('updated successfully (version 3)')
    expect(msg).toContain('Added field “Owner (owner)”')
  })

  it('lists field property updates', () => {
    const after = {
      ...base,
      sections: [
        {
          key: 'general',
          title: 'General',
          fields: [
            { key: 'title', label: 'Plan title', type: 'textarea', required: true, options: [] },
          ],
        },
      ],
    }
    const msg = summarizeFormTemplateSaveChanges(base, after, { templateCode: 'FT-1', versionNumber: 2 })
    expect(msg).toMatch(/Updated field .*label.*type.*marked required/s)
  })
})

describe('summarizeFormTemplateDefaultsSave', () => {
  it('summarises saved and cleared defaults with field names one per line', () => {
    const msg = summarizeFormTemplateDefaultsSave({
      templateCode: 'FT-1',
      entries: [
        { clear: false, fieldKey: 'purpose', label: 'Purpose' },
        { clear: false, fieldKey: 'owner', label: 'Owner' },
        { clear: true, fieldKey: 'notes', label: 'Notes' },
      ],
    })
    expect(msg).toBe(
      [
        'Template FT-1 default content saved successfully.',
        'Updated sample/guidance text for 2 fields:',
        '• Purpose (purpose)',
        '• Owner (owner)',
        'Cleared defaults for 1 field:',
        '• Notes (notes)',
      ].join('\n'),
    )
  })
})
