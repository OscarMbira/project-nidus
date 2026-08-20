import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import MultiItemTextField, {
  isMultiItemFieldValue,
  normalizeMultiItemFieldValue,
  parseLabelledItemGroups,
  serializeLabelledItemGroups,
} from '../MultiItemTextField.jsx'

vi.mock('@nidus/shared/utils/exportUtils', () => ({
  itemHasOwnListMarker: (item) => /^(\d+[.)]\s+|[•●▪▫◦]\s+|[-*]\s+)/.test(String(item || '').trim()),
  formatMultiItemStorage: ({ intro, items }) =>
    intro ? `${intro}:\n${items.join('\n')}` : items.join('\n'),
  splitMultiItemFieldText: (text) => {
    const s = String(text || '')
    if (s.includes('Define WBS elements')) {
      return {
        intro: 'Define WBS elements',
        items: ['Description', 'Owner', 'Acceptance criteria', 'Interfaces'],
      }
    }
    if (s.includes(';') && /^Level\s+\d/i.test(s.trim())) {
      return {
        intro: null,
        items: s
          .replace(/\.$/, '')
          .split(/\s*;\s*/)
          .map((p) => p.trim())
          .filter(Boolean),
      }
    }
    if (s.includes('\n')) {
      const lines = s.split('\n').map((l) => l.trim()).filter(Boolean)
      return lines.length >= 2 ? { intro: null, items: lines } : null
    }
    return null
  },
}))

describe('MultiItemTextField', () => {
  it('folds legacy intro into the first bullet and shows all items with bullets', () => {
    const { container } = render(
      <MultiItemTextField
        value="Define WBS elements: description — Owner — Acceptance criteria — Interfaces"
        onChange={() => {}}
      />,
    )
    expect(screen.queryByLabelText('Main statement')).not.toBeInTheDocument()
    expect(screen.getByDisplayValue('Define WBS elements')).toBeInTheDocument()
    const markers = container.querySelectorAll('li span[aria-hidden="true"]')
    expect(markers[0].textContent).toBe('•')
    expect(screen.getByDisplayValue('Description')).toBeInTheDocument()
  })

  it('Add item appends an empty draft row that stays visible', () => {
    const onChange = vi.fn()
    const { rerender } = render(
      <MultiItemTextField value={'Business\nFunctional'} onChange={onChange} />,
    )
    expect(screen.getAllByRole('textbox')).toHaveLength(2)
    fireEvent.click(screen.getByRole('button', { name: 'Add item' }))
    expect(onChange).toHaveBeenCalledTimes(1)
    const committed = onChange.mock.calls[0][0]
    expect(committed.split('\n')).toEqual(['Business', 'Functional', ''])
    expect(screen.getAllByRole('textbox')).toHaveLength(3)
    expect(screen.getByLabelText('Item 3')).toHaveValue('')
    rerender(<MultiItemTextField value={committed} onChange={onChange} />)
    expect(screen.getAllByRole('textbox')).toHaveLength(3)
    expect(screen.getByLabelText('Item 3')).toHaveValue('')
  })

  it('splits In scope / Out of scope into separate multi-row groups', () => {
    const onChange = vi.fn()
    render(
      <MultiItemTextField
        value={
          'In scope: core deliverables listed in the business case.\nOut of scope: unrelated BAU changes.'
        }
        onChange={onChange}
      />,
    )
    expect(screen.getByText('In scope:')).toBeInTheDocument()
    expect(screen.getByText('Out of scope:')).toBeInTheDocument()
    expect(
      screen.getByDisplayValue('core deliverables listed in the business case.'),
    ).toBeInTheDocument()
    expect(screen.getByDisplayValue('unrelated BAU changes.')).toBeInTheDocument()
    expect(screen.queryByDisplayValue(/In scope:/)).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Add item under In scope:' }))
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange.mock.calls[0][0].split('\n')).toEqual([
      'In scope: core deliverables listed in the business case.',
      'In scope: ',
      'Out of scope: unrelated BAU changes.',
    ])
    expect(screen.getByLabelText('In scope item 2')).toHaveValue('')
    expect(screen.getAllByRole('textbox')).toHaveLength(3)

    const addButtons = screen.getAllByRole('button', { name: /Add item/ })
    expect(addButtons[0].className).toMatch(/font-bold/)
    expect(addButtons[0].className).toMatch(/bg-emerald-600/)
  })
})

describe('parseLabelledItemGroups', () => {
  it('returns null when fewer than two distinct labels exist', () => {
    expect(parseLabelledItemGroups(['Sponsor acceptance', 'Benefits realisation'])).toBeNull()
    expect(parseLabelledItemGroups(['In scope: only one label'])).toBeNull()
  })

  it('groups prefixed lines and round-trips through serialize', () => {
    const groups = parseLabelledItemGroups([
      'In scope: core deliverables listed in the business case.',
      'Out of scope: unrelated BAU changes.',
    ])
    expect(groups).toEqual([
      { label: 'In scope:', items: ['core deliverables listed in the business case.'] },
      { label: 'Out of scope:', items: ['unrelated BAU changes.'] },
    ])
    expect(serializeLabelledItemGroups(groups)).toBe(
      'In scope: core deliverables listed in the business case.\nOut of scope: unrelated BAU changes.',
    )
    expect(
      serializeLabelledItemGroups([
        { label: 'In scope:', items: ['core deliverables listed in the business case.', ''] },
        { label: 'Out of scope:', items: ['unrelated BAU changes.'] },
      ]),
    ).toBe(
      'In scope: core deliverables listed in the business case.\nIn scope: \nOut of scope: unrelated BAU changes.',
    )
  })
})

describe('isMultiItemFieldValue', () => {
  it('detects arrays and multi-line values', () => {
    expect(isMultiItemFieldValue('a\nb', 'string')).toBe(true)
    expect(isMultiItemFieldValue('a', 'array')).toBe(true)
    expect(isMultiItemFieldValue('Single prose sentence.', 'string')).toBe(false)
    expect(isMultiItemFieldValue('{}', 'object')).toBe(false)
  })

  it('normalizes Purpose-style intro into bullets only', () => {
    expect(
      isMultiItemFieldValue(
        'Define WBS elements: description — Owner — Acceptance criteria — Interfaces',
        'string',
      ),
    ).toBe(true)
    expect(
      normalizeMultiItemFieldValue(
        'Define WBS elements: description — Owner — Acceptance criteria — Interfaces',
      ),
    ).toBe('Define WBS elements\nDescription\nOwner\nAcceptance criteria\nInterfaces')
  })
})
