import { describe, expect, it } from 'vitest'
import {
  isDuplicateLabel,
  normaliseRiskLabel,
  orderSimilarRisks,
  similarCatalogueNames,
} from '../riskCategoryMatch'

describe('riskCategoryMatch', () => {
  it('treats capital letters and extra spaces as the same name', () => {
    expect(normaliseRiskLabel('  Vendor  Cutover ')).toBe('vendor cutover')
    expect(isDuplicateLabel('Supplier', ['supplier', 'Pricing'])).toBe(true)
    expect(isDuplicateLabel('Liquidity', ['Supplier'])).toBe(false)
    expect(isDuplicateLabel('   ', ['Supplier'])).toBe(false)
  })

  it('suggests similar catalogue names and skips the exact name', () => {
    const rows = [
      { name: 'Supplier' },
      { name: 'Supplier delay' },
      { name: 'Market' },
    ]
    expect(similarCatalogueNames('supp', rows).map((row) => row.name)).toEqual([
      'Supplier',
      'Supplier delay',
    ])
    expect(similarCatalogueNames('Supplier', rows)).toEqual([{ name: 'Supplier delay' }])
    expect(similarCatalogueNames('s', rows)).toEqual([])
  })

  it('lists the current project first and keeps at most five risks', () => {
    const risks = [
      { id: '1', project_id: 'other', risk_title: 'Alpha' },
      { id: '2', project_id: 'current', risk_title: 'Zulu' },
      { id: '3', project_id: 'other', risk_title: 'Bravo' },
      { id: '4', project_id: 'current', risk_title: 'Mike' },
      { id: '5', project_id: 'other', risk_title: 'Charlie' },
      { id: '6', project_id: 'other', risk_title: 'Delta' },
    ]
    const ordered = orderSimilarRisks(risks, 'current', 5)
    expect(ordered.map((risk) => risk.id)).toEqual(['4', '2', '1', '3', '5'])
    expect(ordered).toHaveLength(5)
  })
})
