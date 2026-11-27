/** v1359 (B4) — client bulk upload: rows checked before saving. */
import { describe, expect, it } from 'vitest'
import { parseCsvText } from '@nidus/shared/utils/importMapping'
import { validateClientRows } from '../billing.js'
import { CLIENT_TEMPLATE } from '../../services/billingData.js'

describe('validateClientRows', () => {
  it('reads the downloadable template (quoted address with a comma) as one valid client', () => {
    const { rows } = parseCsvText(CLIENT_TEMPLATE)
    const [first] = validateClientRows(rows, { currencies: ['USD', 'GBP'] })
    expect(first.errors).toEqual([])
    expect(first.value).toEqual({ name: 'Example Freight Ltd', kind: 'external', currency: 'USD', payment_terms_days: 30, billing_address: '1 Example Wharf, London' })
  })

  it('reports each problem on its row and defaults a blank currency to the organisation currency', () => {
    const out = validateClientRows([
      { name: '', kind: 'external', currency: 'USD' },
      { name: 'Example Roads Authority', kind: 'partner', currency: 'XYZ', payment_terms_days: '400' },
      { name: 'Example Shared Services', kind: 'internal', currency: '', payment_terms_days: '' },
      { name: 'example shared services', kind: 'internal', currency: 'AED' },
      { name: 'Example Freight Ltd', kind: 'external', currency: 'AED' },
    ], { currencies: ['USD', 'AED'], orgCurrency: 'aed', existingNames: ['Example Freight Ltd'] })
    expect(out[0].errors).toEqual(['Name is missing'])
    expect(out[1].errors).toEqual(['Kind must be external or internal', 'Currency XYZ is not in the currency list', 'Payment terms must be a whole number from 0 to 365'])
    expect(out[2]).toMatchObject({ errors: [], value: { kind: 'internal', currency: 'AED', payment_terms_days: 30 } })
    expect(out[3].errors).toEqual(['This name appears twice in the file'])
    expect(out[4].errors).toEqual(['A client with this name already exists'])
    expect(out.map((r) => r.line)).toEqual([1, 2, 3, 4, 5])
  })
})
