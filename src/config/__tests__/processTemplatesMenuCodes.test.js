import { describe, expect, it } from 'vitest'
import {
  isPmoProcessTemplateMenuCode,
  PMO_PROCESS_TEMPLATES_MENU_CODES,
  processTemplateSortKey,
  PROCESS_TEMPLATES_POLLUTION_CODES,
} from '../processTemplatesMenuCodes'

describe('processTemplatesMenuCodes', () => {
  it('recognises canonical pmo_pt_* codes', () => {
    expect(isPmoProcessTemplateMenuCode('pmo_pt_hub')).toBe(true)
    expect(isPmoProcessTemplateMenuCode('pmo_pt_roadmap')).toBe(true)
    expect(isPmoProcessTemplateMenuCode('pmo_industry_templates')).toBe(true)
    expect(PMO_PROCESS_TEMPLATES_MENU_CODES.has('pmo_pt_agile_section')).toBe(true)
  })

  it('excludes legacy template_library pollution codes', () => {
    expect(isPmoProcessTemplateMenuCode('template_library_browse')).toBe(false)
    expect(PROCESS_TEMPLATES_POLLUTION_CODES.has('template_library_browse')).toBe(true)
  })

  it('recognises delay template menu codes', () => {
    expect(isPmoProcessTemplateMenuCode('pmo_oversight_delay_templates')).toBe(true)
    expect(isPmoProcessTemplateMenuCode('plat_pt_delay_templates')).toBe(true)
    expect(processTemplateSortKey({ menu_code: 'pmo_pt_close' })).toBeLessThan(
      processTemplateSortKey({ menu_code: 'pmo_oversight_delay_templates' })
    )
    expect(processTemplateSortKey({ menu_code: 'pmo_oversight_delay_templates' })).toBeLessThan(
      processTemplateSortKey({ menu_code: 'pmo_pt_browse' })
    )
  })

  it('orders hub before agile subsection', () => {
    expect(processTemplateSortKey({ menu_code: 'pmo_pt_hub' })).toBeLessThan(
      processTemplateSortKey({ menu_code: 'pmo_pt_agile_section' })
    )
    expect(processTemplateSortKey({ menu_code: 'pmo_pt_product_backlog' })).toBeLessThan(
      processTemplateSortKey({ menu_code: 'pmo_industry_templates' })
    )
  })
})
